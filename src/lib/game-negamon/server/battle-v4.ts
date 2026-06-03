import { db } from "@/lib/db";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { toPrismaJson } from "@/lib/prisma-json";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import {
    createNegamonShowdownBattleAdapter,
    resolveNegamonBattleTimeoutWinner,
    type NegamonBattleChoiceV4,
    type NegamonBattleStateV4,
} from "@/lib/game-negamon/engine-showdown";
import { normalizeStudentBattleKit } from "@/lib/shop-item-migration";
import { parseNegamonBattleSessionResultV4, type NegamonBattleSessionResultV4 } from "../core/session-v4";
import { finalizeNegamonBattleV4Completion } from "./battle-v4-completion";

export const NEGAMON_BATTLE_TIMEOUT_HOURS = 24;

export type StartNegamonBattleV4Input = {
    classId: string;
    challengerId: string;
    defenderId: string;
    studentCode: string;
    seed?: number;
};

export type ChooseNegamonBattleMoveV4Input = StartNegamonBattleV4Input & {
    sessionId: string;
    choiceRequestId: string;
    moveId: string;
    moveSlot?: number;
    itemId?: string;
};

export type NegamonBattleActionResultV4 =
    | { ok: false; status: 400 | 403 | 404 | 409; body: Record<string, unknown> }
    | { ok: true; body: Record<string, unknown> };

function resolvePreferredStudentDisplayName(input: {
    nickname?: string | null;
    name?: string | null;
}): string | undefined {
    const nickname = input.nickname?.trim();
    if (nickname) return nickname;
    const name = input.name?.trim();
    if (name) return name;
    return undefined;
}

function findSelectedChoice(
    choices: NegamonBattleChoiceV4[],
    input: { moveId?: string; moveSlot?: number }
) {
    return choices.find((choice) => {
        if (typeof input.moveSlot === "number" && choice.moveSlot === input.moveSlot) return true;
        if (input.moveId && choice.moveId === input.moveId) return true;
        return false;
    });
}

export async function startNegamonBattleV4(
    input: StartNegamonBattleV4Input
): Promise<NegamonBattleActionResultV4> {
    if (!input.challengerId || !input.defenderId || !input.studentCode || input.challengerId === input.defenderId) {
        return { ok: false, status: 400, body: { error: "INVALID_REQUEST" } };
    }

    const classroom = await db.classroom.findUnique({
        where: { id: input.classId },
        select: { id: true, gamifiedSettings: true, levelConfig: true },
    });
    if (!classroom) return { ok: false, status: 404, body: { error: "NOT_FOUND" } };

    const challenger = await db.student.findFirst({
        where: { id: input.challengerId, classId: input.classId, loginCode: input.studentCode },
        select: { id: true, name: true, nickname: true, behaviorPoints: true, inventory: true, battleLoadout: true, negamonSkills: true, negamonSkillLoadout: true },
    });
    if (!challenger) return { ok: false, status: 403, body: { error: "FORBIDDEN" } };

    const defender = await db.student.findFirst({
        where: { id: input.defenderId, classId: input.classId },
        select: { id: true, name: true, nickname: true, behaviorPoints: true, inventory: true, battleLoadout: true, negamonSkills: true, negamonSkillLoadout: true },
    });
    if (!defender) return { ok: false, status: 404, body: { error: "DEFENDER_NOT_FOUND" } };

    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) return { ok: false, status: 400, body: { error: "NEGAMON_DISABLED" } };

    const challengerBattleKit = normalizeStudentBattleKit({
        inventory: challenger.inventory,
        battleLoadout: challenger.battleLoadout,
    });
    const defenderBattleKit = normalizeStudentBattleKit({
        inventory: defender.inventory,
        battleLoadout: defender.battleLoadout,
    });

    const player = createNegamonMonsterSnapshot({
        studentId: challenger.id,
        studentName: resolvePreferredStudentDisplayName(challenger),
        points: challenger.behaviorPoints,
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
        equippedSkillIds:
            Array.isArray(challenger.negamonSkillLoadout) && challenger.negamonSkillLoadout.length > 0
                ? (challenger.negamonSkillLoadout as string[])
                : undefined,
        equippedItemIds: challengerBattleKit.battleLoadout,
    });
    const opponent = createNegamonMonsterSnapshot({
        studentId: defender.id,
        studentName: resolvePreferredStudentDisplayName(defender),
        points: defender.behaviorPoints,
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
        equippedSkillIds:
            Array.isArray(defender.negamonSkillLoadout) && defender.negamonSkillLoadout.length > 0
                ? (defender.negamonSkillLoadout as string[])
                : undefined,
        equippedItemIds: defenderBattleKit.battleLoadout,
    });

    if (!player || !opponent) {
        return { ok: false, status: 400, body: { error: "NO_MONSTER" } };
    }

    const adapter = createNegamonShowdownBattleAdapter();
    const state = await adapter.createBattle({
        battleId: `negamon-v4:${input.classId}:${input.challengerId}:${input.defenderId}`,
        seed: typeof input.seed === "number" && Number.isFinite(input.seed) ? input.seed : Date.now(),
        player,
        opponent,
    });

    const session = await db.battleSession.create({
        data: {
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
            result: toPrismaJson({
                mode: "negamon_battle_v4",
                engineVersion: "negamon_v4_showdown_adapter",
                status: "active",
                choiceRequestId: state.choiceRequestId,
                state,
            } satisfies NegamonBattleSessionResultV4),
            winnerId: null,
            goldReward: 0,
            interactivePending: true,
        },
    });

    const savedState = {
        ...state,
        battleId: session.id,
        choiceRequestId: `${session.id}:v4:${state.stateVersion}:${state.turn}`,
    };
    const result: NegamonBattleSessionResultV4 = {
        mode: "negamon_battle_v4",
        engineVersion: "negamon_v4_showdown_adapter",
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
            validChoices: result.state.choices.player,
            diagnostics: result.state.metadata.showdown.choiceDiagnostics.player,
        },
    };
}

