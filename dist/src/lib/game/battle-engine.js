"use strict";
// PvP Battle Engine
// Determines the outcome of a battle between two students
Object.defineProperty(exports, "__esModule", { value: true });
exports.PVP_MATCHUP_MULTIPLIERS = void 0;
exports.getPvpMatchupMultiplier = getPvpMatchupMultiplier;
exports.calcBattlePower = calcBattlePower;
exports.resolveBattle = resolveBattle;
exports.applyPvpSkill = applyPvpSkill;
exports.applyPvpDamage = applyPvpDamage;
exports.rollCrit = rollCrit;
exports.applyRangerCritBonus = applyRangerCritBonus;
exports.applyMpDrain = applyMpDrain;
exports.canUseSkill = canUseSkill;
// ─── PvP Matchup Multipliers ──────────────────────────────────────────────────
exports.PVP_MATCHUP_MULTIPLIERS = {
    WARRIOR: { HEALER: 1.2 },
    MAGE: { WARRIOR: 1.2 },
    ROGUE: { MAGE: 1.2 },
    RANGER: { HEALER: 1.2 },
    HEALER: { ROGUE: 1.2 },
};
/**
 * Returns 1.2 if attacker has a matchup advantage over defender, else 1.0.
 */
function getPvpMatchupMultiplier(attackerClass, defenderClass) {
    var _a, _b;
    if (!attackerClass || !defenderClass)
        return 1.0;
    return (_b = (_a = exports.PVP_MATCHUP_MULTIPLIERS[attackerClass]) === null || _a === void 0 ? void 0 : _a[defenderClass]) !== null && _b !== void 0 ? _b : 1.0;
}
// ─── Calculate Battle Power ───────────────────────────────────────────────────
// Calculate a student's battle power (1-100 base multiplier)
function calcBattlePower(stats) {
    let power = 50; // Base
    // Behavior points: each 100 points = +1 power (capped at +20)
    power += Math.min(20, Math.floor(stats.points / 100));
    // Gold: each 1000 gold = +1 power (capped at +15)
    power += Math.min(15, Math.floor(stats.gold / 1000));
    // Equipped items bonus
    for (const item of stats.items) {
        // Both multipliers contribute to "Combat Power"
        const goldBonus = item.goldMultiplier || 0;
        const bossBonus = item.bossDamageMultiplier || 0;
        if (goldBonus > 0 || bossBonus > 0) {
            const enhanceMult = 1 + item.enhancementLevel * 0.1;
            // Convert multiplier (e.g. 0.5) to a power score
            power += Math.floor((goldBonus + bossBonus) * 10 * enhanceMult);
        }
    }
    return Math.max(1, Math.min(100, power));
}
// ─── Resolve Battle ───────────────────────────────────────────────────────────
// Resolve a battle — returns { challengerRoll, defenderRoll, winnerId }
function resolveBattle(challengerId, challengerStats, defenderId, defenderStats, challengerJobClass, defenderJobClass) {
    let cPower = calcBattlePower(challengerStats);
    let dPower = calcBattlePower(defenderStats);
    // Apply PvP matchup multiplier to the attacker's power
    const cMatchup = getPvpMatchupMultiplier(challengerJobClass, defenderJobClass);
    const dMatchup = getPvpMatchupMultiplier(defenderJobClass, challengerJobClass);
    cPower = Math.min(100, Math.floor(cPower * cMatchup));
    dPower = Math.min(100, Math.floor(dPower * dMatchup));
    // Roll: power (base) + random luck (0-500)
    // 70% stats influence, 30% pure luck to keep it exciting
    const cRoll = Math.floor(cPower * 7 + Math.random() * 500);
    const dRoll = Math.floor(dPower * 7 + Math.random() * 500);
    const winnerId = cRoll >= dRoll ? challengerId : defenderId;
    return { challengerRoll: cRoll, defenderRoll: dRoll, winnerId };
}
// ─── PvP Skill Effects ────────────────────────────────────────────────────────
/**
 * Apply a PvP skill from attacker to defender.
 * Returns { damage, effect }.
 */
function applyPvpSkill(attacker, defender, skillId) {
    switch (skillId) {
        case "warrior_shield_wall": {
            attacker.shieldWallTurnsRemaining = 2;
            return { damage: 0, effect: "SHIELD_WALL" };
        }
        case "mage_meteor": {
            const damage = attacker.mag * 3.0;
            return { damage, effect: "METEOR" };
        }
        case "rogue_backstab": {
            attacker.lastSkillUsed = "rogue_backstab";
            const damage = attacker.atk * 2.0;
            return { damage, effect: "BACKSTAB" };
        }
        case "rogue_execution": {
            const isCombo = attacker.lastSkillUsed === "rogue_backstab" &&
                defender.hp / defender.maxHp < 0.3;
            const damage = isCombo
                ? attacker.atk * 3.0 * 2.5
                : attacker.atk * 3.0;
            return { damage, effect: "EXECUTION" };
        }
        default:
            return { damage: 0, effect: "UNKNOWN" };
    }
}
/**
 * Apply damage to a defender, accounting for Shield Wall.
 * Returns actual damage taken.
 */
function applyPvpDamage(defender, damage) {
    let actualDamage = damage;
    if (defender.shieldWallTurnsRemaining > 0) {
        actualDamage = Math.floor(damage * 0.5);
        defender.shieldWallTurnsRemaining -= 1;
    }
    defender.hp = Math.max(0, defender.hp - actualDamage);
    return actualDamage;
}
// ─── RANGER CRIT ──────────────────────────────────────────────────────────────
/**
 * Returns true if a crit occurs based on critChance (0.0–1.0).
 */
function rollCrit(critChance) {
    return Math.random() < critChance;
}
/**
 * If attacker is RANGER and crits, returns baseDamage + 150% bonus (total 250%).
 * Otherwise returns baseDamage unchanged.
 */
function applyRangerCritBonus(attacker, baseDamage) {
    if (attacker.jobClass === "RANGER" && rollCrit(attacker.crit)) {
        return baseDamage + Math.floor(baseDamage * 1.5);
    }
    return baseDamage;
}
// ─── HEALER MP Drain ──────────────────────────────────────────────────────────
/**
 * Reduces target's MP by amount, clamps to 0.
 * Sets mpDrained = true if MP reaches 0.
 */
function applyMpDrain(target, amount) {
    target.mp = Math.max(0, target.mp - amount);
    if (target.mp === 0) {
        target.mpDrained = true;
    }
}
/**
 * Returns false if the player's MP has been fully drained, else true.
 */
function canUseSkill(player) {
    return !player.mpDrained;
}
