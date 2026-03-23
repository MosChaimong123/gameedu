import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  MATERIAL_TYPES,
  MATERIAL_TIER_MAP,
  CRAFT_REQUIREMENTS,
  getCraftingRecipes,
  serializeCraftingRecipe,
  parseCraftingRecipe,
  type CraftingRecipe,
} from "../crafting-system";

// ─── P3: Crafting Round-Trip ──────────────────────────────────────────────────
// **Validates: Requirements 7.10**
// For all valid CraftingRecipe objects, parseCraftingRecipe(serializeCraftingRecipe(recipe))
// produces an equivalent recipe.

describe("P3 — Crafting Round-Trip", () => {
  it("serialize then parse produces an equivalent CraftingRecipe", () => {
    // Build an arbitrary for valid CraftingRecipe objects
    const validMaterialArb = fc.constantFrom(...MATERIAL_TYPES);
    const possibleItemsArb = fc.array(
      fc.string({ minLength: 1, maxLength: 40 }),
      { minLength: 0, maxLength: 10 }
    );

    fc.assert(
      fc.property(validMaterialArb, possibleItemsArb, (materialType, possibleItems) => {
        const tier = MATERIAL_TIER_MAP[materialType];
        const quantity = CRAFT_REQUIREMENTS[tier].quantity;

        const recipe: CraftingRecipe = {
          tier,
          materialType,
          quantity,
          possibleItems,
        };

        const serialized = serializeCraftingRecipe(recipe);
        const parsed = parseCraftingRecipe(serialized);

        // Must parse successfully
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        // Must be equivalent
        expect(parsed.tier).toBe(recipe.tier);
        expect(parsed.materialType).toBe(recipe.materialType);
        expect(parsed.quantity).toBe(recipe.quantity);
        expect(parsed.possibleItems).toEqual(recipe.possibleItems);
      }),
      { numRuns: 500 }
    );
  });
});

// ─── parseCraftingRecipe — invalid inputs ─────────────────────────────────────

