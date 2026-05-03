import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; skillId: string }> }
) {
    const { id, skillId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            },
            select: { id: true },
        });

        if (!classroom) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const existingSkill = await db.skill.findUnique({
            where: {
                id: skillId,
            },
            select: {
                id: true,
                classId: true,
            },
        });

        if (!existingSkill || existingSkill.classId !== id) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const skill = await db.skill.delete({
            where: {
                id: skillId,
            }
        });

        return NextResponse.json(skill);
    } catch (error) {
        console.error("[SKILL_DELETE]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
