import {
    createGameEconomyMutation,
    createGameRewardResult,
    type GameEconomyMutation,
    type GameRewardResult,
} from "@/lib/game-core";

export type GameQuestType = "daily" | "weekly" | "challenge";

export type QuestClaimRewardInput = {
    studentId: string;
    classId?: string | null;
    questType: GameQuestType;
    questId: string;
    baseReward: number;
    multiplier?: number;
    balanceBefore: number;
};

export type QuestClaimRewardPlan = {
    reward: GameRewardResult;
    economyMutation: GameEconomyMutation;
};

export function createQuestClaimIdempotencyKey(input: {
    studentId: string;
    questType: GameQuestType;
    questId: string;
    periodKey?: string;
}): string {
    return ["quest", input.studentId, input.questType, input.periodKey, input.questId]
        .filter(Boolean)
        .join(":");
}

export function calculateQuestGoldReward(baseReward: number, multiplier = 1): number {
    return Math.max(0, Math.floor(baseReward * multiplier));
}

export function createQuestClaimRewardPlan(input: QuestClaimRewardInput): QuestClaimRewardPlan {
    const gold = calculateQuestGoldReward(input.baseReward, input.multiplier);
    const idempotencyKey = createQuestClaimIdempotencyKey({
        studentId: input.studentId,
        questType: input.questType,
        questId: input.questId,
    });

    return {
        reward: createGameRewardResult({
            gold,
            idempotencyKey,
        }),
        economyMutation: createGameEconomyMutation({
            studentId: input.studentId,
            classId: input.classId,
            type: "earn",
            source: "quest",
            amount: gold,
            balanceBefore: input.balanceBefore,
            sourceRefId: input.questId,
            idempotencyKey,
        }),
    };
}
