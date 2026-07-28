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
import { getTeacherLineLinkStatus, revokeTeacherLineAccountLink } from "@/lib/line-bot/teacher-linking";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { logAuditEvent } from "@/lib/security/audit-log";

async function assertClassroomAccess(classroomId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false as const, response: createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401) };
    }
    if (!isTeacherOrAdmin(session.user.role)) {
        return { ok: false as const, response: createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403) };
    }
    const classroom = await db.classroom.findUnique({ where: { id: classroomId }, select: { id: true, teacherId: true } });
    if (!classroom) return { ok: false as const, response: createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404) };
    if (session.user.role !== "ADMIN" && classroom.teacherId !== session.user.id) {
        return { ok: false as const, response: createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403) };
    }
    return { ok: true as const, userId: session.user.id, classroomId: classroom.id };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const guard = await assertClassroomAccess((await params).id);
    if (!guard.ok) return guard.response;
    const status = await getTeacherLineLinkStatus(guard.userId);
    if (!status) return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    return NextResponse.json(status);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const guard = await assertClassroomAccess((await params).id);
    if (!guard.ok) return guard.response;
    const result = await revokeTeacherLineAccountLink(guard.userId);
    if (!result) return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    logAuditEvent({
        actorUserId: guard.userId,
        action: "line.teacher.account_link.revoked",
        category: "line",
        targetType: "Classroom",
        targetId: guard.classroomId,
        metadata: { revoked: result.revoked },
    });
    return NextResponse.json(result);
}
