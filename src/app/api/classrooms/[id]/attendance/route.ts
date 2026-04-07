import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";
import {
    saveClassroomAttendance,
    type AttendanceUpdateInput,
} from "@/lib/services/classroom-attendance/save-classroom-attendance";

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
        const updates = body.updates as AttendanceUpdateInput[] | undefined;

        if (!updates) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Invalid data", 400);
        }

        const result = await saveClassroomAttendance({
            classroomId: id,
            teacherId: session.user.id,
            updates,
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
            savedCount: result.savedCount,
        });

    } catch (error) {
        console.error("[ATTENDANCE_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error", 500);
    }
}
