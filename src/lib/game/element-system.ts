/**
 * Element System — Job affinities and boss elemental interactions.
 * Advantage: attacker element beats boss element → ×1.25 damage
 * Weakness:  boss element resists attacker element → ×0.80 damage
 */

// ─── Job Element Affinities ─────────────────────────────────────────────────

export const JOB_ELEMENTS: Record<string, string> = {
  // WARRIOR tree → EARTH
  WARRIOR: "EARTH",
  KNIGHT: "EARTH",
  BERSERKER: "EARTH",
  GUARDIAN: "EARTH",
  WARLORD: "EARTH",
  PALADIN: "LIGHT",
  "DEATH KNIGHT": "DARK",

  // MAGE tree → FIRE / DARK
  MAGE: "FIRE",
  ARCHMAGE: "FIRE",
  "GRAND WIZARD": "FIRE",
  ELEMENTALIST: "FIRE",
  WARLOCK: "DARK",
  LICH: "DARK",
  "SHADOW MAGE": "DARK",

  // RANGER tree → WIND / NATURE
  RANGER: "WIND",
  SNIPER: "WIND",
  HAWKEYE: "WIND",
  DEADEYE: "WIND",
  BEASTMASTER: "NATURE",
  "BEAST KING": "NATURE",
  TAMER: "NATURE",

  // HEALER tree → LIGHT / NATURE
  HEALER: "LIGHT",
  SAINT: "LIGHT",
  ARCHBISHOP: "LIGHT",
  "DIVINE HERALD": "LIGHT",
  DRUID: "NATURE",
  "ELDER DRUID": "NATURE",
  "NATURE WARDEN": "NATURE",

  // ROGUE tree → SHADOW / EARTH
  ROGUE: "SHADOW",
  ASSASSIN: "SHADOW",
  DUELIST: "SHADOW",
  "SHADOW LORD": "SHADOW",
  PHANTOM: "SHADOW",
  "BLADE MASTER": "SHADOW",
  "SWORD SAINT": "EARTH",
};

// ─── Element Interaction Table ───────────────────────────────────────────────
// [attacker element, boss element, multiplier]

const ELEMENT_TABLE: [string, string, number][] = [
  // Advantages (1.25×)
  ["FIRE",   "NATURE", 1.25], // Mage vs Treant
  ["FIRE",   "ICE",    1.25], // Mage vs Frost King
  ["WIND",   "FIRE",   1.25], // Ranger vs Inferno Drake
  ["LIGHT",  "DARK",   1.25], // Healer/Paladin vs Shadow Queen, Necromancer
  ["LIGHT",  "DEATH",  1.25], // Healer/Paladin vs Necromancer Lord
  ["SHADOW", "LIGHT",  1.25], // Rogue vs Celestial Guardian
  ["NATURE", "VOID",   1.25], // Druid vs Void Watcher
  ["DARK",   "LIGHT",  1.25], // Warlock/Lich vs Celestial Guardian
  // Weaknesses (0.80×)
  ["NATURE", "FIRE",   0.80], // Druid weak vs Inferno Drake
  ["EARTH",  "DARK",   0.80], // Warrior weak vs Shadow/Necromancer
  ["EARTH",  "DEATH",  0.80], // Warrior weak vs Necromancer
  ["FIRE",   "VOID",   0.80], // Mage weak vs Void Watcher
  ["LIGHT",  "VOID",   0.80], // Healer weak vs Void Watcher
  ["WIND",   "ICE",    0.80], // Ranger weak vs Frost King
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getJobElement(jobClass: string | null | undefined): string {
  if (!jobClass) return "NEUTRAL";
  return JOB_ELEMENTS[jobClass.toUpperCase()] ?? "NEUTRAL";
}

/**
 * Returns the damage multiplier for a given attacker job vs boss element.
 * 1.25 = advantage, 0.80 = weakness, 1.0 = neutral
 */
export function getElementMultiplier(
  jobClass: string | null | undefined,
  bossElementKey: string | null | undefined
): number {
  if (!jobClass || !bossElementKey || bossElementKey === "NONE") return 1.0;

  const attackerEl = getJobElement(jobClass);
  if (attackerEl === "NEUTRAL") return 1.0;

  const bossEl = bossElementKey.toUpperCase();

  for (const [atk, boss, mult] of ELEMENT_TABLE) {
    if (atk === attackerEl && boss === bossEl) return mult;
  }
  return 1.0;
}

/** Thai label for displaying element advantage/disadvantage */
export function getElementLabel(multiplier: number): string {
  if (multiplier > 1) return "⚡ ได้เปรียบธาตุ +25%";
  if (multiplier < 1) return "🔻 เสียเปรียบธาตุ -20%";
  return "";
}
