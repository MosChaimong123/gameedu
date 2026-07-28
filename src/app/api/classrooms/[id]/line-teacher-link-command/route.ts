import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { buildTeacherLineLinkCommand, getOrCreateTeacherLineLinkCode } from "@/lib/line-bot/teacher-linking";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const { id } = await params;
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const classroom = await db.classroom.findUnique({
        where: { id },
        select: { id: true, name: true, teacherId: true },
    });
    if (!classroom) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    if (session.user.role !== "ADMIN" && classroom.teacherId !== session.user.id) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const linkCode = await getOrCreateTeacherLineLinkCode({
        userId: session.user.id,
        classroomId: classroom.id,
    });
    if (!linkCode) return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);

    return NextResponse.json({
        classroomId: classroom.id,
        classroomName: classroom.name,
        command: buildTeacherLineLinkCommand(linkCode.code),
        expiresAt: linkCode.expiresAt.toISOString(),
    });
}
