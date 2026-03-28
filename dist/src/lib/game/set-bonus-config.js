"use strict";
/**
 * Single source of truth for set piece thresholds and numeric bonuses.
 * Used by StatCalculator.applySetBonuses and Inventory UI progress.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SET_MILESTONES_UI = exports.SET_SHADOW_STEAL_GOLD = exports.SET_SHADOW_GOLD_BONUS = exports.SET_THUNDER_TIER2_PIECES = exports.SET_THUNDER_CRIT_ADD = exports.SET_THUNDER_SPD_MULT = exports.SET_THUNDER_TIER1_PIECES = exports.SET_DRAGON_HP_MULT = exports.SET_DRAGON_BOSS_BONUS = exports.SET_DRAGON_TIER2_PIECES = exports.SET_DRAGON_ATK_DEF_MULT = exports.SET_DRAGON_TIER1_PIECES = exports.SET_LEGENDARY_XP_BONUS = exports.SET_LEGENDARY_ALL_STAT_MULT = exports.SET_LEGENDARY_FULL_PIECES = exports.SET_SHADOW_DODGE = exports.SET_SHADOW_SPD_MULT = exports.SET_SHADOW_TIER2_PIECES = exports.SET_SHADOW_LUCK_MULT = exports.SET_SHADOW_CRIT_ADD = exports.SET_SHADOW_TIER1_PIECES = exports.SET_HUNT_LUCK_MULT = exports.SET_HUNT_ATK_MULT = exports.SET_HUNT_TIER2_PIECES = exports.SET_HUNT_SPD_MULT = exports.SET_HUNT_CRIT_ADD = exports.SET_HUNT_TIER1_PIECES = exports.SET_ARCANE_CRIT_ADD = exports.SET_ARCANE_TIER2_PIECES = exports.SET_ARCANE_MP_MULT = exports.SET_ARCANE_MAG_MULT = exports.SET_ARCANE_TIER1_PIECES = exports.SET_TITAN_ATK_MULT = exports.SET_TITAN_TIER2_PIECES = exports.SET_TITAN_HP_MULT = exports.SET_TITAN_DEF_MULT = exports.SET_TITAN_TIER1_PIECES = exports.SET_IDS = void 0;
exports.getSetDisplayMaxPieces = getSetDisplayMaxPieces;
exports.getReachedSetMilestones = getReachedSetMilestones;
exports.getNextSetMilestone = getNextSetMilestone;
exports.SET_IDS = {
    // Legacy sets (kept for backward compat — no new items use these)
    DRAGON: "DRAGON_SET",
    THUNDER: "THUNDER_SET",
    // New archetype sets
    TITAN: "TITAN_SET",
    ARCANE: "ARCANE_SET",
    HUNT: "HUNT_SET",
    SHADOW: "SHADOW_SET",
    // Endgame
    LEGENDARY: "LEGENDARY_SET",
};
// ─── TITAN SET (Warrior/Tank) ──────────────────────────────────────────────
/** TITAN: WEAPON + BODY + HEAD + OFFHAND + GLOVES (5 EPIC pieces) */
exports.SET_TITAN_TIER1_PIECES = 3;
exports.SET_TITAN_DEF_MULT = 1.12;
exports.SET_TITAN_HP_MULT = 1.08;
exports.SET_TITAN_TIER2_PIECES = 5;
exports.SET_TITAN_ATK_MULT = 1.10;
// ─── ARCANE SET (Mage/Healer) ──────────────────────────────────────────────
/** ARCANE: WEAPON + BODY + HEAD + OFFHAND + GLOVES (5 EPIC pieces) */
exports.SET_ARCANE_TIER1_PIECES = 3;
exports.SET_ARCANE_MAG_MULT = 1.15;
exports.SET_ARCANE_MP_MULT = 1.12;
exports.SET_ARCANE_TIER2_PIECES = 5;
exports.SET_ARCANE_CRIT_ADD = 0.06;
// ─── HUNT SET (Ranger/Sniper/Beastmaster) ─────────────────────────────────
/** HUNT: WEAPON + BODY + HEAD + OFFHAND + GLOVES (5 EPIC pieces) */
exports.SET_HUNT_TIER1_PIECES = 3;
exports.SET_HUNT_CRIT_ADD = 0.06;
exports.SET_HUNT_SPD_MULT = 1.10;
exports.SET_HUNT_TIER2_PIECES = 5;
exports.SET_HUNT_ATK_MULT = 1.15;
exports.SET_HUNT_LUCK_MULT = 1.10;
// ─── SHADOW SET (Rogue/Assassin) ──────────────────────────────────────────
/** SHADOW: WEAPON + BODY + HEAD + BOOTS + ACCESSORY (5 EPIC pieces) */
exports.SET_SHADOW_TIER1_PIECES = 3;
exports.SET_SHADOW_CRIT_ADD = 0.08;
exports.SET_SHADOW_LUCK_MULT = 1.12;
exports.SET_SHADOW_TIER2_PIECES = 5;
exports.SET_SHADOW_SPD_MULT = 1.15;
exports.SET_SHADOW_DODGE = 0.12;
// ─── LEGENDARY SET (Endgame All-Class) ────────────────────────────────────
exports.SET_LEGENDARY_FULL_PIECES = 7;
exports.SET_LEGENDARY_ALL_STAT_MULT = 1.25;
exports.SET_LEGENDARY_XP_BONUS = 0.5;
// ─── Legacy set constants (Dragon/Thunder) ────────────────────────────────
exports.SET_DRAGON_TIER1_PIECES = 2;
exports.SET_DRAGON_ATK_DEF_MULT = 1.15;
exports.SET_DRAGON_TIER2_PIECES = 4;
exports.SET_DRAGON_BOSS_BONUS = 0.3;
exports.SET_DRAGON_HP_MULT = 0.25;
exports.SET_THUNDER_TIER1_PIECES = 2;
exports.SET_THUNDER_SPD_MULT = 1.2;
exports.SET_THUNDER_CRIT_ADD = 0.08;
exports.SET_THUNDER_TIER2_PIECES = 4;
exports.SET_SHADOW_GOLD_BONUS = 0.2;
exports.SET_SHADOW_STEAL_GOLD = 0.5;
exports.SET_MILESTONES_UI = {
    [exports.SET_IDS.TITAN]: [
        { at: exports.SET_TITAN_TIER1_PIECES, labelTh: `DEF ×${exports.SET_TITAN_DEF_MULT}, HP ×${exports.SET_TITAN_HP_MULT}` },
        { at: exports.SET_TITAN_TIER2_PIECES, labelTh: `ATK ×${exports.SET_TITAN_ATK_MULT}, เปิด IMMORTAL passive` },
    ],
    [exports.SET_IDS.ARCANE]: [
        { at: exports.SET_ARCANE_TIER1_PIECES, labelTh: `MAG ×${exports.SET_ARCANE_MAG_MULT}, MP ×${exports.SET_ARCANE_MP_MULT}` },
        { at: exports.SET_ARCANE_TIER2_PIECES, labelTh: `CRIT +${Math.round(exports.SET_ARCANE_CRIT_ADD * 100)}%, เปิด MANA_FLOW passive` },
    ],
    [exports.SET_IDS.HUNT]: [
        { at: exports.SET_HUNT_TIER1_PIECES, labelTh: `CRIT +${Math.round(exports.SET_HUNT_CRIT_ADD * 100)}%, SPD ×${exports.SET_HUNT_SPD_MULT}` },
        { at: exports.SET_HUNT_TIER2_PIECES, labelTh: `ATK ×${exports.SET_HUNT_ATK_MULT}, LUK ×${exports.SET_HUNT_LUCK_MULT}, เปิด LUCKY_STRIKE passive` },
    ],
    [exports.SET_IDS.SHADOW]: [
        { at: exports.SET_SHADOW_TIER1_PIECES, labelTh: `CRIT +${Math.round(exports.SET_SHADOW_CRIT_ADD * 100)}%, LUK ×${exports.SET_SHADOW_LUCK_MULT}` },
        { at: exports.SET_SHADOW_TIER2_PIECES, labelTh: `SPD ×${exports.SET_SHADOW_SPD_MULT}, หลบ ${Math.round(exports.SET_SHADOW_DODGE * 100)}%` },
    ],
    [exports.SET_IDS.LEGENDARY]: [
        { at: exports.SET_LEGENDARY_FULL_PIECES, labelTh: `สเตตส์หลัก ×${exports.SET_LEGENDARY_ALL_STAT_MULT}, XP +${Math.round(exports.SET_LEGENDARY_XP_BONUS * 100)}%` },
    ],
    // Legacy
    [exports.SET_IDS.DRAGON]: [
        { at: exports.SET_DRAGON_TIER1_PIECES, labelTh: "ATK/DEF ×1.15" },
        { at: exports.SET_DRAGON_TIER2_PIECES, labelTh: `Boss damage +${Math.round(exports.SET_DRAGON_BOSS_BONUS * 100)}%, HP +${Math.round(exports.SET_DRAGON_HP_MULT * 100)}%` },
    ],
    [exports.SET_IDS.THUNDER]: [
        { at: exports.SET_THUNDER_TIER1_PIECES, labelTh: `SPD ×${exports.SET_THUNDER_SPD_MULT}, CRT +${Math.round(exports.SET_THUNDER_CRIT_ADD * 100)}%` },
        { at: exports.SET_THUNDER_TIER2_PIECES, labelTh: "สายฟ้าโจมตีติดคริ (chain lightning)" },
    ],
};
/** Max pieces shown for progress bar (next milestone or full set). */
function getSetDisplayMaxPieces(setId) {
    const m = exports.SET_MILESTONES_UI[setId];
    if (!(m === null || m === void 0 ? void 0 : m.length))
        return 7;
    return Math.max(...m.map((x) => x.at));
}
/** Highest milestone reached at `count` equipped pieces. */
function getReachedSetMilestones(setId, count) {
    var _a;
    const m = (_a = exports.SET_MILESTONES_UI[setId]) !== null && _a !== void 0 ? _a : [];
    return m.filter((x) => count >= x.at);
}
/** Next milestone not yet reached (if any). */
function getNextSetMilestone(setId, count) {
    var _a;
    const m = (_a = exports.SET_MILESTONES_UI[setId]) !== null && _a !== void 0 ? _a : [];
    const next = m.find((x) => count < x.at);
    return next !== null && next !== void 0 ? next : null;
}
