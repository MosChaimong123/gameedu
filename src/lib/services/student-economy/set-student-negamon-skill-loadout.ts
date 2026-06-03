import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import { validateNegamonSkillLoadout } from "@/lib/game-negamon/core/skill-unlock";

type Deps = { db: PrismaClient };

export type SetStudentNegamonSkillLoadoutResult =
    | { ok: true; negamonSkillLoadout: string[]; rejectedSkillIds: string[] }
    | {
          ok: false;
          reason: "student_not_found" | "negamon_disabled" | "no_monster" | "invalid_loadout";
          message?: string;
          rejectedSkillIds?: string[];
      };

function normalizeSkillIds(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => String(item).trim()).filter(Boolean);
}

export async function setStudentNegamonSkillLoadout(
    loginCode: string,
    rawSkillIds: unknown,
    deps: Deps = { db }
): Promise<SetStudentNegamonSkillLoadoutResult> {
    const student = await deps.db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(loginCode).map((candidate) => ({ loginCode: candidate })),
        },
        select: {
            id: true,
            name: true,
            behaviorPoints: true,
            negamonSkills: true,
            classroom: {
                select: {
                    gamifiedSettings: true,
                    levelConfig: true,
                },
            },
        },
    });
    if (!student) return { ok: false, reason: "student_not_found" };

    const negamon = getNegamonSettings(student.classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) return { ok: false, reason: "negamon_disabled" };

    const monster = createNegamonMonsterSnapshot({
        studentId: student.id,
        studentName: student.name,
        points: student.behaviorPoints,
        levelConfig: student.classroom.levelConfig as LevelConfigInput,
        negamonSettings: negamon,
        equippedSkillIds: Array.isArray(student.negamonSkills) ? student.negamonSkills : [],
    });
    if (!monster) return { ok: false, reason: "no_monster" };

    const requestedSkillIds = normalizeSkillIds(rawSkillIds);
    const validation = validateNegamonSkillLoadout({
        requestedSkillIds,
        unlockedSkills: monster.skillCatalog,
        fallbackToFirstSkills: requestedSkillIds.length === 0,
    });

    if (requestedSkillIds.length > 0 && validation.normalizedSkillIds.length === 0) {
        return {
            ok: false,
            reason: "invalid_loadout",
            message: "No requested skill can be equipped.",
            rejectedSkillIds: validation.rejectedSkillIds,
        };
    }

    await deps.db.student.update({
        where: { id: student.id },
        data: { negamonSkillLoadout: validation.normalizedSkillIds },
    });

    return {
        ok: true,
        negamonSkillLoadout: validation.normalizedSkillIds,
        rejectedSkillIds: validation.rejectedSkillIds,
    };
}
