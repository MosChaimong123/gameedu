import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/prisma-json";
import type { NegamonSettings } from "@/lib/types/negamon";

type GamificationSettingsDeps = {
    db: PrismaClient;
};

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

const negamonSettingsSchema = z.object({
    enabled: z.boolean().optional(),
    allowStudentChoice: z.boolean().optional(),
    expPerPoint: z.number().optional(),
    expPerAttendance: z.number().optional(),
    species: z.array(monsterSpeciesSchema).optional(),
    studentMonsters: z.record(z.string(), z.string()).optional(),
    disabledMoves: z.array(z.string()).optional(),
});

const customAchievementSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    icon: z.string(),
    goldReward: z.number(),
    createdAt: z.string().optional(),
});

const classEventSchema = z.object({
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


export type GamificationClassEvent = {
    id: string;
    title: string;
    description?: string;
    icon: string;
    type: "GOLD_BOOST" | "GOLD_BOOST_3" | "DOUBLE_QUEST" | "CUSTOM";
    multiplier: number;
    startAt: string;
    endAt: string;
    active?: boolean;
};

export function getNegamonSettingsFromGamification(value: unknown): NegamonSettings | null {
    const settings = normalizeGamificationSettings(value);
    const parsed = negamonSettingsSchema.safeParse(settings.negamon);
    if (!parsed.success) {
        return null;
    }
    return parsed.data as NegamonSettings;
}

export type CustomAchievement = z.infer<typeof customAchievementSchema>;

export function getCustomAchievementsFromGamification(value: unknown): CustomAchievement[] {
    const settings = normalizeGamificationSettings(value);
    const parsed = z.array(customAchievementSchema).safeParse(settings.customAchievements);
    if (!parsed.success) {
        return [];
    }
    return parsed.data;
}

export function getClassEventsFromGamification(value: unknown): GamificationClassEvent[] {
    const settings = normalizeGamificationSettings(value);
    const parsed = z.array(classEventSchema).safeParse(settings.events);
    if (!parsed.success) {
        return [];
    }
    return parsed.data;
}

export type ClassroomGamificationRecord = {

    teacherId?: string;
    gamifiedSettings: Record<string, unknown>;
};

export async function getClassroomGamificationRecord(
    classroomId: string,
    deps: GamificationSettingsDeps = { db }
): Promise<ClassroomGamificationRecord | null> {
    const classroom = await deps.db.classroom.findUnique({
        where: {
            id: classroomId,
        },
        select: {
            teacherId: true,
            gamifiedSettings: true,
        },
    });

    if (!classroom) return null;

    return {
        teacherId: classroom.teacherId,
        gamifiedSettings: normalizeGamificationSettings(classroom.gamifiedSettings),
    };
}

export async function getGamificationSettings(
    classroomId: string,
    teacherId: string,
    deps: GamificationSettingsDeps = { db }
): Promise<Record<string, unknown> | null> {
    const classroom = await deps.db.classroom.findUnique({
        where: {
            id: classroomId,
            teacherId,
        },
        select: {
            gamifiedSettings: true,
        },
    });

    if (!classroom) return null;
    return normalizeGamificationSettings(classroom.gamifiedSettings);
}

export async function updateGamificationSettings(
    classroomId: string,
    teacherId: string,
    gamifiedSettings: unknown,
    deps: GamificationSettingsDeps = { db }
) {
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
            gamifiedSettings: toPrismaJson(parsed.data),
        },
        select: {
            gamifiedSettings: true,
        },
    });
}

export async function updateClassroomGamificationSettingsById(
    classroomId: string,
    gamifiedSettings: unknown,
    deps: GamificationSettingsDeps = { db }
) {
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
            gamifiedSettings: toPrismaJson(parsed.data),
        },
        select: {
            gamifiedSettings: true,
        },
    });
}
