import type { QuestStatus } from "@/lib/daily-quests";
import type { GameQuestRewardRule, GameQuestType } from "./quest-claim";

export type GameQuestChainStepCondition =
    | { kind: "quest_claimed"; questType: Exclude<GameQuestType, "chain">; questId: string }
    | { kind: "streak"; min: number }
    | { kind: "submissions"; minTotal?: number; minWeekly?: number }
    | { kind: "inventory"; minItems: number }
    | { kind: "battles"; minPlayed?: number; minWon?: number };

export type GameQuestChainStep = {
    id: string;
    icon: string;
    nameKey: string;
    descKey: string;
    condition: GameQuestChainStepCondition;
    reward: GameQuestRewardRule;
};

export type GameQuestChainDefinition = {
    id: string;
    nameKey: string;
    descKey: string;
    steps: GameQuestChainStep[];
};

export type QuestChainProgressInput = {
    dailyClaimedIds: string[];
    weeklyClaimedIds: string[];
    challengeClaimedIds: string[];
    chainClaimedIds: string[];
    streak: number;
    submissionsThisWeek: number;
    totalSubmissions: number;
    inventoryCount: number;
    battlesPlayed?: number;
    battlesWon?: number;
};

export const DEFAULT_GAME_QUEST_CHAINS: GameQuestChainDefinition[] = [
    {
        id: "chain_learning_path",
        nameKey: "questChainLearningPathName",
        descKey: "questChainLearningPathDesc",
        steps: [
            {
                id: "login",
                icon: "📘",
                nameKey: "questChainLoginName",
                descKey: "questChainLoginDesc",
                condition: { kind: "quest_claimed", questType: "daily", questId: "quest_login" },
                reward: { gold: 10, exp: 10 },
            },
            {
                id: "checkin",
                icon: "📗",
                nameKey: "questChainCheckinName",
                descKey: "questChainCheckinDesc",
                condition: { kind: "quest_claimed", questType: "daily", questId: "quest_checkin" },
                reward: { gold: 15, exp: 15, itemIds: ["item_minor_potion"] },
            },
            {
                id: "submit_week",
                icon: "📙",
                nameKey: "questChainSubmitWeekName",
                descKey: "questChainSubmitWeekDesc",
                condition: { kind: "quest_claimed", questType: "weekly", questId: "wq_submit3_week" },
                reward: { gold: 25, exp: 25, skillIds: ["naga-aqua-jet"], formRank: 2 },
            },
        ],
    },
    {
        id: "chain_attendance_spark",
        nameKey: "questChainAttendanceSparkName",
        descKey: "questChainAttendanceSparkDesc",
        steps: [
            {
                id: "checkin_starter",
                icon: "ATT",
                nameKey: "questChainAttendanceCheckinName",
                descKey: "questChainAttendanceCheckinDesc",
                condition: { kind: "quest_claimed", questType: "daily", questId: "quest_checkin" },
                reward: { gold: 15, exp: 20, itemIds: ["item_minor_potion"] },
            },
            {
                id: "streak_three",
                icon: "STR",
                nameKey: "questChainAttendanceStreakName",
                descKey: "questChainAttendanceStreakDesc",
                condition: { kind: "streak", min: 3 },
                reward: { gold: 25, exp: 35, itemIds: ["item_antidote_charm"] },
            },
            {
                id: "streak_seven",
                icon: "7D",
                nameKey: "questChainAttendanceSevenName",
                descKey: "questChainAttendanceSevenDesc",
                condition: { kind: "streak", min: 7 },
                reward: { gold: 40, exp: 60, itemIds: ["item_flame_ward"], formRank: 2 },
            },
        ],
    },
    {
        id: "chain_battle_training",
        nameKey: "questChainBattleTrainingName",
        descKey: "questChainBattleTrainingDesc",
        steps: [
            {
                id: "prepare_item",
                icon: "BAG",
                nameKey: "questChainBattlePrepareName",
                descKey: "questChainBattlePrepareDesc",
                condition: { kind: "inventory", minItems: 1 },
                reward: { gold: 10, exp: 15, itemIds: ["item_energy_orb"] },
            },
            {
                id: "first_battle",
                icon: "BAT",
                nameKey: "questChainBattlePlayName",
                descKey: "questChainBattlePlayDesc",
                condition: { kind: "battles", minPlayed: 1 },
                reward: { gold: 30, exp: 45, itemIds: ["item_minor_potion"] },
            },
            {
                id: "first_win",
                icon: "WIN",
                nameKey: "questChainBattleWinName",
                descKey: "questChainBattleWinDesc",
                condition: { kind: "battles", minWon: 1 },
                reward: { gold: 50, exp: 75, itemIds: ["item_lucky_coin"], skillIds: ["garuda-flame-burst"] },
            },
        ],
    },
];