export async function chooseNegamonBattleMoveV4(
    input: ChooseNegamonBattleMoveV4Input
): Promise<NegamonBattleActionResultV4> {
    if (!input.challengerId || !input.defenderId || !input.studentCode || !input.sessionId || !input.choiceRequestId) {
        return { ok: false, status: 400, body: { error: "INVALID_REQUEST" } };
    }

    const challenger = await db.student.findFirst({
        where: { id: input.challengerId, classId: input.classId, loginCode: input.studentCode },
        select: { id: true },
    });
    if (!challenger) return { ok: false, status: 403, body: { error: "FORBIDDEN" } };

    const session = await db.battleSession.findFirst({
        where: {
            id: input.sessionId,
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
        },
        select: {
            id: true,
            classId: true,
            challengerId: true,
            defenderId: true,
            winnerId: true,
            goldReward: true,
            interactivePending: true,
            stateVersion: true,
            createdAt: true,
            result: true,
        },
    });
    if (!session) return { ok: false, status: 404, body: { error: "SESSION_NOT_FOUND" } };

    const parsed = parseNegamonBattleSessionResultV4(session.result);
    if (!parsed) return { ok: false, status: 409, body: { error: "INVALID_SESSION_STATE" } };
    if (parsed.status === "finished") {
        const challengerFinal = parsed.participantResults?.challenger;
        return {
            ok: true,
            body: {
                mode: parsed.mode,
                engineVersion: parsed.engineVersion,
                choiceRequestId: parsed.choiceRequestId,
                state: parsed.state,
                validChoices: [],
                final: {
                    winnerId: parsed.winnerId ?? session.winnerId,
                    loserId: parsed.loserId,
                    requestedGoldReward:
                        challengerFinal?.requestedGoldReward ?? parsed.requestedGoldReward ?? parsed.goldReward ?? session.goldReward,
                    goldReward: challengerFinal?.goldReward ?? parsed.goldReward ?? session.goldReward,
                    rewardBlockedReason: challengerFinal?.rewardBlockedReason ?? parsed.rewardBlockedReason ?? null,
                    rewardIdempotencyKey: challengerFinal?.rewardIdempotencyKey ?? parsed.rewardIdempotencyKey,
                    reward: challengerFinal?.reward ?? parsed.reward,
                    progression: challengerFinal?.progression ?? parsed.progression ?? null,
                },
            },
        };
    }
    const BATTLE_TIMEOUT_MS = NEGAMON_BATTLE_TIMEOUT_HOURS * 60 * 60 * 1000;
    const battleAgeMs = Date.now() - session.createdAt.getTime();
    if (battleAgeMs > BATTLE_TIMEOUT_MS && parsed.state.phase !== "ended") {
        const timeoutWinnerId = resolveNegamonBattleTimeoutWinner({
            playerHp: parsed.state.sides.player.hp,
            playerMaxHp: parsed.state.sides.player.maxHp,
            opponentHp: parsed.state.sides.opponent.hp,
            opponentMaxHp: parsed.state.sides.opponent.maxHp,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
        });

        const [classroom, students] = await Promise.all([
            db.classroom.findUnique({
                where: { id: session.classId },
                select: { id: true, gamifiedSettings: true, levelConfig: true },
            }),
            db.student.findMany({
                where: { id: { in: [session.challengerId, session.defenderId] }, classId: session.classId },
                select: {
                    id: true,
                    name: true,
                    nickname: true,
                    behaviorPoints: true,
                    gold: true,
                    inventory: true,
                    battleLoadout: true,
                    negamonSkills: true,
                    negamonSkillLoadout: true,
                },
            }),
        ]);

        if (classroom) {
            const timeoutChallenger = students.find((s) => s.id === session.challengerId);
            const timeoutDefender = students.find((s) => s.id === session.defenderId);
            if (timeoutChallenger && timeoutDefender) {
                const timeoutState = {
                    ...parsed.state,
                    phase: "ended" as const,
                    winner:
                        timeoutWinnerId === input.challengerId
                            ? ("player" as const)
                            : timeoutWinnerId === input.defenderId
                              ? ("opponent" as const)
                              : undefined,
                };
                const timeoutCompletion = await finalizeNegamonBattleV4Completion({
                    db,
                    session: {
                        id: session.id,
                        classId: session.classId,
                        challengerId: session.challengerId,
                        defenderId: session.defenderId,
                        createdAt: session.createdAt,
                    },
                    classroom: {
                        ...classroom,
                        levelConfig: classroom.levelConfig as LevelConfigInput,
                    },
                    challenger: timeoutChallenger,
                    defender: timeoutDefender,
                    state: timeoutState,
                    finishReason: "timeout",
                });
                const timeoutResult = {
                    mode: "negamon_battle_v4" as const,
                    engineVersion: "negamon_v4_showdown_adapter" as const,
                    status: "finished" as const,
                    choiceRequestId: parsed.state.choiceRequestId,
                    state: timeoutState,
                    winnerId: timeoutWinnerId ?? undefined,
                    goldReward: timeoutCompletion.result.goldReward ?? 0,
                    ...timeoutCompletion.result,
                };
                await db.battleSession.update({
                    where: { id: session.id },
                    data: {
                        result: toPrismaJson(timeoutResult),
                        winnerId: timeoutWinnerId ?? null,
                        goldReward: timeoutCompletion.result.goldReward ?? 0,
                        interactivePending: false,
                        stateVersion: { increment: 1 },
                    },
                });
                const challengerFinal = timeoutCompletion.result.participantResults?.challenger;
                return {
                    ok: true,
                    body: {
                        mode: timeoutResult.mode,
                        engineVersion: timeoutResult.engineVersion,
                        choiceRequestId: timeoutResult.choiceRequestId,
                        state: timeoutState,
                        validChoices: [],
                        final: {
                            winnerId: timeoutWinnerId,
                            loserId: timeoutCompletion.result.loserId,
                            requestedGoldReward:
                                challengerFinal?.requestedGoldReward ?? timeoutCompletion.result.requestedGoldReward ?? 0,
                            goldReward: challengerFinal?.goldReward ?? timeoutCompletion.result.goldReward ?? 0,
                            rewardBlockedReason:
                                challengerFinal?.rewardBlockedReason ?? timeoutCompletion.result.rewardBlockedReason ?? null,
                            rewardIdempotencyKey:
                                challengerFinal?.rewardIdempotencyKey ?? timeoutCompletion.result.rewardIdempotencyKey,
                            reward: challengerFinal?.reward ?? timeoutCompletion.result.reward,
                            progression: challengerFinal?.progression ?? timeoutCompletion.result.progression ?? null,
                        },
                    },
                };
            }
        }
    }

    if (parsed.choiceRequestId !== input.choiceRequestId) {
        return {
            ok: false,
            status: 409,
            body: {
                error: "STALE_CHOICE",
                choiceRequestId: parsed.choiceRequestId,
                state: parsed.state,
                validChoices: parsed.state.choices.player,
                diagnostics: parsed.state.metadata.showdown.choiceDiagnostics.player,
            },
        };
    }

    const selectedChoice = input.itemId
        ? null
        : findSelectedChoice(parsed.state.choices.player, {
        moveId: input.moveId,
        moveSlot: input.moveSlot,
    });
    if (!input.itemId && !selectedChoice) {
        return {
            ok: false,
            status: 409,
            body: {
                error: "CHOICE_REJECTED",
                reason: "INVALID_TARGET",
                choiceRequestId: parsed.choiceRequestId,
                state: parsed.state,
                validChoices: parsed.state.choices.player,
                diagnostics: parsed.state.metadata.showdown.choiceDiagnostics.player,
            },
        };
    }
    if (selectedChoice && !selectedChoice.enabled) {
        return {
            ok: false,
            status: 409,
            body: {
                error: "CHOICE_REJECTED",
                reason: selectedChoice.reason ?? "INVALID_ACTION",
                selectedChoice,
                choiceRequestId: parsed.choiceRequestId,
                state: parsed.state,
                validChoices: parsed.state.choices.player,
                diagnostics: parsed.state.metadata.showdown.choiceDiagnostics.player,
            },
        };
    }

    const adapter = createNegamonShowdownBattleAdapter();
    const resolved = await adapter.resolveTurn({
        state: parsed.state,
        playerAction: input.itemId
            ? {
                  actorSide: "player",
                  kind: "item",
                  itemId: input.itemId,
                  targetSide: "player",
              }
            : {
                  actorSide: "player",
                  kind: "move",
                  moveId: selectedChoice?.moveId,
                  moveSlot: selectedChoice?.moveSlot,
                  targetSide: selectedChoice?.targetSide,
              },
    });
    if (!resolved.ok) {
        return {
            ok: false,
            status: 409,
            body: {
                error: resolved.code ?? "CHOICE_REJECTED",
                state: resolved.state,
                validChoices: resolved.validChoices,
                diagnostics: resolved.state.metadata.showdown.choiceDiagnostics.player,
            },
        };
    }

    const winnerId =
        resolved.state.winner === "player"
            ? input.challengerId
            : resolved.state.winner === "opponent"
              ? input.defenderId
              : undefined;

    let nextResult: NegamonBattleSessionResultV4 = {
        mode: "negamon_battle_v4",
        engineVersion: "negamon_v4_showdown_adapter",
        status: resolved.state.phase === "ended" ? "finished" : "active",
        choiceRequestId: resolved.state.choiceRequestId,
        state: resolved.state,
        winnerId,
        goldReward: 0,
    };

    let finalGoldReward = 0;
    if (resolved.state.phase === "ended") {
        await db.$transaction(async (tx) => {
            const [classroom, students] = await Promise.all([
                tx.classroom.findUnique({
                    where: { id: session.classId },
                    select: { id: true, gamifiedSettings: true, levelConfig: true },
                }),
                tx.student.findMany({
                    where: { id: { in: [session.challengerId, session.defenderId] }, classId: session.classId },
                    select: {
                        id: true,
                        name: true,
                        nickname: true,
                        behaviorPoints: true,
                        gold: true,
                        inventory: true,
                        battleLoadout: true,
                        negamonSkills: true,
                        negamonSkillLoadout: true,
                    },
                }),
            ]);

            if (!classroom) {
                throw new Error("CLASSROOM_NOT_FOUND");
            }

            const challenger = students.find((student) => student.id === session.challengerId);
            const defender = students.find((student) => student.id === session.defenderId);
            if (!challenger || !defender) {
                throw new Error("BATTLE_V4_STUDENT_NOT_FOUND");
            }

            const completion = await finalizeNegamonBattleV4Completion({
                db: tx,
                session: {
                    id: session.id,
                    classId: session.classId,
                    challengerId: session.challengerId,
                    defenderId: session.defenderId,
                    createdAt: session.createdAt,
                },
                classroom: {
                    ...classroom,
                    gamifiedSettings: classroom.gamifiedSettings,
                    levelConfig: classroom.levelConfig as LevelConfigInput,
                },
                challenger,
                defender,
                state: resolved.state,
                finishReason: "battle_end",
            });

            nextResult = {
                ...nextResult,
                ...completion.result,
            };
            finalGoldReward = completion.result.goldReward ?? 0;

            await tx.battleSession.update({
                where: { id: session.id },
                data: {
                    result: toPrismaJson(nextResult),
                    winnerId: completion.result.winnerId ?? null,
                    goldReward: finalGoldReward,
                    interactivePending: false,
                    stateVersion: { increment: 1 },
                },
            });
        });
    } else {
        await db.battleSession.update({
            where: { id: session.id },
            data: {
                result: toPrismaJson(nextResult),
                winnerId: winnerId ?? null,
                goldReward: 0,
                interactivePending: true,
                stateVersion: { increment: 1 },
            },
        });
    }

    return {
        ok: true,
        body: {
            mode: nextResult.mode,
            engineVersion: nextResult.engineVersion,
            choiceRequestId: nextResult.choiceRequestId,
            state: nextResult.state,
            validChoices: nextResult.state.phase === "ended" ? [] : nextResult.state.choices.player,
            diagnostics: nextResult.state.metadata.showdown.choiceDiagnostics.player,
            final: winnerId
                ? {
                      winnerId,
                      loserId: nextResult.loserId,
                      requestedGoldReward:
                          nextResult.participantResults?.challenger.requestedGoldReward ??
                          nextResult.requestedGoldReward ??
                          finalGoldReward,
                      goldReward:
                          nextResult.participantResults?.challenger.goldReward ?? finalGoldReward,
                      rewardBlockedReason:
                          nextResult.participantResults?.challenger.rewardBlockedReason ??
                          nextResult.rewardBlockedReason ??
                          null,
                      rewardIdempotencyKey:
                          nextResult.participantResults?.challenger.rewardIdempotencyKey ??
                          nextResult.rewardIdempotencyKey,
                      reward: nextResult.participantResults?.challenger.reward ?? nextResult.reward,
                      progression:
                          nextResult.participantResults?.challenger.progression ??
                          nextResult.progression ??
                          null,
                  }
                : null,
        },
    };
}
