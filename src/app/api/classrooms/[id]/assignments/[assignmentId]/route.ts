import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import {
    deleteClassroomAssignment,
    updateClassroomAssignment,
} from "@/lib/services/assignments/update-classroom-assignment";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, assignmentId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const result = await updateClassroomAssignment({
            teacherId: session.user.id,
            classroomId: resolvedParams.id,
            assignmentId: resolvedParams.assignmentId,
            body: (await req.json()) as Record<string, unknown>,
        });
        if (!result.ok && result.reason === "classroom_forbidden") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }
        if (!result.ok && result.reason === "assignment_not_found") {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }
        if (!result.ok && result.reason === "quiz_requires_question_set") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Quiz requires a question set", 400);
        }
        if (!result.ok && result.reason === "invalid_worksheet") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Worksheet data is invalid", 400);
        }
        if (!result.ok && result.reason === "invalid_quiz_review_mode") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Invalid quizReviewMode", 400);
        }
        if (!result.ok && result.reason === "question_set_not_found") {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        return NextResponse.json(result.assignment);
    } catch (error) {
        console.error("[ASSIGNMENT_PATCH]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, assignmentId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const result = await deleteClassroomAssignment({
            teacherId: session.user.id,
            classroomId: resolvedParams.id,
            assignmentId: resolvedParams.assignmentId,
        });
        if (!result.ok && result.reason === "classroom_forbidden") {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }
        if (!result.ok && result.reason === "assignment_not_found") {
             return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[ASSIGNMENT_DELETE]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
