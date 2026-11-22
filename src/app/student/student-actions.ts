"use server";

import { auth } from "@/auth";
import { createAppError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getStudentAccessSession } from "@/lib/auth/student-access-session";
import { revalidatePath } from "next/cache";
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    digestRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function joinClassroom(_loginCode: string) {
    void _loginCode;
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

    const accessSession = await getStudentAccessSession("student:write");
    if (!accessSession) {
        return createAppError("INVALID_LOGIN_CODE", "Invalid or expired student access session");
    }

    const accountIdentifier = digestRateLimitIdentifier(userId);
    const codeIdentifier = digestRateLimitIdentifier(accessSession.studentId);
    const studentCodeLimits = await Promise.all([
        consumeRateLimitWithStore({
            bucket: "auth:student-code:account",
            key: accountIdentifier,
            limit: 20,
            windowMs: 15 * 60_000,
        }),
        consumeRateLimitWithStore({
            bucket: "auth:student-code:code",
            key: codeIdentifier,
            limit: 10,
            windowMs: 15 * 60_000,
        }),
        consumeRateLimitWithStore({
            bucket: "auth:student-code:account-code",
            key: buildRateLimitKey(accountIdentifier, codeIdentifier),
            limit: 5,
            windowMs: 15 * 60_000,
        }),
    ]);
    if (studentCodeLimits.some((limit) => !limit.allowed)) {
        return createAppError("RATE_LIMITED", "Too many student code attempts");
    }

    try {
        // 1. Find the student record with this code
        const student = await db.student.findUnique({
            where: { id: accessSession.studentId },
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
        const claim = await db.student.updateMany({
            where: { id: student.id, userId: null },
            data: { userId },
        });
        if (claim.count !== 1) {
            return createAppError("LOGIN_CODE_ALREADY_LINKED", "This classroom code is already linked to another account");
        }

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
