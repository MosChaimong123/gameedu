import { createBattleHistorySummary, type GameHistorySummary, type GameRewardResult } from "@/lib/game-core";
import type { NegamonProgressionPersistencePlan } from "@/lib/game-negamon/server/progression";
import type { NegamonBattleSideV3, NegamonBattleStateV3, NegamonBattleValidChoiceV3 } from "./state";
import { getNegamonBattleValidChoicesV3 } from "./engine";

export type NegamonBattleSessionResultV3 = {
    mode: "negamon_battle";
    engineVersion: "negamon_v3_pokemon_inspired";
    status: "active" | "finished";
    choiceRequestId: string;
    state: NegamonBattleStateV3;
    winnerId?: string;
    requestedGoldReward?: number;
    goldReward?: number;
    rewardBlockedReason?: "daily_cap" | "pair_cooldown" | null;
    rewardPolicy?: unknown;
    rewardIdempotencyKey?: string;
    reward?: GameRewardResult;
    progression?: NegamonProgressionPersistencePlan | null;
    historyEvents?: unknown[];
};

export type NegamonBattleSessionRecordV3 = {
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

export type NegamonBattleSessionFinalViewV3 = {
    winnerId: string;
    requestedGoldReward: number;
    goldReward: number;
    rewardBlockedReason: "daily_cap" | "pair_cooldown" | null;
    rewardIdempotencyKey?: string;
    reward?: GameRewardResult;
    progression?: NegamonProgressionPersistencePlan | null;
    historyEvents?: unknown[];
};

export type NegamonBattleSessionViewV3 = {
    mode: "negamon_battle";
    engineVersion: "negamon_v3_pokemon_inspired";
    sessionId: string;
    classId: string;
    challengerId: string;
    defenderId: string;
    status: NegamonBattleSessionResultV3["status"];
    choiceRequestId: string;
    state: NegamonBattleStateV3;
    validChoices: NegamonBattleValidChoiceV3[];
    final: NegamonBattleSessionFinalViewV3 | null;
    interactivePending: boolean;
    stateVersion: number;
    createdAt: string;
};

export function parseNegamonBattleSessionResultV3(raw: unknown): NegamonBattleSessionResultV3 | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Partial<NegamonBattleSessionResultV3>;
    if (value.mode !== "negamon_battle") return null;
    if (value.engineVersion !== "negamon_v3_pokemon_inspired") return null;
    if (value.status !== "active" && value.status !== "finished") return null;
    if (!value.choiceRequestId || typeof value.choiceRequestId !== "string") return null;
    if (!value.state || typeof value.state !== "object") return null;
    return value as NegamonBattleSessionResultV3;
}

export function createNegamonBattleSessionViewV3(
    record: NegamonBattleSessionRecordV3,
    options: { viewerSide?: NegamonBattleSideV3 | null } = {}
): NegamonBattleSessionViewV3 | null {
    const result = parseNegamonBattleSessionResultV3(record.result);
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
        mode: "negamon_battle",
        engineVersion: "negamon_v3_pokemon_inspired",
        sessionId: record.id,
        classId: record.classId,
        challengerId: record.challengerId,
        defenderId: record.defenderId,
        status: result.status,
        choiceRequestId: result.choiceRequestId,
        state: result.state,
        validChoices:
            result.status === "active" && options.viewerSide
                ? getNegamonBattleValidChoicesV3(result.state, options.viewerSide)
                : [],
        final,
        interactivePending: record.interactivePending,
        stateVersion: record.stateVersion,
        createdAt: record.createdAt.toISOString(),
    };
}

export function createNegamonBattleSessionHistorySummaryV3(input: {
    view: NegamonBattleSessionViewV3;
    studentId: string;
}): GameHistorySummary | null {
    if (input.view.status !== "finished") return null;
    const winnerId =
        input.view.final?.winnerId ??
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
