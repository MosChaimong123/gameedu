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
                idempotencyKey: "shop:student-1:frame:frame_fire_t1",
            },
            inventoryChange: {
                consumedItemIds: [],
                grantedItemIds: ["frame_fire_t1"],
            },
        });
    });

    it("allows stackable battle item purchases but blocks duplicate frames", () => {
        expect(
            createShopPurchasePlan({
                studentId: "student-1",
                gold: 500,
                inventory: ["item_buckler"],
                item: { id: "item_buckler", type: "battle_item", price: 100 },
            })
        ).toMatchObject({
            ok: true,
            inventoryChange: { grantedItemIds: ["item_buckler"] },
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
        expect(getGameShopFrameItemById("item_buckler")).toBeNull();
        expect(groupGameShopBattleItems().length).toBeGreaterThan(0);
    });
});
