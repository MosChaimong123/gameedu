import type { GameInventoryChange } from "@/lib/game-core";
import { normalizeLoadoutInput, sanitizeLoadoutAgainstInventory } from "@/lib/battle-loadout";
import { getBattleItemById, resolveLegacyBattleItemId } from "@/lib/shop-items";

export function normalizeStudentInventoryItemIds(rawInventory: unknown): string[] {
    if (!Array.isArray(rawInventory)) return [];
    return rawInventory
        .map((value) => String(value).trim())
        .filter(Boolean)
        .map(resolveLegacyBattleItemId);
}

export function normalizeRewardItemIds(itemIds: readonly string[] | null | undefined): string[] {
    return (itemIds ?? [])
        .map((itemId) => itemId.trim())
        .filter(Boolean)
        .map(resolveLegacyBattleItemId);
}

export function normalizeInventoryChangeIds(change: GameInventoryChange): GameInventoryChange {
    return {
        ...change,
        consumedItemIds: normalizeRewardItemIds(change.consumedItemIds),
        grantedItemIds: normalizeRewardItemIds(change.grantedItemIds),
        equippedItemIds: normalizeRewardItemIds(change.equippedItemIds ?? []),
        unequippedItemIds: normalizeRewardItemIds(change.unequippedItemIds ?? []),
    };
}

export function normalizeStoredBattleLoadoutIds(rawLoadout: unknown): string[] {
    return normalizeLoadoutInput(rawLoadout).map(resolveLegacyBattleItemId);
}

export function normalizeStudentBattleKit(input: {
    inventory: unknown;
    battleLoadout: unknown;
}): { inventory: string[]; battleLoadout: string[] } {
    const inventory = normalizeStudentInventoryItemIds(input.inventory);
    const requestedLoadout = normalizeStoredBattleLoadoutIds(input.battleLoadout).filter((itemId) => {
        const item = getBattleItemById(itemId);
        return item?.battleKind !== "reward";
    });

    return {
        inventory,
        battleLoadout: sanitizeLoadoutAgainstInventory(requestedLoadout, inventory),
    };
}
