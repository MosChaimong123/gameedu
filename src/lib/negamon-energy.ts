import type { MonsterMove, StatusEffect } from "@/lib/types/negamon";
import { isNegamonBasicAttackMoveId } from "@/lib/negamon-basic-move";

export type EnergyProfile = {
    maxEnergy: number;
    regenPerTurn: number;
    costScale: number;
};

const DEFAULT_PROFILE: EnergyProfile = {
    maxEnergy: 100,
    regenPerTurn: 18,
    costScale: 1,
};

/** Hard CC — แพงกว่า debuff/buff ทั่วไป */
const HARD_CC_EFFECTS: ReadonlySet<StatusEffect> = new Set([
    "PARALYZE",
    "SLEEP",
    "FREEZE",
    "CONFUSE",
]);

function isHardCc(effect: StatusEffect): boolean {
    return HARD_CC_EFFECTS.has(effect);
}

/**
 * 3 archetypes: Caster (pool เล็ก regen สูง), Bruiser (กลาง), Tank (pool ใหญ่ regen ต่ำ + ค่าใช้จ่ายแพงขึ้น)
 */
const ENERGY_PROFILE_BY_SPECIES: Record<string, EnergyProfile> = {
    // Caster
    kinnaree: { maxEnergy: 90, regenPerTurn: 20, costScale: 0.88 },
    mekkala: { maxEnergy: 90, regenPerTurn: 20, costScale: 0.88 },
    hanuman: { maxEnergy: 90, regenPerTurn: 20, costScale: 0.88 },
    // Bruiser
    garuda: { maxEnergy: 100, regenPerTurn: 18, costScale: 1.0 },
    naga: { maxEnergy: 100, regenPerTurn: 18, costScale: 1.0 },
    thotsakan: { maxEnergy: 100, regenPerTurn: 18, costScale: 1.0 },
    // Tank
    singha: { maxEnergy: 110, regenPerTurn: 16, costScale: 1.1 },
    suvannamaccha: { maxEnergy: 110, regenPerTurn: 16, costScale: 1.1 },
};

export function getEnergyProfileForSpecies(speciesId: string): EnergyProfile {
    return ENERGY_PROFILE_BY_SPECIES[speciesId] ?? DEFAULT_PROFILE;
}

const ENERGY_COST_MIN = 8;
/** Raised from 56 so learnRank 6 (ult) moves can exceed previous cap after ULT_FLAT_BONUS. */
const ENERGY_COST_MAX = 80;
/** learnRank 6 = ultimate move — extra EN cost so ults are not cast every ~2 turns. */
const ULT_LEARN_RANK = 6;
/** Applied after costScale so casters do not get disproportionately cheap ults. */
const ULT_FLAT_BONUS = 30;

export function getMoveEnergyCost(move: MonsterMove, speciesId: string): number {
    if (isNegamonBasicAttackMoveId(move.id)) {
        return 0;
    }

    const profile = getEnergyProfileForSpecies(speciesId);

    if (move.energyCost != null) {
        return Math.max(0, Math.min(ENERGY_COST_MAX, Math.round(move.energyCost)));
    }

    let baseCost = 0;

    if (move.category === "HEAL") {
        baseCost = 30;
    } else if (move.category === "STATUS") {
        if (move.effect && isHardCc(move.effect)) {
            baseCost = 26;
        } else {
            baseCost = 16;
        }
    } else {
        // PHYSICAL / SPECIAL damage
        const pow = move.power ?? 0;
        baseCost = 12 + Math.round(pow * 0.3);
        if (move.category === "SPECIAL") baseCost += 3;
        if (move.category === "PHYSICAL") baseCost += 1;
        if ((move.priority ?? 0) > 0) baseCost += 5;
        const crit = move.critBonus ?? 0;
        if (crit >= 25) baseCost += 5;
        else if (crit >= 15) baseCost += 3;
        if (move.effect) {
            baseCost += isHardCc(move.effect) ? 5 : 3;
        }
        if ((move.drainPct ?? 0) >= 20) baseCost += 4;
        if (move.accuracy <= 80) baseCost += 5;
    }

    let scaled = Math.round(baseCost * profile.costScale);
    if (!Number.isFinite(scaled)) {
        return ENERGY_COST_MIN;
    }
    if ((move.learnRank ?? 0) >= ULT_LEARN_RANK) {
        scaled += ULT_FLAT_BONUS;
    }
    return Math.max(ENERGY_COST_MIN, Math.min(ENERGY_COST_MAX, scaled));
}
