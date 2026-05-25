import { describe, expect, it } from "vitest";
import {
    calculateNegamonQuestExpReward,
    createNegamonLearningRewardFinalizationPlan,
} from "@/lib/game-negamon";

const monsterBefore = {
    exp: 1255,
    expToNextLevel: 10,
    level: 7,
    rankIndex: 0,
    unlockedSkillIds: ["basic-attack"],
};

describe("Negamon learning rewards", () => {
    it("maps quest gold into optional monster exp", () => {
        expect(calculateNegamonQuestExpReward({ goldReward: 7.8 })).toBe(9);
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
            unlockedSkillIdsAfter: ["basic-attack", "pyronox-ember-fang"],
            createdAt: "2026-04-07T08:00:00.000Z",
        });

        expect(plan.reward).toMatchObject({
            gold: 5,
            exp: 12,
            levelUps: [
                {
                    fromLevel: 7,
                    toLevel: 8,
                    fromRankIndex: 0,
                    toRankIndex: 1,
                },
            ],
            unlockedSkillIds: ["pyronox-ember-fang"],
        });
        expect(plan.historyEvents.map((event) => event.kind)).toEqual([
            "reward_granted",
            "level_up",
            "skill_unlocked",
            "evolution_unlocked",
        ]);
    });
});
