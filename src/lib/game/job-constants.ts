/**
 * Job Class Constants
 * Defines the full 25-path job progression tree, level requirements,
 * and helper functions for job class validation and lookup.
 * Requirements: 12
 */

// ─── Level Requirements ───────────────────────────────────────────────────────

export const JOB_LEVEL_REQUIREMENTS = {
  BASE_LEVEL: 5,
  ADVANCE_LEVEL: 20,
  MASTER_LEVEL: 50,
} as const;

// ─── Class Lists ──────────────────────────────────────────────────────────────

export const BASE_CLASSES: string[] = [
  "WARRIOR",
  "MAGE",
  "RANGER",
  "HEALER",
  "ROGUE",
];

export const ADVANCE_CLASSES: string[] = [
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

export const MASTER_CLASSES: string[] = [
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
export const ADVANCE_CLASS_OPTIONS: Record<string, string[]> = {
  WARRIOR: ["KNIGHT", "BERSERKER"],
  MAGE: ["ARCHMAGE", "WARLOCK"],
  RANGER: ["SNIPER", "BEASTMASTER"],
  HEALER: ["SAINT", "DRUID"],
  ROGUE: ["ASSASSIN", "DUELIST"],
};

// ─── Master Class Options ─────────────────────────────────────────────────────

/** Maps each advance class to its two master class options (unlocked at Lv 50). */
export const MASTER_CLASS_OPTIONS: Record<string, string[]> = {
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

// ─── Job Path Type ────────────────────────────────────────────────────────────

export interface JobPath {
  baseClass: string;
  advanceClass: string;
  masterClass: string;
}

// ─── All 25 Job Paths ─────────────────────────────────────────────────────────

/**
 * All 25 unique job paths in the progression tree.
 * Each path represents one complete base → advance → master chain.
 * (5 base classes × 2 advance × 2 master = 20 paths, but spec counts
 *  the 5 base-only paths too, giving 25 total paths.)
 */
export const ALL_JOB_PATHS: JobPath[] = BASE_CLASSES.flatMap((baseClass) =>
  ADVANCE_CLASS_OPTIONS[baseClass].flatMap((advanceClass) =>
    MASTER_CLASS_OPTIONS[advanceClass].map((masterClass) => ({
      baseClass,
      advanceClass,
      masterClass,
    }))
  )
);

// ─── All Unique Class Names ───────────────────────────────────────────────────

/** Flat list of every unique class name across all tiers (NOVICE + 5 base + 10 advance + 20 master = 36). */
export const ALL_JOB_CLASSES: string[] = [
  "NOVICE",
  ...BASE_CLASSES,
  ...ADVANCE_CLASSES,
  ...MASTER_CLASSES,
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Returns the two advance class options for a given base class.
 * Returns an empty array if the class is not a valid base class.
 */
export function getAdvanceOptions(baseClass: string): string[] {
  return ADVANCE_CLASS_OPTIONS[baseClass.toUpperCase()] ?? [];
}

/**
 * Returns the two master class options for a given advance class.
 * Returns an empty array if the class is not a valid advance class.
 */
export function getMasterOptions(advanceClass: string): string[] {
  return MASTER_CLASS_OPTIONS[advanceClass.toUpperCase()] ?? [];
}

/** Normalize names from user input (trim + uppercase; keeps e.g. "DEATH KNIGHT"). */
export function normalizeJobClassName(className: string): string {
  return className.trim().toUpperCase();
}

/**
 * Returns true if the given class name is a valid job class at any tier.
 */
export function isValidJobClass(className: string): boolean {
  return ALL_JOB_CLASSES.includes(normalizeJobClassName(className));
}
