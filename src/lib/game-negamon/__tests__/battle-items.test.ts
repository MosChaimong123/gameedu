import { describe, expect, it } from "vitest";
import {
    createNegamonBattleItemDefinition,
    findNegamonBattleItemDefinition,
    getNegamonBattleItemCatalog,
    mapBattleEffectToGameItemEffects,
    validateNegamonBattleItemLoadout,
} from "@/lib/game-negamon";
import { getBattleItemById } from "@/lib/shop-items";

describe("Negamon battle items V2", () => {
    it("maps legacy battle effects to game item effects", () => {
        expect(mapBattleEffectToGameItemEffects({
            statBoost: { atk: 1.15, def: 1.1 },
            immunity: ["BURN"],
            goldBonus: 5,
            goldMultiplier: 1.25,
        })).toEqual([
            { kind: "stat_boost", stat: "atk", multiplier: 1.15 },
            { kind: "stat_boost", stat: "def", multiplier: 1.1 },
            { kind: "status_immunity", status: "BURN" },
            { kind: "gold_bonus", amount: 5 },
            { kind: "gold_multiplier", multiplier: 1.25 },
        ]);
    });

    it("creates battle item definitions from the shop catalog", () => {
        const item = createNegamonBattleItemDefinition(getBattleItemById("held_guard_core")!);

        expect(item).toMatchObject({
            id: "held_guard_core",
            itemType: "battle",
            rarity: "rare",
            allowedInBattle: true,
            stackable: true,
            battleCategory: "held",
        });
        expect(item?.effects).toContainEqual({ kind: "damage_taken_multiplier", multiplier: 0.9 });
        expect(findNegamonBattleItemDefinition("frame_fire_t1")).toBeNull();
    });

    it("builds a battle item catalog", () => {
        const catalog = getNegamonBattleItemCatalog();

        expect(catalog.length).toBeGreaterThan(0);
        expect(catalog.map((item) => item.id)).toContain("reward_lucky_coin");
    });

    it("validates loadout ownership, categories, and consume delta", () => {
        const valid = validateNegamonBattleItemLoadout({
            loadoutIds: ["item_iron_shield"],
            inventory: ["item_iron_shield"],
        });
        const duplicateCategory = validateNegamonBattleItemLoadout({
            loadoutIds: ["held_guard_core", "item_spark_charm"],
            inventory: ["held_guard_core", "item_spark_charm"],
        });
        const rewardRejected = validateNegamonBattleItemLoadout({
            loadoutIds: ["reward_lucky_coin"],
            inventory: ["reward_lucky_coin"],
        });

        expect(valid).toMatchObject({
            ok: true,
            normalizedIds: ["held_guard_core"],
            inventoryChange: {
                consumedItemIds: ["held_guard_core"],
                grantedItemIds: [],
            },
        });
        expect(duplicateCategory).toMatchObject({ ok: false, code: "CATEGORY_LIMIT" });
        expect(rewardRejected).toMatchObject({ ok: false, code: "CATEGORY_LIMIT", rejectedItemId: "reward_lucky_coin" });
    });
});
