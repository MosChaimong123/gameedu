import { IdleEngine, CharacterStats } from "./idle-engine";
import {
  applyJobPassiveMultipliers,
  getPassivesForClass,
  getStatMultipliers,
  resolveEffectiveJobKey,
  type JobTier,
} from "./job-system";
import {
  SET_DRAGON_ATK_DEF_MULT,
  SET_DRAGON_BOSS_BONUS,
  SET_DRAGON_HP_MULT,
  SET_DRAGON_TIER1_PIECES,
  SET_DRAGON_TIER2_PIECES,
  SET_IDS,
  SET_LEGENDARY_ALL_STAT_MULT,
  SET_LEGENDARY_FULL_PIECES,
  SET_LEGENDARY_XP_BONUS,
  SET_THUNDER_CRIT_ADD,
  SET_THUNDER_SPD_MULT,
  SET_THUNDER_TIER1_PIECES,
  SET_THUNDER_TIER2_PIECES,
  // New archetype sets
  SET_TITAN_TIER1_PIECES,
  SET_TITAN_DEF_MULT,
  SET_TITAN_HP_MULT,
  SET_TITAN_TIER2_PIECES,
  SET_TITAN_ATK_MULT,
  SET_ARCANE_TIER1_PIECES,
  SET_ARCANE_MAG_MULT,
  SET_ARCANE_MP_MULT,
  SET_ARCANE_TIER2_PIECES,
  SET_ARCANE_CRIT_ADD,
  SET_HUNT_TIER1_PIECES,
  SET_HUNT_CRIT_ADD,
  SET_HUNT_SPD_MULT,
  SET_HUNT_TIER2_PIECES,
  SET_HUNT_ATK_MULT,
  SET_HUNT_LUCK_MULT,
  SET_SHADOW_CRIT_ADD,
  SET_SHADOW_SPD_MULT,
  SET_SHADOW_LUCK_MULT,
  SET_SHADOW_TIER1_PIECES,
  SET_SHADOW_TIER2_PIECES,
  SET_SHADOW_DODGE,
} from "./set-bonus-config";

/**
 * Extended stats that include battle-specific multipliers and effects
 */
export interface ExtendedStats extends CharacterStats {
  goldMultiplier: number;
  xpMultiplier: number;
  bossDamageMultiplier: number;
  dodgeChance: number;
  stealGoldBonus: number;
  chainLightningOnCrit: boolean;
  chosenOneTitle: boolean;
  // Special effect flags (resolved per-battle)
  hasLifesteal: boolean;
  hasImmortal: boolean;
  hasManaFlow: boolean;
  hasTimeWarp: boolean;
  hasToughSkin: boolean;
  hasLuckyStrike: boolean;
  hasGodBlessing: boolean;
  // New archetype effect flags
  hasTitanWill: boolean;    // HP < 30% → DEF ×1.50
  hasHolyFury: boolean;     // HP < 30% → ATK ×1.40
  hasArcaneSurge: boolean;  // MAG skill → +10% damage
  hasDarkPact: boolean;     // +20% DMG, -5% HP/turn
  hasHawkEye: boolean;      // CRIT damage ×1.30
  hasShadowVeil: boolean;   // Dodge 0.15 on-dodge CRIT ×1.20
  // New effects
  hasBerserkerRage: boolean;  // HP < 50% → ATK ×1.20
  hasBattleFocus: boolean;    // HP < 50% → CRIT ×2
  hasEchoStrike: boolean;     // 30% chance second hit 50% DMG
  hasDragonBlood: boolean;    // regen 2% maxHP per boss tick
  hasCelestialGrace: boolean; // all stat ×1.05, EXP +15% (also a stat bonus flag)
  hasVoidWalker: boolean;     // Dodge 25%, counter 50% ATK
  hasSoulEater: boolean;      // on kill: regen 15% maxHP
}

type EquippedItemData = {
  id?: string | null;
  setId?: string | null;
  effects?: unknown;
  baseAtk?: number | null;
  baseDef?: number | null;
  baseHp?: number | null;
  baseSpd?: number | null;
  baseCrit?: number | null;
  baseLuck?: number | null;
  baseMag?: number | null;
  baseMp?: number | null;
};

export type EquippedItemSource = {
  id?: string | null;
  itemId?: string | null;
  setId?: string | null;
  effects?: unknown;
  enhancementLevel?: number | null;
  item?: EquippedItemData | null;
};

// Re-export for callers that imported SET_IDS from stat-calculator
export { SET_IDS } from "./set-bonus-config";

// ─── Special Effect IDs ──────────────────────────────────────────────────────

