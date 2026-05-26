import { describe, expect, it } from "vitest";
import type { NegamonMonsterSnapshot } from "@/lib/game-negamon";
import {
    applyNegamonBattleItemInventoryChange,
    applyNegamonBattleItemRuntimeEffects,
    applyNegamonConsumableBattleItemEffect,
    createNegamonBattleItemRuntimePlan,
    createNegamonBattleItemRuntimePlanOrEmpty,
} from "@/lib/game-negamon";

function makeMonster(itemIds: string[] = []): NegamonMonsterSnapshot {
    return {
        studentId: "student-1",
        speciesId: "naga",
        speciesName: "Naga",
        formName: "Naga",
        rankIndex: 2,
        level: 3,
        types: ["WATER"],
        stats: { hp: 100, atk: 30, def: 20, spd: 10 },
        skills: [],
        monsterId: "student-1:naga",
        displayName: "A",
        formIcon: "N",
        formColor: "#000",
        elementTypes: ["WATER"],
        exp: 0,
        expToNextLevel: 100,
        evolutionStage: 2,
        baseStats: { hp: 100, atk: 30, def: 20, spd: 10 },
        derivedStats: { maxHp: 100, atk: 30, def: 20, spd: 10, maxEnergy: 40, energyRegen: 10 },
        unlockedSkillIds: [],
        equippedSkillIds: [],
        equippedItemIds: itemIds,
        skillCatalog: [],
        unlockedMoves: [],
    };
}

describe("Negamon item effect runtime V2", () => {
    it("creates runtime item plans with stat and reward modifiers", () => {
        const plan = createNegamonBattleItemRuntimePlan({
            loadoutIds: ["held_guard_core"],
            inventory: ["held_guard_core"],
        });

        expect(plan).toMatchObject({
            ok: true,
            itemIds: ["held_guard_core"],
            inventoryChange: {
                consumedItemIds: ["held_guard_core"],
                grantedItemIds: [],
            },
            statMultipliers: { atk: 1, def: 1, spd: 1 },
            rewardModifiers: { goldBonus: 0, goldMultiplier: 1, expMultiplier: 1 },
        });
        expect(plan.ok && plan.effects).toContainEqual({ kind: "damage_taken_multiplier", multiplier: 0.9 });
        expect(plan.ok && plan.statusImmunities).toEqual([]);
    });

    it("maps status immunity items into battle runtime immunities", () => {
        const plan = createNegamonBattleItemRuntimePlan({
            loadoutIds: ["item_antidote_charm"],
            inventory: ["item_antidote_charm"],
            catalog: [
                {
                    id: "held_clear_mind_charm",
                    nameKey: "Antidote Charm",
                    rarity: "rare",
                    itemType: "battle",
                    stackable: true,
                    allowedInBattle: true,
                    battleCategory: "held",
                    battleKind: "held",
                    effects: [{ kind: "status_immunity", status: "POISON" }],
                },
            ],
        });

        expect(plan.ok).toBe(true);
        if (!plan.ok) throw new Error("expected ok plan");
        expect(plan.statusImmunities).toEqual(["POISON", "BADLY_POISON"]);
    });

    it("falls back to an empty plan when saved loadout is no longer owned", () => {
        const plan = createNegamonBattleItemRuntimePlanOrEmpty({
            loadoutIds: ["item_iron_shield"],
            inventory: [],
        });

        expect(plan).toMatchObject({
            ok: true,
            itemIds: [],
            inventoryChange: { consumedItemIds: [], grantedItemIds: [] },
            statMultipliers: { atk: 1, def: 1, spd: 1 },
        });
    });

    it("applies battle item inventory changes exactly once", () => {
        const plan = createNegamonBattleItemRuntimePlanOrEmpty({
            loadoutIds: ["held_guard_core"],
            inventory: ["held_guard_core", "reward_lucky_coin"],
        });

        expect(applyNegamonBattleItemInventoryChange({
            inventory: ["held_guard_core", "reward_lucky_coin"],
            plan,
        })).toEqual(["reward_lucky_coin"]);
        expect(() =>
            applyNegamonBattleItemInventoryChange({ inventory: [], plan })
        ).toThrow("MISSING_ITEM:held_guard_core");
    });

    it("maps content pack restore and immunity items from the shop catalog", () => {
        const plan = createNegamonBattleItemRuntimePlan({
            loadoutIds: ["item_minor_potion", "item_antidote_charm"],
            inventory: ["item_minor_potion", "item_antidote_charm"],
        });

        expect(plan.ok).toBe(true);
        if (!plan.ok) throw new Error("expected ok plan");
        expect(plan.effects).toEqual([
            { kind: "restore_hp", percent: 25 },
            { kind: "status_immunity", status: "POISON" },
            { kind: "status_immunity", status: "BURN" },
            { kind: "status_immunity", status: "SLEEP" },
        ]);
        expect(plan.statusImmunities).toEqual(["POISON", "BADLY_POISON", "BURN", "SLEEP"]);
    });

    it("maps the energy orb into an active-use energy restore effect", () => {
        const plan = createNegamonBattleItemRuntimePlan({
            loadoutIds: ["item_energy_orb"],
            inventory: ["item_energy_orb"],
        });

        expect(plan.ok).toBe(true);
        if (!plan.ok) throw new Error("expected ok plan");
        expect(plan.effects).toEqual([{ kind: "restore_energy", amount: 18 }]);
    });

    it("supports consumable HP and energy restore item effects for future active-use items", () => {
        const healed = applyNegamonConsumableBattleItemEffect({
            combatant: { hp: 40, energy: 30, maxEnergy: 40, stats: { hp: 100 } },
            effect: { kind: "restore_hp", percent: 25 },
        });
        const energized = applyNegamonConsumableBattleItemEffect({
            combatant: { hp: 100, energy: 10, maxEnergy: 40, stats: { hp: 100 } },
            effect: { kind: "restore_energy", amount: 12 },
        });

        expect(healed.hp).toBe(65);
        expect(energized.energy).toBe(22);
    });

    it("can derive stat modifiers from equipped item ids on monster snapshots", () => {
        const runtime = applyNegamonBattleItemRuntimeEffects({
            monster: makeMonster(["item_spark_charm"]),
        });

        expect(runtime.stats.atk).toBe(30);
        expect(runtime.plan.effects).toContainEqual({ kind: "crit_bonus", percent: 18 });
    });
});
