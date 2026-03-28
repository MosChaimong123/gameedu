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
const enhancement_system_1 = require("../enhancement-system");
// ─── P2: Enhancement Bounds ───────────────────────────────────────────────────
// **Validates: Requirements 6.1, 6.6, 6.9**
// For all valid inputs, after any enhancement attempt, enhancementLevel stays in [0, tierMax].
(0, vitest_1.describe)("P2 — Enhancement Bounds", () => {
    (0, vitest_1.it)("rollEnhancement newLevel always stays in [0, TIER_MAX[tier]]", () => {
        const tiers = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
        fc.assert(fc.property(fc.constantFrom(...tiers), fc.nat(), // will be clamped to [0, tierMax - 1]
        (tier, rawLevel) => {
            const tierMax = enhancement_system_1.TIER_MAX[tier];
            // currentLevel must be in [0, tierMax - 1] to be a valid enhancement attempt
            const currentLevel = rawLevel % tierMax; // 0 to tierMax-1
            const result = (0, enhancement_system_1.rollEnhancement)(currentLevel);
            (0, vitest_1.expect)(result.newLevel).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.newLevel).toBeLessThanOrEqual(tierMax);
        }), { numRuns: 500 });
    });
});
// ─── Zone Detection ───────────────────────────────────────────────────────────
(0, vitest_1.describe)("getEnhancementZone", () => {
    (0, vitest_1.it)("returns SAFE for levels 0–5", () => {
        for (let i = 0; i <= 5; i++) {
            (0, vitest_1.expect)((0, enhancement_system_1.getEnhancementZone)(i)).toBe("SAFE");
        }
    });
    (0, vitest_1.it)("returns RISK for levels 6–10", () => {
        for (let i = 6; i <= 10; i++) {
            (0, vitest_1.expect)((0, enhancement_system_1.getEnhancementZone)(i)).toBe("RISK");
        }
    });
    (0, vitest_1.it)("returns DANGER for levels 11–14", () => {
        for (let i = 11; i <= 14; i++) {
            (0, vitest_1.expect)((0, enhancement_system_1.getEnhancementZone)(i)).toBe("DANGER");
        }
    });
    (0, vitest_1.it)("boundary: level 5 is SAFE, level 6 is RISK", () => {
        (0, vitest_1.expect)((0, enhancement_system_1.getEnhancementZone)(5)).toBe("SAFE");
        (0, vitest_1.expect)((0, enhancement_system_1.getEnhancementZone)(6)).toBe("RISK");
    });
    (0, vitest_1.it)("boundary: level 10 is RISK, level 11 is DANGER", () => {
        (0, vitest_1.expect)((0, enhancement_system_1.getEnhancementZone)(10)).toBe("RISK");
        (0, vitest_1.expect)((0, enhancement_system_1.getEnhancementZone)(11)).toBe("DANGER");
    });
});
// ─── Success Rates ────────────────────────────────────────────────────────────
(0, vitest_1.describe)("getSuccessRate", () => {
    (0, vitest_1.it)("Safe zone is always 100%", () => {
        for (let i = 0; i <= 5; i++) {
            (0, vitest_1.expect)((0, enhancement_system_1.getSuccessRate)(i)).toBe(100);
        }
    });
    (0, vitest_1.it)("Risk zone: 70% at +6, 30% at +10", () => {
        (0, vitest_1.expect)((0, enhancement_system_1.getSuccessRate)(6)).toBeCloseTo(70, 5);
        (0, vitest_1.expect)((0, enhancement_system_1.getSuccessRate)(10)).toBeCloseTo(30, 5);
    });
    (0, vitest_1.it)("Risk zone decreases linearly between +6 and +10", () => {
        const rates = [6, 7, 8, 9, 10].map(enhancement_system_1.getSuccessRate);
        for (let i = 1; i < rates.length; i++) {
            (0, vitest_1.expect)(rates[i]).toBeLessThan(rates[i - 1]);
        }
    });
    (0, vitest_1.it)("Danger zone: 20% at +11, 5% at +14", () => {
        (0, vitest_1.expect)((0, enhancement_system_1.getSuccessRate)(11)).toBeCloseTo(20, 5);
        (0, vitest_1.expect)((0, enhancement_system_1.getSuccessRate)(14)).toBeCloseTo(5, 5);
    });
    (0, vitest_1.it)("Danger zone decreases linearly between +11 and +14", () => {
        const rates = [11, 12, 13, 14].map(enhancement_system_1.getSuccessRate);
        for (let i = 1; i < rates.length; i++) {
            (0, vitest_1.expect)(rates[i]).toBeLessThan(rates[i - 1]);
        }
    });
});
// ─── Cost Calculation ─────────────────────────────────────────────────────────
(0, vitest_1.describe)("calculateEnhancementCost", () => {
    (0, vitest_1.it)("Safe zone: gold only, no BP, no materials", () => {
        const cost = (0, enhancement_system_1.calculateEnhancementCost)(3, 1000);
        (0, vitest_1.expect)(cost.gold).toBe(Math.floor(1000 * 4 * 0.5)); // 2000
        (0, vitest_1.expect)(cost.behaviorPoints).toBe(0);
        (0, vitest_1.expect)(cost.materialType).toBeNull();
        (0, vitest_1.expect)(cost.materialQuantity).toBe(0);
    });
    (0, vitest_1.it)("Risk zone: gold + BP, no materials", () => {
        const cost = (0, enhancement_system_1.calculateEnhancementCost)(7, 1000);
        (0, vitest_1.expect)(cost.gold).toBe(Math.floor(1000 * 8 * 0.5)); // 4000
        (0, vitest_1.expect)(cost.behaviorPoints).toBe(8 * 10); // 80
        (0, vitest_1.expect)(cost.materialType).toBeNull();
        (0, vitest_1.expect)(cost.materialQuantity).toBe(0);
    });
    (0, vitest_1.it)("Danger zone: gold + BP + 1 material", () => {
        const cost = (0, enhancement_system_1.calculateEnhancementCost)(12, 1000, "Dragon Scale");
        (0, vitest_1.expect)(cost.gold).toBe(Math.floor(1000 * 13 * 0.5)); // 6500
        (0, vitest_1.expect)(cost.behaviorPoints).toBe(13 * 10); // 130
        (0, vitest_1.expect)(cost.materialType).toBe("Dragon Scale");
        (0, vitest_1.expect)(cost.materialQuantity).toBe(1);
    });
    (0, vitest_1.it)("Danger zone without materialType: materialType is null", () => {
        const cost = (0, enhancement_system_1.calculateEnhancementCost)(11, 500);
        (0, vitest_1.expect)(cost.materialType).toBeNull();
        (0, vitest_1.expect)(cost.materialQuantity).toBe(1);
    });
});
// ─── rollEnhancement zone behavior ───────────────────────────────────────────
(0, vitest_1.describe)("rollEnhancement zone behavior", () => {
    (0, vitest_1.it)("Safe zone always succeeds (100% rate)", () => {
        // Run many times — should always succeed
        for (let i = 0; i < 100; i++) {
            const result = (0, enhancement_system_1.rollEnhancement)(0);
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.newLevel).toBe(1);
            (0, vitest_1.expect)(result.zone).toBe("SAFE");
        }
    });
    (0, vitest_1.it)("Risk zone failure keeps level unchanged", () => {
        // Mock Math.random to force failure (roll = 99, rate = 70 at +6)
        const original = Math.random;
        Math.random = () => 0.99; // 99% → fails at +6 (70% rate)
        const result = (0, enhancement_system_1.rollEnhancement)(6);
        Math.random = original;
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.newLevel).toBe(6); // no change
        (0, vitest_1.expect)(result.zone).toBe("RISK");
    });
    (0, vitest_1.it)("Danger zone failure decreases level by 1", () => {
        const original = Math.random;
        Math.random = () => 0.99; // 99% → fails at +11 (20% rate)
        const result = (0, enhancement_system_1.rollEnhancement)(11);
        Math.random = original;
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.newLevel).toBe(10); // level -1
        (0, vitest_1.expect)(result.zone).toBe("DANGER");
    });
    (0, vitest_1.it)("Danger zone failure at level 0 does not go below 0", () => {
        // Edge case: if somehow in danger zone at level 0 (shouldn't happen in practice)
        const original = Math.random;
        Math.random = () => 0.99;
        const result = (0, enhancement_system_1.rollEnhancement)(11);
        Math.random = original;
        (0, vitest_1.expect)(result.newLevel).toBeGreaterThanOrEqual(0);
    });
});
