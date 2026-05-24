import { db } from "@/lib/db";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { applyInventoryChangeStrict, createGameEconomyMutation, type GameHistoryEvent } from "@/lib/game-core";
import {
    getNegamonBattleValidChoices,
    resolveNegamonBattleChoice,
} from "@/lib/game-negamon/core/battle-engine-v2";
import {
    calculateNegamonBattleExpReward,
    calculateNegamonBattleGoldReward,
    createNegamonBattleRewardFinalizationPlan,
} from "@/lib/game-negamon/core/battle-rewards";
import {
    applyNegamonBattleItemInventoryChange,
    createNegamonBattleItemRuntimePlanOrEmpty,
} from "@/lib/game-negamon/core/item-effects";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import { applyNegamonProgressionReward } from "@/lib/game-negamon/server/progression";
import {
    createNegamonLiteBattleState,
    createNegamonLiteChoiceRequestId,
    parseNegamonLiteSessionResult,
    type NegamonLiteSessionResult,
} from "@/lib/negamon-lite/session";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";
import { resolveBattleRewardPayout } from "@/lib/services/student-economy/battle-reward-policy";
import { normalizeStudentBattleKit } from "@/lib/shop-item-migration";

const NEGAMON_LITE_BASE_GOLD_REWARD = 30;

function createPointHistoryRowsFromRewardEvents(input: {
    studentId: string;
    behaviorPointDelta: number;
    historyEvents: GameHistoryEvent[];
}) {
    return input.historyEvents.map((event) => {
        if (event.kind === "reward_granted") {
            return {
                studentId: input.studentId,
                value: input.behaviorPointDelta,
                reason: "negamon_battle_reward",
            };
        }
        if (event.kind === "level_up") {
            const level = event.reward?.levelUps[0]?.toLevel;
            return {
                studentId: input.studentId,
                value: 0,
                reason: level ? `negamon_level_up:${level}` : "negamon_level_up",
            };
        }
        if (event.kind === "skill_unlocked") {
            const skillId = event.reward?.unlockedSkillIds[0];
            return {
                studentId: input.studentId,
                value: 0,
                reason: skillId ? `negamon_skill_unlocked:${skillId}` : "negamon_skill_unlocked",
            };
        }
        return {
            studentId: input.studentId,
            value: 0,
            reason: `negamon_${event.kind}`,
        };
    });
}

export type StartNegamonLiteBattleInput = {
    classId: string;
    challengerId: string;
    defenderId: string;
    studentCode: string;
};

export type ChooseNegamonLiteMoveInput = StartNegamonLiteBattleInput & {
    sessionId: string;
    choiceRequestId: string;
    moveId: string;
};

export type NegamonLiteActionResult =
    | { ok: false; status: 400 | 403 | 404 | 409; body: Record<string, unknown> }
    | { ok: true; body: Record<string, unknown> };

