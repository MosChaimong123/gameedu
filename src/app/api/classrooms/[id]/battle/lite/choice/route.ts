import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getValidChoices, resolveChoice } from "@/lib/negamon-lite";
import {
    createNegamonLiteChoiceRequestId,
    parseNegamonLiteSessionResult,
    type NegamonLiteSessionResult,
} from "@/lib/negamon-lite/session";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";
import { resolveBattleRewardPayout } from "@/lib/services/student-economy/battle-reward-policy";

const NEGAMON_LITE_BASE_GOLD_REWARD = 30;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    const body = (await req.json()) as {
        challengerId?: string;
        defenderId?: string;
        studentCode?: string;
        sessionId?: string;
        choiceRequestId?: string;
        moveId?: string;
    };

    const challengerId = body.challengerId?.trim();
    const defenderId = body.defenderId?.trim();
    const studentCode = body.studentCode?.trim();
    const sessionId = body.sessionId?.trim();
    const choiceRequestId = body.choiceRequestId?.trim();
    const moveId = body.moveId?.trim();

    if (!challengerId || !defenderId || !studentCode || !sessionId || !choiceRequestId || !moveId) {
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const challenger = await db.student.findFirst({
        where: { id: challengerId, classId, loginCode: studentCode },
        select: { id: true },
    });
    if (!challenger) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const session = await db.battleSession.findFirst({
        where: {
            id: sessionId,
            classId,
            challengerId,
            defenderId,
            interactivePending: true,
        },
    });
    if (!session) return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });

    const parsed = parseNegamonLiteSessionResult(session.result);
    if (!parsed || parsed.status !== "active") {
        return NextResponse.json({ error: "INVALID_SESSION_STATE" }, { status: 409 });
    }

    if (parsed.choiceRequestId !== choiceRequestId) {
        return NextResponse.json(
            {
                error: "STALE_CHOICE",
                choiceRequestId: parsed.choiceRequestId,
                validChoices: getValidChoices(parsed.state, "player"),
            },
            { status: 409 }
        );
    }

    const resolved = resolveChoice(parsed.state, {
        side: "player",
        kind: "move",
        moveId,
    });

    if (!resolved.accepted) {
        return NextResponse.json(
            {
                error: "CHOICE_REJECTED",
                reason: resolved.reason,
                choiceRequestId: parsed.choiceRequestId,
                state: resolved.state,
                validChoices: getValidChoices(resolved.state, "player"),
            },
            { status: 409 }
        );
    }

    const winnerId =
        resolved.state.winner === "player"
            ? challengerId
            : resolved.state.winner === "opponent"
              ? defenderId
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
                    classId,
                    winnerId,
                    challengerId,
                    defenderId,
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
                        id: sessionId,
                        classId,
                        challengerId,
                        defenderId,
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
                    const balanceBefore = updatedWinner.gold - rewardPolicy.goldReward;
                    await recordEconomyTransaction(tx, {
                        studentId: winnerId,
                        classId,
                        type: "earn",
                        source: "battle",
                        amount: rewardPolicy.goldReward,
                        balanceBefore,
                        balanceAfter: updatedWinner.gold,
                        sourceRefId: sessionId,
                        idempotencyKey: `battle:${sessionId}:negamon-lite:reward`,
                        metadata: {
                            mode: "negamon_lite",
                            winnerId,
                            challengerId,
                            defenderId,
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
                return NextResponse.json({ error: "CHOICE_CONFLICT" }, { status: 409 });
            }
            throw error;
        }
    } else {
        const saved = await db.battleSession.updateMany({
            where: {
                id: sessionId,
                classId,
                challengerId,
                defenderId,
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
            return NextResponse.json({ error: "CHOICE_CONFLICT" }, { status: 409 });
        }
    }

    return NextResponse.json({
        choiceRequestId: nextResult.choiceRequestId,
        state: nextResult.state,
        validChoices: resolved.state.phase === "ended" ? [] : getValidChoices(resolved.state, "player"),
        final,
    });
}
