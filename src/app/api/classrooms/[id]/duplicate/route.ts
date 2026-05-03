import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type OriginalSkill = {
    name: string;
    type: string;
    weight: number;
    icon: string | null;
};
type OriginalAssignment = {
    name: string;
    description: string | null;
    order: number;
};

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const originalClassroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id as string
            },
            include: {
                skills: true,
                assignments: true
            }
        });

        if (!originalClassroom) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const sourceSkills = originalClassroom.skills as OriginalSkill[];
        const sourceAssignments = originalClassroom.assignments as OriginalAssignment[];

        const timestamp = new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        const newName = `${originalClassroom.name} (Copy - ${timestamp})`;

        const duplicatedClassroom = await db.classroom.create({
            data: {
                name: newName,
                teacherId: session.user.id as string,
                emoji: originalClassroom.emoji,
                theme: originalClassroom.theme,
                grade: originalClassroom.grade,
                gamifiedSettings: originalClassroom.gamifiedSettings,
                levelConfig: originalClassroom.levelConfig,
                quizReviewMode: originalClassroom.quizReviewMode ?? null,
                skills: {
                    create: sourceSkills.map((skill) => ({
                        name: skill.name,
                        type: skill.type,
                        weight: skill.weight,
                        icon: skill.icon
                    }))
                },
                assignments: {
                    create: sourceAssignments.map((assignment) => ({
                        name: assignment.name,
                        description: assignment.description,
                        order: assignment.order
                    }))
                }
            },
            include: {
                skills: true,
                assignments: true
            }
        });

        logAuditEvent({
            actorUserId: session.user.id,
            action: "classroom.duplicated",
            targetType: "classroom",
            targetId: duplicatedClassroom.id,
            metadata: {
                sourceClassroomId: id,
                duplicatedName: duplicatedClassroom.name,
            },
        });

        return NextResponse.json({
            success: true,
            classroom: duplicatedClassroom
        });
    } catch (error) {
        console.error("[CLASSROOM_DUPLICATE]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
