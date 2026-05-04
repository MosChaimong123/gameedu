import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    CLASSROOM_POINTS_MISSING_DATA,
    awardBatchClassroomPoints,
} from "@/lib/services/classroom-points/award-classroom-points";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { logAuditEvent } from "@/lib/security/audit-log";

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
    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = await req.json();
        const { studentIds, skillId } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !skillId) {
            return createAppErrorResponse("INVALID_PAYLOAD", CLASSROOM_POINTS_MISSING_DATA, 400);
        }

        const result = await awardBatchClassroomPoints({
            classroomId: id,
            teacherId: session.user.id,
            studentIds,
            skillId,
        });

        if (!result.ok) {
            const code = result.status === 400
                ? "INVALID_PAYLOAD"
                : result.status === 403
                    ? "FORBIDDEN"
                : result.status === 404
                    ? "NOT_FOUND"
                    : "INTERNAL_ERROR";
            return createAppErrorResponse(code, result.message, result.status);
        }

        logAuditEvent({
            actorUserId: session.user.id,
            action: "classroom.points.batch_awarded",
            targetType: "classroom",
            targetId: result.classroomId,
            metadata: {
                classroomId: result.classroomId,
                skillId: result.skillId,
                skillName: result.skillName,
                skillWeight: result.skillWeight,
                awardedCount: result.updatedStudents.length,
                studentIds: result.updatedStudents.map((student) => student.id),
            },
        });

        return NextResponse.json({
            success: true,
            classroomId: result.classroomId,
            skillWeight: result.skillWeight,
            updatedStudents: result.updatedStudents,
        });

    } catch (error) {
        console.error("[POINTS_BATCH_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
