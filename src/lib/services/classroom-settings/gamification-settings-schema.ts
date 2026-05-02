import { z } from "zod";

const monsterTypeSchema = z.enum([
    "NORMAL",
    "FIRE",
    "WATER",
    "EARTH",
    "WIND",
    "THUNDER",
    "LIGHT",
    "DARK",
]);

const moveCategorySchema = z.enum(["PHYSICAL", "SPECIAL", "STATUS", "HEAL"]);

const statusEffectSchema = z.enum([
    "BURN",
    "PARALYZE",
    "SLEEP",
    "POISON",
    "BADLY_POISON",
    "FREEZE",
    "CONFUSE",
    "BOOST_ATK",
    "BOOST_DEF",
    "BOOST_DEF_20",
    "BOOST_SPD",
    "BOOST_SPD_30",
    "BOOST_SPD_100",
    "BOOST_WATER_DMG",
    "LOWER_ATK",
    "LOWER_ATK_ALL",
    "LOWER_DEF",
    "LOWER_SPD",
    "LOWER_EN_REGEN",
    "HEAL_25",
    "IGNORE_DEF",
]);

const monsterBaseStatsSchema = z.object({
    hp: z.number(),
    atk: z.number(),
    def: z.number(),
    spd: z.number(),
});

const monsterMoveSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: monsterTypeSchema,
    category: moveCategorySchema,
    power: z.number(),
    accuracy: z.number(),
    learnRank: z.number(),
    effect: statusEffectSchema.optional(),
    effectChance: z.number().optional(),
    effectDurationTurns: z.number().optional(),
    effectParalyzeFullSkip: z.boolean().optional(),
    effectBurnDotRate: z.number().optional(),
    effectRegenPenalty: z.number().optional(),
    effectIgnoreDefRetained: z.number().optional(),
    drainPct: z.number().optional(),
    energyCost: z.number().optional(),
    selfEffect: statusEffectSchema.optional(),
    selfEffectDurationTurns: z.number().optional(),
});

const monsterFormSchema = z.object({
    rank: z.number(),
    name: z.string(),
    icon: z.string(),
    color: z.string(),
});

const monsterSpeciesSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: monsterTypeSchema,
    type2: monsterTypeSchema.optional(),
    baseStats: monsterBaseStatsSchema,
    forms: z.array(monsterFormSchema),
    moves: z.array(monsterMoveSchema),
});

export const negamonSettingsSchema = z.object({
    enabled: z.boolean().optional(),
    allowStudentChoice: z.boolean().optional(),
    expPerPoint: z.number().optional(),
    expPerAttendance: z.number().optional(),
    species: z.array(monsterSpeciesSchema).optional(),
    studentMonsters: z.record(z.string(), z.string()).optional(),
    disabledMoves: z.array(z.string()).optional(),
});

export const customAchievementSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    icon: z.string(),
    goldReward: z.number(),
    createdAt: z.string().optional(),
});

export const classEventSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    icon: z.string(),
    type: z.enum(["GOLD_BOOST", "GOLD_BOOST_3", "DOUBLE_QUEST", "CUSTOM"]),
    multiplier: z.number(),
    startAt: z.string(),
    endAt: z.string(),
    active: z.boolean().optional(),
});

export const gamificationSettingsSchema = z.object({
    negamon: negamonSettingsSchema.optional(),
    customAchievements: z.array(customAchievementSchema).optional(),
    events: z.array(classEventSchema).optional(),
}).catchall(z.unknown());

export class InvalidGamificationSettingsError extends Error {
    constructor(message = "Invalid gamification settings") {
        super(message);
        this.name = "InvalidGamificationSettingsError";
    }
}

/** Safe subset of gamified settings that passes Zod (client-safe; no Prisma). */
export function normalizeGamificationSettings(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    const parsed = gamificationSettingsSchema.safeParse(value);
    if (!parsed.success) {
        return {};
    }

    return parsed.data as Record<string, unknown>;
}
