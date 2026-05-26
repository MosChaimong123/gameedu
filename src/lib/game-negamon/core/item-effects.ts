import {
    applyInventoryChangeStrict,
    mergeInventoryChanges,
    type GameInventoryChange,
    type GameItemEffect,
} from "@/lib/game-core";
import {
    getNegamonBattleItemCatalog,
    validateNegamonBattleItemLoadout,
    type NegamonBattleItemDefinition,
} from "./battle-items";
import type { NegamonMonsterSnapshot } from "./monster-snapshot";
import { resolveLegacyBattleItemId } from "@/lib/shop-items";

export type NegamonBattleStatusId =
    | "BURN"
    | "POISON"
    | "BADLY_POISON"
    | "PARALYZE"
    | "SLEEP"
    | "STUN"
    | "SHIELD"
    | "FOCUS";

export type NegamonConsumableBattleCombatant = {
    hp: number;
    energy: number;
    maxEnergy: number;
    stats: {
        hp: number;
    };
};

function mapItemStatusImmunity(status: string): NegamonBattleStatusId[] {
    const normalized = status.trim().toUpperCase();
    if (normalized === "POISON") return ["POISON", "BADLY_POISON"];
    if (normalized === "FREEZE") return ["STUN"];
    if (
        normalized === "BURN" ||
        normalized === "BADLY_POISON" ||
        normalized === "PARALYZE" ||
        normalized === "SLEEP" ||
        normalized === "STUN" ||
        normalized === "SHIELD" ||
        normalized === "FOCUS"
    ) {
        return [normalized];
    }
    return [];
}

export type NegamonBattleItemRuntimePlan =
    | {
          ok: true;
          itemIds: string[];
          items: NegamonBattleItemDefinition[];
          inventoryChange: GameInventoryChange;
          effects: GameItemEffect[];
          statusImmunities: NegamonBattleStatusId[];
          statMultipliers: { atk: number; def: number; spd: number };
          rewardModifiers: { goldBonus: number; goldMultiplier: number; expMultiplier: number };
      }
    | {
          ok: false;
          code: "DUPLICATE_SLOT" | "UNKNOWN_ITEM" | "CATEGORY_LIMIT" | "NOT_IN_STOCK";
          message: string;
          rejectedItemId?: string;
          itemIds: [];
          items: [];
          inventoryChange: GameInventoryChange;
          effects: [];
          statusImmunities: [];
          statMultipliers: { atk: 1; def: 1; spd: 1 };
          rewardModifiers: { goldBonus: 0; goldMultiplier: 1; expMultiplier: 1 };
      };

export function createNegamonBattleItemRuntimePlan(input: {
    loadoutIds: string[];
    inventory: string[];
    catalog?: NegamonBattleItemDefinition[];
}): NegamonBattleItemRuntimePlan {
    const validation = validateNegamonBattleItemLoadout(input);
    if (!validation.ok) {
        return {
            ok: false,
            code: validation.code,
            message: validation.message,
            rejectedItemId: validation.rejectedItemId,
            itemIds: [],
            items: [],
            inventoryChange: mergeInventoryChanges([]),
            effects: [],
            statusImmunities: [],
            statMultipliers: { atk: 1, def: 1, spd: 1 },
            rewardModifiers: { goldBonus: 0, goldMultiplier: 1, expMultiplier: 1 },
        };
    }

    const effects = validation.items.flatMap((item) => item.effects);
    const statusImmunities: NegamonBattleStatusId[] = [];
    const statMultipliers = { atk: 1, def: 1, spd: 1 };
    const rewardModifiers = { goldBonus: 0, goldMultiplier: 1, expMultiplier: 1 };

    for (const effect of effects) {
        if (effect.kind === "stat_boost") {
            statMultipliers[effect.stat] *= effect.multiplier;
        }
        if (effect.kind === "gold_bonus") {
            rewardModifiers.goldBonus += effect.amount;
        }
        if (effect.kind === "gold_multiplier") {
            rewardModifiers.goldMultiplier *= effect.multiplier;
        }
        if (effect.kind === "status_immunity") {
            statusImmunities.push(...mapItemStatusImmunity(effect.status));
        }
    }

    return {
        ok: true,
        itemIds: validation.normalizedIds,
        items: validation.items,
        inventoryChange: validation.inventoryChange,
        effects,
        statusImmunities: [...new Set(statusImmunities)],
        statMultipliers,
        rewardModifiers,
    };
}

export function createEmptyNegamonBattleItemRuntimePlan(): Extract<NegamonBattleItemRuntimePlan, { ok: true }> {
    return {
        ok: true,
        itemIds: [],
        items: [],
        inventoryChange: mergeInventoryChanges([]),
        effects: [],
        statusImmunities: [],
        statMultipliers: { atk: 1, def: 1, spd: 1 },
        rewardModifiers: { goldBonus: 0, goldMultiplier: 1, expMultiplier: 1 },
    };
}

export function createNegamonBattleItemRuntimePlanOrEmpty(input: {
    loadoutIds: string[];
    inventory: string[];
    catalog?: NegamonBattleItemDefinition[];
}): Extract<NegamonBattleItemRuntimePlan, { ok: true }> {
    const plan = createNegamonBattleItemRuntimePlan(input);
    return plan.ok ? plan : createEmptyNegamonBattleItemRuntimePlan();
}

export function applyNegamonBattleItemInventoryChange(input: {
    inventory: string[];
    plan: Extract<NegamonBattleItemRuntimePlan, { ok: true }>;
}) {
    return applyInventoryChangeStrict(input.inventory, input.plan.inventoryChange);
}

export function getNegamonBattleItemRuntimePlanFromIds(itemIds: string[]) {
    const catalog = getNegamonBattleItemCatalog();
    const byId = new Map(catalog.map((item) => [item.id, item]));
    const items = itemIds
        .map((id) => byId.get(resolveLegacyBattleItemId(id)))
        .filter((item): item is NegamonBattleItemDefinition => Boolean(item));
    return createNegamonBattleItemRuntimePlan({
        loadoutIds: items.map((item) => item.id),
        inventory: items.map((item) => item.id),
        catalog,
    });
}

export function applyNegamonBattleItemRuntimeEffects(input: {
    monster: NegamonMonsterSnapshot;
    itemIds?: string[];
}) {
    const plan = getNegamonBattleItemRuntimePlanFromIds(input.itemIds ?? input.monster.equippedItemIds);
    const stats = { ...input.monster.derivedStats };
    if (plan.ok) {
        stats.atk = Math.max(1, Math.floor(stats.atk * plan.statMultipliers.atk));
        stats.def = Math.max(1, Math.floor(stats.def * plan.statMultipliers.def));
        stats.spd = Math.max(1, Math.floor(stats.spd * plan.statMultipliers.spd));
    }
    return {
        stats,
        plan: plan.ok ? plan : createEmptyNegamonBattleItemRuntimePlan(),
    };
}

export function applyNegamonConsumableBattleItemEffect(input: {
    combatant: NegamonConsumableBattleCombatant;
    effect: GameItemEffect;
}): NegamonConsumableBattleCombatant {
    if (input.effect.kind === "restore_hp") {
        const healing = Math.max(1, Math.floor(input.combatant.stats.hp * (input.effect.percent / 100)));
        return {
            ...input.combatant,
            hp: Math.min(input.combatant.stats.hp, input.combatant.hp + healing),
        };
    }
    if (input.effect.kind === "restore_energy") {
        return {
            ...input.combatant,
            energy: Math.min(input.combatant.maxEnergy, input.combatant.energy + input.effect.amount),
        };
    }
    return input.combatant;
}