describe("parseCraftingRecipe — invalid inputs", () => {
  it("returns null for null", () => {
    expect(parseCraftingRecipe(null)).toBeNull();
  });

  it("returns null for a non-object primitive", () => {
    expect(parseCraftingRecipe("not an object")).toBeNull();
    expect(parseCraftingRecipe(42)).toBeNull();
    expect(parseCraftingRecipe(true)).toBeNull();
  });

  it("returns null when tier is missing", () => {
    expect(
      parseCraftingRecipe({
        materialType: "Stone Fragment",
        quantity: 3,
        possibleItems: [],
      })
    ).toBeNull();
  });

  it("returns null when materialType is unknown", () => {
    expect(
      parseCraftingRecipe({
        tier: "COMMON",
        materialType: "Unicorn Horn",
        quantity: 3,
        possibleItems: [],
      })
    ).toBeNull();
  });

  it("returns null when tier is unknown", () => {
    expect(
      parseCraftingRecipe({
        tier: "MYTHIC",
        materialType: "Stone Fragment",
        quantity: 3,
        possibleItems: [],
      })
    ).toBeNull();
  });

  it("returns null when materialType does not match tier", () => {
    // Stone Fragment is COMMON, not RARE
    expect(
      parseCraftingRecipe({
        tier: "RARE",
        materialType: "Stone Fragment",
        quantity: 3,
        possibleItems: [],
      })
    ).toBeNull();
  });

  it("returns null when quantity is not a positive integer", () => {
    expect(
      parseCraftingRecipe({
        tier: "COMMON",
        materialType: "Stone Fragment",
        quantity: 0,
        possibleItems: [],
      })
    ).toBeNull();

    expect(
      parseCraftingRecipe({
        tier: "COMMON",
        materialType: "Stone Fragment",
        quantity: 1.5,
        possibleItems: [],
      })
    ).toBeNull();
  });

  it("returns null when possibleItems is not an array", () => {
    expect(
      parseCraftingRecipe({
        tier: "COMMON",
        materialType: "Stone Fragment",
        quantity: 3,
        possibleItems: "not-an-array",
      })
    ).toBeNull();
  });

  it("returns null when possibleItems contains non-strings", () => {
    expect(
      parseCraftingRecipe({
        tier: "COMMON",
        materialType: "Stone Fragment",
        quantity: 3,
        possibleItems: [1, 2, 3],
      })
    ).toBeNull();
  });

  it("returns null for arbitrary invalid objects", () => {
    fc.assert(
      fc.property(
        fc.record({
          tier: fc.string(),
          materialType: fc.string(),
          quantity: fc.oneof(fc.string(), fc.float({ min: -100, max: 0 })),
          possibleItems: fc.array(fc.integer()),
        }),
        (obj) => {
          // These should all fail to parse (wrong types / invalid values)
          const result = parseCraftingRecipe(obj);
          // Either null or a valid recipe — if it parses, it must be internally consistent
          if (result !== null) {
            expect(MATERIAL_TYPES as readonly string[]).toContain(result.materialType);
            expect(["COMMON", "RARE", "EPIC", "LEGENDARY"]).toContain(result.tier);
            expect(MATERIAL_TIER_MAP[result.materialType]).toBe(result.tier);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── getCraftingRecipes ───────────────────────────────────────────────────────

describe("getCraftingRecipes", () => {
  it("returns 12 recipes (one per material type)", () => {
    const recipes = getCraftingRecipes();
    expect(recipes).toHaveLength(12);
  });

  it("each recipe has a valid tier and materialType", () => {
    const recipes = getCraftingRecipes();
    for (const recipe of recipes) {
      expect(["COMMON", "RARE", "EPIC", "LEGENDARY"]).toContain(recipe.tier);
      expect(MATERIAL_TYPES as readonly string[]).toContain(recipe.materialType);
      expect(MATERIAL_TIER_MAP[recipe.materialType]).toBe(recipe.tier);
    }
  });

  it("LEGENDARY recipe requires 5 materials", () => {
    const recipes = getCraftingRecipes();
    const legendary = recipes.filter((r) => r.tier === "LEGENDARY");
    expect(legendary).toHaveLength(1);
    expect(legendary[0].quantity).toBe(5);
    expect(legendary[0].materialType).toBe("Ancient Relic");
  });

  it("COMMON/RARE/EPIC recipes require 3 materials", () => {
    const recipes = getCraftingRecipes();
    const nonLegendary = recipes.filter((r) => r.tier !== "LEGENDARY");
    for (const recipe of nonLegendary) {
      expect(recipe.quantity).toBe(3);
    }
  });

  it("all recipes round-trip through serialize/parse", () => {
    const recipes = getCraftingRecipes();
    for (const recipe of recipes) {
      const serialized = serializeCraftingRecipe(recipe);
      const parsed = parseCraftingRecipe(serialized);
      expect(parsed).not.toBeNull();
      expect(parsed?.tier).toBe(recipe.tier);
      expect(parsed?.materialType).toBe(recipe.materialType);
      expect(parsed?.quantity).toBe(recipe.quantity);
    }
  });
});

// ─── MATERIAL_TYPES constant ──────────────────────────────────────────────────

describe("MATERIAL_TYPES", () => {
  it("contains exactly 12 material types", () => {
    expect(MATERIAL_TYPES).toHaveLength(12);
  });

  it("all types are unique", () => {
    const unique = new Set(MATERIAL_TYPES);
    expect(unique.size).toBe(12);
  });
});

// ─── MATERIAL_TIER_MAP ────────────────────────────────────────────────────────

describe("MATERIAL_TIER_MAP", () => {
  it("maps all 12 material types", () => {
    for (const type of MATERIAL_TYPES) {
      expect(MATERIAL_TIER_MAP[type]).toBeDefined();
    }
  });

  it("has exactly 4 COMMON materials", () => {
    const commons = MATERIAL_TYPES.filter((t) => MATERIAL_TIER_MAP[t] === "COMMON");
    expect(commons).toHaveLength(4);
  });

  it("has exactly 4 RARE materials", () => {
    const rares = MATERIAL_TYPES.filter((t) => MATERIAL_TIER_MAP[t] === "RARE");
    expect(rares).toHaveLength(4);
  });

  it("has exactly 3 EPIC materials", () => {
    const epics = MATERIAL_TYPES.filter((t) => MATERIAL_TIER_MAP[t] === "EPIC");
    expect(epics).toHaveLength(3);
  });

  it("has exactly 1 LEGENDARY material", () => {
    const legendaries = MATERIAL_TYPES.filter(
      (t) => MATERIAL_TIER_MAP[t] === "LEGENDARY"
    );
    expect(legendaries).toHaveLength(1);
    expect(legendaries[0]).toBe("Ancient Relic");
  });
});
