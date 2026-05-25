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

/** Teacher deletes a student's quiz submission so they can retake. */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const { id, assignmentId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = (await req.json()) as { studentId?: unknown };
        const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
        if (!studentId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing studentId", 400);
        }

        const assignment = await db.assignment.findFirst({
            where: {
                id: assignmentId,
                classId: id,
                type: "quiz",
                classroom: { teacherId: session.user.id },
            },
            select: { id: true },
        });
        if (!assignment) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const student = await db.student.findFirst({
            where: { id: studentId, classId: id },
            select: { id: true },
        });
        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found in this class", 404);
        }

        const deleted = await db.assignmentSubmission.deleteMany({
            where: { studentId, assignmentId },
        });

        return NextResponse.json({ ok: true, deleted: deleted.count > 0 });
    } catch (error) {
        console.error("[QUIZ_SUBMISSION_RESET]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
