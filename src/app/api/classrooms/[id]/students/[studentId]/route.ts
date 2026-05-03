import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { logAuditEvent } from "@/lib/security/audit-log";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type StudentPatchAuditContext = {
    source?: string;
    studentLookup?: string | null;
    rewardGamePin?: string | null;
};

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    try {
        const session = await auth();
        const { id, studentId } = await params;

        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const classroom = await db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const body = await req.json();
        const existingStudent = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true, name: true, nickname: true, avatar: true, order: true },
        });

        if (!existingStudent || existingStudent.classId !== id) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const auditContext =
            body.auditContext && typeof body.auditContext === "object"
                ? (body.auditContext as StudentPatchAuditContext)
                : null;
        const nextName = body.name !== undefined ? body.name : existingStudent.name;
        const nextNickname = body.nickname !== undefined ? body.nickname : existingStudent.nickname;
        const nextAvatar = body.avatar !== undefined ? body.avatar : existingStudent.avatar;
        const nextOrder = body.order !== undefined ? body.order : existingStudent.order;

        const student = await db.student.update({
            where: { id: studentId },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.nickname !== undefined && { nickname: body.nickname }),
                ...(body.avatar !== undefined && { avatar: body.avatar }),
                ...(body.order !== undefined && { order: body.order }),
            }
        });

        const changes: Record<string, { before: unknown; after: unknown }> = {};
        if (existingStudent.name !== nextName) {
            changes.name = { before: existingStudent.name, after: nextName };
        }
        if (existingStudent.nickname !== nextNickname) {
            changes.nickname = { before: existingStudent.nickname, after: nextNickname };
        }
        if (existingStudent.avatar !== nextAvatar) {
            changes.avatar = { before: existingStudent.avatar, after: nextAvatar };
        }
        if (existingStudent.order !== nextOrder) {
            changes.order = { before: existingStudent.order, after: nextOrder };
        }

        if (Object.keys(changes).length > 0) {
            logAuditEvent({
                actorUserId: session.user.id,
                action: "classroom.student.profile_updated",
                category: "classroom",
                targetType: "student",
                targetId: studentId,
                metadata: {
                    classroomId: id,
                    changes,
                    source: auditContext?.source ?? null,
                    studentLookup: auditContext?.studentLookup ?? null,
                    rewardGamePin: auditContext?.rewardGamePin ?? null,
                },
            });
        }

        return NextResponse.json(student);
    } catch (error) {
        console.error("[STUDENT_PATCH]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    try {
        const session = await auth();
        const { id, studentId } = await params;

        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const classroom = await db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const existingStudent = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true },
        });

        if (!existingStudent || existingStudent.classId !== id) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        await db.student.delete({ where: { id: studentId } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[STUDENT_DELETE]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
