import type { NegamonFormulaTypeId } from "./types";

export type NegamonFormulaTypeChart = Partial<
    Record<NegamonFormulaTypeId, Partial<Record<NegamonFormulaTypeId, number>>>
>;

// วงจรชนะ/แพ้แบบ rock-paper-scissors:
// GRASS → ชนะ → WATER → ชนะ → FIRE → ชนะ → ELECTRICITY → ชนะ → GRASS
export const NEGAMON_FORMULA_TYPE_CHART: NegamonFormulaTypeChart = {
    GRASS:       { WATER: 2, ELECTRICITY: 0.5 },
    WATER:       { FIRE: 2,  GRASS: 0.5 },
    FIRE:        { ELECTRICITY: 2, WATER: 0.5 },
    ELECTRICITY: { GRASS: 2, FIRE: 0.5 },
};

export function getFormulaTypeMultiplier(
    attackingType: NegamonFormulaTypeId,
    defendingTypes: readonly NegamonFormulaTypeId[]
): number {
    if (attackingType === "NORMAL") return 1;
    return defendingTypes.reduce((multiplier, defendingType) => {
        return multiplier * (NEGAMON_FORMULA_TYPE_CHART[attackingType]?.[defendingType] ?? 1);
    }, 1);
}

export function getFormulaEffectivenessLabel(
    multiplier: number
): "immune" | "resisted" | "normal" | "effective" {
    if (multiplier <= 0) return "immune";
    if (multiplier < 1) return "resisted";
    if (multiplier > 1) return "effective";
    return "normal";
}
