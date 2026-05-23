import type { GameInventoryChange, GameItemDefinition } from "./types";

export function createEmptyInventoryChange(): GameInventoryChange {
    return {
        consumedItemIds: [],
        grantedItemIds: [],
    };
}

export function createInventoryGrantChange(itemIds: string[]): GameInventoryChange {
    return {
        consumedItemIds: [],
        grantedItemIds: itemIds.map((itemId) => itemId.trim()).filter(Boolean),
    };
}

export function createInventoryConsumeChange(itemIds: string[]): GameInventoryChange {
    return {
        consumedItemIds: itemIds.map((itemId) => itemId.trim()).filter(Boolean),
        grantedItemIds: [],
    };
}

export function createInventoryEquipChange(itemId: string | null): GameInventoryChange {
    return {
        consumedItemIds: [],
        grantedItemIds: [],
        equippedItemIds: itemId ? [itemId] : [],
        unequippedItemIds: itemId ? [] : ["equippedFrame"],
    };
}

export function mergeInventoryChanges(changes: GameInventoryChange[]): GameInventoryChange {
    return {
        consumedItemIds: changes.flatMap((change) => change.consumedItemIds),
        grantedItemIds: changes.flatMap((change) => change.grantedItemIds),
        equippedItemIds: changes.flatMap((change) => change.equippedItemIds ?? []),
        unequippedItemIds: changes.flatMap((change) => change.unequippedItemIds ?? []),
    };
}

export function applyInventoryChange(inventory: string[], change: GameInventoryChange): string[] {
    const next = [...inventory];

    for (const itemId of change.consumedItemIds) {
        const index = next.indexOf(itemId);
        if (index >= 0) next.splice(index, 1);
    }

    next.push(...change.grantedItemIds);
    return next;
}

export function applyInventoryChangeStrict(inventory: string[], change: GameInventoryChange): string[] {
    const next = [...inventory];

    for (const itemId of change.consumedItemIds) {
        const index = next.indexOf(itemId);
        if (index === -1) {
            throw new Error(`MISSING_ITEM:${itemId}`);
        }
        next.splice(index, 1);
    }

    next.push(...change.grantedItemIds);
    return next;
}

export function countInventoryItem(inventory: string[], itemId: string): number {
    let count = 0;
    for (const ownedItemId of inventory) {
        if (ownedItemId === itemId) count += 1;
    }
    return count;
}

export function hasInventoryItems(inventory: string[], itemIds: string[]): boolean {
    const remaining = [...inventory];
    for (const itemId of itemIds) {
        const index = remaining.indexOf(itemId);
        if (index === -1) return false;
        remaining.splice(index, 1);
    }
    return true;
}

export function createGameItemDefinition(input: GameItemDefinition): GameItemDefinition {
    return {
        ...input,
        id: input.id.trim(),
        effects: input.effects.map((effect) => ({ ...effect })),
    };
}

export function createBattleItemConsumeChange(itemIds: string[]): GameInventoryChange {
    return createInventoryConsumeChange(itemIds);
}