export async function startNegamonLiteBattle(
    input: StartNegamonLiteBattleInput
): Promise<NegamonLiteActionResult> {
    if (
        !input.challengerId ||
        !input.defenderId ||
        !input.studentCode ||
        input.challengerId === input.defenderId
    ) {
        return { ok: false, status: 400, body: { error: "INVALID_REQUEST" } };
    }

    const classroom = await db.classroom.findUnique({
        where: { id: input.classId },
        select: { id: true, gamifiedSettings: true, levelConfig: true },
    });
    if (!classroom) return { ok: false, status: 404, body: { error: "NOT_FOUND" } };

    const challenger = await db.student.findFirst({
        where: {
            id: input.challengerId,
            classId: input.classId,
            loginCode: input.studentCode,
        },
        select: { id: true, name: true, behaviorPoints: true, inventory: true, battleLoadout: true },
    });
    if (!challenger) return { ok: false, status: 403, body: { error: "FORBIDDEN" } };

    const defender = await db.student.findFirst({
        where: { id: input.defenderId, classId: input.classId },
        select: { id: true, name: true, behaviorPoints: true, inventory: true, battleLoadout: true },
    });
    if (!defender) return { ok: false, status: 404, body: { error: "DEFENDER_NOT_FOUND" } };

    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) {
        return { ok: false, status: 400, body: { error: "NEGAMON_DISABLED" } };
    }

    const placeholderBattleId = `negamon-lite:${input.classId}:${input.challengerId}:${input.defenderId}`;
    const challengerBattleKit = normalizeStudentBattleKit({
        inventory: challenger.inventory,
        battleLoadout: challenger.battleLoadout,
    });
    const defenderBattleKit = normalizeStudentBattleKit({
        inventory: defender.inventory,
        battleLoadout: defender.battleLoadout,
    });
    const challengerInventory = challengerBattleKit.inventory;
    const defenderInventory = defenderBattleKit.inventory;
    const challengerBattleItemPlan = createNegamonBattleItemRuntimePlanOrEmpty({
        loadoutIds: challengerBattleKit.battleLoadout,
        inventory: challengerInventory,
    });
    const defenderBattleItemPlan = createNegamonBattleItemRuntimePlanOrEmpty({
        loadoutIds: defenderBattleKit.battleLoadout,
        inventory: defenderInventory,
    });
    const state = createNegamonLiteBattleState({
        battleId: placeholderBattleId,
        classId: input.classId,
        challenger,
        defender,
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
        challengerBattleItemIds: challengerBattleItemPlan.itemIds,
        defenderBattleItemIds: defenderBattleItemPlan.itemIds,
    });
    if (!state) return { ok: false, status: 400, body: { error: "NO_MONSTER" } };

    const session = await db.battleSession.create({
        data: {
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
            result: {
                mode: "negamon_lite",
                status: "active",
                choiceRequestId: createNegamonLiteChoiceRequestId(state),
                state,
            } satisfies NegamonLiteSessionResult,
            winnerId: null,
            goldReward: 0,
            interactivePending: true,
            challengerBattleItems: challengerBattleItemPlan.itemIds,
            defenderBattleItems: defenderBattleItemPlan.itemIds,
        },
    });

    if (challengerBattleItemPlan.inventoryChange.consumedItemIds.length > 0) {
        await db.student.update({
            where: { id: input.challengerId },
            data: {
                inventory: applyNegamonBattleItemInventoryChange({
                    inventory: challengerInventory,
                    plan: challengerBattleItemPlan,
                }),
            },
        });
    }
    if (defenderBattleItemPlan.inventoryChange.consumedItemIds.length > 0) {
        await db.student.update({
            where: { id: input.defenderId },
            data: {
                inventory: applyNegamonBattleItemInventoryChange({
                    inventory: defenderInventory,
                    plan: defenderBattleItemPlan,
                }),
            },
        });
    }

    const savedState = {
        ...state,
        battleId: session.id,
        seed: state.seed,
        events: state.events.map((event) =>
            event.kind === "battle_started"
                ? { ...event, id: `${session.id}:1:start` }
                : event
        ),
    };
    const result: NegamonLiteSessionResult = {
        mode: "negamon_lite",
        status: "active",
        choiceRequestId: createNegamonLiteChoiceRequestId(savedState),
        state: savedState,
    };

    await db.battleSession.update({
        where: { id: session.id },
        data: { result },
    });

    return {
        ok: true,
        body: {
            sessionId: session.id,
            choiceRequestId: result.choiceRequestId,
            state: result.state,
            validChoices: getNegamonBattleValidChoices(result.state, "player"),
            inventoryChanges: {
                challenger: challengerBattleItemPlan.inventoryChange,
                defender: defenderBattleItemPlan.inventoryChange,
            },
            itemEffects: {
                challenger: challengerBattleItemPlan.effects,
                defender: defenderBattleItemPlan.effects,
            },
        },
    };
}

