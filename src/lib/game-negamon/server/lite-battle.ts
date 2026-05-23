import { db } from "@/lib/db";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { createGameEconomyMutation } from "@/lib/game-core";
import {
    getNegamonBattleValidChoices,
    resolveNegamonBattleChoice,
} from "@/lib/game-negamon/core/battle-engine-v2";
import {
    createNegamonLiteBattleState,
    createNegamonLiteChoiceRequestId,
    parseNegamonLiteSessionResult,
    type NegamonLiteSessionResult,
} from "@/lib/negamon-lite/session";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";
import { resolveBattleRewardPayout } from "@/lib/services/student-economy/battle-reward-policy";

const NEGAMON_LITE_BASE_GOLD_REWARD = 30;

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
        select: { id: true, name: true, behaviorPoints: true },
    });
    if (!challenger) return { ok: false, status: 403, body: { error: "FORBIDDEN" } };

    const defender = await db.student.findFirst({
        where: { id: input.defenderId, classId: input.classId },
        select: { id: true, name: true, behaviorPoints: true },
    });
    if (!defender) return { ok: false, status: 404, body: { error: "DEFENDER_NOT_FOUND" } };

    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) {
        return { ok: false, status: 400, body: { error: "NEGAMON_DISABLED" } };
    }

    const placeholderBattleId = `negamon-lite:${input.classId}:${input.challengerId}:${input.defenderId}`;
    const state = createNegamonLiteBattleState({
        battleId: placeholderBattleId,
        classId: input.classId,
        challenger,
        defender,
        levelConfig: classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
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
            challengerBattleItems: [],
            defenderBattleItems: [],
        },
    });

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

    const session = await db.battleSession.findFirst({
        where: {
            id: input.sessionId,
            classId: input.classId,
            challengerId: input.challengerId,
            defenderId: input.defenderId,
            interactivePending: true,
        },
    });
    if (!session) return { ok: false, status: 404, body: { error: "SESSION_NOT_FOUND" } };

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
          }
        | null = null;

    if (winnerId) {
        try {
            final = await db.$transaction(async (tx) => {
                const requestedGoldReward = NEGAMON_LITE_BASE_GOLD_REWARD;
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