export function createQuestChainClaimId(chainId: string, stepId: string): string {
    return `chain:${chainId}:${stepId}`;
}

export function getChainClaimedAll(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((id): id is string => typeof id === "string")
        .filter((id) => id.startsWith("chain:"));
}

function isConditionCompleted(condition: GameQuestChainStepCondition, input: QuestChainProgressInput): boolean {
    if (condition.kind === "quest_claimed") {
        if (condition.questType === "daily") return input.dailyClaimedIds.includes(condition.questId);
        if (condition.questType === "weekly") return input.weeklyClaimedIds.includes(condition.questId);
        return input.challengeClaimedIds.includes(condition.questId);
    }
    if (condition.kind === "streak") return input.streak >= condition.min;
    if (condition.kind === "submissions") {
        return (
            input.totalSubmissions >= (condition.minTotal ?? 0) &&
            input.submissionsThisWeek >= (condition.minWeekly ?? 0)
        );
    }
    if (condition.kind === "battles") {
        return (
            (input.battlesPlayed ?? 0) >= (condition.minPlayed ?? 0) &&
            (input.battlesWon ?? 0) >= (condition.minWon ?? 0)
        );
    }
    return input.inventoryCount >= condition.minItems;
}

export function createQuestChainProgressSnapshot(input: {
    chains?: GameQuestChainDefinition[];
    progress: QuestChainProgressInput;
}): QuestStatus[] {
    const statuses: QuestStatus[] = [];
    for (const chain of input.chains ?? DEFAULT_GAME_QUEST_CHAINS) {
        let previousClaimed = true;
        chain.steps.forEach((step, index) => {
            const claimId = createQuestChainClaimId(chain.id, step.id);
            const claimed = input.progress.chainClaimedIds.includes(claimId);
            const conditionCompleted = isConditionCompleted(step.condition, input.progress);
            const completed = previousClaimed && conditionCompleted;
            statuses.push({
                id: claimId,
                icon: step.icon,
                nameKey: step.nameKey,
                descKey: step.descKey,
                goldReward: step.reward.gold ?? 0,
                rewardItemIds: step.reward.itemIds,
                rewardSkillIds: step.reward.skillIds,
                rewardFormRank: step.reward.formRank,
                questType: "chain",
                chainId: chain.id,
                stepId: step.id,
                stepIndex: index + 1,
                totalSteps: chain.steps.length,
                completed,
                claimed,
            });
            previousClaimed = claimed;
        });
    }
    return statuses;
}

export function findQuestChainStep(input: {
    chainId: string;
    stepId: string;
    chains?: GameQuestChainDefinition[];
}): { chain: GameQuestChainDefinition; step: GameQuestChainStep; index: number } | null {
    for (const chain of input.chains ?? DEFAULT_GAME_QUEST_CHAINS) {
        if (chain.id !== input.chainId) continue;
        const index = chain.steps.findIndex((step) => step.id === input.stepId);
        if (index >= 0) return { chain, step: chain.steps[index], index };
    }
    return null;
}
