import {
    applyInventoryChange,
    applyInventoryChangeStrict,
    createInventoryConsumeChange,
} from "@/lib/game-core";
import { validateNegamonBattleItemLoadout } from "@/lib/game-negamon/core/battle-items";

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
    const validation = validateNegamonBattleItemLoadout({ loadoutIds, inventory });
    if (validation.ok) return { ok: true, normalizedIds: validation.normalizedIds };
    const message =
        validation.code === "DUPLICATE_SLOT"
            ? BATTLE_LOADOUT_DUPLICATE_ITEM
            : validation.code === "UNKNOWN_ITEM"
              ? `${BATTLE_LOADOUT_UNKNOWN_ITEM}:${validation.rejectedItemId ?? ""}`
              : validation.code === "CATEGORY_LIMIT"
                ? validation.message
                : `${BATTLE_LOADOUT_NOT_OWNED}:${validation.rejectedItemId ?? ""}`;
    return { ok: false, code: validation.code, message };
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