export const EFFECT_IDS = {
  // RARE
  GOLD_FINDER:    "GOLD_FINDER",
  QUICK_LEARNER:  "QUICK_LEARNER",
  TOUGH_SKIN:     "TOUGH_SKIN",
  // EPIC
  LIFESTEAL:      "LIFESTEAL",
  MANA_FLOW:      "MANA_FLOW",
  LUCKY_STRIKE:   "LUCKY_STRIKE",
  // LEGENDARY — existing
  IMMORTAL:       "IMMORTAL",
  GODS_BLESSING:  "GODS_BLESSING",
  TIME_WARP:      "TIME_WARP",
  // LEGENDARY — new archetype effects
  TITAN_WILL:     "TITAN_WILL",    // HP < 30% → DEF ×1.50
  HOLY_FURY:      "HOLY_FURY",     // HP < 30% → ATK ×1.40
  ARCANE_SURGE:   "ARCANE_SURGE",  // MAG skill → +10% damage
  DARK_PACT:      "DARK_PACT",     // +20% damage but -5% HP/turn
  HAWK_EYE:       "HAWK_EYE",      // CRIT damage ×1.30
  HUNTER_MARK:    "HUNTER_MARK",   // Boss DMG +0.15
  SHADOW_VEIL:    "SHADOW_VEIL",   // Dodge 0.15, on Dodge: CRIT ×1.20
  BLADE_DANCE:    "BLADE_DANCE",   // SPD/10 = CRIT +1% per 10 SPD
  // New RARE effects
  SWIFT_STRIKE:   "SWIFT_STRIKE",  // SPD/10 = ATK +1% per 10 SPD
  BERSERKER_RAGE: "BERSERKER_RAGE",// HP < 50% → ATK ×1.20 in battle
  // New EPIC effects
  BATTLE_FOCUS:   "BATTLE_FOCUS",  // HP < 50% → CRIT chance ×2
  ECHO_STRIKE:    "ECHO_STRIKE",   // 30% chance second hit for 50% DMG
  // New LEGENDARY effects
  DRAGON_BLOOD:   "DRAGON_BLOOD",  // regen 2% maxHP per boss attack tick
  CELESTIAL_GRACE:"CELESTIAL_GRACE",// all stats ×1.05, EXP +15%
  VOID_WALKER:    "VOID_WALKER",   // Dodge 25%, on dodge counter 50% ATK
  SOUL_EATER:     "SOUL_EATER",    // on monster kill: regen 15% maxHP
} as const;

/** Deterministic ordering for equipped rows (stable even when template ids repeat). */
function compareEquippedItems(a: EquippedItemSource, b: EquippedItemSource): number {
  const idA = String(a.itemId ?? a.id ?? a.item?.id ?? "");
  const idB = String(b.itemId ?? b.id ?? b.item?.id ?? "");
  if (idA !== idB) return idA < idB ? -1 : idA > idB ? 1 : 0;
  const enh =
    (a.enhancementLevel ?? 0) - (b.enhancementLevel ?? 0);
  if (enh !== 0) return enh;
  const ia = a.item ?? {};
  const ib = b.item ?? {};
  const keys = [
    "baseAtk",
    "baseDef",
    "baseHp",
    "baseSpd",
    "baseCrit",
    "baseLuck",
    "baseMag",
    "baseMp",
  ] as const;
  for (const k of keys) {
    const va = Number(ia[k] ?? 0);
    const vb = Number(ib[k] ?? 0);
    if (va !== vb) return va < vb ? -1 : va > vb ? 1 : 0;
  }
  return 0;
}

// ─── StatCalculator ──────────────────────────────────────────────────────────

