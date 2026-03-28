"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRAFT_REQUIREMENTS = exports.MATERIAL_TIER_MAP = exports.MATERIAL_TYPES = void 0;
exports.serializeCraftingRecipe = serializeCraftingRecipe;
exports.parseCraftingRecipe = parseCraftingRecipe;
exports.getCraftingRecipes = getCraftingRecipes;
exports.craftItem = craftItem;
const student_item_stats_1 = require("./student-item-stats");
// ─── Constants ────────────────────────────────────────────────────────────────
/** All 12 material types (Requirement 7.2) */
exports.MATERIAL_TYPES = [
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
];
/** Maps each material type to its crafting tier */
exports.MATERIAL_TIER_MAP = {
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
exports.CRAFT_REQUIREMENTS = {
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
// ─── Serialization ────────────────────────────────────────────────────────────
/**
 * Serialize a CraftingRecipe to a plain JSON-compatible object.
 */
function serializeCraftingRecipe(recipe) {
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
function parseCraftingRecipe(data) {
    if (typeof data !== "object" || data === null)
        return null;
    const obj = data;
    const tier = obj.tier;
    const materialType = obj.materialType;
    const quantity = obj.quantity;
    const possibleItems = obj.possibleItems;
    if (typeof tier !== "string")
        return null;
    if (typeof materialType !== "string")
        return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1)
        return null;
    if (!Array.isArray(possibleItems))
        return null;
    if (!possibleItems.every((item) => typeof item === "string"))
        return null;
    // Validate materialType is one of the 12 known types
    if (!exports.MATERIAL_TYPES.includes(materialType))
        return null;
    // Validate tier is one of the 4 known tiers
    if (!["COMMON", "RARE", "EPIC", "LEGENDARY"].includes(tier))
        return null;
    // Validate materialType belongs to the stated tier
    if (exports.MATERIAL_TIER_MAP[materialType] !== tier)
        return null;
    return {
        tier,
        materialType: materialType,
        quantity,
        possibleItems: possibleItems,
    };
}
/**
 * Returns all crafting recipes as serializable objects.
 * possibleItems is left empty here — the route fills it from the DB.
 */
function getCraftingRecipes() {
    const recipes = [];
    for (const [tier, req] of Object.entries(exports.CRAFT_REQUIREMENTS)) {
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
async function craftItem(studentId, materialType, quantity, prisma) {
    // Validate material type
    if (!exports.MATERIAL_TYPES.includes(materialType)) {
        throw new Error(`Invalid material type: ${materialType}`);
    }
    const targetTier = exports.MATERIAL_TIER_MAP[materialType];
    const required = exports.CRAFT_REQUIREMENTS[targetTier];
    if (!required) {
        throw new Error(`No crafting recipe for tier: ${targetTier}`);
    }
    if (quantity < required.quantity) {
        throw new Error(`Insufficient materials: need ${required.quantity} ${materialType}, got ${quantity}`);
    }
    // Check student's actual material record
    const materialRecord = await prisma.material.findUnique({
        where: { studentId_type: { studentId, type: materialType } },
    });
    if (!materialRecord || materialRecord.quantity < required.quantity) {
        throw new Error(`Insufficient materials: need ${required.quantity} ${materialType}`);
    }
    // Pick a random item of the target tier
    const items = await prisma.item.findMany({
        where: { tier: targetTier },
    });
    if (items.length === 0) {
        throw new Error(`No items of tier ${targetTier} found in catalog`);
    }
    const randomItem = items[Math.floor(Math.random() * items.length)];
    // Atomic transaction: deduct material + merge crafted item into inventory
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
        prisma.studentItem.upsert({
            where: {
                studentId_itemId: {
                    studentId,
                    itemId: randomItem.id,
                },
            },
            update: {
                quantity: { increment: 1 },
            },
            create: {
                studentId,
                itemId: randomItem.id,
                quantity: 1,
                enhancementLevel: 0,
                ...(0, student_item_stats_1.buildStudentItemStatSnapshot)(randomItem, 0),
            },
        }),
    ]);
    return {
        studentItemId: studentItem.id,
        itemId: randomItem.id,
        itemName: randomItem.name,
    };
}
