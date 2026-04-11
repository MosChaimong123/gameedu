"use server";

import { auth } from "@/auth";
import { createAppError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { revalidatePath } from "next/cache";

export async function joinClassroom(loginCode: string) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        logAuditEvent({
            action: "auth.join_classroom.denied",
            category: "auth",
            status: "rejected",
            reason: "auth_required",
            targetType: "classroomJoin",
        });
        return createAppError("AUTH_REQUIRED", "Authentication required");
    }

    const loginCodeVariants = getStudentLoginCodeVariants(loginCode);

    try {
        // 1. Find the student record with this code
        const student = await db.student.findFirst({
            where: {
                OR: loginCodeVariants.map((candidate) => ({ loginCode: candidate })),
            },
            include: { classroom: true }
        });

        if (!student) {
            logAuditEvent({
                actorUserId: userId,
                action: "auth.join_classroom.denied",
                category: "auth",
                status: "rejected",
                reason: "invalid_login_code",
                targetType: "classroomJoin",
            });
            return createAppError("INVALID_LOGIN_CODE", "Invalid login code");
        }

        // 2. Check if it's already linked to THIS user
        if (student.userId === userId) {
            logAuditEvent({
                actorUserId: userId,
                action: "auth.join_classroom.denied",
                category: "auth",
                status: "rejected",
                reason: "already_in_classroom",
                targetType: "classroomJoin",
                targetId: student.classId,
            });
            return createAppError("ALREADY_IN_CLASSROOM", "You are already in this classroom");
        }

        if (student.userId && student.userId !== userId) {
            logAuditEvent({
                actorUserId: userId,
                action: "auth.join_classroom.denied",
                category: "auth",
                status: "rejected",
                reason: "login_code_already_linked",
                targetType: "classroomJoin",
                targetId: student.classId,
            });
            return createAppError("LOGIN_CODE_ALREADY_LINKED", "This classroom code is already linked to another account");
        }

        // 3. Link the student record to the current user
        await db.student.update({
            where: { id: student.id },
            data: { userId }
        });

        logAuditEvent({
            actorUserId: userId,
            action: "auth.join_classroom.succeeded",
            category: "auth",
            status: "success",
            targetType: "classroomJoin",
            targetId: student.classId,
            metadata: { studentId: student.id },
        });

        revalidatePath("/student/home");
        return { success: true, className: student.classroom.name };
    } catch (error) {
        console.error("[JOIN_CLASSROOM_ERROR]", error);
        logAuditEvent({
            actorUserId: userId,
            action: "auth.join_classroom.failed",
            category: "auth",
            status: "error",
            reason: "internal_error",
            targetType: "classroomJoin",
            metadata: {
                message: error instanceof Error ? error.message : "unknown_error",
            },
        });
        return createAppError("INTERNAL_ERROR", "Failed to join classroom");
    }
}