export async function chooseNegamonLiteMove(
    input: ChooseNegamonLiteMoveInput
): Promise<NegamonLiteActionResult> {
    if (
        !input.challengerId ||
        !input.defenderId ||
        !input.studentCode ||
        !input.sessionId ||
        !input.choiceRequestId ||
        !input.moveId
    ) {
        return { ok: false, status: 400, body: { error: "INVALID_REQUEST" } };
    }

    const challenger = await db.student.findFirst({
        where: {
            id: input.challengerId,
            classId: input.classId,
            loginCode: input.studentCode,
        },
        select: { id: true },
    });
    if (!challenger) return { ok: false, status: 403, body: { error: "FORBIDDEN" } };

    const classroom = await db.classroom.findUnique({
        where: { id: input.classId },
        select: { id: true, gamifiedSettings: true, levelConfig: true },
    });
    if (!classroom) return { ok: false, status: 404, body: { error: "NOT_FOUND" } };
    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) {
        return { ok: false, status: 400, body: { error: "NEGAMON_DISABLED" } };
    }

    const session = await db.battleSession.findFirst({
        where: {
            id: input.sessionId,
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
            interactivePending: true,
        },
    });
    if (!session) {
        const completed = await db.battleSession.findFirst({
            where: {
                id: input.sessionId,
                classId: input.classId,
                challengerId: input.challengerId,
                defenderId: input.defenderId,
                interactivePending: false,
            },
        });
        const completedResult = completed ? parseNegamonLiteSessionResult(completed.result) : null;
        if (completed && completedResult?.status === "finished") {
            return {
                ok: true,
                body: {
                    choiceRequestId: completedResult.choiceRequestId,
                    state: completedResult.state,
                    validChoices: [],
                    final: {
                        winnerId: completedResult.winnerId ?? completed.winnerId,
                        requestedGoldReward: completedResult.requestedGoldReward ?? completed.goldReward,
                        goldReward: completedResult.goldReward ?? completed.goldReward,
                        rewardBlockedReason: completedResult.rewardBlockedReason ?? null,
                        rewardPolicy: completedResult.rewardPolicy,
                        rewardIdempotencyKey: completedResult.rewardIdempotencyKey,
                        reward: completedResult.reward,
                        progression: completedResult.progression ?? null,
                        historyEvents: completedResult.historyEvents ?? [],
                    },
                },
            };
        }
        return { ok: false, status: 404, body: { error: "SESSION_NOT_FOUND" } };
    }

    const parsed = parseNegamonLiteSessionResult(session.result);
    if (!parsed || parsed.status !== "active") {
        return { ok: false, status: 409, body: { error: "INVALID_SESSION_STATE" } };
    }

    if (parsed.choiceRequestId !== input.choiceRequestId) {
        return {
            ok: false,
            status: 409,
            body: {
                error: "STALE_CHOICE",
                choiceRequestId: parsed.choiceRequestId,
                validChoices: getNegamonBattleValidChoices(parsed.state, "player"),
            },
        };
    }

    const resolved = resolveNegamonBattleChoice(parsed.state, {
        side: "player",
        kind: "move",
        moveId: input.moveId,
    });

    if (!resolved.accepted) {
        return {
            ok: false,
            status: 409,
            body: {
                error: "CHOICE_REJECTED",
                reason: resolved.reason,
                choiceRequestId: parsed.choiceRequestId,
                state: resolved.state,
                validChoices: getNegamonBattleValidChoices(resolved.state, "player"),
            },
        };
    }

    const winnerId =
        resolved.state.winner === "player"
            ? input.challengerId
            : resolved.state.winner === "opponent"
              ? input.defenderId
              : null;

    const nextResult: NegamonLiteSessionResult = {
        mode: "negamon_lite",
        status: resolved.state.phase === "ended" ? "finished" : "active",
        choiceRequestId: createNegamonLiteChoiceRequestId(resolved.state),
        state: resolved.state,
    };

    let final:
        | {
              winnerId: string;
              requestedGoldReward: number;
              goldReward: number;
              rewardBlockedReason: "daily_cap" | "pair_cooldown" | null;
              rewardPolicy: Awaited<ReturnType<typeof resolveBattleRewardPayout>>;
              rewardIdempotencyKey?: string;
              reward?: NegamonLiteSessionResult["reward"];
              progression?: NegamonLiteSessionResult["progression"];
              historyEvents?: GameHistoryEvent[];
          }
        | null = null;

    if (winnerId) {
        const winnerStudent = await db.student.findFirst({
            where: { id: winnerId, classId: input.classId },
            select: { id: true, name: true, behaviorPoints: true, negamonSkills: true, inventory: true },
        });
        if (!winnerStudent) {
            return { ok: false, status: 404, body: { error: "WINNER_NOT_FOUND" } };
        }
        const winnerPoints = Math.max(0, Math.floor(winnerStudent.behaviorPoints ?? 0));
        const winnerSkills = Array.isArray(winnerStudent.negamonSkills)
            ? (winnerStudent.negamonSkills as string[])
            : [];
        const winnerInventory = Array.isArray(winnerStudent.inventory)
            ? (winnerStudent.inventory as string[])
            : [];
        const monsterBefore = createNegamonMonsterSnapshot({
            studentId: winnerId,
            studentName: winnerStudent.name,
            points: winnerPoints,
            levelConfig: classroom.levelConfig as LevelConfigInput,
            negamonSettings: negamon,
            equippedSkillIds: winnerSkills,
        });
        const winnerSide = winnerId === input.challengerId ? "player" : "opponent";
        const winnerCombatantAfterChoice = resolved.state.sides[winnerSide];
        const expReward = Math.floor(calculateNegamonBattleExpReward({
            outcome: "win",
            turnCount: resolved.state.turn,
        }) * Math.max(1, winnerCombatantAfterChoice.rewardExpMultiplier ?? 1));
        const pointDelta = Math.ceil(expReward / Math.max(1, Math.floor(negamon.expPerPoint ?? 10)));
        const monsterAfter = createNegamonMonsterSnapshot({
            studentId: winnerId,
            studentName: winnerStudent.name,
            points: winnerPoints + pointDelta,
            levelConfig: classroom.levelConfig as LevelConfigInput,
            negamonSettings: negamon,
            equippedSkillIds: winnerSkills,
        });
        try {
            final = await db.$transaction(async (tx) => {
                const winnerCombatant = resolved.state.sides[winnerSide];
                const requestedGoldReward = calculateNegamonBattleGoldReward({
                    baseGold: NEGAMON_LITE_BASE_GOLD_REWARD,
                    goldBonus: winnerCombatant.rewardGoldBonus,
                    goldMultiplier: winnerCombatant.rewardGoldMultiplier,
                });
                const rewardPolicy = await resolveBattleRewardPayout(tx, {
                    classId: input.classId,
                    winnerId,
                    challengerId: input.challengerId,
                    defenderId: input.defenderId,
                    requestedGold: requestedGoldReward,
                });
                const finalResult: NegamonLiteSessionResult = {
                    ...nextResult,
                    winnerId,
                    requestedGoldReward,
                    goldReward: rewardPolicy.goldReward,
                    rewardBlockedReason: rewardPolicy.rewardBlockedReason,
                    rewardPolicy,
                };

                const saved = await tx.battleSession.updateMany({
                    where: {
                        id: input.sessionId,
                        classId: input.classId,
                        challengerId: input.challengerId,
                        defenderId: input.defenderId,
                        interactivePending: true,
                        stateVersion: session.stateVersion ?? 0,
                    },
                    data: {
                        result: finalResult,
                        winnerId,
                        goldReward: rewardPolicy.goldReward,
                        interactivePending: false,
                        stateVersion: { increment: 1 },
                    },
                });
                if (saved.count !== 1) throw new Error("CHOICE_CONFLICT");

                const updatedWinner = await tx.student.update({
                    where: { id: winnerId },
                    data: { gold: { increment: rewardPolicy.goldReward } },
                    select: { gold: true },
                });

                const v2RewardPlan =
                    monsterBefore && monsterAfter
                        ? createNegamonBattleRewardFinalizationPlan({
                              sessionId: input.sessionId,
                              studentId: winnerId,
                              classId: input.classId,
                              outcome: "win",
                              monsterBefore,
                              balanceBefore: updatedWinner.gold - rewardPolicy.goldReward,
                              goldReward: rewardPolicy.goldReward,
                              expReward,
                              rankIndexAfter: monsterAfter.rankIndex,
                              unlockedSkillIdsAfter: monsterAfter.unlockedSkillIds,
                          })
                        : null;

                const progressionResult =
                    v2RewardPlan?.ok
                        ? await applyNegamonProgressionReward({
                              studentId: winnerId,
                              student: {
                                  behaviorPoints: winnerPoints,
                                  negamonSkills: winnerSkills,
                              },
                              progression: v2RewardPlan.progression,
                              expPerPoint: negamon.expPerPoint,
                              studentDelegate: tx.student,
                          })
                        : null;
                if (
                    v2RewardPlan?.ok &&
                    (v2RewardPlan.inventoryChange.consumedItemIds.length > 0 ||
                        v2RewardPlan.inventoryChange.grantedItemIds.length > 0)
                ) {
                    await tx.student.update({
                        where: { id: winnerId },
                        data: {
                            inventory: applyInventoryChangeStrict(
                                winnerInventory,
                                v2RewardPlan.inventoryChange
                            ),
                        },
                    });
                }

                const persistedFinalResult: NegamonLiteSessionResult = {
                    ...finalResult,
                    rewardIdempotencyKey: v2RewardPlan?.idempotencyKey,
                    reward: v2RewardPlan?.reward,
                    progression: progressionResult?.plan ?? null,
                    historyEvents: v2RewardPlan?.historyEvents ?? [],
                };

                const historyRows =
                    v2RewardPlan && progressionResult?.plan
                        ? createPointHistoryRowsFromRewardEvents({
                              studentId: winnerId,
                              behaviorPointDelta: progressionResult.plan.behaviorPointDelta,
                              historyEvents: v2RewardPlan.historyEvents,
                          })
                        : [];
                if (historyRows.length > 0) {
                    await tx.pointHistory.createMany({ data: historyRows });
                }

                await tx.battleSession.update({
                    where: { id: input.sessionId },
                    data: { result: persistedFinalResult },
                });

                if (rewardPolicy.goldReward > 0) {
                    const mutation = createGameEconomyMutation({
                        studentId: winnerId,
                        classId: input.classId,
                        type: "earn",
                        source: "battle",
                        amount: rewardPolicy.goldReward,
                        balanceBefore: updatedWinner.gold - rewardPolicy.goldReward,
                        sourceRefId: input.sessionId,
                        idempotencyKey: `battle:${input.sessionId}:negamon-lite:reward`,
                    });
                    await recordEconomyTransaction(tx, {
                        studentId: mutation.studentId,
                        classId: mutation.classId,
                        type: mutation.type,
                        source: mutation.source,
                        amount: mutation.amount,
                        balanceBefore: mutation.balanceBefore,
                        balanceAfter: updatedWinner.gold,
                        sourceRefId: mutation.sourceRefId,
                        idempotencyKey: mutation.idempotencyKey,
                        metadata: {
                            mode: "negamon_lite",
                            winnerId,
                            challengerId: input.challengerId,
                            defenderId: input.defenderId,
                            requestedGoldReward,
                            goldReward: rewardPolicy.goldReward,
                            rewardIdempotencyKey: v2RewardPlan?.idempotencyKey,
                            reward: v2RewardPlan?.reward ?? null,
                            expReward,
                            progression: progressionResult?.plan ?? null,
                            historyEvents: v2RewardPlan?.historyEvents ?? [],
                            turn: resolved.state.turn,
                            rewardPolicy,
                            itemRuntime: {
                                winnerSide,
                                battleItemIds: winnerCombatant.battleItemIds ?? [],
                                itemEffectKinds: winnerCombatant.itemEffectKinds ?? [],
                                rewardGoldBonus: winnerCombatant.rewardGoldBonus ?? 0,
                                rewardGoldMultiplier: winnerCombatant.rewardGoldMultiplier ?? 1,
                                rewardExpMultiplier: winnerCombatant.rewardExpMultiplier ?? 1,
                            },
                        },
                    });
                }

                return {
                    winnerId,
                    requestedGoldReward,
                    goldReward: rewardPolicy.goldReward,
                    rewardBlockedReason: rewardPolicy.rewardBlockedReason,
                    rewardPolicy,
                    rewardIdempotencyKey: v2RewardPlan?.idempotencyKey,
                    reward: v2RewardPlan?.reward,
                    progression: progressionResult?.plan ?? null,
                    historyEvents: v2RewardPlan?.historyEvents ?? [],
                };
            });
        } catch (error) {
            if (error instanceof Error && error.message === "CHOICE_CONFLICT") {
                return { ok: false, status: 409, body: { error: "CHOICE_CONFLICT" } };
            }
            throw error;
        }
    } else {
        const saved = await db.battleSession.updateMany({
            where: {
                id: input.sessionId,
                classId: input.classId,
                challengerId: input.challengerId,
                defenderId: input.defenderId,
                interactivePending: true,
                stateVersion: session.stateVersion ?? 0,
            },
            data: {
                result: nextResult,
                winnerId: null,
                goldReward: 0,
                interactivePending: true,
                stateVersion: { increment: 1 },
            },
        });

        if (saved.count !== 1) {
            return { ok: false, status: 409, body: { error: "CHOICE_CONFLICT" } };
        }
    }

    return {
        ok: true,
        body: {
            choiceRequestId: nextResult.choiceRequestId,
            state: nextResult.state,
            validChoices: resolved.state.phase === "ended" ? [] : getNegamonBattleValidChoices(resolved.state, "player"),
            final,
        },
    };
}
