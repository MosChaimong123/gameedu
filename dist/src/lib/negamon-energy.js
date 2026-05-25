"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnergyProfileForSpecies = getEnergyProfileForSpecies;
exports.getMoveEnergyCost = getMoveEnergyCost;
const negamon_basic_move_1 = require("@/lib/negamon-basic-move");
const DEFAULT_PROFILE = {
    maxEnergy: 100,
    regenPerTurn: 18,
    costScale: 1,
};
/** Hard CC — แพงกว่า debuff/buff ทั่วไป */
const HARD_CC_EFFECTS = new Set([
    "PARALYZE",
    "SLEEP",
    "FREEZE",
    "CONFUSE",
]);
function isHardCc(effect) {
    return HARD_CC_EFFECTS.has(effect);
}
/**
 * 3 archetypes: Caster (pool เล็ก regen สูง), Bruiser (กลาง), Tank (pool ใหญ่ regen ต่ำ + ค่าใช้จ่ายแพงขึ้น)
 */
const ENERGY_PROFILE_BY_SPECIES = {
    // Caster
    lumilune: { maxEnergy: 90, regenPerTurn: 20, costScale: 0.88 },
    voltshade: { maxEnergy: 90, regenPerTurn: 20, costScale: 0.92 },
    aerolisk: { maxEnergy: 92, regenPerTurn: 20, costScale: 0.92 },
    // Bruiser
    pyronox: { maxEnergy: 100, regenPerTurn: 18, costScale: 1.0 },
    tidemaw: { maxEnergy: 104, regenPerTurn: 17, costScale: 1.04 },
    // Tank
    terranoir: { maxEnergy: 110, regenPerTurn: 16, costScale: 1.1 },
};
function getEnergyProfileForSpecies(speciesId) {
    var _a;
    return (_a = ENERGY_PROFILE_BY_SPECIES[speciesId]) !== null && _a !== void 0 ? _a : DEFAULT_PROFILE;
}
const ENERGY_COST_MIN = 8;
/** Raised from 56 so learnRank 6 (ult) moves can exceed previous cap after ULT_FLAT_BONUS. */
const ENERGY_COST_MAX = 80;
/** learnRank 6 = ultimate move — extra EN cost so ults are not cast every ~2 turns. */
const ULT_LEARN_RANK = 6;
/** Applied after costScale so casters do not get disproportionately cheap ults. */
const ULT_FLAT_BONUS = 30;
function getMoveEnergyCost(move, speciesId) {
    var _a, _b, _c, _d, _e;
    if ((0, negamon_basic_move_1.isNegamonBasicAttackMoveId)(move.id)) {
        return 0;
    }
    const profile = getEnergyProfileForSpecies(speciesId);
    if (move.energyCost != null) {
        return Math.max(0, Math.min(ENERGY_COST_MAX, Math.round(move.energyCost)));
    }
    let baseCost = 0;
    if (move.category === "HEAL") {
        baseCost = 30;
    }
    else if (move.category === "STATUS") {
        if (move.effect && isHardCc(move.effect)) {
            baseCost = 26;
        }
        else {
            baseCost = 16;
        }
    }
    else {
        // PHYSICAL / SPECIAL damage
        const pow = (_a = move.power) !== null && _a !== void 0 ? _a : 0;
        baseCost = 12 + Math.round(pow * 0.3);
        if (move.category === "SPECIAL")
            baseCost += 3;
        if (move.category === "PHYSICAL")
            baseCost += 1;
        if (((_b = move.priority) !== null && _b !== void 0 ? _b : 0) > 0)
            baseCost += 5;
        const crit = (_c = move.critBonus) !== null && _c !== void 0 ? _c : 0;
        if (crit >= 25)
            baseCost += 5;
        else if (crit >= 15)
            baseCost += 3;
        if (move.effect) {
            baseCost += isHardCc(move.effect) ? 5 : 3;
        }
        if (((_d = move.drainPct) !== null && _d !== void 0 ? _d : 0) >= 20)
            baseCost += 4;
        if (move.accuracy <= 80)
            baseCost += 5;
    }
    let scaled = Math.round(baseCost * profile.costScale);
    if (!Number.isFinite(scaled)) {
        return ENERGY_COST_MIN;
    }
    if (move.effect && isHardCc(move.effect)) {
        scaled = Math.max(26, scaled);
    }
    if (((_e = move.learnRank) !== null && _e !== void 0 ? _e : 0) >= ULT_LEARN_RANK) {
        scaled += ULT_FLAT_BONUS;
        scaled = Math.max(60, scaled);
    }
    return Math.max(ENERGY_COST_MIN, Math.min(ENERGY_COST_MAX, scaled));
}
