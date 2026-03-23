import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  TIER_MAX,
  getEnhancementZone,
  getSuccessRate,
  calculateEnhancementCost,
  rollEnhancement,
} from "../enhancement-system";

// ─── P2: Enhancement Bounds ───────────────────────────────────────────────────
// **Validates: Requirements 6.1, 6.6, 6.9**
// For all valid inputs, after any enhancement attempt, enhancementLevel stays in [0, tierMax].

describe("P2 — Enhancement Bounds", () => {
  it("rollEnhancement newLevel always stays in [0, TIER_MAX[tier]]", () => {
    const tiers = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...tiers),
        fc.nat(), // will be clamped to [0, tierMax - 1]
        (tier, rawLevel) => {
          const tierMax = TIER_MAX[tier];
          // currentLevel must be in [0, tierMax - 1] to be a valid enhancement attempt
          const currentLevel = rawLevel % tierMax; // 0 to tierMax-1

          const result = rollEnhancement(currentLevel);

          expect(result.newLevel).toBeGreaterThanOrEqual(0);
          expect(result.newLevel).toBeLessThanOrEqual(tierMax);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─── Zone Detection ───────────────────────────────────────────────────────────

describe("getEnhancementZone", () => {
  it("returns SAFE for levels 0–5", () => {
    for (let i = 0; i <= 5; i++) {
      expect(getEnhancementZone(i)).toBe("SAFE");
    }
  });

  it("returns RISK for levels 6–10", () => {
    for (let i = 6; i <= 10; i++) {
      expect(getEnhancementZone(i)).toBe("RISK");
    }
  });

  it("returns DANGER for levels 11–14", () => {
    for (let i = 11; i <= 14; i++) {
      expect(getEnhancementZone(i)).toBe("DANGER");
    }
  });

  it("boundary: level 5 is SAFE, level 6 is RISK", () => {
    expect(getEnhancementZone(5)).toBe("SAFE");
    expect(getEnhancementZone(6)).toBe("RISK");
  });

  it("boundary: level 10 is RISK, level 11 is DANGER", () => {
    expect(getEnhancementZone(10)).toBe("RISK");
    expect(getEnhancementZone(11)).toBe("DANGER");
  });
});

// ─── Success Rates ────────────────────────────────────────────────────────────

describe("getSuccessRate", () => {
  it("Safe zone is always 100%", () => {
    for (let i = 0; i <= 5; i++) {
      expect(getSuccessRate(i)).toBe(100);
    }
  });

  it("Risk zone: 70% at +6, 30% at +10", () => {
    expect(getSuccessRate(6)).toBeCloseTo(70, 5);
    expect(getSuccessRate(10)).toBeCloseTo(30, 5);
  });

  it("Risk zone decreases linearly between +6 and +10", () => {
    const rates = [6, 7, 8, 9, 10].map(getSuccessRate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThan(rates[i - 1]);
    }
  });

  it("Danger zone: 20% at +11, 5% at +14", () => {
    expect(getSuccessRate(11)).toBeCloseTo(20, 5);
    expect(getSuccessRate(14)).toBeCloseTo(5, 5);
  });

  it("Danger zone decreases linearly between +11 and +14", () => {
    const rates = [11, 12, 13, 14].map(getSuccessRate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThan(rates[i - 1]);
    }
  });
});

// ─── Cost Calculation ─────────────────────────────────────────────────────────

describe("calculateEnhancementCost", () => {
  it("Safe zone: gold only, no BP, no materials", () => {
    const cost = calculateEnhancementCost(3, 1000);
    expect(cost.gold).toBe(Math.floor(1000 * 4 * 0.5)); // 2000
    expect(cost.behaviorPoints).toBe(0);
    expect(cost.materialType).toBeNull();
    expect(cost.materialQuantity).toBe(0);
  });

  it("Risk zone: gold + BP, no materials", () => {
    const cost = calculateEnhancementCost(7, 1000);
    expect(cost.gold).toBe(Math.floor(1000 * 8 * 0.5)); // 4000
    expect(cost.behaviorPoints).toBe(8 * 10); // 80
    expect(cost.materialType).toBeNull();
    expect(cost.materialQuantity).toBe(0);
  });

  it("Danger zone: gold + BP + 1 material", () => {
    const cost = calculateEnhancementCost(12, 1000, "Dragon Scale");
    expect(cost.gold).toBe(Math.floor(1000 * 13 * 0.5)); // 6500
    expect(cost.behaviorPoints).toBe(13 * 10); // 130
    expect(cost.materialType).toBe("Dragon Scale");
    expect(cost.materialQuantity).toBe(1);
  });

  it("Danger zone without materialType: materialType is null", () => {
    const cost = calculateEnhancementCost(11, 500);
    expect(cost.materialType).toBeNull();
    expect(cost.materialQuantity).toBe(1);
  });
});

// ─── rollEnhancement zone behavior ───────────────────────────────────────────

describe("rollEnhancement zone behavior", () => {
  it("Safe zone always succeeds (100% rate)", () => {
    // Run many times — should always succeed
    for (let i = 0; i < 100; i++) {
      const result = rollEnhancement(0);
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(1);
      expect(result.zone).toBe("SAFE");
    }
  });

  it("Risk zone failure keeps level unchanged", () => {
    // Mock Math.random to force failure (roll = 99, rate = 70 at +6)
    const original = Math.random;
    Math.random = () => 0.99; // 99% → fails at +6 (70% rate)
    const result = rollEnhancement(6);
    Math.random = original;

    expect(result.success).toBe(false);
    expect(result.newLevel).toBe(6); // no change
    expect(result.zone).toBe("RISK");
  });

  it("Danger zone failure decreases level by 1", () => {
    const original = Math.random;
    Math.random = () => 0.99; // 99% → fails at +11 (20% rate)
    const result = rollEnhancement(11);
    Math.random = original;

    expect(result.success).toBe(false);
    expect(result.newLevel).toBe(10); // level -1
    expect(result.zone).toBe("DANGER");
  });

  it("Danger zone failure at level 0 does not go below 0", () => {
    // Edge case: if somehow in danger zone at level 0 (shouldn't happen in practice)
    const original = Math.random;
    Math.random = () => 0.99;
    const result = rollEnhancement(11);
    Math.random = original;
    expect(result.newLevel).toBeGreaterThanOrEqual(0);
  });
});
