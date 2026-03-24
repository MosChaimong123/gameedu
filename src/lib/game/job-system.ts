/**
 * Job Class System
 * Defines skill unlock tables, passive bonuses, and stat multipliers for all job classes.
 * Requirements: 10, 11, 12
 */

import { ALL_JOB_CLASSES, BASE_CLASSES } from "./job-constants";
import { JOB_CLASS_EXTENSIONS } from "./job-extensions";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  description: string;
  cost: number;
  /**
   * Resource consumed when using this skill.
   * - "AP" = Stamina (BattlePlayer.ap / Student.stamina) — physical resource
   * - "MP" = Mana    (BattlePlayer.mp / Student.mana)    — magical resource
   * The "AP" label is legacy; semantically it means Stamina throughout the codebase.
   */
  costType: "AP" | "MP";
  unlockLevel: number;
  effect?: string;
  damageMultiplier?: number; // Damage dealt = baseStat * damageMultiplier
  isCrit?: boolean;          // If true, guaranteed critical hit
  damageBase?: "ATK" | "MAG"; // Which stat to use for damage; defaults to "ATK"
  icon?: string;             // Optional custom image icon path
  cooldown?: number;         // Turns before skill can be used again (0 or undefined = no cooldown)
}

export interface Passive {
  id: string;
  name: string;
  description: string;
  statBonus: {
    stat: "HP" | "ATK" | "DEF" | "SPD" | "MAG" | "MP" | "CRIT";
    multiplier: number; // e.g. 0.10 = +10%
  };
}

export interface StatMultipliers {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mag: number;
  mp: number;
  crit: number;
  luck: number;
}

export interface JobClassDefinition {
  skills: Skill[];
  passives: Passive[];
  statMultipliers: StatMultipliers;
}

/** Advance/Master row: merged onto `inheritsFrom` definition (see job-extensions.ts). */
export interface JobClassExtension {
  inheritsFrom: string;
  extraSkills: Skill[];
  extraPassives?: Passive[];
  statMultiplierDelta?: Partial<StatMultipliers>;
}

export type JobTier = "BASE" | "ADVANCE" | "MASTER";

// ─── NOVICE Skills (Lv 1-4) ──────────────────────────────────────────────────

const NOVICE_SKILLS: Skill[] = [
  {
    id: "novice_strike",
    name: "Basic Strike",
    description: "A simple attack dealing ATK damage.",
    cost: 10,
    costType: "MP",
    unlockLevel: 1,
    effect: "DAMAGE",
    damageMultiplier: 1.3,
    icon: "/assets/skills/novice_strike.png",
  },
  {
    id: "novice_guard",
    name: "Guard",
    description: "Brace for impact, reducing incoming damage this turn.",
    cost: 5,
    costType: "MP",
    unlockLevel: 1,
    effect: "DEFEND",
    damageMultiplier: 0.5,
    icon: "/assets/skills/novice_guard.png",
  },
];

// ─── WARRIOR ─────────────────────────────────────────────────────────────────

