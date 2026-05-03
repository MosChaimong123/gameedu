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
import {
    InvalidClassroomBasicUpdateError,
    type ClassroomBasicUpdateInput,
    updateClassroomBasics,
} from "@/lib/services/classroom-settings/update-classroom-basics";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function GET(
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
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id as string,
            },
            include: {
                students: {
                    orderBy: { name: "asc" },
                    include: {
                        submissions: true,
                    },
                },
                skills: true,
                assignments: {
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        });

        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        return NextResponse.json(classroom);
    } catch (error) {
        console.error("[CLASSROOM_GET]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function DELETE(
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
        const classroom = await db.classroom.delete({
            where: {
                id,
                teacherId: session.user.id as string,
            },
        });

        return NextResponse.json(classroom);
    } catch (error) {
        console.error("[CLASSROOM_DELETE]", error);
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2025"
        ) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function PATCH(
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
        const body = await req.json() as ClassroomBasicUpdateInput;
        const classroom = await updateClassroomBasics({
            classroomId: id,
            teacherId: session.user.id as string,
            body,
        });

        return NextResponse.json(classroom);
    } catch (error) {
        if (error instanceof InvalidClassroomBasicUpdateError) {
            return createAppErrorResponse("INVALID_PAYLOAD", error.message, 400);
        }

        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2025"
        ) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        console.error("[CLASSROOM_PATCH]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
