"use strict";
/**
 * Job Class System
 * Defines skill unlock tables, passive bonuses, and stat multipliers for all job classes.
 * Requirements: 10, 11, 12
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_CLASSES = void 0;
exports.getSkillsForLevel = getSkillsForLevel;
exports.getNewlyUnlockedSkills = getNewlyUnlockedSkills;
exports.getPassivesForClass = getPassivesForClass;
exports.getStatMultipliers = getStatMultipliers;
// ─── NOVICE Skills (Lv 1-4) ──────────────────────────────────────────────────
const NOVICE_SKILLS = [
    {
        id: "novice_strike",
        name: "Basic Strike",
        description: "A simple attack dealing ATK damage.",
        cost: 10,
        costType: "AP",
        unlockLevel: 1,
        effect: "DAMAGE",
    },
    {
        id: "novice_guard",
        name: "Guard",
        description: "Brace for impact, reducing incoming damage this turn.",
        cost: 5,
        costType: "AP",
        unlockLevel: 1,
        effect: "DEFEND",
    },
];
// ─── WARRIOR ─────────────────────────────────────────────────────────────────
const WARRIOR_SKILLS = [
    {
        id: "warrior_slash",
        name: "Slash",
        description: "A powerful slash dealing 1.5× ATK damage.",
        cost: 10,
        costType: "AP",
        unlockLevel: 5,
        effect: "DAMAGE",
    },
    {
        id: "warrior_shield_wall",
        name: "Shield Wall",
        description: "Raise your shield, reducing incoming damage by 50% for 2 turns.",
        cost: 15,
        costType: "AP",
        unlockLevel: 8,
        effect: "BUFF_DEF",
    },
    {
        id: "warrior_war_cry",
        name: "War Cry",
        description: "Boost ATK of all allies by 20% for 3 turns.",
        cost: 20,
        costType: "AP",
        unlockLevel: 12,
        effect: "BUFF_ATK",
    },
    {
        id: "warrior_whirlwind",
        name: "Whirlwind",
        description: "Spin attack hitting all enemies for 1.2× ATK damage.",
        cost: 25,
        costType: "AP",
        unlockLevel: 16,
        effect: "DAMAGE",
    },
    {
        id: "warrior_devastate",
        name: "Devastate",
        description: "Crush the enemy for 2.5× ATK damage, ignoring 30% DEF.",
        cost: 30,
        costType: "AP",
        unlockLevel: 20,
        effect: "DAMAGE",
    },
    {
        id: "warrior_heroic_strike",
        name: "Heroic Strike",
        description: "Ultimate blow dealing 3× ATK damage with guaranteed CRIT.",
        cost: 35,
        costType: "AP",
        unlockLevel: 25,
        effect: "DAMAGE",
    },
];
const WARRIOR_PASSIVES = [
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
const MAGE_SKILLS = [
    {
        id: "mage_fireball",
        name: "Fireball",
        description: "Hurl a ball of fire dealing 1.8× MAG damage.",
        cost: 15,
        costType: "MP",
        unlockLevel: 5,
        effect: "DAMAGE",
    },
    {
        id: "mage_blizzard",
        name: "Blizzard",
        description: "Summon a blizzard dealing 2× MAG damage and slowing the enemy.",
        cost: 20,
        costType: "MP",
        unlockLevel: 8,
        effect: "DAMAGE",
    },
    {
        id: "mage_thunder",
        name: "Thunder",
        description: "Call down lightning for 2.2× MAG damage with a chance to stun.",
        cost: 25,
        costType: "MP",
        unlockLevel: 12,
        effect: "DAMAGE",
    },
    {
        id: "mage_mana_surge",
        name: "Mana Surge",
        description: "Channel raw mana for 2.5× MAG damage and restore 10 MP.",
        cost: 30,
        costType: "MP",
        unlockLevel: 16,
        effect: "DAMAGE",
    },
    {
        id: "mage_meteor",
        name: "Meteor",
        description: "Call down a meteor dealing 3× MAG damage to all enemies.",
        cost: 40,
        costType: "MP",
        unlockLevel: 20,
        effect: "DAMAGE",
    },
    {
        id: "mage_arcane_nova",
        name: "Arcane Nova",
        description: "Unleash arcane energy dealing 4× MAG damage in a massive explosion.",
        cost: 50,
        costType: "MP",
        unlockLevel: 25,
        effect: "DAMAGE",
    },
];
const MAGE_PASSIVES = [
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
const RANGER_SKILLS = [
    {
        id: "ranger_arrow_shot",
        name: "Arrow Shot",
        description: "A precise arrow dealing 1.4× ATK damage.",
        cost: 10,
        costType: "AP",
        unlockLevel: 5,
        effect: "DAMAGE",
    },
    {
        id: "ranger_poison_arrow",
        name: "Poison Arrow",
        description: "A poisoned arrow dealing ATK damage and applying poison for 3 turns.",
        cost: 15,
        costType: "AP",
        unlockLevel: 8,
        effect: "POISON",
    },
    {
        id: "ranger_wind_shot",
        name: "Wind Shot",
        description: "A wind-infused arrow dealing 1.8× ATK damage and reducing enemy SPD.",
        cost: 20,
        costType: "AP",
        unlockLevel: 12,
        effect: "DAMAGE",
    },
    {
        id: "ranger_eagle_eye",
        name: "Eagle Eye",
        description: "Mark a target, increasing CRIT chance by 30% for 3 turns.",
        cost: 25,
        costType: "AP",
        unlockLevel: 16,
        effect: "BUFF_ATK",
    },
    {
        id: "ranger_barrage",
        name: "Barrage",
        description: "Fire a volley of arrows dealing 2× ATK damage to all enemies.",
        cost: 30,
        costType: "AP",
        unlockLevel: 20,
        effect: "DAMAGE",
    },
    {
        id: "ranger_snipe",
        name: "Snipe",
        description: "A devastating shot dealing 3.5× ATK damage with guaranteed CRIT.",
        cost: 40,
        costType: "AP",
        unlockLevel: 25,
        effect: "DAMAGE",
    },
];
const RANGER_PASSIVES = [
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
const HEALER_SKILLS = [
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
    },
    {
        id: "healer_regenerate",
        name: "Regenerate",
        description: "Apply regeneration restoring MAG HP per turn for 4 turns.",
        cost: 25,
        costType: "MP",
        unlockLevel: 12,
        effect: "HEAL",
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
const HEALER_PASSIVES = [
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
const ROGUE_SKILLS = [
    {
        id: "rogue_backstab",
        name: "Backstab",
        description: "Strike from the shadows for 2× ATK damage.",
        cost: 10,
        costType: "AP",
        unlockLevel: 5,
        effect: "DAMAGE",
    },
    {
        id: "rogue_dodge",
        name: "Dodge",
        description: "Evade the next attack with 80% chance.",
        cost: 15,
        costType: "AP",
        unlockLevel: 8,
        effect: "BUFF_DEF",
    },
    {
        id: "rogue_poison_blade",
        name: "Poison Blade",
        description: "Coat your blade in poison, dealing ATK damage and poisoning for 4 turns.",
        cost: 20,
        costType: "AP",
        unlockLevel: 12,
        effect: "POISON",
    },
    {
        id: "rogue_shadow_step",
        name: "Shadow Step",
        description: "Teleport behind the enemy, dealing 2.5× ATK damage.",
        cost: 25,
        costType: "AP",
        unlockLevel: 16,
        effect: "DAMAGE",
    },
    {
        id: "rogue_execution",
        name: "Execution",
        description: "Execute a weakened enemy below 30% HP for 3× ATK damage.",
        cost: 30,
        costType: "AP",
        unlockLevel: 20,
        effect: "DAMAGE",
    },
    {
        id: "rogue_death_mark",
        name: "Death Mark",
        description: "Mark an enemy for death, amplifying all damage they take by 50% for 3 turns.",
        cost: 40,
        costType: "AP",
        unlockLevel: 25,
        effect: "BUFF_ATK",
    },
];
const ROGUE_PASSIVES = [
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
exports.JOB_CLASSES = {
    NOVICE: {
        skills: NOVICE_SKILLS,
        passives: [],
        statMultipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, mag: 1.0, mp: 1.0, crit: 1.0 },
    },
    WARRIOR: {
        skills: WARRIOR_SKILLS,
        passives: WARRIOR_PASSIVES,
        statMultipliers: { hp: 1.4, atk: 1.3, def: 1.2, spd: 0.9, mag: 1.0, mp: 1.0, crit: 1.0 },
    },
    MAGE: {
        skills: MAGE_SKILLS,
        passives: MAGE_PASSIVES,
        statMultipliers: { hp: 0.8, atk: 0.8, def: 0.9, spd: 1.0, mag: 1.8, mp: 1.5, crit: 1.0 },
    },
    RANGER: {
        skills: RANGER_SKILLS,
        passives: RANGER_PASSIVES,
        statMultipliers: { hp: 1.0, atk: 1.1, def: 1.0, spd: 1.3, mag: 1.0, mp: 1.0, crit: 1.3 },
    },
    HEALER: {
        skills: HEALER_SKILLS,
        passives: HEALER_PASSIVES,
        statMultipliers: { hp: 1.2, atk: 0.7, def: 1.1, spd: 1.0, mag: 1.6, mp: 1.3, crit: 1.0 },
    },
    ROGUE: {
        skills: ROGUE_SKILLS,
        passives: ROGUE_PASSIVES,
        statMultipliers: { hp: 0.9, atk: 1.2, def: 0.9, spd: 1.4, mag: 1.0, mp: 1.0, crit: 1.5 },
    },
};
// ─── Helper Functions ─────────────────────────────────────────────────────────
/**
 * Returns all skills unlocked for a given job class at the specified level.
 * For NOVICE (level 1-4), returns the 2 basic skills.
 */
