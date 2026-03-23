"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatCalculator = exports.EFFECT_IDS = void 0;
const idle_engine_1 = require("./idle-engine");
const BASE_JOB_MULTIPLIERS = {
    WARRIOR: { hp: 1.4, atk: 1.3, def: 1.2, spd: 0.9, mag: 1.0, maxMp: 1.0, crit: 1.0 },
    MAGE: { hp: 0.8, atk: 0.8, def: 0.9, spd: 1.0, mag: 1.8, maxMp: 1.5, crit: 1.0 },
    RANGER: { hp: 1.0, atk: 1.1, def: 1.0, spd: 1.3, mag: 1.0, maxMp: 1.0, crit: 1.3 },
    HEALER: { hp: 1.2, atk: 0.7, def: 1.1, spd: 1.0, mag: 1.6, maxMp: 1.3, crit: 1.0 },
    ROGUE: { hp: 0.9, atk: 1.2, def: 0.9, spd: 1.4, mag: 1.0, maxMp: 1.0, crit: 1.5 },
    NOVICE: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, mag: 1.0, maxMp: 1.0, crit: 1.0 },
};
// ADVANCE/MASTER tier adds ×1.2 on top of base primary stats
const ADVANCE_TIER_BONUS = 1.2;
// ─── Set Bonus Definitions ───────────────────────────────────────────────────
const SET_IDS = {
    DRAGON: "DRAGON_SET",
    THUNDER: "THUNDER_SET",
    SHADOW: "SHADOW_SET",
    LEGENDARY: "LEGENDARY_SET",
};
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
    // LEGENDARY
    IMMORTAL: "IMMORTAL",
    GOD_BLESSING: "GOD_BLESSING",
    TIME_WARP: "TIME_WARP",
};
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
    static compute(points, equippedItems, level, jobClass, jobTier = "BASE") {
        // Sort items deterministically so floating-point accumulation is order-independent
        const sortedItems = [...equippedItems].sort((a, b) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const idA = (_d = (_b = (_a = a.itemId) !== null && _a !== void 0 ? _a : a.id) !== null && _b !== void 0 ? _b : (_c = a.item) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : "";
            const idB = (_h = (_f = (_e = b.itemId) !== null && _e !== void 0 ? _e : b.id) !== null && _f !== void 0 ? _f : (_g = b.item) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : "";
            return idA < idB ? -1 : idA > idB ? 1 : 0;
        });
        // Step 1: Base stats from IdleEngine
        const base = idle_engine_1.IdleEngine.calculateCharacterStats(points, sortedItems, level);
        // Step 2: Job class multipliers
        const afterJob = this.applyJobMultipliers(base, jobClass, jobTier);
        // Step 3: Set bonuses
        const afterSets = this.applySetBonuses(afterJob, equippedItems);
        // Step 4: Special effects
        const final = this.applySpecialEffects(afterSets, equippedItems);
        return final;
    }
    // ── Step 2: Job Multipliers ────────────────────────────────────────────────
    static applyJobMultipliers(stats, jobClass, jobTier = "BASE") {
        var _a;
        const extended = this.toExtended(stats);
        const key = jobClass !== null && jobClass !== void 0 ? jobClass : "NOVICE";
        const mult = (_a = BASE_JOB_MULTIPLIERS[key]) !== null && _a !== void 0 ? _a : BASE_JOB_MULTIPLIERS.NOVICE;
        // Apply base multipliers
        extended.hp = Math.floor(stats.hp * mult.hp);
        extended.atk = Math.floor(stats.atk * mult.atk);
        extended.def = Math.floor(stats.def * mult.def);
        extended.spd = Math.floor(stats.spd * mult.spd);
        extended.mag = Math.floor(stats.mag * mult.mag);
        extended.maxMp = Math.floor(stats.maxMp * mult.maxMp);
        extended.crit = Number((stats.crit * mult.crit).toFixed(3));
        // ADVANCE / MASTER: additional ×1.2 on primary stats
        if (jobTier === "ADVANCE" || jobTier === "MASTER") {
            const primaryKeys = this.getPrimaryStats(key);
            for (const k of primaryKeys) {
                if (k === "crit") {
                    extended.crit = Number((extended.crit * ADVANCE_TIER_BONUS).toFixed(3));
                }
                else {
                    extended[k] = Math.floor(extended[k] * ADVANCE_TIER_BONUS);
                }
            }
        }
        return extended;
    }
    // ── Step 3: Set Bonuses ────────────────────────────────────────────────────
    static applySetBonuses(stats, equippedItems) {
        var _a, _b, _c, _d;
        const result = { ...stats };
        const setCounts = this.countSets(equippedItems);
        // Dragon Set
        const dragon = (_a = setCounts[SET_IDS.DRAGON]) !== null && _a !== void 0 ? _a : 0;
        if (dragon >= 2) {
            result.atk = Math.floor(result.atk * 1.15);
            result.def = Math.floor(result.def * 1.15);
        }
        if (dragon >= 4) {
            result.bossDamageMultiplier += 0.30;
            result.hp += 500;
        }
        // Thunder Set
        const thunder = (_b = setCounts[SET_IDS.THUNDER]) !== null && _b !== void 0 ? _b : 0;
        if (thunder >= 2) {
            result.spd = Math.floor(result.spd * 1.20);
            result.crit = Number((result.crit + 0.08).toFixed(3));
        }
        if (thunder >= 4) {
            result.chainLightningOnCrit = true;
        }
        // Shadow Set
        const shadow = (_c = setCounts[SET_IDS.SHADOW]) !== null && _c !== void 0 ? _c : 0;
        if (shadow >= 2) {
            result.luck = Number((result.luck * 1.10).toFixed(3));
            result.goldMultiplier += 0.20;
        }
        if (shadow >= 4) {
            result.dodgeChance = 0.15;
            result.stealGoldBonus = 0.50;
        }
        // Legendary Set (7-piece full)
        const legendary = (_d = setCounts[SET_IDS.LEGENDARY]) !== null && _d !== void 0 ? _d : 0;
        if (legendary >= 7) {
            result.hp = Math.floor(result.hp * 1.25);
            result.atk = Math.floor(result.atk * 1.25);
            result.def = Math.floor(result.def * 1.25);
            result.spd = Math.floor(result.spd * 1.25);
            result.mag = Math.floor(result.mag * 1.25);
            result.maxMp = Math.floor(result.maxMp * 1.25);
            result.crit = Number((result.crit * 1.25).toFixed(3));
            result.luck = Number((result.luck * 1.25).toFixed(3));
            result.xpMultiplier += 0.50;
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
        // LEGENDARY effects
        if (effects.has(exports.EFFECT_IDS.IMMORTAL))
            result.hasImmortal = true;
        if (effects.has(exports.EFFECT_IDS.TIME_WARP))
            result.hasTimeWarp = true;
        if (effects.has(exports.EFFECT_IDS.GOD_BLESSING)) {
            result.hasGodBlessing = true;
            result.goldMultiplier += 0.10;
            result.xpMultiplier += 0.10;
            result.bossDamageMultiplier += 0.10;
        }
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
        var _a, _b, _c;
        const effects = new Set();
        for (const si of equippedItems) {
            const itemEffects = (_c = (_b = (_a = si.item) === null || _a === void 0 ? void 0 : _a.effects) !== null && _b !== void 0 ? _b : si.effects) !== null && _c !== void 0 ? _c : [];
            for (const e of itemEffects)
                effects.add(e);
        }
        return effects;
    }
    static getPrimaryStats(jobClass) {
        switch (jobClass) {
            case "WARRIOR": return ["hp", "atk", "def"];
            case "MAGE": return ["mag", "maxMp"];
            case "RANGER": return ["spd", "crit"];
            case "HEALER": return ["mag", "maxMp", "hp"];
            case "ROGUE": return ["spd", "crit", "atk"];
            default: return [];
        }
    }
}
exports.StatCalculator = StatCalculator;
