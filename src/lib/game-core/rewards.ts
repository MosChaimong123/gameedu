import type { GameKind, GameRewardBlockedReason, GameRewardResult } from "./types";

export type CreateGameRewardResultInput = {
    gold?: number;
    grantedItemIds?: string[];
    xp?: number;
    blockedReason?: GameRewardBlockedReason | null;
    idempotencyKey?: string | null;
};

export function createGameRewardResult(input: CreateGameRewardResultInput = {}): GameRewardResult {
    return {
        gold: Math.max(0, Math.floor(input.gold ?? 0)),
        grantedItemIds: [...(input.grantedItemIds ?? [])],
        xp: input.xp == null ? undefined : Math.max(0, Math.floor(input.xp)),
        blockedReason: input.blockedReason ?? undefined,
        idempotencyKey: input.idempotencyKey?.trim() || undefined,
    };
}

export function createGameRewardIdempotencyKey(args: {
    kind: GameKind;
    sessionId: string;
    studentId: string;
    reason: string;
}): string {
    return `game:${args.kind}:${args.sessionId}:${args.studentId}:${args.reason}`;
}

export function isRewardBlocked(reward: GameRewardResult): boolean {
    return Boolean(reward.blockedReason);
}