export class StatCalculator {
  /**
   * Full 4-step stat computation pipeline:
   * 1. IdleEngine base stats (points + equipment)
   * 2. Job class multipliers
   * 3. Set bonuses
   * 4. Special effects
   *
   * Items are sorted by itemId before processing to guarantee confluence
   * (same result regardless of input order — P1 property).
   */
  static compute(
    points: number,
    equippedItems: EquippedItemSource[],
    level: number,
    jobClass: string | null,
    jobTier: string = "BASE",
    advanceClass?: string | null
  ): ExtendedStats {
    // Sort items deterministically so floating-point accumulation is order-independent
    const sortedItems = [...equippedItems].sort(compareEquippedItems);

    // Step 1: Raw base+equipment stats (floats, no job multipliers yet).
    // Using computeRawStats instead of calculateCharacterStats to avoid double-flooring:
    // calculateCharacterStats floors at the end, then applyJobMultipliers would floor again.
    const base = IdleEngine.computeRawStats(points, sortedItems, level);

    const effectiveKey = resolveEffectiveJobKey({
      jobClass,
      jobTier,
      advanceClass,
    });
    // Step 2: Job class multipliers (merged advance/master + tier)
    let afterJob = this.applyJobMultipliers(base, effectiveKey, jobTier);

    // Step 2b: Job passives (+X% stats) — same order as IdleEngine.calculateCharacterStats
    const passiveMerged = applyJobPassiveMultipliers(
      {
        hp: afterJob.hp,
        atk: afterJob.atk,
        def: afterJob.def,
        spd: afterJob.spd,
        mag: afterJob.mag,
        maxMp: afterJob.maxMp,
        crit: afterJob.crit,
        luck: afterJob.luck,
      },
      getPassivesForClass(effectiveKey)
    );
    afterJob = { ...afterJob, ...passiveMerged };

    // Step 3: Set bonuses
    const afterSets = this.applySetBonuses(afterJob, sortedItems);

    // Step 4: Special effects
    const final = this.applySpecialEffects(afterSets, sortedItems);

    return final;
  }

  // ── Step 2: Job Multipliers ────────────────────────────────────────────────

  static applyJobMultipliers(
    stats: CharacterStats,
    effectiveJobKey: string,
    jobTier: string = "BASE"
  ): ExtendedStats {
    const extended = this.toExtended(stats);
    const mult = getStatMultipliers(
      effectiveJobKey,
      jobTier as JobTier
    );

    extended.hp = Math.floor(stats.hp * mult.hp);
    extended.atk = Math.floor(stats.atk * mult.atk);
    extended.def = Math.floor(stats.def * mult.def);
    extended.spd = Math.floor(stats.spd * mult.spd);
    extended.mag = Math.floor(stats.mag * mult.mag);
    extended.maxMp = Math.floor(stats.maxMp * mult.mp);
    extended.crit = Number((stats.crit * mult.crit).toFixed(3));
    extended.luck = Number((stats.luck * mult.luck).toFixed(3));

    return extended;
  }

  // ── Step 3: Set Bonuses ────────────────────────────────────────────────────

