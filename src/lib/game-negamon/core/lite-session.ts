import { getValidChoices } from "@/lib/negamon-lite";
import { createBattleHistorySummary, type GameHistoryEvent, type GameHistorySummary, type GameRewardResult } from "@/lib/game-core";
import type { NegamonProgressionPersistencePlan } from "@/lib/game-negamon/server/progression";
import {
    parseNegamonLiteSessionResult,
    type NegamonLiteSessionResult,
} from "@/lib/negamon-lite/session";
import type {
    NegamonLiteBattleSide,
    NegamonLiteBattleState,
    NegamonLiteValidChoice,
} from "@/lib/negamon-lite";

export type NegamonLiteBattleSessionRecord = {
    id: string;
    classId: string;
    challengerId: string;
    defenderId: string;
    winnerId: string | null;
    goldReward: number;
    interactivePending: boolean;
    stateVersion: number;
    createdAt: Date;
    result: unknown;
};

export type NegamonLiteSessionFinalView = {
    winnerId: string;
    requestedGoldReward: number;
    goldReward: number;
    rewardBlockedReason: "daily_cap" | "pair_cooldown" | null;
    rewardIdempotencyKey?: string;
    reward?: GameRewardResult;
    progression?: NegamonProgressionPersistencePlan | null;
    historyEvents?: GameHistoryEvent[];
};

export type NegamonLiteSessionView = {
    mode: "negamon_lite";
    sessionId: string;
    classId: string;
    challengerId: string;
    defenderId: string;
    status: NegamonLiteSessionResult["status"];
    choiceRequestId: string;
    state: NegamonLiteBattleState;
    validChoices: NegamonLiteValidChoice[];
    final: NegamonLiteSessionFinalView | null;
    interactivePending: boolean;
    stateVersion: number;
    createdAt: string;
};

export function getNegamonLiteViewerSide(
    record: Pick<NegamonLiteBattleSessionRecord, "challengerId" | "defenderId">,
    studentId?: string | null
): NegamonLiteBattleSide | null {
    if (!studentId) return null;
    if (studentId === record.challengerId) return "player";
    if (studentId === record.defenderId) return "opponent";
    return null;
}

export function createNegamonLiteSessionView(
    record: NegamonLiteBattleSessionRecord,
    options: { viewerSide?: NegamonLiteBattleSide | null } = {}
): NegamonLiteSessionView | null {
    const result = parseNegamonLiteSessionResult(record.result);
    if (!result) return null;

    const final =
        result.winnerId || record.winnerId
            ? {
                  winnerId: result.winnerId ?? record.winnerId ?? "",
                  requestedGoldReward: result.requestedGoldReward ?? record.goldReward,
                  goldReward: result.goldReward ?? record.goldReward,
                  rewardBlockedReason: result.rewardBlockedReason ?? null,
                  rewardIdempotencyKey: result.rewardIdempotencyKey,
                  reward: result.reward,
                  progression: result.progression ?? null,
                  historyEvents: result.historyEvents ?? [],
              }
            : null;

    return {
        mode: "negamon_lite",
        sessionId: record.id,
        classId: record.classId,
        challengerId: record.challengerId,
        defenderId: record.defenderId,
        status: result.status,
        choiceRequestId: result.choiceRequestId,
        state: result.state,
        validChoices:
            result.status === "active" && options.viewerSide
                ? getValidChoices(result.state, options.viewerSide)
                : [],
        final,
        interactivePending: record.interactivePending,
        stateVersion: record.stateVersion,
        createdAt: record.createdAt.toISOString(),
    };
}

export function createNegamonLiteSessionHistorySummary(input: {
    view: NegamonLiteSessionView;
    studentId: string;
}): GameHistorySummary | null {
    if (input.view.status !== "finished") return null;
    const winnerId = input.view.final?.winnerId ??
        (input.view.state.winner ? input.view.state.sides[input.view.state.winner].id : null);

    return createBattleHistorySummary({
        id: input.view.sessionId,
        classId: input.view.classId,
        studentId: input.studentId,
        challengerId: input.view.challengerId,
        defenderId: input.view.defenderId,
        winnerId,
        goldReward: input.view.final?.goldReward ?? 0,
        createdAt: input.view.createdAt,
    });
}
