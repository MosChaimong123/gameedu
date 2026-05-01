import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";
import { logAuditEvent } from "@/lib/security/audit-log";

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

        if (!session?.user?.id) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const classroom = await db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const body = await req.json();
        const existingStudent = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true, name: true, nickname: true, avatar: true, order: true },
        });

        if (!existingStudent || existingStudent.classId !== id) {
            return new NextResponse("Student not found", { status: 404 });
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    try {
        const session = await auth();
        const { id, studentId } = await params;

        if (!session?.user?.id) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const classroom = await db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const existingStudent = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true },
        });

        if (!existingStudent || existingStudent.classId !== id) {
            return new NextResponse("Student not found", { status: 404 });
        }

        await db.student.delete({ where: { id: studentId } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[STUDENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
