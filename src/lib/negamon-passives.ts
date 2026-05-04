/**
 * Purchasable Negamon passive skills were removed from the product.
 * This module remains as a no-op shim so any stray imports fail gracefully.
 */

export type PassiveEffectType =
    | "gold_rate_bonus"
    | "checkin_bonus"
    | "streak_shield";

export interface NegamonPassive {
    id: string;
    icon: string;
    cost: number;
    effect: PassiveEffectType;
    value: number;
}

/** @deprecated No purchasable passives; always empty. */
export const NEGAMON_PASSIVES: NegamonPassive[] = [];

export function getPassiveById(): NegamonPassive | undefined {
    return undefined;
}

export function negamonPassiveNameKey(id: string): string {
    return `negamonPassive_${id}_name`;
}

export function negamonPassiveDescKey(id: string): string {
    return `negamonPassive_${id}_desc`;
}

export function calcGoldRateBonus(): number {
    return 0;
}

export function calcCheckinBonus(): number {
    return 0;
}

export function hasStreakShield(): boolean {
    return false;
}
