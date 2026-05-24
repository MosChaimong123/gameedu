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
    "daily:quest_checkin": { exp: 10, itemIds: ["item_minor_potion"] },
    "daily:quest_submit": { exp: 20, itemIds: ["item_energy_orb"] },
    "daily:quest_streak3": { exp: 25, itemIds: ["item_antidote_charm"] },
    "daily:quest_streak7": { exp: 40, itemIds: ["item_flame_ward"] },

    "weekly:wq_streak5": { exp: 70, itemIds: ["item_dream_bell"] },
    "weekly:wq_submit3_week": { exp: 80, itemIds: ["item_energy_orb"], skillIds: ["naga-aqua-jet"] },
    "weekly:wq_daily_complete": { exp: 60, itemIds: ["item_minor_potion", "item_antidote_charm"] },

    "challenge:cq_streak14": { exp: 140, itemIds: ["item_lucky_coin"], formRank: 3 },
    "challenge:cq_submit10": { exp: 120, itemIds: ["item_flame_ward"], skillIds: ["garuda-flame-burst"] },
    "challenge:cq_first_buy": { exp: 50, itemIds: ["item_energy_orb"] },
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
