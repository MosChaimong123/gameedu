import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    CLASSROOM_POINTS_MISSING_DATA,
    awardSingleClassroomPoint,
} from "@/lib/services/classroom-points/award-classroom-points";
import { AUTH_REQUIRED_MESSAGE, INTERNAL_ERROR_MESSAGE, createAppErrorResponse } from "@/lib/api-error";

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
        const body = await req.json();
        const { studentId, skillId } = body;

        if (!studentId || !skillId) {
            return createAppErrorResponse("INVALID_PAYLOAD", CLASSROOM_POINTS_MISSING_DATA, 400);
        }

        const result = await awardSingleClassroomPoint({
            classroomId: id,
            teacherId: session.user.id,
            studentId,
            skillId,
        });

        if (!result.ok) {
            const code = result.status === 400
                ? "INVALID_PAYLOAD"
                : result.status === 404
                    ? "NOT_FOUND"
                    : "AUTH_REQUIRED";
            return createAppErrorResponse(code, result.message, result.status);
        }

        return NextResponse.json({
            success: true,
            classroomId: result.classroomId,
            skillWeight: result.skillWeight,
            updatedStudents: result.updatedStudents,
        });

    } catch (error) {
        console.error("[POINTS_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