  static applySetBonuses(stats: ExtendedStats, equippedItems: EquippedItemSource[]): ExtendedStats {
    const result = { ...stats };
    const setCounts = this.countSets(equippedItems);

    // Dragon Set
    const dragon = setCounts[SET_IDS.DRAGON] ?? 0;
    if (dragon >= SET_DRAGON_TIER1_PIECES) {
      result.atk = Math.floor(result.atk * SET_DRAGON_ATK_DEF_MULT);
      result.def = Math.floor(result.def * SET_DRAGON_ATK_DEF_MULT);
    }
    if (dragon >= SET_DRAGON_TIER2_PIECES) {
      result.bossDamageMultiplier += SET_DRAGON_BOSS_BONUS;
      // Multiplicative HP bonus scales with level (consistent with other set bonuses)
      result.hp = Math.floor(result.hp * (1 + SET_DRAGON_HP_MULT));
    }

    // Thunder Set
    const thunder = setCounts[SET_IDS.THUNDER] ?? 0;
    if (thunder >= SET_THUNDER_TIER1_PIECES) {
      result.spd = Math.floor(result.spd * SET_THUNDER_SPD_MULT);
      result.crit = Number((result.crit + SET_THUNDER_CRIT_ADD).toFixed(3));
    }
    if (thunder >= SET_THUNDER_TIER2_PIECES) {
      result.chainLightningOnCrit = true;
    }

    // ── New Archetype Sets ────────────────────────────────────────────────

    // Titan Set (Warrior)
    const titan = setCounts[SET_IDS.TITAN] ?? 0;
    if (titan >= SET_TITAN_TIER1_PIECES) {
      result.def = Math.floor(result.def * SET_TITAN_DEF_MULT);
      result.hp  = Math.floor(result.hp  * SET_TITAN_HP_MULT);
    }
    if (titan >= SET_TITAN_TIER2_PIECES) {
      result.atk       = Math.floor(result.atk * SET_TITAN_ATK_MULT);
      result.hasImmortal = true;
    }

    // Arcane Set (Mage/Healer)
    const arcane = setCounts[SET_IDS.ARCANE] ?? 0;
    if (arcane >= SET_ARCANE_TIER1_PIECES) {
      result.mag    = Math.floor(result.mag    * SET_ARCANE_MAG_MULT);
      result.maxMp  = Math.floor(result.maxMp  * SET_ARCANE_MP_MULT);
    }
    if (arcane >= SET_ARCANE_TIER2_PIECES) {
      result.crit      = Number((result.crit + SET_ARCANE_CRIT_ADD).toFixed(3));
      result.hasManaFlow = true;
    }

    // Hunt Set (Ranger/Sniper/Beastmaster)
    const hunt = setCounts[SET_IDS.HUNT] ?? 0;
    if (hunt >= SET_HUNT_TIER1_PIECES) {
      result.crit = Number((result.crit + SET_HUNT_CRIT_ADD).toFixed(3));
      result.spd  = Math.floor(result.spd * SET_HUNT_SPD_MULT);
    }
    if (hunt >= SET_HUNT_TIER2_PIECES) {
      result.atk  = Math.floor(result.atk * SET_HUNT_ATK_MULT);
      result.luck = Number((result.luck * SET_HUNT_LUCK_MULT).toFixed(3));
      result.hasLuckyStrike = true;
    }

    // Shadow Set (Rogue/Assassin)
    const shadowNew = setCounts[SET_IDS.SHADOW] ?? 0;
    if (shadowNew >= SET_SHADOW_TIER1_PIECES) {
      result.crit = Number((result.crit + SET_SHADOW_CRIT_ADD).toFixed(3));
      result.luck = Number((result.luck * SET_SHADOW_LUCK_MULT).toFixed(3));
    }
    if (shadowNew >= SET_SHADOW_TIER2_PIECES) {
      result.spd        = Math.floor(result.spd * SET_SHADOW_SPD_MULT);
      result.dodgeChance = Math.max(result.dodgeChance, SET_SHADOW_DODGE);
      result.hasLifesteal = true;
    }

    // Legendary Set (7-piece full)
    const legendary = setCounts[SET_IDS.LEGENDARY] ?? 0;
    if (legendary >= SET_LEGENDARY_FULL_PIECES) {
      result.hp    = Math.floor(result.hp    * SET_LEGENDARY_ALL_STAT_MULT);
      result.atk   = Math.floor(result.atk   * SET_LEGENDARY_ALL_STAT_MULT);
      result.def   = Math.floor(result.def   * SET_LEGENDARY_ALL_STAT_MULT);
      result.spd   = Math.floor(result.spd   * SET_LEGENDARY_ALL_STAT_MULT);
      result.mag   = Math.floor(result.mag   * SET_LEGENDARY_ALL_STAT_MULT);
      result.maxMp = Math.floor(result.maxMp * SET_LEGENDARY_ALL_STAT_MULT);
      result.crit  = Number((result.crit * SET_LEGENDARY_ALL_STAT_MULT).toFixed(3));
      result.luck  = Number((result.luck * SET_LEGENDARY_ALL_STAT_MULT).toFixed(3));
      result.xpMultiplier += SET_LEGENDARY_XP_BONUS;
      result.chosenOneTitle = true;
    }

    return result;
  }

  // ── Step 4: Special Effects ────────────────────────────────────────────────

