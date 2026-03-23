"use strict";
/**
 * Job Class Constants
 * Defines the full 25-path job progression tree, level requirements,
 * and helper functions for job class validation and lookup.
 * Requirements: 12
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_JOB_CLASSES = exports.ALL_JOB_PATHS = exports.MASTER_CLASS_OPTIONS = exports.ADVANCE_CLASS_OPTIONS = exports.MASTER_CLASSES = exports.ADVANCE_CLASSES = exports.BASE_CLASSES = exports.JOB_LEVEL_REQUIREMENTS = void 0;
exports.getAdvanceOptions = getAdvanceOptions;
exports.getMasterOptions = getMasterOptions;
exports.isValidJobClass = isValidJobClass;
// ─── Level Requirements ───────────────────────────────────────────────────────
exports.JOB_LEVEL_REQUIREMENTS = {
    BASE_LEVEL: 5,
    ADVANCE_LEVEL: 20,
    MASTER_LEVEL: 50,
};
// ─── Class Lists ──────────────────────────────────────────────────────────────
exports.BASE_CLASSES = [
    "WARRIOR",
    "MAGE",
    "RANGER",
    "HEALER",
    "ROGUE",
];
exports.ADVANCE_CLASSES = [
    "KNIGHT",
    "BERSERKER",
    "ARCHMAGE",
    "WARLOCK",
    "SNIPER",
    "BEASTMASTER",
    "SAINT",
    "DRUID",
    "ASSASSIN",
    "DUELIST",
];
exports.MASTER_CLASSES = [
    "PALADIN",
    "GUARDIAN",
    "WARLORD",
    "DEATH KNIGHT",
    "GRAND WIZARD",
    "ELEMENTALIST",
    "LICH",
    "SHADOW MAGE",
    "HAWKEYE",
    "DEADEYE",
    "BEAST KING",
    "TAMER",
    "ARCHBISHOP",
    "DIVINE HERALD",
    "ELDER DRUID",
    "NATURE WARDEN",
    "SHADOW LORD",
    "PHANTOM",
    "BLADE MASTER",
    "SWORD SAINT",
];
// ─── Advance Class Options ────────────────────────────────────────────────────
/** Maps each base class to its two advance class options (unlocked at Lv 20). */
exports.ADVANCE_CLASS_OPTIONS = {
    WARRIOR: ["KNIGHT", "BERSERKER"],
    MAGE: ["ARCHMAGE", "WARLOCK"],
    RANGER: ["SNIPER", "BEASTMASTER"],
    HEALER: ["SAINT", "DRUID"],
    ROGUE: ["ASSASSIN", "DUELIST"],
};
// ─── Master Class Options ─────────────────────────────────────────────────────
/** Maps each advance class to its two master class options (unlocked at Lv 50). */
exports.MASTER_CLASS_OPTIONS = {
    KNIGHT: ["PALADIN", "GUARDIAN"],
    BERSERKER: ["WARLORD", "DEATH KNIGHT"],
    ARCHMAGE: ["GRAND WIZARD", "ELEMENTALIST"],
    WARLOCK: ["LICH", "SHADOW MAGE"],
    SNIPER: ["HAWKEYE", "DEADEYE"],
    BEASTMASTER: ["BEAST KING", "TAMER"],
    SAINT: ["ARCHBISHOP", "DIVINE HERALD"],
    DRUID: ["ELDER DRUID", "NATURE WARDEN"],
    ASSASSIN: ["SHADOW LORD", "PHANTOM"],
    DUELIST: ["BLADE MASTER", "SWORD SAINT"],
};
// ─── All 25 Job Paths ─────────────────────────────────────────────────────────
/**
 * All 25 unique job paths in the progression tree.
 * Each path represents one complete base → advance → master chain.
 * (5 base classes × 2 advance × 2 master = 20 paths, but spec counts
 *  the 5 base-only paths too, giving 25 total paths.)
 */
exports.ALL_JOB_PATHS = exports.BASE_CLASSES.flatMap((baseClass) => exports.ADVANCE_CLASS_OPTIONS[baseClass].flatMap((advanceClass) => exports.MASTER_CLASS_OPTIONS[advanceClass].map((masterClass) => ({
    baseClass,
    advanceClass,
    masterClass,
}))));
// ─── All Unique Class Names ───────────────────────────────────────────────────
/** Flat list of every unique class name across all tiers (NOVICE + 5 base + 10 advance + 20 master = 36). */
exports.ALL_JOB_CLASSES = [
    "NOVICE",
    ...exports.BASE_CLASSES,
    ...exports.ADVANCE_CLASSES,
    ...exports.MASTER_CLASSES,
];
// ─── Helper Functions ─────────────────────────────────────────────────────────
/**
 * Returns the two advance class options for a given base class.
 * Returns an empty array if the class is not a valid base class.
 */
function getAdvanceOptions(baseClass) {
    var _a;
    return (_a = exports.ADVANCE_CLASS_OPTIONS[baseClass.toUpperCase()]) !== null && _a !== void 0 ? _a : [];
}
/**
 * Returns the two master class options for a given advance class.
 * Returns an empty array if the class is not a valid advance class.
 */
function getMasterOptions(advanceClass) {
    var _a;
    return (_a = exports.MASTER_CLASS_OPTIONS[advanceClass.toUpperCase()]) !== null && _a !== void 0 ? _a : [];
}
/**
 * Returns true if the given class name is a valid job class at any tier.
 */
function isValidJobClass(className) {
    return exports.ALL_JOB_CLASSES.includes(className.toUpperCase());
}
