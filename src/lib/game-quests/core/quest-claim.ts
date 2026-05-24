import {
    createGameEconomyMutation,
    createGameHistoryEvent,
    createGameHistoryId,
    createGameRewardResult,
    createInventoryGrantChange,
    mergeInventoryChanges,
    type GameEconomyMutation,
    type GameHistoryEvent,
    type GameInventoryChange,
    type GameRewardResult,
} from "@/lib/game-core";

export type GameQuestType = "daily" | "weekly" | "challenge" | "chain";

export type GameQuestRewardRule = {
    gold?: number;
    exp?: number;
    itemIds?: string[];
    skillIds?: string[];
    formRank?: number;
};

export type QuestClaimRewardInput = {
    studentId: string;
    classId?: string | null;
    questType: GameQuestType;
    questId: string;
    baseReward: number;
    rewardRule?: GameQuestRewardRule;
    multiplier?: number;
    balanceBefore: number;
    periodKey?: string;
    finalizedRewardKeys?: Iterable<string>;
    createdAt?: string | Date;
};

export type QuestClaimRewardPlan =
    | {
          ok: true;
          idempotencyKey: string;
          reward: GameRewardResult;
          economyMutation: GameEconomyMutation;
          inventoryChange: GameInventoryChange;
          historyEvents: GameHistoryEvent[];
      }
    | {
          ok: false;
          idempotencyKey: string;
          reason: "duplicate_claim";
          reward: GameRewardResult;
          economyMutation: null;
          inventoryChange: GameInventoryChange;
          historyEvents: GameHistoryEvent[];
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
    const idempotencyKey = createQuestClaimIdempotencyKey({
        studentId: input.studentId,
        questType: input.questType,
        questId: input.questId,
        periodKey: input.periodKey,
    });
    if (new Set(input.finalizedRewardKeys ?? []).has(idempotencyKey)) {
        return {
            ok: false,
            idempotencyKey,
            reason: "duplicate_claim",
            reward: createGameRewardResult({ blockedReason: "duplicate_finalize", idempotencyKey }),
            economyMutation: null,
            inventoryChange: mergeInventoryChanges([]),
            historyEvents: [],
        };
    }

    const gold = calculateQuestGoldReward(input.rewardRule?.gold ?? input.baseReward, input.multiplier);
    const reward = createGameRewardResult({
        gold,
        exp: input.rewardRule?.exp,
        grantedItemIds: input.rewardRule?.itemIds,
        unlockedSkillIds: input.rewardRule?.skillIds,
        idempotencyKey,
    });
    const inventoryChange = createInventoryGrantChange(input.rewardRule?.itemIds ?? []);

    return {
        ok: true,
        idempotencyKey,
        reward,
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
        inventoryChange,
        historyEvents: [
            createGameHistoryEvent({
                id: createGameHistoryId({
                    gameKind: "quest",
                    kind: "quest_claimed",
                    studentId: input.studentId,
                    refId: input.questId,
                }),
                kind: "quest_claimed",
                gameKind: "quest",
                studentId: input.studentId,
                classId: input.classId ?? undefined,
                sessionId: input.questId,
                titleKey: input.questType === "chain" ? "questChainStepClaimedHistoryTitle" : "questClaimedHistoryTitle",
                reward,
                inventoryChange,
                createdAt: input.createdAt ?? new Date(0),
            }),
        ],
    };
}
