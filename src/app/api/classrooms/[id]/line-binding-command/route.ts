import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { getLineClassroomBindingSecret } from "@/lib/line-bot/config";
import { encodeLineClassroomBindingToken } from "@/lib/line-bot/classroom-binding-token";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { NextResponse } from "next/server";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const bindingSecret = getLineClassroomBindingSecret();
    if (!bindingSecret) {
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }

    const classroom = await db.classroom.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            teacherId: true,
        },
    });

    if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    if (classroom.teacherId !== session.user.id) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const { token, expiresAt } = encodeLineClassroomBindingToken(classroom.id, bindingSecret);

    return NextResponse.json({
        classroomId: classroom.id,
        classroomName: classroom.name,
        command: `ผูกห้อง ${token}`,
        expiresAt,
    });
}
