import { describe, expect, it } from "vitest";
import {
    applyConsumeInventory,
    removeBattleItemsFromInventory,
    sanitizeLoadoutAgainstInventory,
    validateBattleLoadout,
} from "@/lib/battle-loadout";
import {
    calculateNegamonBattleGoldReward,
    NEGAMON_BATTLE_GOLD_MULTIPLIER_CAP,
} from "@/lib/game-negamon";

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
