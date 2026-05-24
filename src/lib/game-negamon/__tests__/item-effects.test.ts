import { describe, expect, it } from "vitest";
import type { NegamonMonsterSnapshot } from "@/lib/game-negamon";
import {
    applyNegamonBattleItemInventoryChange,
    applyNegamonBattleItemRuntimeEffects,
    applyNegamonConsumableBattleItemEffect,
    createNegamonBattleItemRuntimePlan,
    createNegamonBattleItemRuntimePlanOrEmpty,
} from "@/lib/game-negamon";
import { applyNegamonLiteDifficultyModifier, createNegamonLiteCombatant } from "@/lib/negamon-lite/session";

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
            loadoutIds: ["item_iron_shield", "item_lucky_coin"],
            inventory: ["item_iron_shield", "item_lucky_coin"],
        });

        expect(plan).toMatchObject({
            ok: true,
            itemIds: ["item_iron_shield", "item_lucky_coin"],
            inventoryChange: {
                consumedItemIds: ["item_iron_shield", "item_lucky_coin"],
                grantedItemIds: [],
            },
            statMultipliers: { atk: 1, def: 1.15, spd: 1 },
            rewardModifiers: { goldBonus: 15, goldMultiplier: 1, expMultiplier: 1 },
        });
        expect(plan.ok && plan.effects).toContainEqual({ kind: "gold_bonus", amount: 15 });
        expect(plan.ok && plan.statusImmunities).toEqual([]);
    });

    it("maps status immunity items into battle runtime immunities", () => {
        const plan = createNegamonBattleItemRuntimePlan({
            loadoutIds: ["item_antidote_charm"],
            inventory: ["item_antidote_charm"],
            catalog: [
                {
                    id: "item_antidote_charm",
                    nameKey: "Antidote Charm",
                    rarity: "rare",
                    itemType: "battle",
                    stackable: true,
                    allowedInBattle: true,
                    battleCategory: "status",
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
            loadoutIds: ["item_iron_shield"],
            inventory: ["item_iron_shield", "item_lucky_coin"],
        });

        expect(applyNegamonBattleItemInventoryChange({
            inventory: ["item_iron_shield", "item_lucky_coin"],
            plan,
        })).toEqual(["item_lucky_coin"]);
        expect(() =>
            applyNegamonBattleItemInventoryChange({ inventory: [], plan })
        ).toThrow("MISSING_ITEM:item_iron_shield");
    });

    it("applies item stat and reward modifiers to lite battle combatants", () => {
        const combatant = createNegamonLiteCombatant({
            side: "player",
            student: { id: "student-1", name: "A", behaviorPoints: 20 },
            monster: makeMonster(["item_iron_shield", "item_lucky_coin"]),
        });

        expect(combatant.stats.defense).toBe(23);
        expect(combatant.battleItemIds).toEqual(["item_iron_shield", "item_lucky_coin"]);
        expect(combatant.itemEffectKinds).toEqual(["stat_boost", "gold_bonus"]);
        expect(combatant.rewardGoldBonus).toBe(15);
        expect(combatant.rewardGoldMultiplier).toBe(1);
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
        ]);
        expect(plan.statusImmunities).toEqual(["POISON", "BADLY_POISON"]);
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

    it("applies opponent difficulty modifiers deterministically", () => {
        const combatant = createNegamonLiteCombatant({
            side: "opponent",
            student: { id: "student-2", name: "B", behaviorPoints: 20 },
            monster: makeMonster(),
        });
        const boss = applyNegamonLiteDifficultyModifier(combatant, "boss");

        expect(boss.difficulty).toBe("boss");
        expect(boss.stats.hp).toBe(135);
        expect(boss.stats.attack).toBe(34);
        expect(boss.stats.defense).toBe(22);
    });

    it("supports consumable HP and energy restore item effects for future active-use items", () => {
        const combatant = createNegamonLiteCombatant({
            side: "player",
            student: { id: "student-1", name: "A", behaviorPoints: 20 },
            monster: makeMonster(),
        });
        const healed = applyNegamonConsumableBattleItemEffect({
            combatant: { ...combatant, hp: 40 },
            effect: { kind: "restore_hp", percent: 25 },
        });
        const energized = applyNegamonConsumableBattleItemEffect({
            combatant: { ...combatant, energy: 10 },
            effect: { kind: "restore_energy", amount: 12 },
        });

        expect(healed.hp).toBe(65);
        expect(energized.energy).toBe(22);
    });

    it("can derive stat modifiers from equipped item ids on monster snapshots", () => {
        const runtime = applyNegamonBattleItemRuntimeEffects({
            monster: makeMonster(["item_spark_charm", "item_lucky_coin"]),
        });

        expect(runtime.stats.atk).toBe(32);
        expect(runtime.plan.rewardModifiers.goldBonus).toBe(15);
    });
});
