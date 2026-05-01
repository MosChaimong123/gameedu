import { getBattleItemById } from "@/lib/shop-items";
import type { ShopBattleItemCategory } from "@/lib/shop-items";

export type BattleLoadoutValidation =
    | { ok: true; normalizedIds: string[] }
    | { ok: false; code: string; message: string };

/** Client-side mirror: remove one stack unit per id (no throw if missing). */
export function applyConsumeInventory(inventory: string[], consumedIds: string[]): string[] {
    const out = [...inventory];
    for (const id of consumedIds) {
        const i = out.indexOf(id);
        if (i >= 0) out.splice(i, 1);
    }
    return out;
}

/** Remove one occurrence of each id from inventory (order-preserving). */
export function removeBattleItemsFromInventory(
    inventory: string[],
    itemIdsToRemove: string[]
): string[] {
    const inv = [...inventory];
    for (const id of itemIdsToRemove) {
        const idx = inv.indexOf(id);
        if (idx === -1) {
            throw new Error(`MISSING_ITEM:${id}`);
        }
        inv.splice(idx, 1);
    }
    return inv;
}

function countInInventory(inventory: string[], itemId: string): number {
    let n = 0;
    for (const x of inventory) {
        if (x === itemId) n += 1;
    }
    return n;
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
            return { ok: false, code: "DUPLICATE_SLOT", message: "Duplicate item in loadout" };
        }
        seen.add(id);

        const item = getBattleItemById(id);
        if (!item) {
            return { ok: false, code: "UNKNOWN_ITEM", message: `Not a battle item: ${id}` };
        }

        const cat = item.battleCategory ?? "stat_boost";
        if (perCategory.has(cat)) {
            return {
                ok: false,
                code: "CATEGORY_LIMIT",
                message: `Only one ${cat} item allowed`,
            };
        }
        perCategory.set(cat, id);

        if (countInInventory(inventory, id) < 1) {
            return { ok: false, code: "NOT_IN_STOCK", message: `Not owned: ${id}` };
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
