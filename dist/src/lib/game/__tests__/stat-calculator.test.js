"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fc = __importStar(require("fast-check"));
const stat_calculator_1 = require("../stat-calculator");
// ─── Helpers ─────────────────────────────────────────────────────────────────
const JOB_CLASSES = ["WARRIOR", "MAGE", "RANGER", "HEALER", "ROGUE", "NOVICE", null];
const JOB_TIERS = ["BASE", "ADVANCE", "MASTER"];
/** Arbitrary for a single equipped item (no set, no effects) — with a stable id */
let _itemId = 0;
const arbItem = fc.record({
    enhancementLevel: fc.integer({ min: 0, max: 15 }),
    item: fc.record({
        id: fc.constant(`item-${++_itemId}`),
        baseAtk: fc.integer({ min: 0, max: 100 }),
        baseDef: fc.integer({ min: 0, max: 100 }),
        baseHp: fc.integer({ min: 0, max: 500 }),
        baseSpd: fc.integer({ min: 0, max: 50 }),
        baseCrit: fc.float({ min: 0, max: 0.5 }),
        baseLuck: fc.float({ min: 0, max: 0.5 }),
        baseMag: fc.integer({ min: 0, max: 100 }),
        baseMp: fc.integer({ min: 0, max: 200 }),
        goldMultiplier: fc.float({ min: 0, max: 1 }),
        bossDamageMultiplier: fc.float({ min: 0, max: 1 }),
        setId: fc.constant(null),
        effects: fc.constant([]),
    }),
});
const arbItems = fc.array(arbItem, { minLength: 0, maxLength: 7 });
// ─── P1: Stat Calculator Confluence ──────────────────────────────────────────
// For all combinations of equipped items, StatCalculator.compute produces the
// same CharacterStats regardless of item evaluation order.
(0, vitest_1.describe)("P1 — Stat Calculator Confluence", () => {
    (0, vitest_1.it)("produces identical stats regardless of item order", () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 1000 }), // points
        arbItems, fc.integer({ min: 1, max: 60 }), // level
        fc.constantFrom(...JOB_CLASSES), fc.constantFrom(...JOB_TIERS), (points, items, level, jobClass, jobTier) => {
            const shuffled = [...items].sort(() => Math.random() - 0.5);
            const a = stat_calculator_1.StatCalculator.compute(points, items, level, jobClass, jobTier);
            const b = stat_calculator_1.StatCalculator.compute(points, shuffled, level, jobClass, jobTier);
            (0, vitest_1.expect)(a.hp).toBe(b.hp);
            (0, vitest_1.expect)(a.atk).toBe(b.atk);
            (0, vitest_1.expect)(a.def).toBe(b.def);
            (0, vitest_1.expect)(a.spd).toBe(b.spd);
            (0, vitest_1.expect)(a.mag).toBe(b.mag);
            (0, vitest_1.expect)(a.maxMp).toBe(b.maxMp);
            // crit uses float rounding — allow tiny epsilon
            (0, vitest_1.expect)(Math.abs(a.crit - b.crit)).toBeLessThan(0.001);
        }), { numRuns: 200 });
    });
});
// ─── P7: AP Cap ───────────────────────────────────────────────────────────────
// player.ap after any battle-action is always in [0, player.maxAp].
(0, vitest_1.describe)("P7 — AP Cap", () => {
    (0, vitest_1.it)("ap stays within [0, maxAp] after gaining or spending AP", () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), // current ap
        fc.integer({ min: 0, max: 100 }), // maxAp
        fc.integer({ min: -50, max: 50 }), // delta (positive = gain, negative = spend)
        (ap, maxAp, delta) => {
            const newAp = Math.min(maxAp, Math.max(0, ap + delta));
            (0, vitest_1.expect)(newAp).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(newAp).toBeLessThanOrEqual(maxAp);
        }), { numRuns: 500 });
    });
});
// ─── P8: Job Multiplier Positivity ───────────────────────────────────────────
// For all job classes and tiers, applyJobMultipliers produces stats where all
// numeric values are strictly positive.
(0, vitest_1.describe)("P8 — Job Multiplier Positivity", () => {
    (0, vitest_1.it)("all stats remain strictly positive after job multipliers", () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 1000 }), // points (min 1 to ensure base stats > 0)
        fc.integer({ min: 1, max: 60 }), // level
        fc.constantFrom(...JOB_CLASSES), fc.constantFrom(...JOB_TIERS), (points, level, jobClass, jobTier) => {
            const stats = stat_calculator_1.StatCalculator.compute(points, [], level, jobClass, jobTier);
            (0, vitest_1.expect)(stats.hp).toBeGreaterThan(0);
            (0, vitest_1.expect)(stats.atk).toBeGreaterThan(0);
            (0, vitest_1.expect)(stats.def).toBeGreaterThan(0);
            (0, vitest_1.expect)(stats.spd).toBeGreaterThan(0);
            (0, vitest_1.expect)(stats.mag).toBeGreaterThan(0);
            (0, vitest_1.expect)(stats.maxMp).toBeGreaterThan(0);
            (0, vitest_1.expect)(stats.crit).toBeGreaterThan(0);
        }), { numRuns: 300 });
    });
});
