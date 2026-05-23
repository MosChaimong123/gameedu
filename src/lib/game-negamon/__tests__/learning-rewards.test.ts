import { describe, expect, it } from "vitest";
import {
    calculateNegamonQuestExpReward,
    createNegamonLearningRewardFinalizationPlan,
} from "@/lib/game-negamon";

const monsterBefore = {
    exp: 40,
    expToNextLevel: 10,
    level: 1,
    rankIndex: 0,
    unlockedSkillIds: ["basic-attack"],
};

describe("Negamon learning rewards", () => {
    it("maps quest gold into optional monster exp", () => {
        expect(calculateNegamonQuestExpReward({ goldReward: 7.8 })).toBe(7);
        expect(calculateNegamonQuestExpReward({ goldReward: -3 })).toBe(0);
    });

    it("creates reward, level-up, and skill history for quest progression", () => {
        const plan = createNegamonLearningRewardFinalizationPlan({
            source: "quest",
            sourceId: "daily:quest_login:2026-04-07",
            studentId: "student-1",
            classId: "class-1",
            monsterBefore,
            goldReward: 5,
            expReward: 12,
            rankIndexAfter: 1,
            unlockedSkillIdsAfter: ["basic-attack", "naga-aqua-jet"],
            createdAt: "2026-04-07T08:00:00.000Z",
        });

        expect(plan.reward).toMatchObject({
            gold: 5,
            exp: 12,
            levelUps: [
                {
                    fromLevel: 1,
                    toLevel: 2,
                    fromRankIndex: 0,
                    toRankIndex: 1,
                },
            ],
            unlockedSkillIds: ["naga-aqua-jet"],
        });
        expect(plan.historyEvents.map((event) => event.kind)).toEqual([
            "reward_granted",
            "level_up",
            "skill_unlocked",
        ]);
    });
});
