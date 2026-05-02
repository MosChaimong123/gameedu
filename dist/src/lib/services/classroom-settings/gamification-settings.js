"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGamificationSettings = exports.InvalidGamificationSettingsError = exports.gamificationSettingsSchema = void 0;
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
const gamification_settings_schema_1 = require("@/lib/services/classroom-settings/gamification-settings-schema");
var gamification_settings_schema_2 = require("@/lib/services/classroom-settings/gamification-settings-schema");
Object.defineProperty(exports, "gamificationSettingsSchema", { enumerable: true, get: function () { return gamification_settings_schema_2.gamificationSettingsSchema; } });
Object.defineProperty(exports, "InvalidGamificationSettingsError", { enumerable: true, get: function () { return gamification_settings_schema_2.InvalidGamificationSettingsError; } });
Object.defineProperty(exports, "normalizeGamificationSettings", { enumerable: true, get: function () { return gamification_settings_schema_2.normalizeGamificationSettings; } });
function getNegamonSettingsFromGamification(value) {
    const settings = (0, gamification_settings_schema_1.normalizeGamificationSettings)(value);
    const parsed = gamification_settings_schema_1.negamonSettingsSchema.safeParse(settings.negamon);
    if (!parsed.success) {
        return null;
    }
    return parsed.data;
}
function getCustomAchievementsFromGamification(value) {
    const settings = (0, gamification_settings_schema_1.normalizeGamificationSettings)(value);
    const parsed = zod_1.z.array(gamification_settings_schema_1.customAchievementSchema).safeParse(settings.customAchievements);
    if (!parsed.success) {
        return [];
    }
    return parsed.data;
}
function getClassEventsFromGamification(value) {
    const settings = (0, gamification_settings_schema_1.normalizeGamificationSettings)(value);
    const parsed = zod_1.z.array(gamification_settings_schema_1.classEventSchema).safeParse(settings.events);
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
        gamifiedSettings: (0, gamification_settings_schema_1.normalizeGamificationSettings)(classroom.gamifiedSettings),
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
    return (0, gamification_settings_schema_1.normalizeGamificationSettings)(classroom.gamifiedSettings);
}
async function updateGamificationSettings(classroomId, teacherId, gamifiedSettings, deps = { db: db_1.db }) {
    if (!gamifiedSettings || typeof gamifiedSettings !== "object" || Array.isArray(gamifiedSettings)) {
        throw new gamification_settings_schema_1.InvalidGamificationSettingsError("gamifiedSettings must be an object");
    }
    const parsed = gamification_settings_schema_1.gamificationSettingsSchema.safeParse(gamifiedSettings);
    if (!parsed.success) {
        throw new gamification_settings_schema_1.InvalidGamificationSettingsError("gamifiedSettings has an invalid structure");
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
        throw new gamification_settings_schema_1.InvalidGamificationSettingsError("gamifiedSettings must be an object");
    }
    const parsed = gamification_settings_schema_1.gamificationSettingsSchema.safeParse(gamifiedSettings);
    if (!parsed.success) {
        throw new gamification_settings_schema_1.InvalidGamificationSettingsError("gamifiedSettings has an invalid structure");
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
