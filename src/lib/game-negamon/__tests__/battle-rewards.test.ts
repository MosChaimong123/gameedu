import { describe, expect, it } from "vitest";
import {
    calculateNegamonBattleGoldReward,
    calculateNegamonBattleExpReward,
    calculateNegamonProgressionReward,
    createNegamonBattleRewardFinalizationPlan,
} from "@/lib/game-negamon";

const monsterBefore = {
    exp: 1255,
    expToNextLevel: 10,
    level: 7,
    rankIndex: 0,
    unlockedSkillIds: ["basic-attack"],
};

describe("Negamon progression and reward contracts", () => {
    it("calculates battle gold with flat bonus before capped multiplier", () => {
        expect(calculateNegamonBattleGoldReward({ goldBonus: 10, goldMultiplier: 1.25 })).toBe(50);
        expect(calculateNegamonBattleGoldReward({ goldBonus: 10, goldMultiplier: 99 })).toBe(100);
    });

    it("calculates battle exp by outcome with a capped turn bonus", () => {
        expect(calculateNegamonBattleExpReward({ outcome: "win", turnCount: 20 })).toBe(60);
        expect(calculateNegamonBattleExpReward({ outcome: "draw", turnCount: 3 })).toBe(31);
        expect(calculateNegamonBattleExpReward({ outcome: "loss", turnCount: 0 })).toBe(18);
    });

    it("summarizes exp, level-up, and newly unlocked skills", () => {
        const summary = calculateNegamonProgressionReward({
            monsterBefore,
            expReward: 25,
            unlockedSkillIdsAfter: ["basic-attack", "pyronox-ember-fang"],
        });

        expect(summary).toMatchObject({
            expBefore: 1255,
            expAfter: 1280,
            levelBefore: 7,
            levelAfter: 8,
            rankIndexBefore: 0,
            rankIndexAfter: 1,
            unlockedSkillIds: ["pyronox-ember-fang"],
            evolutionUnlocks: [
                {
                    fromRankIndex: 0,
                    toRankIndex: 1,
                    formRank: 1,
                },
            ],
        });
        expect(summary.levelUps).toEqual([
            {
                fromLevel: 7,
                toLevel: 8,
                fromRankIndex: 0,
                toRankIndex: 1,
                expBefore: 1255,
                expAfter: 1280,
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
            unlockedSkillIdsAfter: ["basic-attack", "pyronox-ember-fang"],
            createdAt: "2026-05-23T12:00:00.000Z",
        });

        expect(plan.ok).toBe(true);
        if (!plan.ok) throw new Error("expected ok plan");
        expect(plan.reward).toMatchObject({
            gold: 30,
            exp: 25,
            grantedItemIds: ["reward_lucky_coin"],
            unlockedSkillIds: ["pyronox-ember-fang"],
        });
        expect(plan.inventoryChange).toEqual({
            consumedItemIds: ["item_potion"],
            grantedItemIds: ["reward_lucky_coin"],
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
            "evolution_unlocked",
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
