import { createBattleHistorySummary, type GameHistorySummary } from "@/lib/game-core";
import type { NegamonBattleChoiceV4, NegamonBattleSideV4, NegamonBattleStateV4 } from "../engine-showdown";

export type NegamonBattleSessionResultV4 = {
    mode: "negamon_battle_v4";
    engineVersion: "negamon_v4_showdown_adapter";
    status: "active" | "finished";
    choiceRequestId: string;
    state: NegamonBattleStateV4;
    winnerId?: string;
    goldReward?: number;
};

export type NegamonBattleSessionRecordV4 = {
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

export type NegamonBattleSessionViewV4 = {
    mode: "negamon_battle_v4";
    engineVersion: "negamon_v4_showdown_adapter";
    sessionId: string;
    classId: string;
    challengerId: string;
    defenderId: string;
    status: NegamonBattleSessionResultV4["status"];
    choiceRequestId: string;
    state: NegamonBattleStateV4;
    validChoices: NegamonBattleChoiceV4[];
    final: {
        winnerId: string;
        goldReward: number;
    } | null;
    interactivePending: boolean;
    stateVersion: number;
    createdAt: string;
};

export function parseNegamonBattleSessionResultV4(raw: unknown): NegamonBattleSessionResultV4 | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Partial<NegamonBattleSessionResultV4>;
    if (value.mode !== "negamon_battle_v4") return null;
    if (value.engineVersion !== "negamon_v4_showdown_adapter") return null;
    if (value.status !== "active" && value.status !== "finished") return null;
    if (!value.choiceRequestId || typeof value.choiceRequestId !== "string") return null;
    if (!value.state || typeof value.state !== "object") return null;
    return value as NegamonBattleSessionResultV4;
}

export function getNegamonBattleViewerSideV4(
    session: { challengerId: string; defenderId: string },
    studentId?: string | null
): NegamonBattleSideV4 | null {
    if (!studentId) return null;
    if (session.challengerId === studentId) return "player";
    if (session.defenderId === studentId) return "opponent";
    return null;
}

export function createNegamonBattleSessionViewV4(
    record: NegamonBattleSessionRecordV4,
    options: { viewerSide?: NegamonBattleSideV4 | null } = {}
): NegamonBattleSessionViewV4 | null {
    const result = parseNegamonBattleSessionResultV4(record.result);
    if (!result) return null;

    return {
        mode: "negamon_battle_v4",
        engineVersion: "negamon_v4_showdown_adapter",
        sessionId: record.id,
        classId: record.classId,
        challengerId: record.challengerId,
        defenderId: record.defenderId,
        status: result.status,
        choiceRequestId: result.choiceRequestId,
        state: result.state,
        validChoices:
            result.status === "active" && options.viewerSide
                ? result.state.choices[options.viewerSide].map((choice) => ({
                      ...choice,
                      cost: choice.cost ? { ...choice.cost } : undefined,
                  }))
                : [],
        final:
            result.winnerId || record.winnerId
                ? {
                      winnerId: result.winnerId ?? record.winnerId ?? "",
                      goldReward: result.goldReward ?? record.goldReward,
                  }
                : null,
        interactivePending: record.interactivePending,
        stateVersion: record.stateVersion,
        createdAt: record.createdAt.toISOString(),
    };
}

export function createNegamonBattleSessionHistorySummaryV4(input: {
    view: NegamonBattleSessionViewV4;
    studentId: string;
}): GameHistorySummary | null {
    if (input.view.status !== "finished") return null;

    return createBattleHistorySummary({
        id: input.view.sessionId,
        classId: input.view.classId,
        studentId: input.studentId,
        challengerId: input.view.challengerId,
        defenderId: input.view.defenderId,
        winnerId: input.view.final?.winnerId ?? null,
        goldReward: input.view.final?.goldReward ?? 0,
        createdAt: input.view.createdAt,
    });
}