const WARRIOR_SKILLS: Skill[] = [
  {
    id: "warrior_slash",
    name: "Slash",
    description: "A powerful slash dealing 1.5× ATK damage.",
    cost: 10,
    costType: "MP",
    unlockLevel: 5,
    effect: "DAMAGE",
    damageMultiplier: 1.5,
    icon: "/assets/skills/warrior_slash.png",
  },
  {
    id: "warrior_shield_wall",
    name: "Shield Wall",
    description: "Raise your shield, reducing incoming damage by 50% for 2 turns.",
    cost: 15,
    costType: "MP",
    unlockLevel: 8,
    effect: "BUFF_DEF",
    damageMultiplier: 0.5,
    icon: "/assets/skills/warrior_shield_wall.png",
  },
  {
    id: "warrior_war_cry",
    name: "War Cry",
    description: "Boost ATK of all allies by 20% for 3 turns.",
    cost: 20,
    costType: "MP",
    unlockLevel: 12,
    effect: "BUFF_ATK",
    damageMultiplier: 0.8,
    icon: "/assets/skills/warrior_war_cry.png",
  },
  {
    id: "warrior_whirlwind",
    name: "Whirlwind",
    description: "Spin attack hitting all enemies for 2.3× ATK damage.",
    cost: 25,
    costType: "MP",
    unlockLevel: 16,
    effect: "DAMAGE",
    damageMultiplier: 2.3,
    icon: "/assets/skills/warrior_whirlwind.png",
  },
  {
    id: "warrior_devastate",
    name: "Devastate",
    description: "Crush the enemy for 2.8× ATK damage, breaking armor — enemy takes +20% damage for 3 turns.",
    cost: 30,
    costType: "MP",
    unlockLevel: 20,
    effect: "ARMOR_PIERCE",
    damageMultiplier: 2.8,
    icon: "/assets/skills/warrior_devastate.png",
  },
  {
    id: "warrior_heroic_strike",
    name: "Heroic Strike",
    description: "Ultimate blow dealing 4× ATK damage with guaranteed CRIT.",
    cost: 35,
    costType: "MP",
    unlockLevel: 25,
    effect: "DAMAGE",
    damageMultiplier: 2.0,
    isCrit: true,
    icon: "/assets/skills/warrior_heroic_strike.png",
  },
];

const WARRIOR_PASSIVES: Passive[] = [
  {
    id: "warrior_iron_body",
    name: "Iron Body",
    description: "Hardened physique grants +10% DEF.",
    statBonus: { stat: "DEF", multiplier: 0.10 },
  },
  {
    id: "warrior_battle_hardened",
    name: "Battle Hardened",
    description: "Years of combat grant +5% HP.",
    statBonus: { stat: "HP", multiplier: 0.05 },
  },
  {
    id: "warrior_weapon_mastery",
    name: "Weapon Mastery",
    description: "Expert weapon handling grants +5% ATK.",
    statBonus: { stat: "ATK", multiplier: 0.05 },
  },
];

// ─── MAGE ─────────────────────────────────────────────────────────────────────

const MAGE_SKILLS: Skill[] = [
  {
    id: "mage_fireball",
    name: "Fireball",
    description: "Hurl a ball of fire dealing 1.8× MAG damage.",
    cost: 15,
    costType: "MP",
    unlockLevel: 5,
    effect: "DAMAGE",
    damageMultiplier: 1.8,
    damageBase: "MAG",
    icon: "/assets/skills/mage_fireball.png",
  },
  {
    id: "mage_blizzard",
    name: "Blizzard",
    description: "Summon a blizzard dealing 2× MAG damage and slowing the enemy.",
    cost: 20,
    costType: "MP",
    unlockLevel: 8,
    effect: "SLOW",
    damageMultiplier: 2.0,
    damageBase: "MAG",
    icon: "/assets/skills/mage_blizzard.png",
  },
  {
    id: "mage_thunder",
    name: "Thunder",
    description: "Call down lightning for 2.3× MAG damage with a 50% chance to stun.",
    cost: 25,
    costType: "MP",
    unlockLevel: 12,
    effect: "STUN",
    damageMultiplier: 2.3,
    damageBase: "MAG",
    icon: "/assets/skills/mage_thunder.png",
  },
  {
    id: "mage_mana_surge",
    name: "Mana Surge",
    description: "Channel raw mana for 2.7× MAG damage and restore 10 MP.",
    cost: 30,
    costType: "MP",
    unlockLevel: 16,
    effect: "MANA_SURGE",
    damageMultiplier: 2.7,
    damageBase: "MAG",
    icon: "/assets/skills/mage_mana_surge.png",
  },
  {
    id: "mage_meteor",
    name: "Meteor",
    description: "Call down a meteor dealing 3.5× MAG damage to all enemies.",
    cost: 40,
    costType: "MP",
    unlockLevel: 20,
    effect: "DAMAGE",
    damageMultiplier: 3.5,
    damageBase: "MAG",
    icon: "/assets/skills/mage_meteor.png",
  },
  {
    id: "mage_arcane_nova",
    name: "Arcane Nova",
    description: "Unleash arcane energy dealing 5.6× MAG damage (2.8× + guaranteed CRIT).",
    cost: 50,
    costType: "MP",
    unlockLevel: 25,
    effect: "DAMAGE",
    damageMultiplier: 2.8,
    damageBase: "MAG",
    isCrit: true,
    icon: "/assets/skills/mage_arcane_nova.png",
  },
];

