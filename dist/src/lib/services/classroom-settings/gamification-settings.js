"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidGamificationSettingsError = void 0;
exports.normalizeGamificationSettings = normalizeGamificationSettings;
exports.getNegamonSettingsFromGamification = getNegamonSettingsFromGamification;
exports.getCustomAchievementsFromGamification = getCustomAchievementsFromGamification;
exports.getClassEventsFromGamification = getClassEventsFromGamification;
exports.getClassroomGamificationRecord = getClassroomGamificationRecord;
exports.getGamificationSettings = getGamificationSettings;
exports.updateGamificationSettings = updateGamificationSettings;
exports.updateClassroomGamificationSettingsById = updateClassroomGamificationSettingsById;
const zod_1 = require("zod");
const db_1 = require("@/lib/db");
const prisma_json_1 = require("@/lib/prisma-json");
const monsterTypeSchema = zod_1.z.enum([
    "FIRE",
    "WATER",
    "EARTH",
    "WIND",
    "THUNDER",
    "LIGHT",
    "DARK",
    "PSYCHIC",
]);
const moveCategorySchema = zod_1.z.enum(["PHYSICAL", "SPECIAL", "STATUS", "HEAL"]);
const statusEffectSchema = zod_1.z.enum([
    "BURN",
    "PARALYZE",
    "SLEEP",
    "POISON",
    "BOOST_ATK",
    "BOOST_DEF",
    "BOOST_SPD",
    "BOOST_WATER_DMG",
    "LOWER_ATK",
    "LOWER_ATK_ALL",
    "LOWER_DEF",
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
const negamonSettingsSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().optional(),
    allowStudentChoice: zod_1.z.boolean().optional(),
    expPerPoint: zod_1.z.number().optional(),
    expPerAttendance: zod_1.z.number().optional(),
    species: zod_1.z.array(monsterSpeciesSchema).optional(),
    studentMonsters: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    disabledMoves: zod_1.z.array(zod_1.z.string()).optional(),
});
const customAchievementSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    icon: zod_1.z.string(),
    goldReward: zod_1.z.number(),
    createdAt: zod_1.z.string().optional(),
});
const classEventSchema = zod_1.z.object({
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
const gamificationSettingsSchema = zod_1.z.object({
    negamon: negamonSettingsSchema.optional(),
    customAchievements: zod_1.z.array(customAchievementSchema).optional(),
    events: zod_1.z.array(classEventSchema).optional(),
}).catchall(zod_1.z.unknown());
class InvalidGamificationSettingsError extends Error {
    constructor(message = "Invalid gamification settings") {
        super(message);
        this.name = "InvalidGamificationSettingsError";
    }
}
exports.InvalidGamificationSettingsError = InvalidGamificationSettingsError;
function normalizeGamificationSettings(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    const parsed = gamificationSettingsSchema.safeParse(value);
    if (!parsed.success) {
        return {};
    }
    return parsed.data;
}
function getNegamonSettingsFromGamification(value) {
    const settings = normalizeGamificationSettings(value);
    const parsed = negamonSettingsSchema.safeParse(settings.negamon);
    if (!parsed.success) {
        return null;
    }
    return parsed.data;
}
function getCustomAchievementsFromGamification(value) {
    const settings = normalizeGamificationSettings(value);
    const parsed = zod_1.z.array(customAchievementSchema).safeParse(settings.customAchievements);
    if (!parsed.success) {
        return [];
    }
    return parsed.data;
}
function getClassEventsFromGamification(value) {
    const settings = normalizeGamificationSettings(value);
    const parsed = zod_1.z.array(classEventSchema).safeParse(settings.events);
    if (!parsed.success) {
        return [];
    }
    return parsed.data;
}
async function getClassroomGamificationRecord(classroomId, deps = { db: db_1.db }) {
    const classroom = await deps.db.classroom.findUnique({
        where: {
            id: classroomId,
        },
        select: {
            teacherId: true,
            gamifiedSettings: true,
        },
    });
    if (!classroom)
        return null;
    return {
        teacherId: classroom.teacherId,
        gamifiedSettings: normalizeGamificationSettings(classroom.gamifiedSettings),
    };
}
async function getGamificationSettings(classroomId, teacherId, deps = { db: db_1.db }) {
    const classroom = await deps.db.classroom.findUnique({
        where: {
            id: classroomId,
            teacherId,
        },
        select: {
            gamifiedSettings: true,
        },
    });
    if (!classroom)
        return null;
    return normalizeGamificationSettings(classroom.gamifiedSettings);
}
async function updateGamificationSettings(classroomId, teacherId, gamifiedSettings, deps = { db: db_1.db }) {
    if (!gamifiedSettings || typeof gamifiedSettings !== "object" || Array.isArray(gamifiedSettings)) {
        throw new InvalidGamificationSettingsError("gamifiedSettings must be an object");
    }
    const parsed = gamificationSettingsSchema.safeParse(gamifiedSettings);
    if (!parsed.success) {
        throw new InvalidGamificationSettingsError("gamifiedSettings has an invalid structure");
    }
    return deps.db.classroom.update({
        where: {
            id: classroomId,
            teacherId,
        },
        data: {
            gamifiedSettings: (0, prisma_json_1.toPrismaJson)(parsed.data),
        },
        select: {
            gamifiedSettings: true,
        },
    });
}
async function updateClassroomGamificationSettingsById(classroomId, gamifiedSettings, deps = { db: db_1.db }) {
    if (!gamifiedSettings || typeof gamifiedSettings !== "object" || Array.isArray(gamifiedSettings)) {
        throw new InvalidGamificationSettingsError("gamifiedSettings must be an object");
    }
    const parsed = gamificationSettingsSchema.safeParse(gamifiedSettings);
    if (!parsed.success) {
        throw new InvalidGamificationSettingsError("gamifiedSettings has an invalid structure");
    }
    return deps.db.classroom.update({
        where: {
            id: classroomId,
        },
        data: {
            gamifiedSettings: (0, prisma_json_1.toPrismaJson)(parsed.data),
        },
        select: {
            gamifiedSettings: true,
        },
    });
}
