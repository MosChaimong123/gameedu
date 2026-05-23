import type { NegamonLiteType } from "./types";

export type NegamonLiteTypeChart = Partial<Record<NegamonLiteType, Partial<Record<NegamonLiteType, number>>>>;

export const NEGAMON_LITE_TYPES: readonly NegamonLiteType[] = [
    "NORMAL",
    "FIRE",
    "WATER",
    "EARTH",
    "WIND",
    "THUNDER",
    "LIGHT",
    "DARK",
];

export const NEGAMON_LITE_TYPE_CHART: NegamonLiteTypeChart = {
    WATER: {
        FIRE: 2,
        THUNDER: 0.5,
        LIGHT: 2,
        DARK: 0.5,
        WATER: 0.5,
    },
    FIRE: {
        WIND: 2,
        WATER: 0.5,
        LIGHT: 2,
        DARK: 0.5,
        FIRE: 0.5,
    },
    WIND: {
        EARTH: 2,
        FIRE: 0.5,
        LIGHT: 2,
        DARK: 0.5,
        WIND: 0.5,
    },
    EARTH: {
        THUNDER: 2,
        WIND: 0.5,
        LIGHT: 2,
        DARK: 0.5,
        EARTH: 0.5,
    },
    THUNDER: {
        WATER: 2,
        EARTH: 0.5,
        LIGHT: 2,
        DARK: 0.5,
        THUNDER: 0.5,
    },
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

export function getTypeMultiplier(
    attackingType: NegamonLiteType,
    defendingTypes: readonly NegamonLiteType[]
): number {
    return defendingTypes.reduce<number>((multiplier, defendingType) => {
        if (attackingType === "NORMAL") return multiplier;
        return multiplier * (NEGAMON_LITE_TYPE_CHART[attackingType]?.[defendingType] ?? 1);
    }, 1);
}

export function getEffectivenessLabel(multiplier: number): "immune" | "resisted" | "normal" | "effective" {
    if (multiplier <= 0) return "immune";
    if (multiplier < 1) return "resisted";
    if (multiplier > 1) return "effective";
    return "normal";
}
