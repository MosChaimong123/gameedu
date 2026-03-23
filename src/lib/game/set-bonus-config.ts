/**
 * Single source of truth for set piece thresholds and numeric bonuses.
 * Used by StatCalculator.applySetBonuses and Inventory UI progress.
 */

export const SET_IDS = {
  DRAGON: "DRAGON_SET",
  THUNDER: "THUNDER_SET",
  SHADOW: "SHADOW_SET",
  LEGENDARY: "LEGENDARY_SET",
} as const;

/** Dragon: 2pc ATK/DEF, 4pc boss + HP */
export const SET_DRAGON_TIER1_PIECES = 2;
export const SET_DRAGON_ATK_DEF_MULT = 1.15;
export const SET_DRAGON_TIER2_PIECES = 4;
export const SET_DRAGON_BOSS_BONUS = 0.3;
/** HP bonus is multiplicative (+25%) so it scales with level instead of being trivial at high levels. */
export const SET_DRAGON_HP_MULT = 0.25;

/** Thunder: 2pc SPD + crit, 4pc chain lightning flag */
export const SET_THUNDER_TIER1_PIECES = 2;
export const SET_THUNDER_SPD_MULT = 1.2;
export const SET_THUNDER_CRIT_ADD = 0.08;
export const SET_THUNDER_TIER2_PIECES = 4;

/** Shadow: 2pc luck + gold mult, 4pc dodge + steal */
export const SET_SHADOW_TIER1_PIECES = 2;
export const SET_SHADOW_LUCK_MULT = 1.1;
export const SET_SHADOW_GOLD_BONUS = 0.2;
export const SET_SHADOW_TIER2_PIECES = 4;
export const SET_SHADOW_DODGE = 0.15;
export const SET_SHADOW_STEAL_GOLD = 0.5;

/** Legendary: full 7pc only */
export const SET_LEGENDARY_FULL_PIECES = 7;
export const SET_LEGENDARY_ALL_STAT_MULT = 1.25;
export const SET_LEGENDARY_XP_BONUS = 0.5;

/** Milestones per setId for UI (Thai copy matches engine). */
export interface SetMilestoneUi {
  at: number;
  labelTh: string;
}

export const SET_MILESTONES_UI: Record<string, SetMilestoneUi[]> = {
  [SET_IDS.DRAGON]: [
    { at: SET_DRAGON_TIER1_PIECES, labelTh: "ATK/DEF ×1.15" },
    {
      at: SET_DRAGON_TIER2_PIECES,
      labelTh: `Boss damage +${Math.round(SET_DRAGON_BOSS_BONUS * 100)}%, HP +${Math.round(SET_DRAGON_HP_MULT * 100)}%`,
    },
  ],
  [SET_IDS.THUNDER]: [
    {
      at: SET_THUNDER_TIER1_PIECES,
      labelTh: `SPD ×${SET_THUNDER_SPD_MULT}, CRT +${Math.round(SET_THUNDER_CRIT_ADD * 100)}%`,
    },
    { at: SET_THUNDER_TIER2_PIECES, labelTh: "สายฟ้าโจมตีติดคริ (chain lightning)" },
  ],
  [SET_IDS.SHADOW]: [
    {
      at: SET_SHADOW_TIER1_PIECES,
      labelTh: `LUK ×${SET_SHADOW_LUCK_MULT}, ทอง +${Math.round(SET_SHADOW_GOLD_BONUS * 100)}%`,
    },
    {
      at: SET_SHADOW_TIER2_PIECES,
      labelTh: `หลบ ${Math.round(SET_SHADOW_DODGE * 100)}%, Steal gold +${Math.round(SET_SHADOW_STEAL_GOLD * 100)}%`,
    },
  ],
  [SET_IDS.LEGENDARY]: [
    {
      at: SET_LEGENDARY_FULL_PIECES,
      labelTh: `สเตตส์หลัก ×${SET_LEGENDARY_ALL_STAT_MULT}, XP +${Math.round(SET_LEGENDARY_XP_BONUS * 100)}%`,
    },
  ],
};

/** Max pieces shown for progress bar (next milestone or full set). */
export function getSetDisplayMaxPieces(setId: string): number {
  const m = SET_MILESTONES_UI[setId];
  if (!m?.length) return 7;
  return Math.max(...m.map((x) => x.at));
}

/** Highest milestone reached at `count` equipped pieces. */
export function getReachedSetMilestones(setId: string, count: number): SetMilestoneUi[] {
  const m = SET_MILESTONES_UI[setId] ?? [];
  return m.filter((x) => count >= x.at);
}

/** Next milestone not yet reached (if any). */
export function getNextSetMilestone(
  setId: string,
  count: number
): SetMilestoneUi | null {
  const m = SET_MILESTONES_UI[setId] ?? [];
  const next = m.find((x) => count < x.at);
  return next ?? null;
}