function getSkillsForLevel(jobClass, level) {
    const classDef = exports.JOB_CLASSES[jobClass.toUpperCase()];
    if (!classDef)
        return [];
    return classDef.skills.filter((skill) => skill.unlockLevel <= level);
}
/**
 * Returns skill IDs that become newly unlocked when a student levels up.
 * Finds skills with unlockLevel > oldLevel and unlockLevel <= newLevel
 * that are not already in the student's current skill list.
 * Req 11.6
 */
function getNewlyUnlockedSkills(jobClass, oldLevel, newLevel, currentSkillIds) {
    const classDef = exports.JOB_CLASSES[jobClass.toUpperCase()];
    if (!classDef)
        return [];
    const currentSet = new Set(currentSkillIds);
    return classDef.skills
        .filter((skill) => skill.unlockLevel > oldLevel && skill.unlockLevel <= newLevel)
        .map((skill) => skill.id)
        .filter((id) => !currentSet.has(id));
}
/**
 * Returns all passive bonuses for a given job class.
 */
function getPassivesForClass(jobClass) {
    const classDef = exports.JOB_CLASSES[jobClass.toUpperCase()];
    if (!classDef)
        return [];
    return classDef.passives;
}
/**
 * Returns the stat multipliers for a given job class and tier.
 * ADVANCE and MASTER tiers apply an additional x1.2 multiplier on top of base.
 * Req 12.5: additional x1.2 for ADVANCE/MASTER tiers.
 */
function getStatMultipliers(jobClass, jobTier = "BASE") {
    const classDef = exports.JOB_CLASSES[jobClass.toUpperCase()];
    if (!classDef) {
        return { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, mag: 1.0, mp: 1.0, crit: 1.0 };
    }
    const base = classDef.statMultipliers;
    if (jobTier === "BASE") {
        return { ...base };
    }
    // ADVANCE and MASTER apply x1.2 on top of base multipliers
    const tierBonus = 1.2;
    return {
        hp: base.hp * tierBonus,
        atk: base.atk * tierBonus,
        def: base.def * tierBonus,
        spd: base.spd * tierBonus,
        mag: base.mag * tierBonus,
        mp: base.mp * tierBonus,
        crit: base.crit * tierBonus,
    };
}
