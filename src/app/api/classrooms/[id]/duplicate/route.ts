import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/security/audit-log";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

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
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        // Get the original classroom
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
            return new NextResponse("Not Found", { status: 404 });
        }

        const sourceSkills = originalClassroom.skills as OriginalSkill[];
        const sourceAssignments = originalClassroom.assignments as OriginalAssignment[];

        // Generate unique name for duplicate
        const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const newName = `${originalClassroom.name} (Copy - ${timestamp})`;

        // Create new classroom with same settings but no students
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
                // Copy skills
                skills: {
                    create: sourceSkills.map((skill) => ({
                        name: skill.name,
                        type: skill.type,
                        weight: skill.weight,
                        icon: skill.icon
                    }))
                },
                // Copy assignments
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}
