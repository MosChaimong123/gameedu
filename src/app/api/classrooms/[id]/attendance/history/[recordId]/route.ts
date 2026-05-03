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

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; recordId: string }> }
) {
    const { id, recordId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = await req.json();
        const { status } = body;

        if (!status) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Status is required", 400);
        }

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

        const existingRecord = await db.attendanceRecord.findUnique({
            where: {
                id: recordId,
            },
            select: {
                id: true,
                classId: true,
                studentId: true,
            },
        });

        if (!existingRecord || existingRecord.classId !== id) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const updatedRecord = await db.attendanceRecord.update({
            where: {
                id: recordId,
            },
            data: {
                status
            }
        });

        await db.student.update({
            where: { id: updatedRecord.studentId },
            data: { attendance: status }
        });

        return NextResponse.json(updatedRecord);
    } catch (error) {
        console.error("[ATTENDANCE_RECORD_PATCH]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
