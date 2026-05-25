import { db } from "@/lib/db";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { applyInventoryChangeStrict, createGameEconomyMutation, type GameHistoryEvent } from "@/lib/game-core";
import { toPrismaJson } from "@/lib/prisma-json";
import {
    calculateNegamonBattleExpReward,
    calculateNegamonBattleGoldReward,
    createNegamonBattleRewardFinalizationPlan,
} from "@/lib/game-negamon/core/battle-rewards";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import { parseNegamonBattleSessionResultV3, type NegamonBattleSessionResultV3 } from "@/lib/game-negamon/core/session-v3";
import { createBattleCombatantV3, createBattleStateV3 } from "@/lib/game-negamon/core/state";
import { createNegamonBattleItemRuntimePlanOrEmpty } from "@/lib/game-negamon/core/item-effects";
import { chooseNegamonBattleAiActionV3 } from "@/lib/game-negamon/core/engine/ai-engine";
import { getNegamonBattleValidChoicesV3, resolveNegamonBattleTurnV3 } from "@/lib/game-negamon/core/engine/state-engine";
import { createRuntimeCombatant } from "@/lib/game-negamon/core/engine/runtime-types";
import { createNegamonSkillLoadoutPlan } from "@/lib/game-negamon/server/skill-loadout";
import { applyNegamonProgressionReward } from "@/lib/game-negamon/server/progression";
import { getEnergyProfileForSpecies } from "@/lib/negamon-energy";
import { parseNegamonLiteSessionResult } from "@/lib/negamon-lite/session";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";
import { resolveBattleRewardPayout } from "@/lib/services/student-economy/battle-reward-policy";
import type { ChooseNegamonLiteMoveInput, NegamonLiteActionResult, StartNegamonLiteBattleInput } from "./lite-battle";
import { applyNegamonBattleItemInventoryChange } from "../core/item-effects";
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

function mapResultToEngineMode(result: unknown): "lite" | "pokemon_v3" | null {
    if (parseNegamonBattleSessionResultV3(result)) return "pokemon_v3";
    if (parseNegamonLiteSessionResult(result)) return "lite";
    return null;
}

function createV3BattleCombatant(input: {
    studentId: string;
    studentName: string;
    behaviorPoints: number;
    side: "player" | "opponent";
    levelConfig: LevelConfigInput;
    negamonSettings: NonNullable<ReturnType<typeof getNegamonSettings>>;
    equippedSkillIds?: string[];
    battleItemIds?: string[];
}) {
    const snapshot = createNegamonMonsterSnapshot({
        studentId: input.studentId,
        studentName: input.studentName,
        points: input.behaviorPoints,
        levelConfig: input.levelConfig,
        negamonSettings: input.negamonSettings,
        equippedSkillIds: input.equippedSkillIds,
        equippedItemIds: input.battleItemIds,
    });
    if (!snapshot) return null;

    const loadout = createNegamonSkillLoadoutPlan({
        monster: snapshot,
        requestedSkillIds: input.equippedSkillIds,
    });
    const energyProfile = getEnergyProfileForSpecies(snapshot.speciesId);
    const runtime = createRuntimeCombatant({
        id: input.studentId,
        side: input.side,
        name: input.studentName,
        level: snapshot.level,
        types: snapshot.elementTypes as Array<"NORMAL" | "FIRE" | "WATER" | "EARTH" | "WIND" | "THUNDER" | "LIGHT" | "DARK">,
        stats: {
            maxHp: snapshot.derivedStats.maxHp,
            attack: snapshot.derivedStats.atk,
            defense: snapshot.derivedStats.def,
            specialAttack: snapshot.derivedStats.atk,
            specialDefense: snapshot.derivedStats.def,
            speed: snapshot.derivedStats.spd,
        },
        hp: snapshot.derivedStats.maxHp,
        energy: snapshot.derivedStats.maxEnergy,
        maxEnergy: snapshot.derivedStats.maxEnergy,
        energyRegenPerTurn: energyProfile.regenPerTurn,
        abilityId: snapshot.abilityId,
        battleItemIds: input.battleItemIds,
    });

    return createBattleCombatantV3({
        runtime,
        speciesId: snapshot.speciesId,
        speciesName: snapshot.speciesName,
        formName: snapshot.formName,
        rankIndex: snapshot.rankIndex,
        moveSkills: loadout.skills,
    });
}

