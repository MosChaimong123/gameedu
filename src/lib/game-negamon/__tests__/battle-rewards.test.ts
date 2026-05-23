import { describe, expect, it } from "vitest";
import {
    calculateNegamonBattleGoldReward,
    calculateNegamonBattleExpReward,
    calculateNegamonProgressionReward,
    createNegamonBattleRewardFinalizationPlan,
} from "@/lib/game-negamon";

const monsterBefore = {
    exp: 390,
    expToNextLevel: 10,
    level: 2,
    rankIndex: 1,
    unlockedSkillIds: ["basic-attack"],
};

describe("Negamon progression and reward contracts", () => {
    it("calculates battle gold with flat bonus before capped multiplier", () => {
        expect(calculateNegamonBattleGoldReward({ goldBonus: 10, goldMultiplier: 1.25 })).toBe(50);
        expect(calculateNegamonBattleGoldReward({ goldBonus: 10, goldMultiplier: 99 })).toBe(100);
    });

    it("calculates battle exp by outcome with a capped turn bonus", () => {
        expect(calculateNegamonBattleExpReward({ outcome: "win", turnCount: 20 })).toBe(100);
        expect(calculateNegamonBattleExpReward({ outcome: "draw", turnCount: 3 })).toBe(46);
        expect(calculateNegamonBattleExpReward({ outcome: "loss", turnCount: 0 })).toBe(25);
    });

    it("summarizes exp, level-up, and newly unlocked skills", () => {
        const summary = calculateNegamonProgressionReward({
            monsterBefore,
            expReward: 25,
            unlockedSkillIdsAfter: ["basic-attack", "naga-aqua-jet"],
        });

        expect(summary).toMatchObject({
            expBefore: 390,
            expAfter: 415,
            levelBefore: 2,
            levelAfter: 3,
            rankIndexBefore: 1,
            rankIndexAfter: 2,
            unlockedSkillIds: ["naga-aqua-jet"],
        });
        expect(summary.levelUps).toEqual([
            {
                fromLevel: 2,
                toLevel: 3,
                fromRankIndex: 1,
                toRankIndex: 2,
                expBefore: 390,
                expAfter: 415,
            },
        ]);
    });

    it("creates one finalization plan for gold, exp, items, inventory, and history", () => {
        const plan = createNegamonBattleRewardFinalizationPlan({
            sessionId: "battle-1",
            studentId: "student-1",
            classId: "class-1",
            outcome: "win",
            monsterBefore,
            balanceBefore: 200,
            goldReward: 30,
            expReward: 25,
            itemRewardIds: ["item_lucky_coin"],
            consumedItemIds: ["item_potion"],
            unlockedSkillIdsAfter: ["basic-attack", "naga-aqua-jet"],
            createdAt: "2026-05-23T12:00:00.000Z",
        });

        expect(plan.ok).toBe(true);
        if (!plan.ok) throw new Error("expected ok plan");
        expect(plan.reward).toMatchObject({
            gold: 30,
            exp: 25,
            grantedItemIds: ["item_lucky_coin"],
            unlockedSkillIds: ["naga-aqua-jet"],
        });
        expect(plan.inventoryChange).toEqual({
            consumedItemIds: ["item_potion"],
            grantedItemIds: ["item_lucky_coin"],
            equippedItemIds: [],
            unequippedItemIds: [],
        });
        expect(plan.economyMutation).toMatchObject({
            source: "battle",
            amount: 30,
            balanceBefore: 200,
            balanceAfter: 230,
            idempotencyKey: "game:negamon:battle-1:student-1:battle-finalize",
        });
        expect(plan.historyEvents.map((event) => event.kind)).toEqual([
            "reward_granted",
            "level_up",
            "skill_unlocked",
        ]);
    });

    it("blocks duplicate finalization with the same idempotency key", () => {
        const duplicate = createNegamonBattleRewardFinalizationPlan({
            sessionId: "battle-1",
            studentId: "student-1",
            outcome: "win",
            monsterBefore,
            balanceBefore: 200,
            finalizedRewardKeys: ["game:negamon:battle-1:student-1:battle-finalize"],
        });

        expect(duplicate).toMatchObject({
            ok: false,
            reward: {
                gold: 0,
                exp: 0,
                grantedItemIds: [],
                blockedReason: "duplicate_finalize",
                idempotencyKey: "game:negamon:battle-1:student-1:battle-finalize",
            },
            economyMutation: null,
            inventoryChange: {
                consumedItemIds: [],
                grantedItemIds: [],
                equippedItemIds: [],
                unequippedItemIds: [],
            },
        });
    });
});
