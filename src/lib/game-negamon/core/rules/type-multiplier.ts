import type { NegamonFormulaTypeId } from "./types";

export type NegamonFormulaTypeChart = Partial<
    Record<NegamonFormulaTypeId, Partial<Record<NegamonFormulaTypeId, number>>>
>;

export const NEGAMON_FORMULA_TYPE_CHART: NegamonFormulaTypeChart = {
    WATER: { FIRE: 2, THUNDER: 0.5, LIGHT: 2, DARK: 0.5, WATER: 0.5 },
    FIRE: { WIND: 2, WATER: 0.5, LIGHT: 2, DARK: 0.5, FIRE: 0.5 },
    WIND: { EARTH: 2, FIRE: 0.5, LIGHT: 2, DARK: 0.5, WIND: 0.5 },
    EARTH: { THUNDER: 2, WIND: 0.5, LIGHT: 2, DARK: 0.5, EARTH: 0.5 },
    THUNDER: { WATER: 2, EARTH: 0.5, LIGHT: 2, DARK: 0.5, THUNDER: 0.5 },
    DARK: {
        FIRE: 2,
        WATER: 2,
        WIND: 2,
        EARTH: 2,
        THUNDER: 2,
        LIGHT: 0.5,
        DARK: 0.5,
    },
    LIGHT: {
        DARK: 2,
        FIRE: 0.5,
        WATER: 0.5,
        WIND: 0.5,
        EARTH: 0.5,
        THUNDER: 0.5,
        LIGHT: 0.5,
    },
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
