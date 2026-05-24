import {
    countInventoryItem,
    createBattleItemConsumeChange,
    createGameItemDefinition,
    type GameInventoryChange,
    type GameItemDefinition,
    type GameItemEffect,
} from "@/lib/game-core";
import {
    BATTLE_ITEMS,
    getBattleItemById,
    resolveLegacyBattleItemId,
    shopItemDescKey,
    shopItemNameKey,
    type BattleEffect,
    type ShopBattleItemCategory,
    type ShopItem,
} from "@/lib/shop-items";

export type NegamonBattleItemDefinition = GameItemDefinition & {
    battleCategory: ShopBattleItemCategory;
    battleKind: "held" | "usable" | "reward";
};

export type NegamonBattleItemLoadoutValidation =
    | {
          ok: true;
          normalizedIds: string[];
          items: NegamonBattleItemDefinition[];
          inventoryChange: GameInventoryChange;
      }
    | {
          ok: false;
          code: "DUPLICATE_SLOT" | "UNKNOWN_ITEM" | "CATEGORY_LIMIT" | "NOT_IN_STOCK";
          message: string;
          rejectedItemId?: string;
      };

export function mapBattleEffectToGameItemEffects(effect: BattleEffect | undefined): GameItemEffect[] {
    if (!effect) return [];
    const effects: GameItemEffect[] = [];
    if (effect.statBoost?.atk) {
        effects.push({ kind: "stat_boost", stat: "atk", multiplier: effect.statBoost.atk });
    }
    if (effect.statBoost?.def) {
        effects.push({ kind: "stat_boost", stat: "def", multiplier: effect.statBoost.def });
    }
    if (effect.statBoost?.spd) {
        effects.push({ kind: "stat_boost", stat: "spd", multiplier: effect.statBoost.spd });
    }
    for (const status of effect.immunity ?? []) {
        effects.push({ kind: "status_immunity", status });
    }
    if (effect.restoreHpPercent) {
        effects.push({ kind: "restore_hp", percent: effect.restoreHpPercent });
    }
    if (effect.restoreEnergy) {
        effects.push({ kind: "restore_energy", amount: effect.restoreEnergy });
    }
    if (effect.goldBonus) {
        effects.push({ kind: "gold_bonus", amount: effect.goldBonus });
    }
    if (effect.goldMultiplier) {
        effects.push({ kind: "gold_multiplier", multiplier: effect.goldMultiplier });
    }
    if (effect.expMultiplier) {
        effects.push({ kind: "exp_multiplier", multiplier: effect.expMultiplier });
    }
    if (effect.critBonusPercent) {
        effects.push({ kind: "crit_bonus", percent: effect.critBonusPercent });
    }
    if (effect.damageTakenMultiplier) {
        effects.push({ kind: "damage_taken_multiplier", multiplier: effect.damageTakenMultiplier });
    }
    if (effect.energyRegen) {
        effects.push({ kind: "energy_regen", amount: effect.energyRegen });
    }
    return effects;
}

export function createNegamonBattleItemDefinition(item: ShopItem): NegamonBattleItemDefinition | null {
    if (item.type !== "battle_item") return null;
    return {
        ...createGameItemDefinition({
            id: item.id,
            nameKey: shopItemNameKey(item.id),
            descriptionKey: shopItemDescKey(item.id),
            icon: item.icon,
            rarity: item.rarity,
            itemType: item.battleKind === "reward" ? "material" : "battle",
            priceGold: item.price,
            stackable: true,
            allowedInBattle: item.battleKind !== "reward",
            effects: mapBattleEffectToGameItemEffects(item.battleEffect),
        }),
        battleCategory: item.battleCategory ?? "held",
        battleKind: item.battleKind ?? "held",
    };
}

export function getNegamonBattleItemCatalog(items: ShopItem[] = BATTLE_ITEMS): NegamonBattleItemDefinition[] {
    return items
        .map(createNegamonBattleItemDefinition)
        .filter((item): item is NegamonBattleItemDefinition => Boolean(item));
}

export function findNegamonBattleItemDefinition(itemId: string): NegamonBattleItemDefinition | null {
    const item = getBattleItemById(itemId);
    return item ? createNegamonBattleItemDefinition(item) : null;
}

export function validateNegamonBattleItemLoadout(input: {
    loadoutIds: string[];
    inventory: string[];
    catalog?: NegamonBattleItemDefinition[];
}): NegamonBattleItemLoadoutValidation {
    const catalog = input.catalog ?? getNegamonBattleItemCatalog();
    const byId = new Map(catalog.map((item) => [item.id, item]));
    const seen = new Set<string>();
    const perCategory = new Map<ShopBattleItemCategory, string>();
    const normalizedInventory = input.inventory.map(resolveLegacyBattleItemId);
    const normalizedIds: string[] = [];
    const items: NegamonBattleItemDefinition[] = [];

    for (const rawId of input.loadoutIds) {
        const id = resolveLegacyBattleItemId(String(rawId).trim());
        if (!id) continue;

        if (seen.has(id)) {
            return { ok: false, code: "DUPLICATE_SLOT", message: "battleLoadoutDuplicateItem", rejectedItemId: id };
        }
        seen.add(id);

        const item = byId.get(id);
        if (!item) {
            return { ok: false, code: "UNKNOWN_ITEM", message: `battleLoadoutUnknownItem:${id}`, rejectedItemId: id };
        }
        if (item.battleKind === "reward") {
            return {
                ok: false,
                code: "CATEGORY_LIMIT",
                message: "battleLoadoutCategoryLimit:reward",
                rejectedItemId: id,
            };
        }

        if (perCategory.has(item.battleCategory)) {
            return {
                ok: false,
                code: "CATEGORY_LIMIT",
                message: `battleLoadoutCategoryLimit:${item.battleCategory}`,
                rejectedItemId: id,
            };
        }
        perCategory.set(item.battleCategory, id);

        if (countInventoryItem(normalizedInventory, id) < 1) {
            return { ok: false, code: "NOT_IN_STOCK", message: `battleLoadoutNotOwned:${id}`, rejectedItemId: id };
        }

        normalizedIds.push(id);
        items.push(item);
    }

    return {
        ok: true,
        normalizedIds,
        items,
        inventoryChange: createBattleItemConsumeChange(normalizedIds),
    };
}