const MAGE_PASSIVES: Passive[] = [
  {
    id: "mage_arcane_mind",
    name: "Arcane Mind",
    description: "Deep arcane knowledge grants +10% MAG.",
    statBonus: { stat: "MAG", multiplier: 0.10 },
  },
  {
    id: "mage_mana_well",
    name: "Mana Well",
    description: "Expanded mana reserves grant +15% MP.",
    statBonus: { stat: "MP", multiplier: 0.15 },
  },
  {
    id: "mage_spell_focus",
    name: "Spell Focus",
    description: "Precise spellcasting grants +3% CRIT.",
    statBonus: { stat: "CRIT", multiplier: 0.03 },
  },
];

// ─── RANGER ───────────────────────────────────────────────────────────────────

const RANGER_SKILLS: Skill[] = [
  {
    id: "ranger_arrow_shot",
    name: "Arrow Shot",
    description: "A precise arrow dealing 1.4× ATK damage.",
    cost: 10,
    costType: "MP",
    unlockLevel: 5,
    effect: "DAMAGE",
    damageMultiplier: 1.4,
    icon: "/assets/skills/ranger_arrow_shot.png",
  },
  {
    id: "ranger_poison_arrow",
    name: "Poison Arrow",
    description: "A poisoned arrow dealing 1.5× ATK damage and applying poison for 3 turns.",
    cost: 15,
    costType: "MP",
    unlockLevel: 8,
    effect: "POISON",
    damageMultiplier: 1.5,
    icon: "/assets/skills/ranger_poison_arrow.png",
  },
  {
    id: "ranger_wind_shot",
    name: "Wind Shot",
    description: "A wind-infused arrow dealing 1.5× ATK damage and reducing enemy ATK by 30% for 2 turns.",
    cost: 20,
    costType: "MP",
    unlockLevel: 12,
    effect: "DEBUFF_ATK",
    damageMultiplier: 1.5,
    icon: "/assets/skills/ranger_wind_shot.png",
  },
  {
    id: "ranger_eagle_eye",
    name: "Eagle Eye",
    description: "Mark a target, increasing CRIT chance by 30% for 3 turns.",
    cost: 25,
    costType: "MP",
    unlockLevel: 16,
    effect: "CRIT_BUFF",
    damageMultiplier: 1.0,
    icon: "/assets/skills/ranger_eagle_eye.png",
  },
  {
    id: "ranger_barrage",
    name: "Barrage",
    description: "Fire a volley of arrows dealing 2.6× ATK damage to all enemies.",
    cost: 30,
    costType: "MP",
    unlockLevel: 20,
    effect: "DAMAGE",
    damageMultiplier: 2.6,
    icon: "/assets/skills/ranger_barrage.png",
  },
  {
    id: "ranger_snipe",
    name: "Snipe",
    description: "A devastating shot dealing 4.6× ATK damage (2.3× + guaranteed CRIT).",
    cost: 40,
    costType: "MP",
    unlockLevel: 25,
    effect: "DAMAGE",
    damageMultiplier: 2.3,
    isCrit: true,
    icon: "/assets/skills/ranger_snipe.png",
  },
];

const RANGER_PASSIVES: Passive[] = [
  {
    id: "ranger_keen_eye",
    name: "Keen Eye",
    description: "Sharp vision grants +8% CRIT.",
    statBonus: { stat: "CRIT", multiplier: 0.08 },
  },
  {
    id: "ranger_swift_feet",
    name: "Swift Feet",
    description: "Light footwork grants +5% SPD.",
    statBonus: { stat: "SPD", multiplier: 0.05 },
  },
  {
    id: "ranger_hunters_mark",
    name: "Hunter's Mark",
    description: "Predatory instincts grant +5% ATK.",
    statBonus: { stat: "ATK", multiplier: 0.05 },
  },
];

