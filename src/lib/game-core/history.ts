import type {
    GameHistoryAnalytics,
    GameHistoryEvent,
    GameHistoryEventKind,
    GameHistorySummary,
    GameKind,
} from "./types";

export type CreateGameHistoryEventInput = Omit<GameHistoryEvent, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string | Date;
};

function toIsoString(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : value;
}

export function createGameHistoryEvent(input: CreateGameHistoryEventInput): GameHistoryEvent {
    return {
        ...input,
        id: input.id ?? `${input.gameKind}:${input.studentId}:${input.kind}`,
        createdAt: toIsoString(input.createdAt ?? new Date(0)),
    };
}

export function createGameHistoryId(args: {
    gameKind: GameKind;
    kind: GameHistoryEventKind;
    studentId: string;
    refId: string;
}): string {
    return `game-history:${args.gameKind}:${args.kind}:${args.studentId}:${args.refId}`;
}

export type CreateGameHistorySummaryInput = {
    id: string;
    kind: GameHistoryEventKind;
    gameKind: GameKind;
    studentId: string;
    classId?: string | null;
    opponentId?: string | null;
    winnerId?: string | null;
    goldDelta?: number;
    itemDelta?: number;
    createdAt: string | Date;
    sourceRefId?: string | null;
    titleKey: string;
};

export function createGameHistorySummary(input: CreateGameHistorySummaryInput): GameHistorySummary {
    const outcome =
        input.winnerId && input.winnerId === input.studentId
            ? "win"
            : input.winnerId
              ? "loss"
              : undefined;

    return {
        id: input.id,
        kind: input.kind,
        gameKind: input.gameKind,
        studentId: input.studentId,
        classId: input.classId ?? null,
        opponentId: input.opponentId ?? null,
        winnerId: input.winnerId ?? null,
        outcome,
        goldDelta: Math.trunc(input.goldDelta ?? 0),
        itemDelta: Math.trunc(input.itemDelta ?? 0),
        createdAt: toIsoString(input.createdAt),
        sourceRefId: input.sourceRefId ?? null,
        titleKey: input.titleKey,
    };
}

export function createBattleHistorySummary(input: {
    id: string;
    classId: string;
    studentId: string;
    challengerId: string;
    defenderId: string;
    winnerId?: string | null;
    goldReward?: number | null;
    createdAt: string | Date;
}): GameHistorySummary {
    const opponentId = input.studentId === input.challengerId ? input.defenderId : input.challengerId;
    const won = input.winnerId === input.studentId;

    return createGameHistorySummary({
        id: createGameHistoryId({
            gameKind: "negamon",
            kind: "battle_finished",
            studentId: input.studentId,
            refId: input.id,
        }),
        kind: "battle_finished",
        gameKind: "negamon",
        studentId: input.studentId,
        classId: input.classId,
        opponentId,
        winnerId: input.winnerId ?? null,
        goldDelta: won ? input.goldReward ?? 0 : 0,
        createdAt: input.createdAt,
        sourceRefId: input.id,
        titleKey: "battleHistoryTitle",
    });
}

export type EconomyLedgerHistorySource = {
    id: string;
    studentId: string;
    classId?: string | null;
    source: "quest" | "shop" | "battle" | "passive_gold" | "checkin" | "admin_adjustment" | "migration";
    type: "earn" | "spend" | "adjust";
    amount: number;
    sourceRefId?: string | null;
    createdAt: string | Date;
    metadata?: unknown;
};

function readMetadataString(metadata: unknown, key: string): string | undefined {
    if (!metadata || typeof metadata !== "object") return undefined;
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value : undefined;
}

export function createEconomyLedgerHistorySummary(
    row: EconomyLedgerHistorySource
): GameHistorySummary | null {
    if (row.source !== "quest" && row.source !== "shop") return null;

    const refId = row.sourceRefId ?? row.id;
    const questId = readMetadataString(row.metadata, "questId") ?? refId;
    const itemId = readMetadataString(row.metadata, "itemId") ?? refId;

    if (row.source === "quest") {
        return createGameHistorySummary({
            id: createGameHistoryId({
                gameKind: "quest",
                kind: "quest_claimed",
                studentId: row.studentId,
                refId: questId,
            }),
            kind: "quest_claimed",
            gameKind: "quest",
            studentId: row.studentId,
            classId: row.classId ?? null,
            goldDelta: row.amount,
            createdAt: row.createdAt,
            sourceRefId: refId,
            titleKey: "questClaimedHistoryTitle",
        });
    }

    return createGameHistorySummary({
        id: createGameHistoryId({
            gameKind: "shop",
            kind: "shop_purchase",
            studentId: row.studentId,
            refId: itemId,
        }),
        kind: "shop_purchase",
        gameKind: "shop",
        studentId: row.studentId,
        classId: row.classId ?? null,
        goldDelta: row.amount,
        itemDelta: row.type === "spend" ? 1 : 0,
        createdAt: row.createdAt,
        sourceRefId: refId,
        titleKey: "shopPurchaseHistoryTitle",
    });
}

export function aggregateGameHistoryAnalytics(summaries: GameHistorySummary[]): GameHistoryAnalytics {
    const analytics: GameHistoryAnalytics = {
        totalEvents: summaries.length,
        wins: 0,
        losses: 0,
        goldEarned: 0,
        goldSpent: 0,
        itemsGranted: 0,
        byGameKind: {},
        byStudent: {},
    };

    for (const summary of summaries) {
        if (summary.outcome === "win") analytics.wins += 1;
        if (summary.outcome === "loss") analytics.losses += 1;
        if (summary.goldDelta > 0) analytics.goldEarned += summary.goldDelta;
        if (summary.goldDelta < 0) analytics.goldSpent += Math.abs(summary.goldDelta);
        if (summary.itemDelta > 0) analytics.itemsGranted += summary.itemDelta;
        analytics.byGameKind[summary.gameKind] = (analytics.byGameKind[summary.gameKind] ?? 0) + 1;
        analytics.byStudent[summary.studentId] = (analytics.byStudent[summary.studentId] ?? 0) + 1;
    }

    return analytics;
}
