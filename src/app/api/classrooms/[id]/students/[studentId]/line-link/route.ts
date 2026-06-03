import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db, getOptionalDbModel } from "@/lib/db";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { logAuditEvent } from "@/lib/security/audit-log";

type LineStudentBindingModel = {
    deleteMany(input: {
        where: {
            classroomId: string;
            studentId: string;
        };
    }): Promise<{ count: number }>;
};

export const runtime = "nodejs";

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    const session = await auth();
    const { id, studentId } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: { id },
            select: { id: true, teacherId: true },
        });

        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        if (classroom.teacherId !== session.user.id) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const student = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true, name: true },
        });

        if (!student || student.classId !== id) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const accountLinks = await db.lineStudentAccountLink.deleteMany({
            where: {
                classroomId: id,
                studentId,
            },
        });

        const bindingModel = getOptionalDbModel<LineStudentBindingModel>("lineStudentBinding");
        const groupBindings = bindingModel
            ? await bindingModel.deleteMany({
                  where: {
                      classroomId: id,
                      studentId,
                  },
              })
            : { count: 0 };

        logAuditEvent({
            actorUserId: session.user.id,
            action: "line.student_link.reset",
            category: "line",
            targetType: "student",
            targetId: studentId,
            metadata: {
                classroomId: id,
                studentName: student.name,
                accountLinksDeleted: accountLinks.count,
                groupBindingsDeleted: groupBindings.count,
            },
        });

        return NextResponse.json({
            success: true,
            studentId,
            accountLinksDeleted: accountLinks.count,
            groupBindingsDeleted: groupBindings.count,
        });
    } catch (error) {
        console.error("[CLASSROOM_STUDENT_LINE_LINK_DELETE]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
