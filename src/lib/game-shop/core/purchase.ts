import {
    createGameEconomyMutation,
    createInventoryGrantChange,
    countInventoryItem,
    type GameEconomyMutation,
    type GameInventoryChange,
} from "@/lib/game-core";

export type GameShopItemType = "frame" | "battle_item";

export type GameShopCatalogItem = {
    id: string;
    type: GameShopItemType;
    price: number;
    rarity?: string;
};

export type ShopPurchasePlan =
    | { ok: false; reason: "already_owned" | "not_enough_gold" }
    | {
          ok: true;
          economyMutation: GameEconomyMutation;
          inventoryChange: GameInventoryChange;
      };

export function createShopPurchaseIdempotencyKey(input: {
    studentId: string;
    item: GameShopCatalogItem;
}): string | undefined {
    if (input.item.type !== "frame") return undefined;
    return `shop:${input.studentId}:frame:${input.item.id}`;
}

export function createShopPurchasePlan(input: {
    studentId: string;
    classId?: string | null;
    gold: number;
    inventory: string[];
    item: GameShopCatalogItem;
}): ShopPurchasePlan {
    if (input.item.type === "frame" && countInventoryItem(input.inventory, input.item.id) > 0) {
        return { ok: false, reason: "already_owned" };
    }

    if (input.gold < input.item.price) {
        return { ok: false, reason: "not_enough_gold" };
    }

    return {
        ok: true,
        economyMutation: createGameEconomyMutation({
            studentId: input.studentId,
            classId: input.classId,
            type: "spend",
            source: "shop",
            amount: -input.item.price,
            balanceBefore: input.gold,
            sourceRefId: input.item.id,
            idempotencyKey: createShopPurchaseIdempotencyKey({
                studentId: input.studentId,
                item: input.item,
            }),
        }),
        inventoryChange: createInventoryGrantChange([input.item.id]),
    };
}
