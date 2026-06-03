import type { GameRewardResult } from "@/lib/game-core";

export interface Opponent {
    id: string;
    name: string;
    formIcon: string;
    formName: string;
    rankIndex: number;
}

export interface BattleSessionEntry {
    id: string;
    challengerId: string;
    defenderId: string;
    winnerId: string;
    goldReward: number;
    createdAt: string;
}

export type BattleFinalRewardPayload = {
    winnerId: string;
    requestedGoldReward: number;
    goldReward: number;
    rewardBlockedReason: "daily_cap" | "pair_cooldown" | null;
    rewardIdempotencyKey?: string;
    reward?: GameRewardResult;
    progression?: {
        expDelta: number;
        behaviorPointDelta: number;
        nextBehaviorPoints: number;
        nextNegamonSkills: string[];
        shouldPersist: boolean;
    } | null;
};

export interface BattleTabProps {
    classId: string;
    myStudentId: string;
    myStudentCode: string;
    myMonster: { formIcon: string; formName: string; rankIndex: number } | null;
    currentGold?: number;
    inventory: string[];
    resetSignal?: number;
    onGoldChange?: (newGold: number) => void;
    onBattleConsumablesSpent?: (consumedItemIds: string[]) => void;
    onBattleFinalized?: (final: BattleFinalRewardPayload) => void;
}
