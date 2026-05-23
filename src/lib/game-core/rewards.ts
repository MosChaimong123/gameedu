import type { GameKind, GameRewardBlockedReason, GameRewardResult } from "./types";

export type CreateGameRewardResultInput = {
    gold?: number;
    grantedItemIds?: string[];
    exp?: number;
    xp?: number;
    levelUps?: GameRewardResult["levelUps"];
    unlockedSkillIds?: string[];
    blockedReason?: GameRewardBlockedReason | null;
    idempotencyKey?: string | null;
};

export function createGameRewardResult(input: CreateGameRewardResultInput = {}): GameRewardResult {
    const exp = Math.max(0, Math.floor(input.exp ?? input.xp ?? 0));
    return {
        gold: Math.max(0, Math.floor(input.gold ?? 0)),
        grantedItemIds: [...(input.grantedItemIds ?? [])],
        exp,
        xp: input.xp == null ? undefined : Math.max(0, Math.floor(input.xp)),
        levelUps: [...(input.levelUps ?? [])],
        unlockedSkillIds: [...(input.unlockedSkillIds ?? [])],
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
