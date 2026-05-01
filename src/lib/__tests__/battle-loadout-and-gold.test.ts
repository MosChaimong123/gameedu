import { describe, expect, it } from "vitest";
import { applyConsumeInventory, validateBattleLoadout } from "@/lib/battle-loadout";
import { calcGoldReward, BATTLE_GOLD_MULT_CAP } from "@/lib/battle-engine";
import type { BattleFighter } from "@/lib/battle-engine";

function minimalWinner(overrides: Partial<BattleFighter> = {}): BattleFighter {
    return {
        studentId: "w",
        studentName: "W",
        speciesId: "s",
        formIcon: "",
        formName: "",
        speciesName: "",
        type: "FIRE",
        maxHp: 10,
        currentHp: 10,
        baseStats: { hp: 10, atk: 10, def: 10, spd: 10 },
        statStages: { atk: 1, def: 1, spd: 1, waterDmg: 1, ignoreDef: false },
        effects: [],
        moves: [],
        rankIndex: 0,
        badlyPoisonTick: 0,
        immunities: [],
        activeItems: [],
        goldBonus: 0,
        goldMultiplier: 1,
        abilityUsed: false,
        maxEnergy: 10,
        currentEnergy: 10,
        energyRegenPerTurn: 0,
        actionMeter: 0,
        ...overrides,
    };
}

describe("validateBattleLoadout", () => {
    it("accepts empty loadout", () => {
        const v = validateBattleLoadout([], ["item_buckler"]);
        expect(v.ok).toBe(true);
        expect(v.ok && v.normalizedIds).toEqual([]);
    });

    it("rejects two stat_boost items", () => {
        const inv = ["item_iron_shield", "item_spark_charm"];
        const v = validateBattleLoadout(["item_iron_shield", "item_spark_charm"], inv);
        expect(v.ok).toBe(false);
    });

    it("allows valid mixed categories", () => {
        const inv = ["item_iron_shield", "item_lucky_coin"];
        const v = validateBattleLoadout(
            ["item_iron_shield", "item_lucky_coin"],
            inv
        );
        expect(v.ok).toBe(true);
    });
});

describe("applyConsumeInventory", () => {
    it("removes one occurrence per id", () => {
        expect(applyConsumeInventory(["a", "b", "a"], ["a", "a"])).toEqual(["b"]);
    });
});

describe("calcGoldReward", () => {
    it("applies flat then multiplier", () => {
        const w = minimalWinner({ goldBonus: 10, goldMultiplier: 1.25 });
        const l = minimalWinner({ studentId: "l" });
        expect(calcGoldReward(w, l)).toBe(Math.floor((30 + 10) * 1.25));
    });

    it("respects multiplier cap constant", () => {
        expect(BATTLE_GOLD_MULT_CAP).toBeGreaterThanOrEqual(1);
    });
});
