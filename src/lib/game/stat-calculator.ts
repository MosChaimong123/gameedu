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
  SET_SHADOW_DODGE,
  SET_SHADOW_GOLD_BONUS,
  SET_SHADOW_LUCK_MULT,
  SET_SHADOW_STEAL_GOLD,
  SET_SHADOW_TIER1_PIECES,
  SET_SHADOW_TIER2_PIECES,
  SET_THUNDER_CRIT_ADD,
  SET_THUNDER_SPD_MULT,
  SET_THUNDER_TIER1_PIECES,
  SET_THUNDER_TIER2_PIECES,
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
}

// Re-export for callers that imported SET_IDS from stat-calculator
export { SET_IDS } from "./set-bonus-config";

// ─── Special Effect IDs ──────────────────────────────────────────────────────

export const EFFECT_IDS = {
  // RARE
  GOLD_FINDER:   "GOLD_FINDER",
  QUICK_LEARNER: "QUICK_LEARNER",
  TOUGH_SKIN:    "TOUGH_SKIN",
  // EPIC
  LIFESTEAL:     "LIFESTEAL",
  MANA_FLOW:     "MANA_FLOW",
  LUCKY_STRIKE:  "LUCKY_STRIKE",
  // LEGENDARY
  IMMORTAL:      "IMMORTAL",
  /** Must match prisma seed / item.effects string */
  GODS_BLESSING: "GODS_BLESSING",
  TIME_WARP:     "TIME_WARP",
} as const;

/** Deterministic ordering for equipped rows (stable even when template ids repeat). */
function compareEquippedItems(a: any, b: any): number {
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
    equippedItems: any[],
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

  static applySetBonuses(stats: ExtendedStats, equippedItems: any[]): ExtendedStats {
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

    // Shadow Set
    const shadow = setCounts[SET_IDS.SHADOW] ?? 0;
    if (shadow >= SET_SHADOW_TIER1_PIECES) {
      result.luck = Number((result.luck * SET_SHADOW_LUCK_MULT).toFixed(3));
      result.goldMultiplier += SET_SHADOW_GOLD_BONUS;
    }
    if (shadow >= SET_SHADOW_TIER2_PIECES) {
      result.dodgeChance = SET_SHADOW_DODGE;
      result.stealGoldBonus = SET_SHADOW_STEAL_GOLD;
    }

    // Legendary Set (7-piece full)
    const legendary = setCounts[SET_IDS.LEGENDARY] ?? 0;
    if (legendary >= SET_LEGENDARY_FULL_PIECES) {
      result.hp = Math.floor(result.hp * SET_LEGENDARY_ALL_STAT_MULT);
      result.atk = Math.floor(result.atk * SET_LEGENDARY_ALL_STAT_MULT);
      result.def = Math.floor(result.def * SET_LEGENDARY_ALL_STAT_MULT);
      result.spd = Math.floor(result.spd * SET_LEGENDARY_ALL_STAT_MULT);
      result.mag = Math.floor(result.mag * SET_LEGENDARY_ALL_STAT_MULT);
      result.maxMp = Math.floor(result.maxMp * SET_LEGENDARY_ALL_STAT_MULT);
      result.crit = Number((result.crit * SET_LEGENDARY_ALL_STAT_MULT).toFixed(3));
      result.luck = Number((result.luck * SET_LEGENDARY_ALL_STAT_MULT).toFixed(3));
      result.xpMultiplier += SET_LEGENDARY_XP_BONUS;
      result.chosenOneTitle = true;
    }

    return result;
  }

  // ── Step 4: Special Effects ────────────────────────────────────────────────

  static applySpecialEffects(stats: ExtendedStats, equippedItems: any[]): ExtendedStats {
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

    // LEGENDARY effects
    if (effects.has(EFFECT_IDS.IMMORTAL))       result.hasImmortal     = true;
    if (effects.has(EFFECT_IDS.TIME_WARP))      result.hasTimeWarp     = true;
    if (effects.has(EFFECT_IDS.GODS_BLESSING)) {
      result.hasGodBlessing = true;
      result.goldMultiplier += 0.1;
      result.xpMultiplier += 0.1;
      result.bossDamageMultiplier += 0.1;
    }

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
    };
  }

  private static countSets(equippedItems: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const si of equippedItems) {
      const setId = si.item?.setId ?? si.setId;
      if (setId) counts[setId] = (counts[setId] ?? 0) + 1;
    }
    return counts;
  }

  private static collectEffects(equippedItems: any[]): Set<string> {
    const effects = new Set<string>();
    for (const si of equippedItems) {
      const itemEffects: string[] = si.item?.effects ?? si.effects ?? [];
      for (const e of itemEffects) effects.add(e);
    }
    return effects;
  }

}
