import { describe, expect, it, vi } from "vitest";
import {
    applyNegamonProgressionReward,
    calculateNegamonExpProgress,
    createNegamonProgressionPersistencePlan,
    type NegamonProgressionRewardSummary,
} from "@/lib/game-negamon";

const progression: NegamonProgressionRewardSummary = {
    expBefore: 1255,
    expAfter: 1275,
    levelBefore: 7,
    levelAfter: 8,
    rankIndexBefore: 0,
    rankIndexAfter: 1,
    levelUps: [
        {
            fromLevel: 7,
            toLevel: 8,
            fromRankIndex: 0,
            toRankIndex: 1,
            expBefore: 1255,
            expAfter: 1275,
        },
    ],
    unlockedSkillIds: ["pyronox-ember-fang", "basic-attack", "pyronox-ember-fang"],
};

describe("Negamon progression persistence", () => {
    it("keeps the new 1-60 curve lively early while preserving later headroom", () => {
        expect(calculateNegamonExpProgress({ points: 1, rankIndex: 0, expPerPoint: 6 })).toMatchObject({
            level: 1,
            rankIndex: 0,
        });
        expect(calculateNegamonExpProgress({ points: 15, rankIndex: 1, expPerPoint: 6 })).toMatchObject({
            level: 8,
            rankIndex: 1,
        });
        expect(calculateNegamonExpProgress({ points: 25, rankIndex: 2, expPerPoint: 6 })).toMatchObject({
            level: 16,
            rankIndex: 2,
        });
    });

    it("plans behavior point exp persistence and dedupes unlocked skills", () => {
        const plan = createNegamonProgressionPersistencePlan({
            student: {
                behaviorPoints: 10,
                negamonSkills: ["basic-attack", "  ", "basic-attack"],
            },
            progression,
            expPerPoint: 6,
            canonicalUnlockedSkillIdsBefore: ["basic-attack"],
        });

        expect(plan).toEqual({
            expDelta: 20,
            behaviorPointDelta: 4,
            behaviorPointsBefore: 10,
            behaviorPointsAfter: 14,
            levelBefore: 7,
            levelAfter: 8,
            rankIndexBefore: 0,
            rankIndexAfter: 1,
            unlockedSkillIdsBefore: ["basic-attack"],
            unlockedSkillIdsAfter: ["basic-attack", "pyronox-ember-fang"],
            newlyUnlockedSkillIds: ["pyronox-ember-fang"],
            shouldPersist: true,
        });
    });

    it("updates student behavior points and skills only when needed", async () => {
        const update = vi.fn().mockResolvedValue({
            behaviorPoints: 12,
            negamonSkills: ["basic-attack", "pyronox-ember-fang"],
        });

        const result = await applyNegamonProgressionReward({
            studentId: "student-1",
            student: { behaviorPoints: 10, negamonSkills: ["basic-attack"] },
            progression,
            expPerPoint: 6,
            canonicalUnlockedSkillIdsBefore: ["basic-attack"],
            studentDelegate: { update },
        });

        expect(update).toHaveBeenCalledWith({
            where: { id: "student-1" },
            data: {
                behaviorPoints: { increment: 4 },
                negamonSkills: ["basic-attack", "pyronox-ember-fang"],
            },
            select: { behaviorPoints: true, negamonSkills: true },
        });
        expect(result.student).toEqual({
            behaviorPoints: 12,
            negamonSkills: ["basic-attack", "pyronox-ember-fang"],
        });
    });

    it("hydrates canonical unlocked skills even when the stored list is stale", () => {
        const plan = createNegamonProgressionPersistencePlan({
            student: {
                behaviorPoints: 10,
                negamonSkills: [],
            },
            progression,
            expPerPoint: 6,
            canonicalUnlockedSkillIdsBefore: ["basic-attack"],
        });

        expect(plan.unlockedSkillIdsBefore).toEqual(["basic-attack"]);
        expect(plan.unlockedSkillIdsAfter).toEqual(["basic-attack", "pyronox-ember-fang"]);
    });

    it("skips writes when there is no exp delta or new skill", async () => {
        const update = vi.fn();
        const result = await applyNegamonProgressionReward({
            studentId: "student-1",
            student: { behaviorPoints: 10, negamonSkills: ["basic-attack"] },
            expPerPoint: 6,
            progression: {
                ...progression,
                expAfter: progression.expBefore,
                unlockedSkillIds: ["basic-attack"],
                levelUps: [],
            },
            canonicalUnlockedSkillIdsBefore: ["basic-attack"],
            studentDelegate: { update },
        });

        expect(update).not.toHaveBeenCalled();
        expect(result.plan.shouldPersist).toBe(false);
    });
});
