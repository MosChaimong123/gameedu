import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    createAppErrorResponse,
    AUTH_REQUIRED_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
} from "@/lib/api-error";
import { logAuditEvent } from "@/lib/security/audit-log";
import { resetClassroomPoints } from "@/lib/services/classroom-points/reset-classroom-points";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!session.user.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    try {
        const result = await resetClassroomPoints({
            classroomId: id,
            teacherId: session.user.id,
        });

        if (!result.ok) {
            return createAppErrorResponse("AUTH_REQUIRED", result.message, result.status);
        }

        logAuditEvent({
            actorUserId: session.user.id,
            action: "classroom.points.reset",
            targetType: "classroom",
            targetId: id,
            metadata: {
                studentsResetCount: result.studentsResetCount,
                activitiesDeletedCount: result.activitiesDeletedCount,
            },
        });

        return NextResponse.json({
            success: true,
            classroomId: result.classroomId,
            studentsResetCount: result.studentsResetCount,
            activitiesDeletedCount: result.activitiesDeletedCount,
        });

    } catch (error) {
        console.error("[POINTS_RESET_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
