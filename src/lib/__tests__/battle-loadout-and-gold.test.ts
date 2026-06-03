import { describe, expect, it } from "vitest";
import {
    applyConsumeInventory,
    removeBattleItemsFromInventory,
    sanitizeLoadoutAgainstInventory,
    validateBattleLoadout,
} from "@/lib/battle-loadout";
import {
    calculateNegamonBattleGoldReward,
    calculateNegamonBattleExpReward,
    createNegamonBattleRewardFinalizationPlan,
    validateNegamonSkillLoadout,
    NEGAMON_BATTLE_GOLD_MULTIPLIER_CAP,
} from "@/lib/game-negamon";
import { DEFAULT_NEGAMON_SPECIES, createDefaultNegamonSettings } from "@/lib/negamon-species";
import { getNegamonSpeciesSkillCatalog } from "@/lib/game-negamon/core/skills";
import { isNegamonBasicAttackMoveId } from "@/lib/negamon-basic-move";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";

describe("validateBattleLoadout", () => {
    it("accepts empty loadout", () => {
        const v = validateBattleLoadout([], ["held_guard_core"]);
        expect(v.ok).toBe(true);
        expect(v.ok && v.normalizedIds).toEqual([]);
    });

    it("rejects two held items", () => {
        const inv = ["held_guard_core", "item_spark_charm"];
        const v = validateBattleLoadout(["held_guard_core", "item_spark_charm"], inv);
        expect(v.ok).toBe(false);
    });

    it("rejects reward items from battle loadout", () => {
        const inv = ["held_guard_core", "reward_lucky_coin"];
        const v = validateBattleLoadout(["reward_lucky_coin"], inv);
        expect(v.ok).toBe(false);
    });

    it("rejects profile frames and unowned battle items", () => {
        const frame = validateBattleLoadout(["frame_fire_t1"], ["frame_fire_t1"]);
        expect(frame.ok).toBe(false);
        expect(!frame.ok && frame.code).toBe("UNKNOWN_ITEM");

        const missing = validateBattleLoadout(["item_buckler"], ["reward_lucky_coin"]);
        expect(missing.ok).toBe(false);
        expect(!missing.ok && missing.code).toBe("NOT_IN_STOCK");
    });
});

describe("applyConsumeInventory", () => {
    it("removes one occurrence per id", () => {
        expect(applyConsumeInventory(["a", "b", "a"], ["a", "a"])).toEqual(["b"]);
    });
});

describe("battle item inventory mutation", () => {
    it("throws when finalizing would consume an item stack that no longer exists", () => {
        expect(() => removeBattleItemsFromInventory(["held_guard_core"], ["held_guard_core", "held_guard_core"]))
            .toThrow("MISSING_ITEM:held_guard_core");
    });

    it("sanitizes saved loadout against remaining inventory one stack at a time", () => {
        expect(
            sanitizeLoadoutAgainstInventory(
                ["item_buckler", "item_buckler", "item_lucky_coin"],
                ["item_buckler", "frame_fire_t1"]
            )
        ).toEqual(["item_buckler"]);
    });
});

describe("calculateNegamonBattleGoldReward", () => {
    it("applies flat then multiplier", () => {
        expect(
            calculateNegamonBattleGoldReward({ goldBonus: 10, goldMultiplier: 1.25 })
        ).toBe(Math.floor((30 + 10) * 1.25));
    });

    it("respects multiplier cap constant", () => {
        expect(NEGAMON_BATTLE_GOLD_MULTIPLIER_CAP).toBeGreaterThanOrEqual(1);
    });
});

