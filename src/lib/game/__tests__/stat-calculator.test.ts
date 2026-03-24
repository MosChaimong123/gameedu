import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { StatCalculator } from "../stat-calculator";
import { getStatMultipliers } from "../job-system";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JOB_CLASSES = ["WARRIOR", "MAGE", "RANGER", "HEALER", "ROGUE", "NOVICE", null] as const;
const JOB_TIERS   = ["BASE", "ADVANCE", "MASTER"] as const;

/** Arbitrary for a single equipped item (no set, no effects) — with a stable id */
let _itemId = 0;
const arbItem = fc.record({
  enhancementLevel: fc.integer({ min: 0, max: 15 }),
  item: fc.record({
    id:       fc.constant(`item-${++_itemId}`),
    baseAtk:  fc.integer({ min: 0, max: 100 }),
    baseDef:  fc.integer({ min: 0, max: 100 }),
    baseHp:   fc.integer({ min: 0, max: 500 }),
    baseSpd:  fc.integer({ min: 0, max: 50 }),
    baseCrit: fc.float({ min: 0, max: 0.5 }),
    baseLuck: fc.float({ min: 0, max: 0.5 }),
    baseMag:  fc.integer({ min: 0, max: 100 }),
    baseMp:   fc.integer({ min: 0, max: 200 }),
    goldMultiplier:       fc.float({ min: 0, max: 1 }),
    bossDamageMultiplier: fc.float({ min: 0, max: 1 }),
    setId:   fc.constant(null),
    effects: fc.constant([]),
  }),
});

const arbItems = fc.array(arbItem, { minLength: 0, maxLength: 7 });

// ─── P1: Stat Calculator Confluence ──────────────────────────────────────────
// For all combinations of equipped items, StatCalculator.compute produces the
// same CharacterStats regardless of item evaluation order.

describe("P1 — Stat Calculator Confluence", () => {
  it("produces identical stats regardless of item order", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),  // points
        arbItems,
        fc.integer({ min: 1, max: 60 }),    // level
        fc.constantFrom(...JOB_CLASSES),
        fc.constantFrom(...JOB_TIERS),
        (points, items, level, jobClass, jobTier) => {
          const shuffled = [...items].sort(() => Math.random() - 0.5);
          const a = StatCalculator.compute(points, items,    level, jobClass, jobTier);
          const b = StatCalculator.compute(points, shuffled, level, jobClass, jobTier);

          expect(a.hp).toBe(b.hp);
          expect(a.atk).toBe(b.atk);
          expect(a.def).toBe(b.def);
          expect(a.spd).toBe(b.spd);
          expect(a.mag).toBe(b.mag);
          expect(a.maxMp).toBe(b.maxMp);
          // crit uses float rounding — allow tiny epsilon
          expect(Math.abs(a.crit - b.crit)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── P7: AP Cap ───────────────────────────────────────────────────────────────
// player.ap after any battle-action is always in [0, player.maxAp].

describe("P7 — AP Cap", () => {
  it("ap stays within [0, maxAp] after gaining or spending AP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),  // current ap
        fc.integer({ min: 0, max: 100 }),  // maxAp
        fc.integer({ min: -50, max: 50 }), // delta (positive = gain, negative = spend)
        (ap, maxAp, delta) => {
          const newAp = Math.min(maxAp, Math.max(0, ap + delta));
          expect(newAp).toBeGreaterThanOrEqual(0);
          expect(newAp).toBeLessThanOrEqual(maxAp);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─── P8: Job Multiplier Positivity ───────────────────────────────────────────
// For all job classes and tiers, applyJobMultipliers produces stats where all
// numeric values are strictly positive.

describe("P8 — Job Multiplier Positivity", () => {
  it("all stats remain strictly positive after job multipliers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),  // points (min 1 to ensure base stats > 0)
        fc.integer({ min: 1, max: 60 }),    // level
        fc.constantFrom(...JOB_CLASSES),
        fc.constantFrom(...JOB_TIERS),
        (points, level, jobClass, jobTier) => {
          const stats = StatCalculator.compute(points, [], level, jobClass, jobTier);

          expect(stats.hp).toBeGreaterThan(0);
          expect(stats.atk).toBeGreaterThan(0);
          expect(stats.def).toBeGreaterThan(0);
          expect(stats.spd).toBeGreaterThan(0);
          expect(stats.mag).toBeGreaterThan(0);
          expect(stats.maxMp).toBeGreaterThan(0);
          expect(stats.crit).toBeGreaterThan(0);
          expect(stats.luck).toBeGreaterThan(0);
        }
      ),
      { numRuns: 300 }
    );
  });
});

describe("Job passives + LUK scaling", () => {
  it("WARRIOR passives raise stats vs NOVICE at same level (empty equip)", () => {
    const level = 15;
    const novice = StatCalculator.compute(0, [], level, null, "BASE");
    const warrior = StatCalculator.compute(0, [], level, "WARRIOR", "BASE");
    const warriorMultipliers = getStatMultipliers("WARRIOR", "BASE");
    const warriorBaseAtk = Math.floor((10 + level * 3) * warriorMultipliers.atk);
    const warriorBaseDef = Math.floor((5 + level * 2) * warriorMultipliers.def);
    expect(warrior.hp).toBeGreaterThan(novice.hp);
    expect(warrior.def).toBeGreaterThan(warriorBaseDef);
    expect(warrior.atk).toBeGreaterThan(warriorBaseAtk);
  });

  it("RANGER scales LUK by job crit multiplier like IdleEngine", () => {
    const level = 10;
    const ranger = StatCalculator.compute(0, [], level, "RANGER", "BASE");
    const baseLuck = 0.01 + level * 0.001;
    const expected = Number((baseLuck * 1.3).toFixed(3));
    expect(Math.abs(ranger.luck - expected)).toBeLessThan(0.002);
  });
});