// ─── HEALER ───────────────────────────────────────────────────────────────────

const HEALER_SKILLS: Skill[] = [
  {
    id: "healer_cure",
    name: "Cure",
    description: "Restore HP equal to 1.5× MAG to a single ally.",
    cost: 15,
    costType: "MP",
    unlockLevel: 5,
    effect: "HEAL",
  },
  {
    id: "healer_barrier",
    name: "Barrier",
    description: "Erect a barrier absorbing damage equal to 2× MAG for 2 turns.",
    cost: 20,
    costType: "MP",
    unlockLevel: 8,
    effect: "BUFF_DEF",
    icon: "/assets/skills/healer_barrier.png",
  },
  {
    id: "healer_regenerate",
    name: "Regenerate",
    description: "Apply regeneration restoring 25% MAG HP per turn for 4 turns.",
    cost: 25,
    costType: "MP",
    unlockLevel: 12,
    effect: "REGEN",
    icon: "/assets/skills/healer_regenerate.png",
  },
  {
    id: "healer_holy_light",
    name: "Holy Light",
    description: "Bathe all allies in holy light, restoring 2× MAG HP to each.",
    cost: 30,
    costType: "MP",
    unlockLevel: 16,
    effect: "HEAL",
  },
  {
    id: "healer_resurrection",
    name: "Resurrection",
    description: "Revive a fallen ally with 50% HP.",
    cost: 50,
    costType: "MP",
    unlockLevel: 20,
    effect: "HEAL",
  },
  {
    id: "healer_divine_intervention",
    name: "Divine Intervention",
    description: "Call upon divine power to fully restore all allies' HP.",
    cost: 60,
    costType: "MP",
    unlockLevel: 25,
    effect: "HEAL",
  },
];

const HEALER_PASSIVES: Passive[] = [
  {
    id: "healer_holy_aura",
    name: "Holy Aura",
    description: "Divine presence grants +10% MAG.",
    statBonus: { stat: "MAG", multiplier: 0.10 },
  },
  {
    id: "healer_blessed",
    name: "Blessed",
    description: "Divine blessing grants +8% HP.",
    statBonus: { stat: "HP", multiplier: 0.08 },
  },
  {
    id: "healer_mana_blessing",
    name: "Mana Blessing",
    description: "Sacred mana reserves grant +10% MP.",
    statBonus: { stat: "MP", multiplier: 0.10 },
  },
];

// ─── ROGUE ────────────────────────────────────────────────────────────────────

const ROGUE_SKILLS: Skill[] = [
  {
    id: "rogue_backstab",
    name: "Backstab",
    description: "Strike from the shadows for 2× ATK damage.",
    cost: 10,
    costType: "MP",
    unlockLevel: 5,
    effect: "DAMAGE",
    damageMultiplier: 2.0,
  },
  {
    id: "rogue_dodge",
    name: "Dodge",
    description: "Evade the next attack with 80% chance.",
    cost: 15,
    costType: "MP",
    unlockLevel: 8,
    effect: "BUFF_DEF",
    damageMultiplier: 0.5,
  },
  {
    id: "rogue_poison_blade",
    name: "Poison Blade",
    description: "Coat your blade in poison, dealing 1.8× ATK damage and poisoning for 4 turns.",
    cost: 20,
    costType: "MP",
    unlockLevel: 12,
    effect: "POISON",
    damageMultiplier: 1.8,
  },
  {
    id: "rogue_shadow_step",
    name: "Shadow Step",
    description: "Teleport behind the enemy, dealing 2.5× ATK damage.",
    cost: 25,
    costType: "MP",
    unlockLevel: 16,
    effect: "DAMAGE",
    damageMultiplier: 2.5,
  },
  {
    id: "rogue_execution",
    name: "Execution",
    description: "Execute a weakened enemy — 3× ATK normally, 5.4× ATK if enemy HP below 30%.",
    cost: 30,
    costType: "MP",
    unlockLevel: 20,
    effect: "EXECUTE",
    damageMultiplier: 3.0,
  },
  {
    id: "rogue_death_mark",
    name: "Death Mark",
    description: "Mark an enemy for death — 2× ATK and enemy takes +50% damage for 3 turns.",
    cost: 40,
    costType: "MP",
    unlockLevel: 25,
    effect: "DEF_BREAK",
    damageMultiplier: 2.0,
  },
];