describe("B4 acceptance — gold reward and idempotency", () => {
    const monsterBefore = { exp: 0, expToNextLevel: 100, level: 1, rankIndex: 0, unlockedSkillIds: [] };

    it("winner reward plan carries gold > 0 and a non-empty idempotencyKey", () => {
        const goldReward = calculateNegamonBattleGoldReward({});
        expect(goldReward).toBeGreaterThan(0);

        const plan = createNegamonBattleRewardFinalizationPlan({
            sessionId: "session-b4-win",
            studentId: "student-b4-winner",
            classId: "class-1",
            outcome: "win",
            monsterBefore,
            balanceBefore: 100,
            goldReward,
        });

        expect(plan.ok).toBe(true);
        expect(plan.idempotencyKey).toBeTruthy();
        if (plan.ok) {
            expect(plan.reward.gold).toBe(goldReward);
            expect(plan.economyMutation).not.toBeNull();
            expect(plan.economyMutation?.idempotencyKey).toBe(plan.idempotencyKey);
        }
    });

    it("loser reward plan carries gold = 0 and no economy mutation", () => {
        const plan = createNegamonBattleRewardFinalizationPlan({
            sessionId: "session-b4-loss",
            studentId: "student-b4-loser",
            classId: "class-1",
            outcome: "loss",
            monsterBefore,
            balanceBefore: 50,
            goldReward: 0,
        });

        expect(plan.ok).toBe(true);
        if (plan.ok) {
            expect(plan.reward.gold).toBe(0);
            expect(plan.economyMutation).toBeNull();
        }
    });

    it("duplicate finalize (same idempotencyKey) blocks gold and returns ok: false", () => {
        const goldReward = calculateNegamonBattleGoldReward({});
        const first = createNegamonBattleRewardFinalizationPlan({
            sessionId: "session-b4-idempotent",
            studentId: "student-b4-idempotent",
            classId: "class-1",
            outcome: "win",
            monsterBefore,
            balanceBefore: 200,
            goldReward,
        });
        expect(first.ok).toBe(true);

        const duplicate = createNegamonBattleRewardFinalizationPlan({
            sessionId: "session-b4-idempotent",
            studentId: "student-b4-idempotent",
            classId: "class-1",
            outcome: "win",
            monsterBefore,
            balanceBefore: 200,
            goldReward,
            finalizedRewardKeys: [first.idempotencyKey],
        });

        expect(duplicate.ok).toBe(false);
        expect(duplicate.reward.gold).toBe(0);
        expect(duplicate.economyMutation).toBeNull();
    });

    it("calculateNegamonBattleExpReward: win > draw > loss, all positive", () => {
        const win = calculateNegamonBattleExpReward({ outcome: "win" });
        const draw = calculateNegamonBattleExpReward({ outcome: "draw" });
        const loss = calculateNegamonBattleExpReward({ outcome: "loss" });
        expect(win).toBeGreaterThan(draw);
        expect(draw).toBeGreaterThan(loss);
        expect(loss).toBeGreaterThan(0);
    });
});

describe("B3 acceptance — skill loadout auto-build", () => {
    it("fallback loadout always includes basic attack and highest-tier non-basic skills", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            const catalog = getNegamonSpeciesSkillCatalog(species, { includeBasic: true });
            const result = validateNegamonSkillLoadout({
                requestedSkillIds: [],
                unlockedSkills: catalog,
                fallbackToFirstSkills: true,
            });

            expect(result.normalizedSkillIds[0]).toBe("basic-attack");
            expect(result.normalizedSkillIds.length).toBeGreaterThan(0);
            expect(result.normalizedSkillIds.length).toBeLessThanOrEqual(4);

            // Every selected skill must exist in the catalog
            const catalogIds = new Set(catalog.map((s) => s.id));
            for (const skillId of result.normalizedSkillIds) {
                expect(catalogIds.has(skillId)).toBe(true);
            }

            // Unselected non-basic skills must have unlock level <= lowest selected non-basic
            const nonBasicSelected = result.normalizedSkillIds.filter((id) => !isNegamonBasicAttackMoveId(id));
            const nonBasicCatalog = catalog.filter((s) => !isNegamonBasicAttackMoveId(s.id));
            if (nonBasicCatalog.length > 0 && nonBasicSelected.length > 0) {
                const minSelectedLevel = Math.min(
                    ...nonBasicSelected.map((id) => catalog.find((s) => s.id === id)?.unlock.level ?? 0)
                );
                const maxUnselectedLevel = Math.max(
                    0,
                    ...nonBasicCatalog
                        .filter((s) => !nonBasicSelected.includes(s.id))
                        .map((s) => s.unlock.level ?? 0)
                );
                expect(maxUnselectedLevel).toBeLessThanOrEqual(minSelectedLevel);
            }
        }
    });

    it("max-level snapshot includes the species ultimate (learnRank 6) skill in auto-built loadout", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            const ultimateMove = species.moves.find((move) => (move.learnRank ?? 0) >= 6);
            if (!ultimateMove) continue;

            const settings = createDefaultNegamonSettings();
            settings.enabled = true;
            settings.studentMonsters = { "student-b3-ult": species.id };

            const snapshot = createNegamonMonsterSnapshot({
                studentId: "student-b3-ult",
                points: 10000,
                levelConfig: [{ name: "Common", minScore: 0 }],
                negamonSettings: settings,
            });

            expect(snapshot).not.toBeNull();
            expect(snapshot?.equippedSkillIds).toContain(ultimateMove.id);
        }
    });
});
