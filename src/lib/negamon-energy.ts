import type { MonsterMove } from "@/lib/types/negamon";

export type EnergyProfile = {
    maxEnergy: number;
    regenPerTurn: number;
    costScale: number;
};

const DEFAULT_PROFILE: EnergyProfile = {
    maxEnergy: 100,
    regenPerTurn: 16,
    costScale: 1,
};

const ENERGY_PROFILE_BY_SPECIES: Record<string, EnergyProfile> = {
    // Fast utility/caster: lower pool but cycles skills frequently.
    kinnaree: { maxEnergy: 90, regenPerTurn: 20, costScale: 0.88 },
    hanuman: { maxEnergy: 94, regenPerTurn: 18, costScale: 0.90 },
    mekkala: { maxEnergy: 100, regenPerTurn: 18, costScale: 0.92 },
    // Tank/control: high pool, slow recovery, expensive casts.
    singha: { maxEnergy: 126, regenPerTurn: 12, costScale: 1.12 },
    suvannamaccha: { maxEnergy: 124, regenPerTurn: 13, costScale: 1.04 },
    // Burst/bruiser: medium pool, higher burst tax.
    garuda: { maxEnergy: 98, regenPerTurn: 16, costScale: 1.06 },
    thotsakan: { maxEnergy: 108, regenPerTurn: 14, costScale: 1.14 },
    // All-rounder control.
    naga: { maxEnergy: 112, regenPerTurn: 15, costScale: 0.98 },
};

export function getEnergyProfileForSpecies(speciesId: string): EnergyProfile {
    return ENERGY_PROFILE_BY_SPECIES[speciesId] ?? DEFAULT_PROFILE;
}

export function getMoveEnergyCost(move: MonsterMove, speciesId: string): number {
    const profile = getEnergyProfileForSpecies(speciesId);
    let baseCost = 0;

    if (move.category === "STATUS") {
        baseCost = 18;
    } else if (move.category === "HEAL") {
        baseCost = 28;
    } else {
        baseCost = 12 + Math.round(move.power * 0.22);
        if (move.category === "SPECIAL") baseCost += 3;
        if (move.category === "PHYSICAL") baseCost += 1;
    }

    if ((move.priority ?? 0) > 0) baseCost += 4;
    if ((move.critBonus ?? 0) >= 15) baseCost += 3;
    if (move.effect) baseCost += 4;
    if (move.accuracy <= 85) baseCost += 4;

    return Math.max(8, Math.min(46, Math.round(baseCost * profile.costScale)));
}

