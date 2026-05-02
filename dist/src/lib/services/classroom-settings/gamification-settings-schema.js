"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidGamificationSettingsError = exports.gamificationSettingsSchema = exports.classEventSchema = exports.customAchievementSchema = exports.negamonSettingsSchema = void 0;
exports.normalizeGamificationSettings = normalizeGamificationSettings;
const zod_1 = require("zod");
const monsterTypeSchema = zod_1.z.enum([
    "NORMAL",
    "FIRE",
    "WATER",
    "EARTH",
    "WIND",
    "THUNDER",
    "LIGHT",
    "DARK",
]);
const moveCategorySchema = zod_1.z.enum(["PHYSICAL", "SPECIAL", "STATUS", "HEAL"]);
const statusEffectSchema = zod_1.z.enum([
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
const monsterBaseStatsSchema = zod_1.z.object({
    hp: zod_1.z.number(),
    atk: zod_1.z.number(),
    def: zod_1.z.number(),
    spd: zod_1.z.number(),
});
const monsterMoveSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: monsterTypeSchema,
    category: moveCategorySchema,
    power: zod_1.z.number(),
    accuracy: zod_1.z.number(),
    learnRank: zod_1.z.number(),
    effect: statusEffectSchema.optional(),
    effectChance: zod_1.z.number().optional(),
    effectDurationTurns: zod_1.z.number().optional(),
    effectParalyzeFullSkip: zod_1.z.boolean().optional(),
    effectBurnDotRate: zod_1.z.number().optional(),
    effectRegenPenalty: zod_1.z.number().optional(),
    effectIgnoreDefRetained: zod_1.z.number().optional(),
    drainPct: zod_1.z.number().optional(),
    energyCost: zod_1.z.number().optional(),
    selfEffect: statusEffectSchema.optional(),
    selfEffectDurationTurns: zod_1.z.number().optional(),
});
const monsterFormSchema = zod_1.z.object({
    rank: zod_1.z.number(),
    name: zod_1.z.string(),
    icon: zod_1.z.string(),
    color: zod_1.z.string(),
});
const monsterSpeciesSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: monsterTypeSchema,
    type2: monsterTypeSchema.optional(),
    baseStats: monsterBaseStatsSchema,
    forms: zod_1.z.array(monsterFormSchema),
    moves: zod_1.z.array(monsterMoveSchema),
});
exports.negamonSettingsSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().optional(),
    allowStudentChoice: zod_1.z.boolean().optional(),
    expPerPoint: zod_1.z.number().optional(),
    expPerAttendance: zod_1.z.number().optional(),
    species: zod_1.z.array(monsterSpeciesSchema).optional(),
    studentMonsters: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    disabledMoves: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.customAchievementSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    icon: zod_1.z.string(),
    goldReward: zod_1.z.number(),
    createdAt: zod_1.z.string().optional(),
});
exports.classEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    icon: zod_1.z.string(),
    type: zod_1.z.enum(["GOLD_BOOST", "GOLD_BOOST_3", "DOUBLE_QUEST", "CUSTOM"]),
    multiplier: zod_1.z.number(),
    startAt: zod_1.z.string(),
    endAt: zod_1.z.string(),
    active: zod_1.z.boolean().optional(),
});
exports.gamificationSettingsSchema = zod_1.z.object({
    negamon: exports.negamonSettingsSchema.optional(),
    customAchievements: zod_1.z.array(exports.customAchievementSchema).optional(),
    events: zod_1.z.array(exports.classEventSchema).optional(),
}).catchall(zod_1.z.unknown());
class InvalidGamificationSettingsError extends Error {
    constructor(message = "Invalid gamification settings") {
        super(message);
        this.name = "InvalidGamificationSettingsError";
    }
}
exports.InvalidGamificationSettingsError = InvalidGamificationSettingsError;
/** Safe subset of gamified settings that passes Zod (client-safe; no Prisma). */
function normalizeGamificationSettings(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    const parsed = exports.gamificationSettingsSchema.safeParse(value);
    if (!parsed.success) {
        return {};
    }
    return parsed.data;
}
