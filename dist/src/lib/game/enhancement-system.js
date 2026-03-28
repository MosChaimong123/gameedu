"use strict";
/**
 * Enhancement System
 * Pure functions — no DB calls. All DB logic stays in the route.
 *
 * Zones:
 *   Safe   (+0  to +5 ): 100% success, gold only
 *   Risk   (+6  to +10): 70%→30% linear, gold + BP, fail = no change
 *   Danger (+11 to +15): 20%→5% linear, gold + BP + materials, fail = level -1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_MAX = void 0;
exports.getEnhancementZone = getEnhancementZone;
exports.getSuccessRate = getSuccessRate;
exports.calculateEnhancementCost = calculateEnhancementCost;
exports.rollEnhancement = rollEnhancement;
/** Tier max enhancement levels */
exports.TIER_MAX = {
    COMMON: 9,
    RARE: 12,
    EPIC: 15,
    LEGENDARY: 15,
};
/**
 * Detect zone from current enhancement level (the level BEFORE attempting).
 * currentLevel 0–5  → SAFE
 * currentLevel 6–10 → RISK
 * currentLevel 11+  → DANGER
 */
function getEnhancementZone(currentLevel) {
    if (currentLevel <= 5)
        return "SAFE";
    if (currentLevel <= 10)
        return "RISK";
    return "DANGER";
}
/**
 * Get success rate (0–100) for attempting to go from currentLevel to currentLevel+1.
 *
 * Safe   (+0–+5):  100%
 * Risk   (+6–+10): linear 70% at +6 → 30% at +10
 *   formula: 70 - ((currentLevel - 6) / (10 - 6)) * (70 - 30)
 * Danger (+11–+14): linear 20% at +11 → 5% at +14
 *   formula: 20 - ((currentLevel - 11) / (14 - 11)) * (20 - 5)
 * Note: currentLevel is the level BEFORE the attempt (max for Danger is 14 → trying to reach +15)
 */
function getSuccessRate(currentLevel) {
    const zone = getEnhancementZone(currentLevel);
    if (zone === "SAFE")
        return 100;
    if (zone === "RISK") {
        return 70 - ((currentLevel - 6) / (10 - 6)) * (70 - 30);
    }
    // DANGER: currentLevel 11–14
    const clamped = Math.min(currentLevel, 14);
    return 20 - ((clamped - 11) / (14 - 11)) * (20 - 5);
}
/**
 * Calculate costs for attempting enhancement from currentLevel to currentLevel+1.
 *
 * Safe:   gold = floor(itemPrice * (currentLevel + 1) * 0.5), no BP, no materials
 * Risk:   gold = floor(itemPrice * (currentLevel + 1) * 0.5), BP = (currentLevel + 1) * 10
 * Danger: gold = floor(itemPrice * (currentLevel + 1) * 0.5), BP = (currentLevel + 1) * 10, material = 1 unit
 */
function calculateEnhancementCost(currentLevel, itemPrice, materialType) {
    const zone = getEnhancementZone(currentLevel);
    const gold = Math.floor(itemPrice * (currentLevel + 1) * 0.5);
    if (zone === "SAFE") {
        return { gold, behaviorPoints: 0, materialType: null, materialQuantity: 0 };
    }
    if (zone === "RISK") {
        return { gold, behaviorPoints: (currentLevel + 1) * 10, materialType: null, materialQuantity: 0 };
    }
    // DANGER
    return {
        gold,
        behaviorPoints: (currentLevel + 1) * 10,
        materialType: materialType !== null && materialType !== void 0 ? materialType : null,
        materialQuantity: 1,
    };
}
/**
 * Roll enhancement outcome.
 * Uses getSuccessRate + Math.random(), applies zone failure behavior:
 *   Success      → newLevel = currentLevel + 1
 *   Risk fail    → newLevel = currentLevel (no change)
 *   Danger fail  → newLevel = max(0, currentLevel - 1)
 */
function rollEnhancement(currentLevel) {
    const zone = getEnhancementZone(currentLevel);
    const rate = getSuccessRate(currentLevel);
    const roll = Math.random() * 100;
    const success = roll < rate;
    if (success) {
        return { success: true, newLevel: currentLevel + 1, zone };
    }
    if (zone === "RISK") {
        return { success: false, newLevel: currentLevel, zone };
    }
    // DANGER fail → level -1
    return { success: false, newLevel: Math.max(0, currentLevel - 1), zone };
}
