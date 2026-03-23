/**
 * Aggregate item multipliers from equipped rows (same formula as IdleEngine / StatCalculator item loops).
 */

/** Idle gold rate uses `1 + sum(item bonuses)`; UI labels that baseline as 100%. */
export const IDLE_GOLD_BOSS_DISPLAY_BASE_PERCENT = 100;

export type EquippedRow = {
  enhancementLevel?: number;
  item?: {
    goldMultiplier?: number | null;
    bossDamageMultiplier?: number | null;
  };
};

export function enhancementMultiplier(level: number): number {
  return 1 + (level || 0) * 0.1;
}

/** Sum of (item goldMult * enhMult) for each equipped row — additive bonuses on rate. */
export function sumEquippedGoldMultiplierBonus(items: EquippedRow[]): number {
  let sum = 0;
  for (const si of items) {
    const lb = enhancementMultiplier(si.enhancementLevel ?? 0);
    const g = si.item?.goldMultiplier ?? 0;
    sum += Number(g) * lb;
  }
  return sum;
}

/** Sum of (item bossMult * enhMult). */
export function sumEquippedBossDamageMultiplierBonus(items: EquippedRow[]): number {
  let sum = 0;
  for (const si of items) {
    const lb = enhancementMultiplier(si.enhancementLevel ?? 0);
    const b = si.item?.bossDamageMultiplier ?? 0;
    sum += Number(b) * lb;
  }
  return sum;
}
