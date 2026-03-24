/**
 * Single source of truth for set piece thresholds and numeric bonuses.
 * Used by StatCalculator.applySetBonuses and Inventory UI progress.
 */

export const SET_IDS = {
  // Legacy sets (kept for backward compat — no new items use these)
  DRAGON:    "DRAGON_SET",
  THUNDER:   "THUNDER_SET",
  // New archetype sets
  TITAN:     "TITAN_SET",
  ARCANE:    "ARCANE_SET",
  HUNT:      "HUNT_SET",
  SHADOW:    "SHADOW_SET",
  // Endgame
  LEGENDARY: "LEGENDARY_SET",
} as const;

// ─── TITAN SET (Warrior/Tank) ──────────────────────────────────────────────
/** TITAN: WEAPON + BODY + HEAD + OFFHAND + GLOVES (5 EPIC pieces) */
export const SET_TITAN_TIER1_PIECES  = 3;
export const SET_TITAN_DEF_MULT      = 1.12;
export const SET_TITAN_HP_MULT       = 1.08;
export const SET_TITAN_TIER2_PIECES  = 5;
export const SET_TITAN_ATK_MULT      = 1.10;

// ─── ARCANE SET (Mage/Healer) ──────────────────────────────────────────────
/** ARCANE: WEAPON + BODY + HEAD + OFFHAND + GLOVES (5 EPIC pieces) */
export const SET_ARCANE_TIER1_PIECES = 3;
export const SET_ARCANE_MAG_MULT     = 1.15;
export const SET_ARCANE_MP_MULT      = 1.12;
export const SET_ARCANE_TIER2_PIECES = 5;
export const SET_ARCANE_CRIT_ADD     = 0.06;

// ─── HUNT SET (Ranger/Sniper/Beastmaster) ─────────────────────────────────
/** HUNT: WEAPON + BODY + HEAD + OFFHAND + GLOVES (5 EPIC pieces) */
export const SET_HUNT_TIER1_PIECES   = 3;
export const SET_HUNT_CRIT_ADD       = 0.06;
export const SET_HUNT_SPD_MULT       = 1.10;
export const SET_HUNT_TIER2_PIECES   = 5;
export const SET_HUNT_ATK_MULT       = 1.15;
export const SET_HUNT_LUCK_MULT      = 1.10;

// ─── SHADOW SET (Rogue/Assassin) ──────────────────────────────────────────
/** SHADOW: WEAPON + BODY + HEAD + BOOTS + ACCESSORY (5 EPIC pieces) */
export const SET_SHADOW_TIER1_PIECES = 3;
export const SET_SHADOW_CRIT_ADD     = 0.08;
export const SET_SHADOW_LUCK_MULT    = 1.12;
export const SET_SHADOW_TIER2_PIECES = 5;
export const SET_SHADOW_SPD_MULT     = 1.15;
export const SET_SHADOW_DODGE        = 0.12;

// ─── LEGENDARY SET (Endgame All-Class) ────────────────────────────────────
export const SET_LEGENDARY_FULL_PIECES    = 7;
export const SET_LEGENDARY_ALL_STAT_MULT  = 1.25;
export const SET_LEGENDARY_XP_BONUS       = 0.5;

// ─── Legacy set constants (Dragon/Thunder) ────────────────────────────────
export const SET_DRAGON_TIER1_PIECES  = 2;
export const SET_DRAGON_ATK_DEF_MULT  = 1.15;
export const SET_DRAGON_TIER2_PIECES  = 4;
export const SET_DRAGON_BOSS_BONUS    = 0.3;
export const SET_DRAGON_HP_MULT       = 0.25;

export const SET_THUNDER_TIER1_PIECES = 2;
export const SET_THUNDER_SPD_MULT     = 1.2;
export const SET_THUNDER_CRIT_ADD     = 0.08;
export const SET_THUNDER_TIER2_PIECES = 4;

export const SET_SHADOW_GOLD_BONUS    = 0.2;
export const SET_SHADOW_STEAL_GOLD    = 0.5;

// ─── UI milestone definitions ─────────────────────────────────────────────

export interface SetMilestoneUi {
  at: number;
  labelTh: string;
}

export const SET_MILESTONES_UI: Record<string, SetMilestoneUi[]> = {
  [SET_IDS.TITAN]: [
    { at: SET_TITAN_TIER1_PIECES,  labelTh: `DEF ×${SET_TITAN_DEF_MULT}, HP ×${SET_TITAN_HP_MULT}` },
    { at: SET_TITAN_TIER2_PIECES,  labelTh: `ATK ×${SET_TITAN_ATK_MULT}, เปิด IMMORTAL passive` },
  ],
  [SET_IDS.ARCANE]: [
    { at: SET_ARCANE_TIER1_PIECES, labelTh: `MAG ×${SET_ARCANE_MAG_MULT}, MP ×${SET_ARCANE_MP_MULT}` },
    { at: SET_ARCANE_TIER2_PIECES, labelTh: `CRIT +${Math.round(SET_ARCANE_CRIT_ADD * 100)}%, เปิด MANA_FLOW passive` },
  ],
  [SET_IDS.HUNT]: [
    { at: SET_HUNT_TIER1_PIECES,   labelTh: `CRIT +${Math.round(SET_HUNT_CRIT_ADD * 100)}%, SPD ×${SET_HUNT_SPD_MULT}` },
    { at: SET_HUNT_TIER2_PIECES,   labelTh: `ATK ×${SET_HUNT_ATK_MULT}, LUK ×${SET_HUNT_LUCK_MULT}, เปิด LUCKY_STRIKE passive` },
  ],
  [SET_IDS.SHADOW]: [
    { at: SET_SHADOW_TIER1_PIECES, labelTh: `CRIT +${Math.round(SET_SHADOW_CRIT_ADD * 100)}%, LUK ×${SET_SHADOW_LUCK_MULT}` },
    { at: SET_SHADOW_TIER2_PIECES, labelTh: `SPD ×${SET_SHADOW_SPD_MULT}, หลบ ${Math.round(SET_SHADOW_DODGE * 100)}%` },
  ],
  [SET_IDS.LEGENDARY]: [
    { at: SET_LEGENDARY_FULL_PIECES, labelTh: `สเตตส์หลัก ×${SET_LEGENDARY_ALL_STAT_MULT}, XP +${Math.round(SET_LEGENDARY_XP_BONUS * 100)}%` },
  ],
  // Legacy
  [SET_IDS.DRAGON]: [
    { at: SET_DRAGON_TIER1_PIECES, labelTh: "ATK/DEF ×1.15" },
    { at: SET_DRAGON_TIER2_PIECES, labelTh: `Boss damage +${Math.round(SET_DRAGON_BOSS_BONUS * 100)}%, HP +${Math.round(SET_DRAGON_HP_MULT * 100)}%` },
  ],
  [SET_IDS.THUNDER]: [
    { at: SET_THUNDER_TIER1_PIECES, labelTh: `SPD ×${SET_THUNDER_SPD_MULT}, CRT +${Math.round(SET_THUNDER_CRIT_ADD * 100)}%` },
    { at: SET_THUNDER_TIER2_PIECES, labelTh: "สายฟ้าโจมตีติดคริ (chain lightning)" },
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
