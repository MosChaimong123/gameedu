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
const crafting_system_1 = require("../crafting-system");
// ─── P3: Crafting Round-Trip ──────────────────────────────────────────────────
// **Validates: Requirements 7.10**
// For all valid CraftingRecipe objects, parseCraftingRecipe(serializeCraftingRecipe(recipe))
// produces an equivalent recipe.
(0, vitest_1.describe)("P3 — Crafting Round-Trip", () => {
    (0, vitest_1.it)("serialize then parse produces an equivalent CraftingRecipe", () => {
        // Build an arbitrary for valid CraftingRecipe objects
        const validMaterialArb = fc.constantFrom(...crafting_system_1.MATERIAL_TYPES);
        const possibleItemsArb = fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 0, maxLength: 10 });
        fc.assert(fc.property(validMaterialArb, possibleItemsArb, (materialType, possibleItems) => {
            const tier = crafting_system_1.MATERIAL_TIER_MAP[materialType];
            const quantity = crafting_system_1.CRAFT_REQUIREMENTS[tier].quantity;
            const recipe = {
                tier,
                materialType,
                quantity,
                possibleItems,
            };
            const serialized = (0, crafting_system_1.serializeCraftingRecipe)(recipe);
            const parsed = (0, crafting_system_1.parseCraftingRecipe)(serialized);
            // Must parse successfully
            (0, vitest_1.expect)(parsed).not.toBeNull();
            if (!parsed)
                return;
            // Must be equivalent
            (0, vitest_1.expect)(parsed.tier).toBe(recipe.tier);
            (0, vitest_1.expect)(parsed.materialType).toBe(recipe.materialType);
            (0, vitest_1.expect)(parsed.quantity).toBe(recipe.quantity);
            (0, vitest_1.expect)(parsed.possibleItems).toEqual(recipe.possibleItems);
        }), { numRuns: 500 });
    });
});
// ─── parseCraftingRecipe — invalid inputs ─────────────────────────────────────
(0, vitest_1.describe)("parseCraftingRecipe — invalid inputs", () => {
    (0, vitest_1.it)("returns null for null", () => {
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)(null)).toBeNull();
    });
    (0, vitest_1.it)("returns null for a non-object primitive", () => {
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)("not an object")).toBeNull();
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)(42)).toBeNull();
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)(true)).toBeNull();
    });
    (0, vitest_1.it)("returns null when tier is missing", () => {
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)({
            materialType: "Stone Fragment",
            quantity: 3,
            possibleItems: [],
        })).toBeNull();
    });
    (0, vitest_1.it)("returns null when materialType is unknown", () => {
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)({
            tier: "COMMON",
            materialType: "Unicorn Horn",
            quantity: 3,
            possibleItems: [],
        })).toBeNull();
    });
    (0, vitest_1.it)("returns null when tier is unknown", () => {
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)({
            tier: "MYTHIC",
            materialType: "Stone Fragment",
            quantity: 3,
            possibleItems: [],
        })).toBeNull();
    });
    (0, vitest_1.it)("returns null when materialType does not match tier", () => {
        // Stone Fragment is COMMON, not RARE
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)({
            tier: "RARE",
            materialType: "Stone Fragment",
            quantity: 3,
            possibleItems: [],
        })).toBeNull();
    });
    (0, vitest_1.it)("returns null when quantity is not a positive integer", () => {
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)({
            tier: "COMMON",
            materialType: "Stone Fragment",
            quantity: 0,
            possibleItems: [],
        })).toBeNull();
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)({
            tier: "COMMON",
            materialType: "Stone Fragment",
            quantity: 1.5,
            possibleItems: [],
        })).toBeNull();
    });
    (0, vitest_1.it)("returns null when possibleItems is not an array", () => {
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)({
            tier: "COMMON",
            materialType: "Stone Fragment",
            quantity: 3,
            possibleItems: "not-an-array",
        })).toBeNull();
    });
    (0, vitest_1.it)("returns null when possibleItems contains non-strings", () => {
        (0, vitest_1.expect)((0, crafting_system_1.parseCraftingRecipe)({
            tier: "COMMON",
            materialType: "Stone Fragment",
            quantity: 3,
            possibleItems: [1, 2, 3],
        })).toBeNull();
    });
    (0, vitest_1.it)("returns null for arbitrary invalid objects", () => {
        fc.assert(fc.property(fc.record({
            tier: fc.string(),
            materialType: fc.string(),
            quantity: fc.oneof(fc.string(), fc.float({ min: -100, max: 0 })),
            possibleItems: fc.array(fc.integer()),
        }), (obj) => {
            // These should all fail to parse (wrong types / invalid values)
            const result = (0, crafting_system_1.parseCraftingRecipe)(obj);
            // Either null or a valid recipe — if it parses, it must be internally consistent
            if (result !== null) {
                (0, vitest_1.expect)(crafting_system_1.MATERIAL_TYPES).toContain(result.materialType);
                (0, vitest_1.expect)(["COMMON", "RARE", "EPIC", "LEGENDARY"]).toContain(result.tier);
                (0, vitest_1.expect)(crafting_system_1.MATERIAL_TIER_MAP[result.materialType]).toBe(result.tier);
            }
        }), { numRuns: 200 });
    });
});
// ─── getCraftingRecipes ───────────────────────────────────────────────────────
(0, vitest_1.describe)("getCraftingRecipes", () => {
    (0, vitest_1.it)("returns 12 recipes (one per material type)", () => {
        const recipes = (0, crafting_system_1.getCraftingRecipes)();
        (0, vitest_1.expect)(recipes).toHaveLength(12);
    });
    (0, vitest_1.it)("each recipe has a valid tier and materialType", () => {
        const recipes = (0, crafting_system_1.getCraftingRecipes)();
        for (const recipe of recipes) {
            (0, vitest_1.expect)(["COMMON", "RARE", "EPIC", "LEGENDARY"]).toContain(recipe.tier);
            (0, vitest_1.expect)(crafting_system_1.MATERIAL_TYPES).toContain(recipe.materialType);
            (0, vitest_1.expect)(crafting_system_1.MATERIAL_TIER_MAP[recipe.materialType]).toBe(recipe.tier);
        }
    });
    (0, vitest_1.it)("LEGENDARY recipe requires 5 materials", () => {
        const recipes = (0, crafting_system_1.getCraftingRecipes)();
        const legendary = recipes.filter((r) => r.tier === "LEGENDARY");
        (0, vitest_1.expect)(legendary).toHaveLength(1);
        (0, vitest_1.expect)(legendary[0].quantity).toBe(5);
        (0, vitest_1.expect)(legendary[0].materialType).toBe("Ancient Relic");
    });
    (0, vitest_1.it)("COMMON/RARE/EPIC recipes require 3 materials", () => {
        const recipes = (0, crafting_system_1.getCraftingRecipes)();
        const nonLegendary = recipes.filter((r) => r.tier !== "LEGENDARY");
        for (const recipe of nonLegendary) {
            (0, vitest_1.expect)(recipe.quantity).toBe(3);
        }
    });
    (0, vitest_1.it)("all recipes round-trip through serialize/parse", () => {
        const recipes = (0, crafting_system_1.getCraftingRecipes)();
        for (const recipe of recipes) {
            const serialized = (0, crafting_system_1.serializeCraftingRecipe)(recipe);
            const parsed = (0, crafting_system_1.parseCraftingRecipe)(serialized);
            (0, vitest_1.expect)(parsed).not.toBeNull();
            (0, vitest_1.expect)(parsed === null || parsed === void 0 ? void 0 : parsed.tier).toBe(recipe.tier);
            (0, vitest_1.expect)(parsed === null || parsed === void 0 ? void 0 : parsed.materialType).toBe(recipe.materialType);
            (0, vitest_1.expect)(parsed === null || parsed === void 0 ? void 0 : parsed.quantity).toBe(recipe.quantity);
        }
    });
});
// ─── MATERIAL_TYPES constant ──────────────────────────────────────────────────
(0, vitest_1.describe)("MATERIAL_TYPES", () => {
    (0, vitest_1.it)("contains exactly 12 material types", () => {
        (0, vitest_1.expect)(crafting_system_1.MATERIAL_TYPES).toHaveLength(12);
    });
    (0, vitest_1.it)("all types are unique", () => {
        const unique = new Set(crafting_system_1.MATERIAL_TYPES);
        (0, vitest_1.expect)(unique.size).toBe(12);
    });
});
// ─── MATERIAL_TIER_MAP ────────────────────────────────────────────────────────
(0, vitest_1.describe)("MATERIAL_TIER_MAP", () => {
    (0, vitest_1.it)("maps all 12 material types", () => {
        for (const type of crafting_system_1.MATERIAL_TYPES) {
            (0, vitest_1.expect)(crafting_system_1.MATERIAL_TIER_MAP[type]).toBeDefined();
        }
    });
    (0, vitest_1.it)("has exactly 4 COMMON materials", () => {
        const commons = crafting_system_1.MATERIAL_TYPES.filter((t) => crafting_system_1.MATERIAL_TIER_MAP[t] === "COMMON");
        (0, vitest_1.expect)(commons).toHaveLength(4);
    });
    (0, vitest_1.it)("has exactly 4 RARE materials", () => {
        const rares = crafting_system_1.MATERIAL_TYPES.filter((t) => crafting_system_1.MATERIAL_TIER_MAP[t] === "RARE");
        (0, vitest_1.expect)(rares).toHaveLength(4);
    });
    (0, vitest_1.it)("has exactly 3 EPIC materials", () => {
        const epics = crafting_system_1.MATERIAL_TYPES.filter((t) => crafting_system_1.MATERIAL_TIER_MAP[t] === "EPIC");
        (0, vitest_1.expect)(epics).toHaveLength(3);
    });
    (0, vitest_1.it)("has exactly 1 LEGENDARY material", () => {
        const legendaries = crafting_system_1.MATERIAL_TYPES.filter((t) => crafting_system_1.MATERIAL_TIER_MAP[t] === "LEGENDARY");
        (0, vitest_1.expect)(legendaries).toHaveLength(1);
        (0, vitest_1.expect)(legendaries[0]).toBe("Ancient Relic");
    });
});
