import { describe, expect, it, vi } from "vitest";
import {
    applyNegamonProgressionReward,
    createNegamonProgressionPersistencePlan,
    type NegamonProgressionRewardSummary,
} from "@/lib/game-negamon";

const progression: NegamonProgressionRewardSummary = {
    expBefore: 100,
    expAfter: 180,
    levelBefore: 2,
    levelAfter: 3,
    rankIndexBefore: 1,
    rankIndexAfter: 2,
    levelUps: [
        {
            fromLevel: 2,
            toLevel: 3,
            fromRankIndex: 1,
            toRankIndex: 2,
            expBefore: 100,
            expAfter: 180,
        },
    ],
    unlockedSkillIds: ["naga-aqua-jet", "basic-attack", "naga-aqua-jet"],
};

describe("Negamon progression persistence", () => {
    it("plans behavior point exp persistence and dedupes unlocked skills", () => {
        const plan = createNegamonProgressionPersistencePlan({
            student: {
                behaviorPoints: 10,
                negamonSkills: ["basic-attack", "  ", "basic-attack"],
            },
            progression,
            expPerPoint: 10,
        });

        expect(plan).toEqual({
            expDelta: 80,
            behaviorPointDelta: 8,
            behaviorPointsBefore: 10,
            behaviorPointsAfter: 18,
            unlockedSkillIdsBefore: ["basic-attack"],
            unlockedSkillIdsAfter: ["basic-attack", "naga-aqua-jet"],
            newlyUnlockedSkillIds: ["naga-aqua-jet"],
            shouldPersist: true,
        });
    });

    it("updates student behavior points and skills only when needed", async () => {
        const update = vi.fn().mockResolvedValue({
            behaviorPoints: 90,
            negamonSkills: ["basic-attack", "naga-aqua-jet"],
        });

        const result = await applyNegamonProgressionReward({
            studentId: "student-1",
            student: { behaviorPoints: 10, negamonSkills: ["basic-attack"] },
            progression,
            expPerPoint: 10,
            studentDelegate: { update },
        });

        expect(update).toHaveBeenCalledWith({
            where: { id: "student-1" },
            data: {
                behaviorPoints: { increment: 8 },
                negamonSkills: ["basic-attack", "naga-aqua-jet"],
            },
            select: { behaviorPoints: true, negamonSkills: true },
        });
        expect(result.student).toEqual({
            behaviorPoints: 90,
            negamonSkills: ["basic-attack", "naga-aqua-jet"],
        });
    });

    it("skips writes when there is no exp delta or new skill", async () => {
        const update = vi.fn();
        const result = await applyNegamonProgressionReward({
            studentId: "student-1",
            student: { behaviorPoints: 10, negamonSkills: ["basic-attack"] },
            expPerPoint: 10,
            progression: {
                ...progression,
                expAfter: progression.expBefore,
                unlockedSkillIds: ["basic-attack"],
                levelUps: [],
            },
            studentDelegate: { update },
        });

        expect(update).not.toHaveBeenCalled();
        expect(result.plan.shouldPersist).toBe(false);
    });
});
