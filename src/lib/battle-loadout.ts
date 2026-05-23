import { getBattleItemById } from "@/lib/shop-items";
import {
    applyInventoryChange,
    applyInventoryChangeStrict,
    countInventoryItem,
    createInventoryConsumeChange,
} from "@/lib/game-core";
import type { ShopBattleItemCategory } from "@/lib/shop-items";

export type BattleLoadoutValidation =
    | { ok: true; normalizedIds: string[] }
    | { ok: false; code: string; message: string };

export const BATTLE_LOADOUT_DUPLICATE_ITEM = "battleLoadoutDuplicateItem";
export const BATTLE_LOADOUT_UNKNOWN_ITEM = "battleLoadoutUnknownItem";
export const BATTLE_LOADOUT_CATEGORY_LIMIT = "battleLoadoutCategoryLimit";
export const BATTLE_LOADOUT_NOT_OWNED = "battleLoadoutNotOwned";

/** Client-side mirror: remove one stack unit per id (no throw if missing). */
export function applyConsumeInventory(inventory: string[], consumedIds: string[]): string[] {
    return applyInventoryChange(inventory, createInventoryConsumeChange(consumedIds));
}

/** Remove one occurrence of each id from inventory (order-preserving). */
export function removeBattleItemsFromInventory(
    inventory: string[],
    itemIdsToRemove: string[]
): string[] {
    return applyInventoryChangeStrict(inventory, createInventoryConsumeChange(itemIdsToRemove));
}

/**
 * Validates battle loadout: only known battle items, no duplicate IDs in loadout,
 * at most one item per battleCategory, sufficient stack in inventory.
 */
export function validateBattleLoadout(
    loadoutIds: string[],
    inventory: string[]
): BattleLoadoutValidation {
    const seen = new Set<string>();
    const perCategory = new Map<ShopBattleItemCategory, string>();

    for (const rawId of loadoutIds) {
        const id = String(rawId).trim();
        if (!id) continue;

        if (seen.has(id)) {
            return { ok: false, code: "DUPLICATE_SLOT", message: BATTLE_LOADOUT_DUPLICATE_ITEM };
        }
        seen.add(id);

        const item = getBattleItemById(id);
        if (!item) {
            return { ok: false, code: "UNKNOWN_ITEM", message: `${BATTLE_LOADOUT_UNKNOWN_ITEM}:${id}` };
        }

        const cat = item.battleCategory ?? "stat_boost";
        if (perCategory.has(cat)) {
            return {
                ok: false,
                code: "CATEGORY_LIMIT",
                message: `${BATTLE_LOADOUT_CATEGORY_LIMIT}:${cat}`,
            };
        }
        perCategory.set(cat, id);

        if (countInventoryItem(inventory, id) < 1) {
            return { ok: false, code: "NOT_IN_STOCK", message: `${BATTLE_LOADOUT_NOT_OWNED}:${id}` };
        }
    }

    return { ok: true, normalizedIds: [...seen] };
}

/** Merge category rules: ensures combined challenger+defender doesn't double-apply same logic — each side validated separately. */
export function normalizeLoadoutInput(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => String(x).trim()).filter(Boolean);
}

/** Keep only loadout entries that still exist in inventory (one-by-one stack aware). */
export function sanitizeLoadoutAgainstInventory(loadoutIds: string[], inventory: string[]): string[] {
    const inv = [...inventory];
    const out: string[] = [];
    for (const id of loadoutIds) {
        const idx = inv.indexOf(id);
        if (idx === -1) continue;
        out.push(id);
        inv.splice(idx, 1);
    }
    return out;
}