const ROGUE_PASSIVES: Passive[] = [
  {
    id: "rogue_shadow_veil",
    name: "Shadow Veil",
    description: "Shrouded in shadow, grants +10% CRIT.",
    statBonus: { stat: "CRIT", multiplier: 0.10 },
  },
  {
    id: "rogue_nimble",
    name: "Nimble",
    description: "Agile movements grant +8% SPD.",
    statBonus: { stat: "SPD", multiplier: 0.08 },
  },
  {
    id: "rogue_predator",
    name: "Predator",
    description: "Predatory nature grants +5% ATK.",
    statBonus: { stat: "ATK", multiplier: 0.05 },
  },
];

// ─── JOB_CLASSES Map ──────────────────────────────────────────────────────────

export const JOB_CLASSES: Record<string, JobClassDefinition> = {
  NOVICE: {
    skills: NOVICE_SKILLS,
    passives: [],
    statMultipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, mag: 1.0, mp: 1.0, crit: 1.0, luck: 1.0 },
  },
  WARRIOR: {
    skills: WARRIOR_SKILLS,
    passives: WARRIOR_PASSIVES,
    // Tank archetype: highest HP+DEF, below-average ATK/CRIT/SPD — not an all-rounder
    statMultipliers: { hp: 1.4, atk: 1.15, def: 1.25, spd: 0.85, mag: 0.9, mp: 1.0, crit: 0.9, luck: 1.0 },
  },
  MAGE: {
    skills: MAGE_SKILLS,
    passives: MAGE_PASSIVES,
    statMultipliers: { hp: 0.8, atk: 0.8, def: 0.9, spd: 1.0, mag: 1.8, mp: 1.5, crit: 1.0, luck: 1.0 },
  },
  RANGER: {
    skills: RANGER_SKILLS,
    passives: RANGER_PASSIVES,
    statMultipliers: { hp: 1.0, atk: 1.1, def: 1.0, spd: 1.3, mag: 1.0, mp: 1.0, crit: 1.3, luck: 1.3 },
  },
  HEALER: {
    skills: HEALER_SKILLS,
    passives: HEALER_PASSIVES,
    statMultipliers: { hp: 1.2, atk: 0.7, def: 1.1, spd: 1.0, mag: 1.6, mp: 1.3, crit: 1.0, luck: 1.0 },
  },
  ROGUE: {
    skills: ROGUE_SKILLS,
    passives: ROGUE_PASSIVES,
    statMultipliers: { hp: 0.9, atk: 1.2, def: 0.9, spd: 1.4, mag: 1.0, mp: 1.0, crit: 1.5, luck: 1.5 },
  },
};

// ─── Merge + effective job key (Advance/Master) ─────────────────────────────

const mergedDefCache = new Map<string, JobClassDefinition>();

/** Normalize class names from API/UI (trim + uppercase; preserves spaces e.g. "DEATH KNIGHT"). */
export function normalizeJobName(name: string | null | undefined): string {
  return (name ?? "").trim().toUpperCase();
}

