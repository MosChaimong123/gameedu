import type { NegamonLiteType } from "@/lib/negamon-lite";
import {
    getEffectivenessLabel as getLiteEffectivenessLabel,
    getTypeMultiplier as getLiteTypeMultiplier,
    NEGAMON_LITE_TYPE_CHART,
    NEGAMON_LITE_TYPES,
    type NegamonLiteTypeChart,
} from "@/lib/negamon-lite/type-chart";

export type NegamonBattleType = NegamonLiteType;
export type NegamonBattleTypeChart = NegamonLiteTypeChart;

export const NEGAMON_BATTLE_TYPES = NEGAMON_LITE_TYPES;
export const NEGAMON_BATTLE_TYPE_CHART = NEGAMON_LITE_TYPE_CHART;

export function getNegamonTypeMultiplier(
    attackingType: NegamonBattleType,
    defendingTypes: readonly NegamonBattleType[]
): number {
    return getLiteTypeMultiplier(attackingType, defendingTypes);
}

export function getNegamonEffectivenessLabel(
    multiplier: number
): "immune" | "resisted" | "normal" | "effective" {
    return getLiteEffectivenessLabel(multiplier);
}
