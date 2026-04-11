import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { NEGAMON_PASSIVES } from "@/lib/negamon-passives";

type UnlockStudentNegamonSkillDeps = {
    db: PrismaClient;
};

export type UnlockStudentNegamonSkillResult =
    | { ok: false; reason: "invalid_payload" }
    | { ok: false; reason: "skill_not_found" }
    | { ok: false; reason: "student_not_found" }
    | { ok: false; reason: "already_unlocked" }
    | { ok: false; reason: "not_enough_gold" }
    | { ok: true; success: true; newGold: number; negamonSkills: unknown };

export async function unlockStudentNegamonSkill(
    code: string,
    skillId: unknown,
    deps: UnlockStudentNegamonSkillDeps = { db }
): Promise<UnlockStudentNegamonSkillResult> {
    if (typeof skillId !== "string" || !skillId.trim()) {
        return { ok: false, reason: "invalid_payload" };
    }

    const passive = NEGAMON_PASSIVES.find((entry) => entry.id === skillId);
    if (!passive) {
        return { ok: false, reason: "skill_not_found" };
    }

    const student = await deps.db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
        },
        select: { id: true, gold: true, negamonSkills: true },
    });

    if (!student) {
        return { ok: false, reason: "student_not_found" };
    }

    const skills = student.negamonSkills as string[];
    if (skills.includes(skillId)) {
        return { ok: false, reason: "already_unlocked" };
    }

    if (student.gold < passive.cost) {
        return { ok: false, reason: "not_enough_gold" };
    }

    const updated = await deps.db.student.update({
        where: { id: student.id },
        data: {
            gold: { decrement: passive.cost },
            negamonSkills: { push: skillId },
        },
        select: { gold: true, negamonSkills: true },
    });

    return {
        ok: true,
        success: true,
        newGold: updated.gold,
        negamonSkills: updated.negamonSkills,
    };
}