  static applySpecialEffects(stats: ExtendedStats, equippedItems: EquippedItemSource[]): ExtendedStats {
    const result = { ...stats };
    const effects = this.collectEffects(equippedItems);

    // RARE effects
    if (effects.has(EFFECT_IDS.GOLD_FINDER))   result.goldMultiplier += 0.15;
    if (effects.has(EFFECT_IDS.QUICK_LEARNER))  result.xpMultiplier   += 0.10;
    if (effects.has(EFFECT_IDS.TOUGH_SKIN))     result.hasToughSkin    = true;

    // EPIC effects
    if (effects.has(EFFECT_IDS.LIFESTEAL))      result.hasLifesteal    = true;
    if (effects.has(EFFECT_IDS.MANA_FLOW))      result.hasManaFlow     = true;
    if (effects.has(EFFECT_IDS.LUCKY_STRIKE) && result.luck > 0.5) {
      result.crit = Number((result.crit + 0.05).toFixed(3));
      result.hasLuckyStrike = true;
    }

    // LEGENDARY effects — existing
    if (effects.has(EFFECT_IDS.IMMORTAL))       result.hasImmortal     = true;
    if (effects.has(EFFECT_IDS.TIME_WARP))      result.hasTimeWarp     = true;
    if (effects.has(EFFECT_IDS.GODS_BLESSING)) {
      result.hasGodBlessing = true;
      result.goldMultiplier += 0.1;
      result.xpMultiplier += 0.1;
      result.bossDamageMultiplier += 0.1;
    }

    // LEGENDARY effects — new archetype
    if (effects.has(EFFECT_IDS.TITAN_WILL))     result.hasTitanWill    = true;
    if (effects.has(EFFECT_IDS.HOLY_FURY))      result.hasHolyFury     = true;
    if (effects.has(EFFECT_IDS.ARCANE_SURGE))   result.hasArcaneSurge  = true;
    if (effects.has(EFFECT_IDS.DARK_PACT))      result.hasDarkPact     = true;
    if (effects.has(EFFECT_IDS.HAWK_EYE))       result.hasHawkEye      = true;
    if (effects.has(EFFECT_IDS.HUNTER_MARK)) {
      result.bossDamageMultiplier += 0.15;
    }
    if (effects.has(EFFECT_IDS.SHADOW_VEIL)) {
      result.dodgeChance = Math.max(result.dodgeChance, 0.15);
      result.hasShadowVeil = true;
    }
    if (effects.has(EFFECT_IDS.BLADE_DANCE)) {
      result.crit = Number((result.crit + Math.floor(result.spd / 10) * 0.01).toFixed(3));
    }

    // ── New RARE effects ──────────────────────────────────────────────────────
    if (effects.has(EFFECT_IDS.SWIFT_STRIKE)) {
      // SPD every 10 = ATK +1%
      result.atk = Math.floor(result.atk * (1 + Math.floor(result.spd / 10) * 0.01));
    }
    if (effects.has(EFFECT_IDS.BERSERKER_RAGE))  result.hasBerserkerRage  = true;

    // ── New EPIC effects ──────────────────────────────────────────────────────
    if (effects.has(EFFECT_IDS.BATTLE_FOCUS))    result.hasBattleFocus    = true;
    if (effects.has(EFFECT_IDS.ECHO_STRIKE))     result.hasEchoStrike     = true;

    // ── New LEGENDARY effects ─────────────────────────────────────────────────
    if (effects.has(EFFECT_IDS.DRAGON_BLOOD))    result.hasDragonBlood    = true;
    if (effects.has(EFFECT_IDS.CELESTIAL_GRACE)) {
      result.hasCelestialGrace = true;
      result.hp    = Math.floor(result.hp    * 1.05);
      result.atk   = Math.floor(result.atk   * 1.05);
      result.def   = Math.floor(result.def   * 1.05);
      result.spd   = Math.floor(result.spd   * 1.05);
      result.mag   = Math.floor(result.mag   * 1.05);
      result.maxMp = Math.floor(result.maxMp * 1.05);
      result.crit  = Number((result.crit  * 1.05).toFixed(3));
      result.luck  = Number((result.luck  * 1.05).toFixed(3));
      result.xpMultiplier += 0.15;
    }
    if (effects.has(EFFECT_IDS.VOID_WALKER))     result.hasVoidWalker     = true;
    if (effects.has(EFFECT_IDS.SOUL_EATER))      result.hasSoulEater      = true;

    return result;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private static toExtended(stats: CharacterStats): ExtendedStats {
    return {
      ...stats,
      goldMultiplier:       0,
      xpMultiplier:         0,
      bossDamageMultiplier: 0,
      dodgeChance:          0,
      stealGoldBonus:       0,
      chainLightningOnCrit: false,
      chosenOneTitle:       false,
      hasLifesteal:         false,
      hasImmortal:          false,
      hasManaFlow:          false,
      hasTimeWarp:          false,
      hasToughSkin:         false,
      hasLuckyStrike:       false,
      hasGodBlessing:       false,
      hasTitanWill:         false,
      hasHolyFury:          false,
      hasArcaneSurge:       false,
      hasDarkPact:          false,
      hasHawkEye:           false,
      hasShadowVeil:        false,
      hasBerserkerRage:     false,
      hasBattleFocus:       false,
      hasEchoStrike:        false,
      hasDragonBlood:       false,
      hasCelestialGrace:    false,
      hasVoidWalker:        false,
      hasSoulEater:         false,
    };
  }

  private static countSets(equippedItems: EquippedItemSource[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const si of equippedItems) {
      const setId = si.item?.setId ?? si.setId;
      if (setId) counts[setId] = (counts[setId] ?? 0) + 1;
    }
    return counts;
  }

  private static collectEffects(equippedItems: EquippedItemSource[]): Set<string> {
    const effects = new Set<string>();
    for (const si of equippedItems) {
      const itemEffects = this.normalizeEffects(si.item?.effects ?? si.effects);
      for (const e of itemEffects) effects.add(e);
    }
    return effects;
  }

  private static normalizeEffects(effects: unknown): string[] {
    if (Array.isArray(effects)) {
      return effects.filter((effect): effect is string => typeof effect === "string");
    }

    if (typeof effects === "string") {
      return [effects];
    }

    return [];
  }

}
