import { describe, expect, it } from "vitest";
import {
    createShopPurchasePlan,
    getGameShopCatalogItemById,
    getGameShopFrameItemById,
    groupGameShopBattleItems,
} from "@/lib/game-shop";

describe("game-shop purchase contracts", () => {
    it("creates a frame purchase economy mutation and inventory grant", () => {
        const plan = createShopPurchasePlan({
            studentId: "student-1",
            classId: "class-1",
            gold: 250,
            inventory: [],
            item: {
                id: "frame_fire_t1",
                type: "frame",
                price: 100,
                rarity: "common",
            },
        });

        expect(plan).toMatchObject({
            ok: true,
            economyMutation: {
                studentId: "student-1",
                classId: "class-1",
                type: "spend",
                source: "shop",
                amount: -100,
                balanceBefore: 250,
                balanceAfter: 150,
                sourceRefId: "frame_fire_t1",
                idempotencyKey: "shop:student-1:single:frame_fire_t1",
            },
            inventoryChange: {
                consumedItemIds: [],
                grantedItemIds: ["frame_fire_t1"],
            },
        });
    });

    it("blocks duplicate held items and frames but allows stackable consumables", () => {
        expect(
            createShopPurchasePlan({
                studentId: "student-1",
                gold: 500,
                inventory: ["held_guard_core"],
                item: { id: "held_guard_core", type: "battle_item", price: 100 },
            })
        ).toEqual({ ok: false, reason: "already_owned" });

        expect(
            createShopPurchasePlan({
                studentId: "student-1",
                gold: 500,
                inventory: ["use_vital_vial"],
                item: { id: "use_vital_vial", type: "battle_item", price: 150 },
            })
        ).toMatchObject({
            ok: true,
            inventoryChange: { grantedItemIds: ["use_vital_vial"] },
        });

        expect(
            createShopPurchasePlan({
                studentId: "student-1",
                gold: 500,
                inventory: ["frame_fire_t1"],
                item: { id: "frame_fire_t1", type: "frame", price: 100 },
            })
        ).toEqual({ ok: false, reason: "already_owned" });
    });

    it("normalizes shop catalog lookups and battle item groups", () => {
        expect(getGameShopCatalogItemById("frame_fire_t1")).toMatchObject({
            id: "frame_fire_t1",
            type: "frame",
        });
        expect(getGameShopCatalogItemById("item_buckler")).toMatchObject({
            id: "held_guard_core",
            type: "battle_item",
        });
        expect(getGameShopFrameItemById("held_guard_core")).toBeNull();
        expect(groupGameShopBattleItems().length).toBeGreaterThan(0);
    });
});
