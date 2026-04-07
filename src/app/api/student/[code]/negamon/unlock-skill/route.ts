import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { NEGAMON_PASSIVES } from "@/lib/negamon-passives";
import { createAppErrorResponse } from "@/lib/api-error";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const { skillId } = (await req.json()) as { skillId?: unknown };

    if (typeof skillId !== "string" || !skillId.trim()) {
        return createAppErrorResponse("INVALID_PAYLOAD", "Missing skillId", 400);
    }

    const passive = NEGAMON_PASSIVES.find((p) => p.id === skillId);
    if (!passive) {
        return createAppErrorResponse("NEGAMON_PASSIVE_NOT_FOUND", "Skill not found", 404);
    }

    const student = await db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((c) => ({ loginCode: c })),
        },
        select: { id: true, gold: true, negamonSkills: true },
    });
    if (!student) {
        return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
    }

    const skills = student.negamonSkills as string[];

    if (skills.includes(skillId)) {
        return createAppErrorResponse("NEGAMON_PASSIVE_ALREADY_UNLOCKED", "Already unlocked", 409);
    }
    if (student.gold < passive.cost) {
        return createAppErrorResponse("NOT_ENOUGH_GOLD", "Not enough gold", 400);
    }

    const updated = await db.student.update({
        where: { id: student.id },
        data: {
            gold: { decrement: passive.cost },
            negamonSkills: { push: skillId },
        },
        select: { gold: true, negamonSkills: true },
    });

    return NextResponse.json({
        success: true,
        newGold: updated.gold,
        negamonSkills: updated.negamonSkills,
    });
}