function mergeJobDefinitions(
  parent: JobClassDefinition,
  ext: JobClassExtension
): JobClassDefinition {
  const skillMap = new Map<string, Skill>();
  for (const s of parent.skills) skillMap.set(s.id, { ...s });
  for (const s of ext.extraSkills) skillMap.set(s.id, { ...s });

  const passiveMap = new Map<string, Passive>();
  for (const p of parent.passives) passiveMap.set(p.id, { ...p });
  for (const p of ext.extraPassives ?? []) passiveMap.set(p.id, { ...p });

  const delta = ext.statMultiplierDelta ?? {};
  const sm = parent.statMultipliers;
  const statMultipliers: StatMultipliers = {
    hp: sm.hp + (delta.hp ?? 0),
    atk: sm.atk + (delta.atk ?? 0),
    def: sm.def + (delta.def ?? 0),
    spd: sm.spd + (delta.spd ?? 0),
    mag: sm.mag + (delta.mag ?? 0),
    mp: sm.mp + (delta.mp ?? 0),
    crit: sm.crit + (delta.crit ?? 0),
    luck: sm.luck + (delta.luck ?? 0),
  };

  return {
    skills: Array.from(skillMap.values()).sort(
      (a, b) => a.unlockLevel - b.unlockLevel
    ),
    passives: Array.from(passiveMap.values()),
    statMultipliers,
  };
}

/**
 * Merged definition for a base name (WARRIOR), advance (KNIGHT), or master (PALADIN).
 */
export function getMergedClassDef(effectiveKey: string): JobClassDefinition {
  const k = normalizeJobName(effectiveKey);
  const cached = mergedDefCache.get(k);
  if (cached) return cached;

  if (!k || k === "NOVICE") {
    mergedDefCache.set("NOVICE", JOB_CLASSES.NOVICE);
    return JOB_CLASSES.NOVICE;
  }

  const ext = JOB_CLASS_EXTENSIONS[k];
  if (ext) {
    const parent = getMergedClassDef(ext.inheritsFrom);
    const merged = mergeJobDefinitions(parent, ext);
    mergedDefCache.set(k, merged);
    return merged;
  }

  const baseOnly = JOB_CLASSES[k];
  if (baseOnly) {
    mergedDefCache.set(k, baseOnly);
    return baseOnly;
  }

  mergedDefCache.set(k, JOB_CLASSES.NOVICE);
  return JOB_CLASSES.NOVICE;
}

/**
 * Effective job key for skill/passive/stat resolution.
 * ADVANCE/MASTER: use `advanceClass` (KNIGHT, PALADIN, "DEATH KNIGHT", …).
 */
export function resolveEffectiveJobKey(input: {
  jobClass?: string | null;
  jobTier?: string | null;
  advanceClass?: string | null;
}): string {
  const tierRaw = normalizeJobName(input.jobTier ?? "BASE");
  const tier = tierRaw || "BASE";
  if (!input.jobClass) return "NOVICE";
  const base = normalizeJobName(input.jobClass);
  if (!JOB_CLASSES[base]) return "NOVICE";

  if (tier === "BASE") return base;

  const adv = normalizeJobName(input.advanceClass);
  if (adv && (JOB_CLASS_EXTENSIONS[adv] || JOB_CLASSES[adv])) {
    return adv;
  }
  return base;
}

/** Walk inheritance chain to the 5 base archetypes for PvP matchup tables. */
export function getPvpMatchupBaseClass(
  effectiveKey: string | null | undefined
): string | null {
  if (!effectiveKey) return null;
  let k = normalizeJobName(effectiveKey);
  const visited = new Set<string>();
  while (k && !visited.has(k)) {
    visited.add(k);
    if (BASE_CLASSES.includes(k)) return k;
    const ext = JOB_CLASS_EXTENSIONS[k];
    if (ext) {
      k = normalizeJobName(ext.inheritsFrom);
      continue;
    }
    if (JOB_CLASSES[k] && k !== "NOVICE") {
      if (BASE_CLASSES.includes(k)) return k;
      return k;
    }
    break;
  }
  return null;
}

let globalSkillMap: Record<string, Skill> | null = null;

