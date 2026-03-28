"use strict";
/**
 * Job Class System
 * Defines skill unlock tables, passive bonuses, and stat multipliers for all job classes.
 * Requirements: 10, 11, 12
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_CLASSES = void 0;
exports.normalizeJobName = normalizeJobName;
exports.getMergedClassDef = getMergedClassDef;
exports.resolveEffectiveJobKey = resolveEffectiveJobKey;
exports.getPvpMatchupBaseClass = getPvpMatchupBaseClass;
exports.buildGlobalSkillMap = buildGlobalSkillMap;
exports.clearJobClassCache = clearJobClassCache;
exports.getSkillsForLevel = getSkillsForLevel;
exports.getNewlyUnlockedSkills = getNewlyUnlockedSkills;
exports.getPassivesForClass = getPassivesForClass;
exports.applyJobPassiveMultipliers = applyJobPassiveMultipliers;
exports.getStatMultipliers = getStatMultipliers;
const job_constants_1 = require("./job-constants");
const job_extensions_1 = require("./job-extensions");
// ─── NOVICE Skills (Lv 1-4) ──────────────────────────────────────────────────
const NOVICE_SKILLS = [
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
const WARRIOR_SKILLS = [
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
        icon: "/assets/skills/healer_cure.png",
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
        icon: "/assets/skills/healer_holy_light.png",
    },
    {
        id: "healer_resurrection",
        name: "Resurrection",
        description: "Revive a fallen ally with 50% HP.",
        cost: 50,
        costType: "MP",
        unlockLevel: 20,
        effect: "HEAL",
        icon: "/assets/skills/healer_resurrection.png",
    },
    {
        id: "healer_divine_intervention",
        name: "Divine Intervention",
        description: "Call upon divine power to fully restore all allies' HP.",
        cost: 60,
        costType: "MP",
        unlockLevel: 25,
        effect: "HEAL",
        icon: "/assets/skills/healer_divine_intervention.png",
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
        description: "Strike from the shadows, dealing 2.0× ATK damage.",
        cost: 10,
        costType: "AP",
        unlockLevel: 5,
        effect: "DAMAGE",
        damageMultiplier: 2.0,
        icon: "/assets/skills/rogue_backstab.png",
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
        icon: "/assets/skills/rogue_dodge.png",
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
        icon: "/assets/skills/rogue_poison_blade.png",
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
        icon: "/assets/skills/rogue_shadow_step.png",
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
        icon: "/assets/skills/rogue_execution.png",
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
        icon: "/assets/skills/rogue_death_mark.png",
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
const mergedDefCache = new Map();
/** Normalize class names from API/UI (trim + uppercase; preserves spaces e.g. "DEATH KNIGHT"). */
function normalizeJobName(name) {
    return (name !== null && name !== void 0 ? name : "").trim().toUpperCase();
}
function mergeJobDefinitions(parent, ext) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const skillMap = new Map();
    for (const s of parent.skills)
        skillMap.set(s.id, { ...s });
    for (const s of ext.extraSkills)
        skillMap.set(s.id, { ...s });
    const passiveMap = new Map();
    for (const p of parent.passives)
        passiveMap.set(p.id, { ...p });
    for (const p of (_a = ext.extraPassives) !== null && _a !== void 0 ? _a : [])
        passiveMap.set(p.id, { ...p });
    const delta = (_b = ext.statMultiplierDelta) !== null && _b !== void 0 ? _b : {};
    const sm = parent.statMultipliers;
    const statMultipliers = {
        hp: sm.hp + ((_c = delta.hp) !== null && _c !== void 0 ? _c : 0),
        atk: sm.atk + ((_d = delta.atk) !== null && _d !== void 0 ? _d : 0),
        def: sm.def + ((_e = delta.def) !== null && _e !== void 0 ? _e : 0),
        spd: sm.spd + ((_f = delta.spd) !== null && _f !== void 0 ? _f : 0),
        mag: sm.mag + ((_g = delta.mag) !== null && _g !== void 0 ? _g : 0),
        mp: sm.mp + ((_h = delta.mp) !== null && _h !== void 0 ? _h : 0),
        crit: sm.crit + ((_j = delta.crit) !== null && _j !== void 0 ? _j : 0),
        luck: sm.luck + ((_k = delta.luck) !== null && _k !== void 0 ? _k : 0),
    };
    return {
        skills: Array.from(skillMap.values()).sort((a, b) => a.unlockLevel - b.unlockLevel).map(ensureSkillTreeMeta),
        passives: Array.from(passiveMap.values()),
        statMultipliers,
    };
}
function ensureSkillTreeMeta(skill) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return {
        ...skill,
        maxRank: (_a = skill.maxRank) !== null && _a !== void 0 ? _a : 3,
        requiredLevel: (_b = skill.requiredLevel) !== null && _b !== void 0 ? _b : skill.unlockLevel,
        prerequisite: Array.isArray(skill.prerequisite) ? skill.prerequisite : [],
        rankScales: {
            damageMultiplierPerRank: (_d = (_c = skill.rankScales) === null || _c === void 0 ? void 0 : _c.damageMultiplierPerRank) !== null && _d !== void 0 ? _d : 0.12,
            costPerRank: (_f = (_e = skill.rankScales) === null || _e === void 0 ? void 0 : _e.costPerRank) !== null && _f !== void 0 ? _f : 0,
            healMultiplierPerRank: (_h = (_g = skill.rankScales) === null || _g === void 0 ? void 0 : _g.healMultiplierPerRank) !== null && _h !== void 0 ? _h : 0.1,
        },
    };
}
/**
 * Merged definition for a base name (WARRIOR), advance (KNIGHT), or master (PALADIN).
 */
