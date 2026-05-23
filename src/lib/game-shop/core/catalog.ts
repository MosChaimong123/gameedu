import {
    ALL_ITEMS,
    getItemById,
    groupBattleItemsByCategory,
    type ShopBattleItemCategory,
    type ShopItem,
} from "@/lib/shop-items";

export type GameShopCatalogGroup = {
    category: ShopBattleItemCategory;
    items: ShopItem[];
};

export function getGameShopCatalogItems(): ShopItem[] {
    return [...ALL_ITEMS];
}

export function getGameShopCatalogItemById(itemId: string): ShopItem | undefined {
    return getItemById(itemId);
}

export function getGameShopFrameItemById(itemId: string | null): ShopItem | null {
    if (!itemId) return null;
    const item = getGameShopCatalogItemById(itemId);
    return item?.type === "frame" ? item : null;
}

export function groupGameShopBattleItems(items: ShopItem[] = getGameShopCatalogItems()): GameShopCatalogGroup[] {
    return groupBattleItemsByCategory(items);
}
