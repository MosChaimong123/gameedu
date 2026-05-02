import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/prisma-json";
import type { NegamonSettings } from "@/lib/types/negamon";
import {
    classEventSchema,
    customAchievementSchema,
    gamificationSettingsSchema,
    InvalidGamificationSettingsError,
    negamonSettingsSchema,
    normalizeGamificationSettings,
} from "@/lib/services/classroom-settings/gamification-settings-schema";

export {
    gamificationSettingsSchema,
    InvalidGamificationSettingsError,
    normalizeGamificationSettings,
} from "@/lib/services/classroom-settings/gamification-settings-schema";

type GamificationSettingsDeps = {
    db: PrismaClient;
};

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