function getMergedClassDef(effectiveKey) {
    const k = normalizeJobName(effectiveKey);
    const cached = mergedDefCache.get(k);
    if (cached)
        return cached;
    if (!k || k === "NOVICE") {
        const novice = {
            ...exports.JOB_CLASSES.NOVICE,
            skills: exports.JOB_CLASSES.NOVICE.skills.map(ensureSkillTreeMeta),
        };
        mergedDefCache.set("NOVICE", novice);
        return novice;
    }
    const ext = job_extensions_1.JOB_CLASS_EXTENSIONS[k];
    if (ext) {
        const parent = getMergedClassDef(ext.inheritsFrom);
        const merged = mergeJobDefinitions(parent, ext);
        mergedDefCache.set(k, merged);
        return merged;
    }
    const baseOnly = exports.JOB_CLASSES[k];
    if (baseOnly) {
        const normalizedBase = {
            ...baseOnly,
            skills: baseOnly.skills.map(ensureSkillTreeMeta),
        };
        mergedDefCache.set(k, normalizedBase);
        return normalizedBase;
    }
    mergedDefCache.set(k, exports.JOB_CLASSES.NOVICE);
    return exports.JOB_CLASSES.NOVICE;
}
/**
 * Effective job key for skill/passive/stat resolution.
 * ADVANCE/MASTER: use `advanceClass` (KNIGHT, PALADIN, "DEATH KNIGHT", …).
 */
function resolveEffectiveJobKey(input) {
    var _a;
    const tierRaw = normalizeJobName((_a = input.jobTier) !== null && _a !== void 0 ? _a : "BASE");
    const tier = tierRaw || "BASE";
    if (!input.jobClass)
        return "NOVICE";
    const base = normalizeJobName(input.jobClass);
    if (!exports.JOB_CLASSES[base])
        return "NOVICE";
    if (tier === "BASE")
        return base;
    const adv = normalizeJobName(input.advanceClass);
    if (adv && (job_extensions_1.JOB_CLASS_EXTENSIONS[adv] || exports.JOB_CLASSES[adv])) {
        return adv;
    }
    return base;
}
/** Walk inheritance chain to the 5 base archetypes for PvP matchup tables. */
function getPvpMatchupBaseClass(effectiveKey) {
    if (!effectiveKey)
        return null;
    let k = normalizeJobName(effectiveKey);
    const visited = new Set();
    while (k && !visited.has(k)) {
        visited.add(k);
        if (job_constants_1.BASE_CLASSES.includes(k))
            return k;
        const ext = job_extensions_1.JOB_CLASS_EXTENSIONS[k];
        if (ext) {
            k = normalizeJobName(ext.inheritsFrom);
            continue;
        }
        if (exports.JOB_CLASSES[k] && k !== "NOVICE") {
            if (job_constants_1.BASE_CLASSES.includes(k))
                return k;
            return k;
        }
        break;
    }
    return null;
}
let globalSkillMap = null;
/** All skills from every merged class (for API hydration + farming lookup). */
function buildGlobalSkillMap() {
    if (globalSkillMap)
        return globalSkillMap;
    const map = {};
    for (const cls of job_constants_1.ALL_JOB_CLASSES) {
        if (cls === "NOVICE")
            continue;
        const def = getMergedClassDef(cls);
        for (const s of def.skills)
            map[s.id] = s;
    }
    globalSkillMap = map;
    return map;
}
/**
 * Clears all module-level caches (mergedDefCache and globalSkillMap).
 * Call this in test afterEach hooks to prevent cross-test pollution.
 * Safe to call in production — it is a no-op until the caches are accessed again.
 */
function clearJobClassCache() {
    mergedDefCache.clear();
    globalSkillMap = null;
}
// ─── Helper Functions ─────────────────────────────────────────────────────────
/**
 * Returns all skills unlocked for a given effective job key at the specified level.
 * `jobKey` may be a base, advance, or master class name.
 */
function getSkillsForLevel(jobKey, level) {
    const def = getMergedClassDef(jobKey);
    return def.skills.filter((skill) => skill.unlockLevel <= level);
}
/**
 * Returns skill IDs that become newly unlocked when a student levels up.
 * Req 11.6 — uses merged skill list for advance/master paths.
 */
function getNewlyUnlockedSkills(jobKey, oldLevel, newLevel, currentSkillIds) {
    const def = getMergedClassDef(jobKey);
    const currentSet = new Set(currentSkillIds);
    return def.skills
        .filter((skill) => skill.unlockLevel > oldLevel && skill.unlockLevel <= newLevel)
        .map((skill) => skill.id)
        .filter((id) => !currentSet.has(id));
}
/**
 * Returns all passive bonuses for an effective job key (merged).
 */
function getPassivesForClass(jobKey) {
    return getMergedClassDef(jobKey).passives;
}
/**
 * Apply merged job passives after class stat multipliers (+X% to HP/ATK/DEF/…).
 * Order matches StatCalculator: job mult first, then passives, then sets/effects.
 */
function applyJobPassiveMultipliers(stats, passives) {
    let { hp, atk, def, spd, mag, maxMp, crit, luck } = stats;
    for (const p of passives) {
        const m = p.statBonus.multiplier;
        if (!m)
            continue;
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
function getStatMultipliers(jobKey, jobTier = "BASE") {
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
