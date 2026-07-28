import { db } from "@/lib/db";
import { pushLineFlex } from "@/lib/line-bot/client";
import {
    claimDeliveryForManualRetry,
    classifyDispatchError,
    getDeliveryModel,
    markDeliveryFailed,
    markDeliverySent,
} from "@/lib/line-bot/delivery-contract";
import { createMissingStudentNameResolver } from "@/lib/line-bot/missing-student-names";
import { buildReminderFlexBubble } from "@/lib/line-bot/reminder-flex";
import { getLineAppUrl } from "@/lib/line-bot/config";

export async function retryLineReminderDelivery(
    deliveryId: string
): Promise<
    | { ok: true; status: "sent" }
    | { ok: false; status: "not_found" | "sent" | "in_flight" | "contended" | "failed" | "retry_wait"; message?: string }
> {
    const model = getDeliveryModel();
    if (!model) return { ok: false, status: "failed", message: "DELIVERY_MODEL_UNAVAILABLE" };
    const claimed = await claimDeliveryForManualRetry(model, deliveryId);
    if (claimed.type === "unavailable") {
        return { ok: false, status: claimed.reason };
    }
    const row = claimed.row;
    const assignmentId = String(row.assignmentId ?? "");
    const classroomId = String(row.classroomId ?? "");
    const lineGroupId = String(row.lineGroupId ?? "");
    const assignment = await db.assignment.findFirst({
        where: { id: assignmentId, classId: classroomId, visible: true },
        select: {
            id: true,
            name: true,
            deadline: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                    students: { select: { id: true, name: true } },
                },
            },
            submissions: { select: { studentId: true } },
        },
    });
    if (!assignment || !lineGroupId) {
        const error = new Error("REMINDER_TARGET_NOT_FOUND");
        await markDeliveryFailed(
            model,
            deliveryId,
            claimed.attemptCount,
            "DELIVERY_RECORD_FAILED",
            error
        );
        return { ok: false, status: "failed", message: error.message };
    }
    try {
        const submitted = new Set(assignment.submissions.map((item) => item.studentId));
        const missing = assignment.classroom.students.filter((student) => !submitted.has(student.id));
        const resolveNames = await createMissingStudentNameResolver({
            lineGroupId,
            classroomId,
        });
        const missingStudents = await resolveNames(missing);
        const bubble = buildReminderFlexBubble({
            tone:
                assignment.deadline && assignment.deadline.getTime() < Date.now()
                    ? "overdue"
                    : "today",
            classroomName: assignment.classroom.name,
            assignmentName: assignment.name,
            deadline: assignment.deadline,
            missingSubmissions: missing.length,
            totalStudents: assignment.classroom.students.length,
            missingStudents,
            footerUrl: getLineAppUrl(),
        });
        await pushLineFlex(
            lineGroupId,
            `แจ้งเตือนงานจากครู: ${assignment.name} (ยังขาด ${missing.length} คน)`,
            bubble
        );
        await markDeliverySent(model, deliveryId);
        return { ok: true, status: "sent" };
    } catch (error) {
        const status = await markDeliveryFailed(
            model,
            deliveryId,
            claimed.attemptCount,
            classifyDispatchError(error),
            error
        );
        return {
            ok: false,
            status,
            message: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function processDueLineReminderRetries(
    input: { now?: Date; limit?: number } = {}
): Promise<{ attempted: number; sent: number; failed: number }> {
    const model = getDeliveryModel();
    if (!model) return { attempted: 0, sent: 0, failed: 0 };
    const now = input.now ?? new Date();
    const rows = await model.findMany({
        where: {
            status: "retry_wait",
            nextAttemptAt: { lte: now },
            attemptCount: { lt: 3 },
        },
        orderBy: { nextAttemptAt: "asc" },
        take: Math.min(100, Math.max(1, input.limit ?? 25)),
        select: { id: true },
    });
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
        const result = await retryLineReminderDelivery(row.id);
        if (result.ok) sent += 1;
        else if (result.status !== "in_flight" && result.status !== "contended") failed += 1;
    }
    return { attempted: rows.length, sent, failed };
}