/** All skills from every merged class (for API hydration + farming lookup). */
export function buildGlobalSkillMap(): Record<string, Skill> {
  if (globalSkillMap) return globalSkillMap;
  const map: Record<string, Skill> = {};
  for (const cls of ALL_JOB_CLASSES) {
    if (cls === "NOVICE") continue;
    const def = getMergedClassDef(cls);
    for (const s of def.skills) map[s.id] = s;
  }
  globalSkillMap = map;
  return map;
}

/**
 * Clears all module-level caches (mergedDefCache and globalSkillMap).
 * Call this in test afterEach hooks to prevent cross-test pollution.
 * Safe to call in production — it is a no-op until the caches are accessed again.
 */
export function clearJobClassCache(): void {
  mergedDefCache.clear();
  globalSkillMap = null;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Returns all skills unlocked for a given effective job key at the specified level.
 * `jobKey` may be a base, advance, or master class name.
 */
export function getSkillsForLevel(jobKey: string, level: number): Skill[] {
  const def = getMergedClassDef(jobKey);
  return def.skills.filter((skill) => skill.unlockLevel <= level);
}

/**
 * Returns skill IDs that become newly unlocked when a student levels up.
 * Req 11.6 — uses merged skill list for advance/master paths.
 */
export function getNewlyUnlockedSkills(
  jobKey: string,
  oldLevel: number,
  newLevel: number,
  currentSkillIds: string[]
): string[] {
  const def = getMergedClassDef(jobKey);
  const currentSet = new Set(currentSkillIds);
  return def.skills
    .filter(
      (skill) =>
        skill.unlockLevel > oldLevel && skill.unlockLevel <= newLevel
    )
    .map((skill) => skill.id)
    .filter((id) => !currentSet.has(id));
}

/**
 * Returns all passive bonuses for an effective job key (merged).
 */
export function getPassivesForClass(jobKey: string): Passive[] {
  return getMergedClassDef(jobKey).passives;
}

/** Stats shape job passives can modify (keeps idle-engine ↔ job-system free of circular imports). */
export type PassiveTargetStats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mag: number;
  maxMp: number;
  crit: number;
  luck: number;
};

/**
 * Apply merged job passives after class stat multipliers (+X% to HP/ATK/DEF/…).
 * Order matches StatCalculator: job mult first, then passives, then sets/effects.
 */
export function applyJobPassiveMultipliers(
  stats: PassiveTargetStats,
  passives: Passive[]
): PassiveTargetStats {
  let { hp, atk, def, spd, mag, maxMp, crit, luck } = stats;
  for (const p of passives) {
    const m = p.statBonus.multiplier;
    if (!m) continue;
    const factor = 1 + m;
    switch (p.statBonus.stat) {
      case "HP":
        hp = Math.floor(hp * factor);
        break;
      case "ATK":
        atk = Math.floor(atk * factor);
        break;
      case "DEF":
        def = Math.floor(def * factor);
        break;
      case "SPD":
        spd = Math.floor(spd * factor);
        break;
      case "MAG":
        mag = Math.floor(mag * factor);
        break;
      case "MP":
        maxMp = Math.floor(maxMp * factor);
        break;
      case "CRIT":
        crit = Number((crit * factor).toFixed(3));
        break;
      default:
        break;
    }
  }
  return { hp, atk, def, spd, mag, maxMp, crit, luck };
}

/**
 * Stat multipliers for merged class + tier (ADVANCE/MASTER ×1.2 on all stats).
 */
export function getStatMultipliers(
  jobKey: string,
  jobTier: JobTier = "BASE"
): StatMultipliers {
  const def = getMergedClassDef(jobKey);
  const base = def.statMultipliers;

  if (jobTier === "BASE") {
    return { ...base };
  }

  const tierBonus = 1.2;
  return {
    hp: base.hp * tierBonus,
    atk: base.atk * tierBonus,
    def: base.def * tierBonus,
    spd: base.spd * tierBonus,
    mag: base.mag * tierBonus,
    mp: base.mp * tierBonus,
    crit: base.crit * tierBonus,
    luck: base.luck * tierBonus,
  };
}
