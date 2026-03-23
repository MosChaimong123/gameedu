/**
 * Crafting System
 * Pure functions — no DB calls. All DB logic stays in the route.
 *
 * Tiers and required materials:
 *   COMMON    : 3 units of a Common-tier material  (Stone Fragment, Wolf Fang, Iron Ore, Forest Herb)
 *   RARE      : 3 units of a Rare-tier material    (Dragon Scale, Shadow Essence, Thunder Crystal, Void Shard)
 *   EPIC      : 3 units of an Epic-tier material   (Phoenix Feather, Abyssal Core, Celestial Dust)
 *   LEGENDARY : 5 units of Ancient Relic
 */

import { PrismaClient } from "@prisma/client";

// ─── Constants ────────────────────────────────────────────────────────────────

/** All 12 material types (Requirement 7.2) */
export const MATERIAL_TYPES = [
  "Stone Fragment",
  "Wolf Fang",
  "Iron Ore",
  "Forest Herb",
  "Dragon Scale",
  "Shadow Essence",
  "Thunder Crystal",
  "Void Shard",
  "Phoenix Feather",
  "Abyssal Core",
  "Celestial Dust",
  "Ancient Relic",
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

/** Maps each material type to its crafting tier */
export const MATERIAL_TIER_MAP: Record<MaterialType, string> = {
  "Stone Fragment": "COMMON",
  "Wolf Fang": "COMMON",
  "Iron Ore": "COMMON",
  "Forest Herb": "COMMON",
  "Dragon Scale": "RARE",
  "Shadow Essence": "RARE",
  "Thunder Crystal": "RARE",
  "Void Shard": "RARE",
  "Phoenix Feather": "EPIC",
  "Abyssal Core": "EPIC",
  "Celestial Dust": "EPIC",
  "Ancient Relic": "LEGENDARY",
};

/** Crafting requirements per target tier */
export const CRAFT_REQUIREMENTS: Record<
  string,
  { quantity: number; materials: MaterialType[] }
> = {
  COMMON: {
    quantity: 3,
    materials: ["Stone Fragment", "Wolf Fang", "Iron Ore", "Forest Herb"],
  },
  RARE: {
    quantity: 3,
    materials: [
      "Dragon Scale",
      "Shadow Essence",
      "Thunder Crystal",
      "Void Shard",
    ],
  },
  EPIC: {
    quantity: 3,
    materials: ["Phoenix Feather", "Abyssal Core", "Celestial Dust"],
  },
  LEGENDARY: {
    quantity: 5,
    materials: ["Ancient Relic"],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CraftingRecipe {
  tier: string;
  materialType: MaterialType;
  quantity: number;
  possibleItems: string[]; // item IDs or names
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Serialize a CraftingRecipe to a plain JSON-compatible object.
 */
export function serializeCraftingRecipe(
  recipe: CraftingRecipe
): Record<string, unknown> {
  return {
    tier: recipe.tier,
    materialType: recipe.materialType,
    quantity: recipe.quantity,
    possibleItems: [...recipe.possibleItems],
  };
}

/**
 * Parse and validate an unknown value into a CraftingRecipe.
 * Returns null if the input is invalid.
 */
export function parseCraftingRecipe(data: unknown): CraftingRecipe | null {
  if (typeof data !== "object" || data === null) return null;

  const obj = data as Record<string, unknown>;

  const tier = obj.tier;
  const materialType = obj.materialType;
  const quantity = obj.quantity;
  const possibleItems = obj.possibleItems;

  if (typeof tier !== "string") return null;
  if (typeof materialType !== "string") return null;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1)
    return null;
  if (!Array.isArray(possibleItems)) return null;
  if (!possibleItems.every((item) => typeof item === "string")) return null;

  // Validate materialType is one of the 12 known types
  if (!(MATERIAL_TYPES as readonly string[]).includes(materialType)) return null;

  // Validate tier is one of the 4 known tiers
  if (!["COMMON", "RARE", "EPIC", "LEGENDARY"].includes(tier)) return null;

  // Validate materialType belongs to the stated tier
  if (MATERIAL_TIER_MAP[materialType as MaterialType] !== tier) return null;

  return {
    tier,
    materialType: materialType as MaterialType,
    quantity,
    possibleItems: possibleItems as string[],
  };
}

/**
 * Returns all crafting recipes as serializable objects.
 * possibleItems is left empty here — the route fills it from the DB.
 */
export function getCraftingRecipes(): CraftingRecipe[] {
  const recipes: CraftingRecipe[] = [];

  for (const [tier, req] of Object.entries(CRAFT_REQUIREMENTS)) {
    for (const material of req.materials) {
      recipes.push({
        tier,
        materialType: material,
        quantity: req.quantity,
        possibleItems: [],
      });
    }
  }

  return recipes;
}

// ─── Atomic Craft Transaction ─────────────────────────────────────────────────

/**
 * Atomically deduct materials and create a StudentItem.
 * Picks a random item of the target tier from the Item catalog.
 *
 * Throws if:
 *  - materialType is invalid
 *  - student has insufficient quantity
 *  - no items of the target tier exist in the catalog
 */
export async function craftItem(
  studentId: string,
  materialType: string,
  quantity: number,
  prisma: PrismaClient
): Promise<{ studentItemId: string; itemId: string; itemName: string }> {
  // Validate material type
  if (!(MATERIAL_TYPES as readonly string[]).includes(materialType)) {
    throw new Error(`Invalid material type: ${materialType}`);
  }

  const targetTier = MATERIAL_TIER_MAP[materialType as MaterialType];
  const required = CRAFT_REQUIREMENTS[targetTier];

  if (!required) {
    throw new Error(`No crafting recipe for tier: ${targetTier}`);
  }

  if (quantity < required.quantity) {
    throw new Error(
      `Insufficient materials: need ${required.quantity} ${materialType}, got ${quantity}`
    );
  }

  // Check student's actual material record
  const materialRecord = await prisma.material.findUnique({
    where: { studentId_type: { studentId, type: materialType } },
  });

  if (!materialRecord || materialRecord.quantity < required.quantity) {
    throw new Error(
      `Insufficient materials: need ${required.quantity} ${materialType}`
    );
  }

  // Pick a random item of the target tier
  const items = await prisma.item.findMany({
    where: { tier: targetTier },
  });

  if (items.length === 0) {
    throw new Error(`No items of tier ${targetTier} found in catalog`);
  }

  const randomItem = items[Math.floor(Math.random() * items.length)];

  // Atomic transaction: deduct material + create StudentItem
  const newQuantity = materialRecord.quantity - required.quantity;

  const [, studentItem] = await prisma.$transaction([
    newQuantity <= 0
      ? prisma.material.delete({
          where: { id: materialRecord.id },
        })
      : prisma.material.update({
          where: { id: materialRecord.id },
          data: { quantity: newQuantity },
        }),
    prisma.studentItem.create({
      data: {
        studentId,
        itemId: randomItem.id,
        quantity: 1,
        enhancementLevel: 0,
        hp: randomItem.baseHp ?? 0,
        atk: randomItem.baseAtk ?? 0,
        def: randomItem.baseDef ?? 0,
        spd: randomItem.baseSpd ?? 0,
        crit: randomItem.baseCrit ?? 0,
        luck: randomItem.baseLuck ?? 0,
        mag: randomItem.baseMag ?? 0,
        mp: randomItem.baseMp ?? 0,
      },
    }),
  ]);

  return {
    studentItemId: studentItem.id,
    itemId: randomItem.id,
    itemName: randomItem.name,
  };
}
