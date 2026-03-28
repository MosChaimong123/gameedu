"use strict";
/**
 * Aggregate item multipliers from equipped rows (same formula as IdleEngine / StatCalculator item loops).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDLE_GOLD_BOSS_DISPLAY_BASE_PERCENT = void 0;
exports.enhancementMultiplier = enhancementMultiplier;
exports.sumEquippedGoldMultiplierBonus = sumEquippedGoldMultiplierBonus;
exports.sumEquippedBossDamageMultiplierBonus = sumEquippedBossDamageMultiplierBonus;
/** Idle gold rate uses `1 + sum(item bonuses)`; UI labels that baseline as 100%. */
exports.IDLE_GOLD_BOSS_DISPLAY_BASE_PERCENT = 100;
function enhancementMultiplier(level) {
    return 1 + (level || 0) * 0.1;
}
/** Sum of (item goldMult * enhMult) for each equipped row — additive bonuses on rate. */
function sumEquippedGoldMultiplierBonus(items) {
    var _a, _b, _c;
    let sum = 0;
    for (const si of items) {
        const lb = enhancementMultiplier((_a = si.enhancementLevel) !== null && _a !== void 0 ? _a : 0);
        const g = (_c = (_b = si.item) === null || _b === void 0 ? void 0 : _b.goldMultiplier) !== null && _c !== void 0 ? _c : 0;
        sum += Number(g) * lb;
    }
    return sum;
}
/** Sum of (item bossMult * enhMult). */
function sumEquippedBossDamageMultiplierBonus(items) {
    var _a, _b, _c;
    let sum = 0;
    for (const si of items) {
        const lb = enhancementMultiplier((_a = si.enhancementLevel) !== null && _a !== void 0 ? _a : 0);
        const b = (_c = (_b = si.item) === null || _b === void 0 ? void 0 : _b.bossDamageMultiplier) !== null && _c !== void 0 ? _c : 0;
        sum += Number(b) * lb;
    }
    return sum;
}
