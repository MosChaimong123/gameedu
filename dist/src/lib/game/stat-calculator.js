"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatCalculator = exports.EFFECT_IDS = exports.SET_IDS = void 0;
const idle_engine_1 = require("./idle-engine");
const job_system_1 = require("./job-system");
const set_bonus_config_1 = require("./set-bonus-config");
// Re-export for callers that imported SET_IDS from stat-calculator
var set_bonus_config_2 = require("./set-bonus-config");
Object.defineProperty(exports, "SET_IDS", { enumerable: true, get: function () { return set_bonus_config_2.SET_IDS; } });
// ─── Special Effect IDs ──────────────────────────────────────────────────────
exports.EFFECT_IDS = {
    // RARE
    GOLD_FINDER: "GOLD_FINDER",
    QUICK_LEARNER: "QUICK_LEARNER",
    TOUGH_SKIN: "TOUGH_SKIN",
    // EPIC
    LIFESTEAL: "LIFESTEAL",
    MANA_FLOW: "MANA_FLOW",
    LUCKY_STRIKE: "LUCKY_STRIKE",
    // LEGENDARY — existing
    IMMORTAL: "IMMORTAL",
    GODS_BLESSING: "GODS_BLESSING",
    TIME_WARP: "TIME_WARP",
    // LEGENDARY — new archetype effects
    TITAN_WILL: "TITAN_WILL", // HP < 30% → DEF ×1.50
    HOLY_FURY: "HOLY_FURY", // HP < 30% → ATK ×1.40
    ARCANE_SURGE: "ARCANE_SURGE", // MAG skill → +10% damage
    DARK_PACT: "DARK_PACT", // +20% damage but -5% HP/turn
    HAWK_EYE: "HAWK_EYE", // CRIT damage ×1.30
    HUNTER_MARK: "HUNTER_MARK", // Boss DMG +0.15
    SHADOW_VEIL: "SHADOW_VEIL", // Dodge 0.15, on Dodge: CRIT ×1.20
    BLADE_DANCE: "BLADE_DANCE", // SPD/10 = CRIT +1% per 10 SPD
    // New RARE effects
    SWIFT_STRIKE: "SWIFT_STRIKE", // SPD/10 = ATK +1% per 10 SPD
    BERSERKER_RAGE: "BERSERKER_RAGE", // HP < 50% → ATK ×1.20 in battle
    // New EPIC effects
    BATTLE_FOCUS: "BATTLE_FOCUS", // HP < 50% → CRIT chance ×2
    ECHO_STRIKE: "ECHO_STRIKE", // 30% chance second hit for 50% DMG
    // New LEGENDARY effects
    DRAGON_BLOOD: "DRAGON_BLOOD", // regen 2% maxHP per boss attack tick
    CELESTIAL_GRACE: "CELESTIAL_GRACE", // all stats ×1.05, EXP +15%
    VOID_WALKER: "VOID_WALKER", // Dodge 25%, on dodge counter 50% ATK
    SOUL_EATER: "SOUL_EATER", // on monster kill: regen 15% maxHP
};
/** Deterministic ordering for equipped rows (stable even when template ids repeat). */
function compareEquippedItems(a, b) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const idA = String((_d = (_b = (_a = a.itemId) !== null && _a !== void 0 ? _a : a.id) !== null && _b !== void 0 ? _b : (_c = a.item) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : "");
    const idB = String((_h = (_f = (_e = b.itemId) !== null && _e !== void 0 ? _e : b.id) !== null && _f !== void 0 ? _f : (_g = b.item) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : "");
    if (idA !== idB)
        return idA < idB ? -1 : idA > idB ? 1 : 0;
    const enh = ((_j = a.enhancementLevel) !== null && _j !== void 0 ? _j : 0) - ((_k = b.enhancementLevel) !== null && _k !== void 0 ? _k : 0);
    if (enh !== 0)
        return enh;
    const ia = (_l = a.item) !== null && _l !== void 0 ? _l : {};
    const ib = (_m = b.item) !== null && _m !== void 0 ? _m : {};
    const keys = [
        "baseAtk",
        "baseDef",
        "baseHp",
        "baseSpd",
        "baseCrit",
        "baseLuck",
        "baseMag",
        "baseMp",
    ];
    for (const k of keys) {
        const va = Number((_o = ia[k]) !== null && _o !== void 0 ? _o : 0);
        const vb = Number((_p = ib[k]) !== null && _p !== void 0 ? _p : 0);
        if (va !== vb)
            return va < vb ? -1 : va > vb ? 1 : 0;
    }
    return 0;
}
// ─── StatCalculator ──────────────────────────────────────────────────────────
class StatCalculator {
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
    static compute(points, equippedItems, level, jobClass, jobTier = "BASE", advanceClass) {
        // Sort items deterministically so floating-point accumulation is order-independent
        const sortedItems = [...equippedItems].sort(compareEquippedItems);
        // Step 1: Raw base+equipment stats (floats, no job multipliers yet).
        // Using computeRawStats instead of calculateCharacterStats to avoid double-flooring:
        // calculateCharacterStats floors at the end, then applyJobMultipliers would floor again.
        const base = idle_engine_1.IdleEngine.computeRawStats(points, sortedItems, level);
        const effectiveKey = (0, job_system_1.resolveEffectiveJobKey)({
            jobClass,
            jobTier,
            advanceClass,
        });
        // Step 2: Job class multipliers (merged advance/master + tier)
        let afterJob = this.applyJobMultipliers(base, effectiveKey, jobTier);
        // Step 2b: Job passives (+X% stats) — same order as IdleEngine.calculateCharacterStats
        const passiveMerged = (0, job_system_1.applyJobPassiveMultipliers)({
            hp: afterJob.hp,
            atk: afterJob.atk,
            def: afterJob.def,
            spd: afterJob.spd,
            mag: afterJob.mag,
            maxMp: afterJob.maxMp,
            crit: afterJob.crit,
            luck: afterJob.luck,
        }, (0, job_system_1.getPassivesForClass)(effectiveKey));
        afterJob = { ...afterJob, ...passiveMerged };
        // Step 3: Set bonuses
        const afterSets = this.applySetBonuses(afterJob, sortedItems);
        // Step 4: Special effects
        const final = this.applySpecialEffects(afterSets, sortedItems);
        return final;
    }
    // ── Step 2: Job Multipliers ────────────────────────────────────────────────
    static applyJobMultipliers(stats, effectiveJobKey, jobTier = "BASE") {
        const extended = this.toExtended(stats);
        const mult = (0, job_system_1.getStatMultipliers)(effectiveJobKey, jobTier);
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
    static applySetBonuses(stats, equippedItems) {
        var _a, _b, _c, _d, _e, _f, _g;
        const result = { ...stats };
        const setCounts = this.countSets(equippedItems);
        // Dragon Set
        const dragon = (_a = setCounts[set_bonus_config_1.SET_IDS.DRAGON]) !== null && _a !== void 0 ? _a : 0;
        if (dragon >= set_bonus_config_1.SET_DRAGON_TIER1_PIECES) {
            result.atk = Math.floor(result.atk * set_bonus_config_1.SET_DRAGON_ATK_DEF_MULT);
            result.def = Math.floor(result.def * set_bonus_config_1.SET_DRAGON_ATK_DEF_MULT);
        }
        if (dragon >= set_bonus_config_1.SET_DRAGON_TIER2_PIECES) {
            result.bossDamageMultiplier += set_bonus_config_1.SET_DRAGON_BOSS_BONUS;
            // Multiplicative HP bonus scales with level (consistent with other set bonuses)
            result.hp = Math.floor(result.hp * (1 + set_bonus_config_1.SET_DRAGON_HP_MULT));
        }
        // Thunder Set
        const thunder = (_b = setCounts[set_bonus_config_1.SET_IDS.THUNDER]) !== null && _b !== void 0 ? _b : 0;
        if (thunder >= set_bonus_config_1.SET_THUNDER_TIER1_PIECES) {
            result.spd = Math.floor(result.spd * set_bonus_config_1.SET_THUNDER_SPD_MULT);
            result.crit = Number((result.crit + set_bonus_config_1.SET_THUNDER_CRIT_ADD).toFixed(3));
        }
        if (thunder >= set_bonus_config_1.SET_THUNDER_TIER2_PIECES) {
            result.chainLightningOnCrit = true;
        }
        // ── New Archetype Sets ────────────────────────────────────────────────
        // Titan Set (Warrior)
        const titan = (_c = setCounts[set_bonus_config_1.SET_IDS.TITAN]) !== null && _c !== void 0 ? _c : 0;
        if (titan >= set_bonus_config_1.SET_TITAN_TIER1_PIECES) {
            result.def = Math.floor(result.def * set_bonus_config_1.SET_TITAN_DEF_MULT);
            result.hp = Math.floor(result.hp * set_bonus_config_1.SET_TITAN_HP_MULT);
        }
        if (titan >= set_bonus_config_1.SET_TITAN_TIER2_PIECES) {
            result.atk = Math.floor(result.atk * set_bonus_config_1.SET_TITAN_ATK_MULT);
            result.hasImmortal = true;
        }
        // Arcane Set (Mage/Healer)
        const arcane = (_d = setCounts[set_bonus_config_1.SET_IDS.ARCANE]) !== null && _d !== void 0 ? _d : 0;
        if (arcane >= set_bonus_config_1.SET_ARCANE_TIER1_PIECES) {
            result.mag = Math.floor(result.mag * set_bonus_config_1.SET_ARCANE_MAG_MULT);
            result.maxMp = Math.floor(result.maxMp * set_bonus_config_1.SET_ARCANE_MP_MULT);
        }
        if (arcane >= set_bonus_config_1.SET_ARCANE_TIER2_PIECES) {
            result.crit = Number((result.crit + set_bonus_config_1.SET_ARCANE_CRIT_ADD).toFixed(3));
            result.hasManaFlow = true;
        }
        // Hunt Set (Ranger/Sniper/Beastmaster)
        const hunt = (_e = setCounts[set_bonus_config_1.SET_IDS.HUNT]) !== null && _e !== void 0 ? _e : 0;
        if (hunt >= set_bonus_config_1.SET_HUNT_TIER1_PIECES) {
            result.crit = Number((result.crit + set_bonus_config_1.SET_HUNT_CRIT_ADD).toFixed(3));
            result.spd = Math.floor(result.spd * set_bonus_config_1.SET_HUNT_SPD_MULT);
        }
        if (hunt >= set_bonus_config_1.SET_HUNT_TIER2_PIECES) {
            result.atk = Math.floor(result.atk * set_bonus_config_1.SET_HUNT_ATK_MULT);
            result.luck = Number((result.luck * set_bonus_config_1.SET_HUNT_LUCK_MULT).toFixed(3));
            result.hasLuckyStrike = true;
        }
        // Shadow Set (Rogue/Assassin)
        const shadowNew = (_f = setCounts[set_bonus_config_1.SET_IDS.SHADOW]) !== null && _f !== void 0 ? _f : 0;
        if (shadowNew >= set_bonus_config_1.SET_SHADOW_TIER1_PIECES) {
            result.crit = Number((result.crit + set_bonus_config_1.SET_SHADOW_CRIT_ADD).toFixed(3));
            result.luck = Number((result.luck * set_bonus_config_1.SET_SHADOW_LUCK_MULT).toFixed(3));
        }
        if (shadowNew >= set_bonus_config_1.SET_SHADOW_TIER2_PIECES) {
            result.spd = Math.floor(result.spd * set_bonus_config_1.SET_SHADOW_SPD_MULT);
            result.dodgeChance = Math.max(result.dodgeChance, set_bonus_config_1.SET_SHADOW_DODGE);
            result.hasLifesteal = true;
        }
        // Legendary Set (7-piece full)
        const legendary = (_g = setCounts[set_bonus_config_1.SET_IDS.LEGENDARY]) !== null && _g !== void 0 ? _g : 0;
        if (legendary >= set_bonus_config_1.SET_LEGENDARY_FULL_PIECES) {
            result.hp = Math.floor(result.hp * set_bonus_config_1.SET_LEGENDARY_ALL_STAT_MULT);
            result.atk = Math.floor(result.atk * set_bonus_config_1.SET_LEGENDARY_ALL_STAT_MULT);
            result.def = Math.floor(result.def * set_bonus_config_1.SET_LEGENDARY_ALL_STAT_MULT);
            result.spd = Math.floor(result.spd * set_bonus_config_1.SET_LEGENDARY_ALL_STAT_MULT);
            result.mag = Math.floor(result.mag * set_bonus_config_1.SET_LEGENDARY_ALL_STAT_MULT);
            result.maxMp = Math.floor(result.maxMp * set_bonus_config_1.SET_LEGENDARY_ALL_STAT_MULT);
            result.crit = Number((result.crit * set_bonus_config_1.SET_LEGENDARY_ALL_STAT_MULT).toFixed(3));
            result.luck = Number((result.luck * set_bonus_config_1.SET_LEGENDARY_ALL_STAT_MULT).toFixed(3));
            result.xpMultiplier += set_bonus_config_1.SET_LEGENDARY_XP_BONUS;
            result.chosenOneTitle = true;
        }
        return result;
    }
    // ── Step 4: Special Effects ────────────────────────────────────────────────
    static applySpecialEffects(stats, equippedItems) {
        const result = { ...stats };
        const effects = this.collectEffects(equippedItems);
        // RARE effects
        if (effects.has(exports.EFFECT_IDS.GOLD_FINDER))
            result.goldMultiplier += 0.15;
        if (effects.has(exports.EFFECT_IDS.QUICK_LEARNER))
            result.xpMultiplier += 0.10;
        if (effects.has(exports.EFFECT_IDS.TOUGH_SKIN))
            result.hasToughSkin = true;
        // EPIC effects
        if (effects.has(exports.EFFECT_IDS.LIFESTEAL))
            result.hasLifesteal = true;
        if (effects.has(exports.EFFECT_IDS.MANA_FLOW))
            result.hasManaFlow = true;
        if (effects.has(exports.EFFECT_IDS.LUCKY_STRIKE) && result.luck > 0.5) {
            result.crit = Number((result.crit + 0.05).toFixed(3));
            result.hasLuckyStrike = true;
        }
        // LEGENDARY effects — existing
        if (effects.has(exports.EFFECT_IDS.IMMORTAL))
            result.hasImmortal = true;
        if (effects.has(exports.EFFECT_IDS.TIME_WARP))
            result.hasTimeWarp = true;
        if (effects.has(exports.EFFECT_IDS.GODS_BLESSING)) {
            result.hasGodBlessing = true;
            result.goldMultiplier += 0.1;
            result.xpMultiplier += 0.1;
            result.bossDamageMultiplier += 0.1;
        }
        // LEGENDARY effects — new archetype
        if (effects.has(exports.EFFECT_IDS.TITAN_WILL))
            result.hasTitanWill = true;
        if (effects.has(exports.EFFECT_IDS.HOLY_FURY))
            result.hasHolyFury = true;
        if (effects.has(exports.EFFECT_IDS.ARCANE_SURGE))
            result.hasArcaneSurge = true;
        if (effects.has(exports.EFFECT_IDS.DARK_PACT))
            result.hasDarkPact = true;
        if (effects.has(exports.EFFECT_IDS.HAWK_EYE))
            result.hasHawkEye = true;
        if (effects.has(exports.EFFECT_IDS.HUNTER_MARK)) {
            result.bossDamageMultiplier += 0.15;
        }
        if (effects.has(exports.EFFECT_IDS.SHADOW_VEIL)) {
            result.dodgeChance = Math.max(result.dodgeChance, 0.15);
            result.hasShadowVeil = true;
        }
        if (effects.has(exports.EFFECT_IDS.BLADE_DANCE)) {
            result.crit = Number((result.crit + Math.floor(result.spd / 10) * 0.01).toFixed(3));
        }
        // ── New RARE effects ──────────────────────────────────────────────────────
        if (effects.has(exports.EFFECT_IDS.SWIFT_STRIKE)) {
            // SPD every 10 = ATK +1%
            result.atk = Math.floor(result.atk * (1 + Math.floor(result.spd / 10) * 0.01));
        }
        if (effects.has(exports.EFFECT_IDS.BERSERKER_RAGE))
            result.hasBerserkerRage = true;
        // ── New EPIC effects ──────────────────────────────────────────────────────
        if (effects.has(exports.EFFECT_IDS.BATTLE_FOCUS))
            result.hasBattleFocus = true;
        if (effects.has(exports.EFFECT_IDS.ECHO_STRIKE))
            result.hasEchoStrike = true;
        // ── New LEGENDARY effects ─────────────────────────────────────────────────
        if (effects.has(exports.EFFECT_IDS.DRAGON_BLOOD))
            result.hasDragonBlood = true;
        if (effects.has(exports.EFFECT_IDS.CELESTIAL_GRACE)) {
            result.hasCelestialGrace = true;
            result.hp = Math.floor(result.hp * 1.05);
            result.atk = Math.floor(result.atk * 1.05);
            result.def = Math.floor(result.def * 1.05);
            result.spd = Math.floor(result.spd * 1.05);
            result.mag = Math.floor(result.mag * 1.05);
            result.maxMp = Math.floor(result.maxMp * 1.05);
            result.crit = Number((result.crit * 1.05).toFixed(3));
            result.luck = Number((result.luck * 1.05).toFixed(3));
            result.xpMultiplier += 0.15;
        }
        if (effects.has(exports.EFFECT_IDS.VOID_WALKER))
            result.hasVoidWalker = true;
        if (effects.has(exports.EFFECT_IDS.SOUL_EATER))
            result.hasSoulEater = true;
        return result;
    }
    // ── Helpers ────────────────────────────────────────────────────────────────
    static toExtended(stats) {
        return {
            ...stats,
            goldMultiplier: 0,
            xpMultiplier: 0,
            bossDamageMultiplier: 0,
            dodgeChance: 0,
            stealGoldBonus: 0,
            chainLightningOnCrit: false,
            chosenOneTitle: false,
            hasLifesteal: false,
            hasImmortal: false,
            hasManaFlow: false,
            hasTimeWarp: false,
            hasToughSkin: false,
            hasLuckyStrike: false,
            hasGodBlessing: false,
            hasTitanWill: false,
            hasHolyFury: false,
            hasArcaneSurge: false,
            hasDarkPact: false,
            hasHawkEye: false,
            hasShadowVeil: false,
            hasBerserkerRage: false,
            hasBattleFocus: false,
            hasEchoStrike: false,
            hasDragonBlood: false,
            hasCelestialGrace: false,
            hasVoidWalker: false,
            hasSoulEater: false,
        };
    }
    static countSets(equippedItems) {
        var _a, _b, _c;
        const counts = {};
        for (const si of equippedItems) {
            const setId = (_b = (_a = si.item) === null || _a === void 0 ? void 0 : _a.setId) !== null && _b !== void 0 ? _b : si.setId;
            if (setId)
                counts[setId] = ((_c = counts[setId]) !== null && _c !== void 0 ? _c : 0) + 1;
        }
        return counts;
    }
    static collectEffects(equippedItems) {
        var _a, _b;
        const effects = new Set();
        for (const si of equippedItems) {
            const itemEffects = this.normalizeEffects((_b = (_a = si.item) === null || _a === void 0 ? void 0 : _a.effects) !== null && _b !== void 0 ? _b : si.effects);
            for (const e of itemEffects)
                effects.add(e);
        }
        return effects;
    }
    static normalizeEffects(effects) {
        if (Array.isArray(effects)) {
            return effects.filter((effect) => typeof effect === "string");
        }
        if (typeof effects === "string") {
            return [effects];
        }
        return [];
    }
}
exports.StatCalculator = StatCalculator;
