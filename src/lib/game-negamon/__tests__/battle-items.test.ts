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
        const item = createNegamonBattleItemDefinition(getBattleItemById("item_iron_shield")!);

        expect(item).toMatchObject({
            id: "item_iron_shield",
            itemType: "battle",
            rarity: "rare",
            allowedInBattle: true,
            stackable: true,
            battleCategory: "stat_boost",
        });
        expect(item?.effects).toContainEqual({ kind: "stat_boost", stat: "def", multiplier: 1.15 });
        expect(findNegamonBattleItemDefinition("frame_fire_t1")).toBeNull();
    });

    it("builds a battle item catalog", () => {
        const catalog = getNegamonBattleItemCatalog();

        expect(catalog.length).toBeGreaterThan(0);
        expect(catalog.map((item) => item.id)).toContain("item_lucky_coin");
    });

    it("validates loadout ownership, categories, and consume delta", () => {
        const valid = validateNegamonBattleItemLoadout({
            loadoutIds: ["item_iron_shield", "item_lucky_coin"],
            inventory: ["item_iron_shield", "item_lucky_coin"],
        });
        const duplicateCategory = validateNegamonBattleItemLoadout({
            loadoutIds: ["item_iron_shield", "item_spark_charm"],
            inventory: ["item_iron_shield", "item_spark_charm"],
        });
        const missing = validateNegamonBattleItemLoadout({
            loadoutIds: ["item_buckler"],
            inventory: [],
        });

        expect(valid).toMatchObject({
            ok: true,
            normalizedIds: ["item_iron_shield", "item_lucky_coin"],
            inventoryChange: {
                consumedItemIds: ["item_iron_shield", "item_lucky_coin"],
                grantedItemIds: [],
            },
        });
        expect(duplicateCategory).toMatchObject({ ok: false, code: "CATEGORY_LIMIT" });
        expect(missing).toMatchObject({ ok: false, code: "NOT_IN_STOCK", rejectedItemId: "item_buckler" });
    });
});
