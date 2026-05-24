import type { QuestStatus } from "@/lib/daily-quests";
import type { GameQuestRewardRule, GameQuestType } from "./quest-claim";

export type GameQuestRewardContentInput = {
    questType: GameQuestType;
    questId: string;
    baseGold: number;
    multiplier?: number;
};

const QUEST_REWARD_CONTENT: Record<string, Omit<GameQuestRewardRule, "gold">> = {
    "daily:quest_login": { exp: 5 },
    "daily:quest_checkin": { exp: 10, itemIds: ["use_vital_vial"] },
    "daily:quest_submit": { exp: 20, itemIds: ["use_charge_capsule"] },
    "weekly:wq_streak3": { exp: 25, itemIds: ["held_clear_mind_charm"] },
    "weekly:wq_streak5": { exp: 70, itemIds: ["held_clear_mind_charm"] },
    "weekly:wq_streak7": { exp: 40, itemIds: ["held_clear_mind_charm"] },
    "weekly:wq_submit3_week": { exp: 80, itemIds: ["use_charge_capsule"], skillIds: ["naga-aqua-jet"] },
    "weekly:wq_daily_complete": { exp: 60, itemIds: ["use_vital_vial", "held_clear_mind_charm"] },

    "challenge:cq_streak14": { exp: 140, itemIds: ["reward_lucky_coin"], formRank: 3 },
    "challenge:cq_submit10": { exp: 120, itemIds: ["held_clear_mind_charm"], skillIds: ["garuda-flame-burst"] },
    "challenge:cq_first_buy": { exp: 50, itemIds: ["use_charge_capsule"] },
};

function contentKey(questType: GameQuestType, questId: string): string {
    return `${questType}:${questId}`;
}

export function resolveGameQuestRewardRule(input: GameQuestRewardContentInput): GameQuestRewardRule {
    const gold = Math.max(0, Math.floor(input.baseGold * Math.max(0, input.multiplier ?? 1)));
    const content = QUEST_REWARD_CONTENT[contentKey(input.questType, input.questId)] ?? {};
    return {
        gold,
        ...content,
    };
}

export function applyQuestRewardContentToStatuses(
    questType: Exclude<GameQuestType, "chain">,
    statuses: QuestStatus[]
): QuestStatus[] {
    return statuses.map((status) => {
        const reward = resolveGameQuestRewardRule({
            questType,
            questId: status.id,
            baseGold: status.goldReward,
        });
        return {
            ...status,
            goldReward: reward.gold ?? status.goldReward,
            rewardItemIds: reward.itemIds,
            rewardSkillIds: reward.skillIds,
            rewardFormRank: reward.formRank,
        };
    });
}