async function startNegamonBattleV3(
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
        select: { id: true, name: true, behaviorPoints: true, inventory: true, battleLoadout: true, negamonSkills: true },
    });
    if (!challenger) return { ok: false, status: 403, body: { error: "FORBIDDEN" } };

    const defender = await db.student.findFirst({
        where: { id: input.defenderId, classId: input.classId },
        select: { id: true, name: true, behaviorPoints: true, inventory: true, battleLoadout: true, negamonSkills: true },
    });
    if (!defender) return { ok: false, status: 404, body: { error: "DEFENDER_NOT_FOUND" } };

    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) {
        return { ok: false, status: 400, body: { error: "NEGAMON_DISABLED" } };
    }

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

    const player = createV3BattleCombatant({
        studentId: challenger.id,
        studentName: challenger.name,
        behaviorPoints: challenger.behaviorPoints,
        side: "player",
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
        equippedSkillIds: Array.isArray(challenger.negamonSkills) ? (challenger.negamonSkills as string[]) : [],
        battleItemIds: challengerBattleItemPlan.itemIds,
    });
    const opponent = createV3BattleCombatant({
        studentId: defender.id,
        studentName: defender.name,
        behaviorPoints: defender.behaviorPoints,
        side: "opponent",
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
        equippedSkillIds: Array.isArray(defender.negamonSkills) ? (defender.negamonSkills as string[]) : [],
        battleItemIds: defenderBattleItemPlan.itemIds,
    });

    if (!player || !opponent) {
        return { ok: false, status: 400, body: { error: "NO_MONSTER" } };
    }

    const placeholderBattleId = `negamon-v3:${input.classId}:${input.challengerId}:${input.defenderId}`;
    const state = createBattleStateV3({
        battleId: placeholderBattleId,
        seed: Date.now(),
        player,
        opponent,
    });

    const session = await db.battleSession.create({
        data: {
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
            result: toPrismaJson({
                mode: "negamon_battle",
                engineVersion: "negamon_v3_pokemon_inspired",
                status: "active",
                choiceRequestId: state.choiceRequestId,
                state,
            } satisfies NegamonBattleSessionResultV3),
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
        choiceRequestId: `${session.id}:${state.stateVersion}:${state.turn}`,
        events: state.events.map((event, index) => ({ ...event, id: `${session.id}:event:${index + 1}` })),
    };
    const result: NegamonBattleSessionResultV3 = {
        mode: "negamon_battle",
        engineVersion: "negamon_v3_pokemon_inspired",
        status: "active",
        choiceRequestId: savedState.choiceRequestId,
        state: savedState,
    };

    await db.battleSession.update({
        where: { id: session.id },
        data: { result: toPrismaJson(result) },
    });

    return {
        ok: true,
        body: {
            mode: result.mode,
            engineVersion: result.engineVersion,
            sessionId: session.id,
            choiceRequestId: result.choiceRequestId,
            state: result.state,
            validChoices: getNegamonBattleValidChoicesV3(result.state, "player"),
            inventoryChanges: {
                challenger: challengerBattleItemPlan.inventoryChange,
                defender: defenderBattleItemPlan.inventoryChange,
            },
        },
    };
}

async function chooseNegamonBattleMoveV3(
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
        const completedResult = completed ? parseNegamonBattleSessionResultV3(completed.result) : null;
        if (completed && completedResult?.status === "finished") {
            return {
                ok: true,
                body: {
                    mode: completedResult.mode,
                    engineVersion: completedResult.engineVersion,
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

    const parsed = parseNegamonBattleSessionResultV3(session.result);
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
                validChoices: getNegamonBattleValidChoicesV3(parsed.state, "player"),
            },
        };
    }

    const playerChoices = getNegamonBattleValidChoicesV3(parsed.state, "player");
    const selectedChoice = playerChoices.find((choice) => choice.moveId === input.moveId);
    if (!selectedChoice) {
        return {
            ok: false,
            status: 409,
            body: {
                error: "CHOICE_REJECTED",
                reason: "UNKNOWN_MOVE",
                choiceRequestId: parsed.choiceRequestId,
                state: parsed.state,
                validChoices: playerChoices,
            },
        };
    }

    const aiDecision = chooseNegamonBattleAiActionV3({
        state: parsed.state,
        side: "opponent",
    });

    const resolved = resolveNegamonBattleTurnV3({
        state: parsed.state,
        playerAction: {
            battleId: parsed.state.battleId,
            choiceRequestId: parsed.state.choiceRequestId,
            stateVersion: parsed.state.stateVersion,
            side: "player",
            action: {
                kind: "move",
                moveSlot: selectedChoice.moveSlot,
                targetSlot: selectedChoice.targetSlot,
            },
        },
        opponentAction: aiDecision.action,
    });

    if (!resolved.ok) {
        return {
            ok: false,
            status: 409,
            body: {
                error: resolved.code === "STALE_REQUEST" || resolved.code === "STALE_STATE" ? "STALE_CHOICE" : "CHOICE_REJECTED",
                reason: resolved.code,
                choiceRequestId: resolved.state.choiceRequestId,
                state: resolved.state,
                validChoices: resolved.validChoices,
            },
        };
    }

    const winnerId =
        resolved.state.winner === "player"
            ? input.challengerId
            : resolved.state.winner === "opponent"
              ? input.defenderId
              : null;

    const nextResult: NegamonBattleSessionResultV3 = {
        mode: "negamon_battle",
        engineVersion: "negamon_v3_pokemon_inspired",
        status: resolved.state.phase === "ended" ? "finished" : "active",
        choiceRequestId: resolved.state.choiceRequestId,
        state: resolved.state,
    };

    let final: Record<string, unknown> | null = null;

    if (winnerId) {
        const winnerStudent = await db.student.findFirst({
            where: { id: winnerId, classId: input.classId },
            select: { id: true, name: true, behaviorPoints: true, negamonSkills: true, inventory: true },
        });
        if (!winnerStudent) {
            return { ok: false, status: 404, body: { error: "WINNER_NOT_FOUND" } };
        }
        const winnerPoints = Math.max(0, Math.floor(winnerStudent.behaviorPoints ?? 0));
        const winnerSkills = Array.isArray(winnerStudent.negamonSkills) ? (winnerStudent.negamonSkills as string[]) : [];
        const winnerInventory = Array.isArray(winnerStudent.inventory) ? (winnerStudent.inventory as string[]) : [];
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
        const expReward = Math.floor(
            calculateNegamonBattleExpReward({
                outcome: "win",
                turnCount: resolved.state.turn,
            }) * Math.max(1, winnerCombatantAfterChoice.rewardExpMultiplier ?? 1)
        );
        const pointDelta = Math.ceil(expReward / Math.max(1, Math.floor(negamon.expPerPoint ?? 6)));
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
                const finalResult: NegamonBattleSessionResultV3 = {
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
                        result: toPrismaJson(finalResult),
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
                              canonicalUnlockedSkillIdsBefore: monsterBefore?.unlockedSkillIds ?? [],
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
                            inventory: applyInventoryChangeStrict(winnerInventory, v2RewardPlan.inventoryChange),
                        },
                    });
                }

                const persistedFinalResult: NegamonBattleSessionResultV3 = {
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
                    data: { result: toPrismaJson(persistedFinalResult) },
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
                        idempotencyKey: `battle:${input.sessionId}:negamon-v3:reward`,
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
                            mode: "negamon_battle",
                            engineVersion: "negamon_v3_pokemon_inspired",
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
                result: toPrismaJson(nextResult),
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
            mode: nextResult.mode,
            engineVersion: nextResult.engineVersion,
            choiceRequestId: nextResult.choiceRequestId,
            state: nextResult.state,
            validChoices: nextResult.state.phase === "ended" ? [] : getNegamonBattleValidChoicesV3(nextResult.state, "player"),
            final,
        },
    };
}

export async function startNegamonBattle(
    input: StartNegamonLiteBattleInput
): Promise<NegamonLiteActionResult> {
    return startNegamonBattleV3(input);
}

export async function chooseNegamonBattleMove(
    input: ChooseNegamonLiteMoveInput
): Promise<NegamonLiteActionResult> {
    const existingSession = await db.battleSession.findFirst({
        where: {
            id: input.sessionId,
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
        },
        select: { result: true },
    });
    const existingMode = existingSession ? mapResultToEngineMode(existingSession.result) : null;
    if (existingMode === "lite") {
        return {
            ok: false,
            status: 409,
            body: {
                error: "LEGACY_SESSION_READ_ONLY",
                message: "Legacy negamon-lite sessions are readable but no longer accept production battle actions.",
                sessionMode: "negamon_lite",
            },
        };
    }
    return chooseNegamonBattleMoveV3(input);
}
