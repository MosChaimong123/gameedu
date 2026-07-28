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

type ReminderDeliveryRow = {
    id: string;
    lineGroupId: string;
    classroomId: string;
    assignmentId: string;
    reminderKey: string;
    reminderType: string;
    targetCount: number;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    errorCode: string | null;
    errorMessage: string | null;
    nextAttemptAt: Date | null;
    lastAttemptAt: Date | null;
    sentAt: Date | null;
    failedAt: Date | null;
    createdAt: Date;
};

type ReminderDeliveryModel = {
    findMany(input: {
        where: Record<string, unknown>;
        orderBy: { createdAt: "desc" };
        take: number;
        select: {
            id: true;
            lineGroupId: true;
            classroomId: true;
            assignmentId: true;
            reminderKey: true;
            reminderType: true;
            targetCount: true;
            status: true;
            attemptCount: true;
            maxAttempts: true;
            errorCode: true;
            errorMessage: true;
            nextAttemptAt: true;
            lastAttemptAt: true;
            sentAt: true;
            failedAt: true;
            createdAt: true;
        };
    }): Promise<ReminderDeliveryRow[]>;
};

async function assertTeacherOwnsClassroom(classroomId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false as const, response: createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401) };
    }
    if (!isTeacherOrAdmin(session.user.role)) {
        return { ok: false as const, response: createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403) };
    }

    const classroom = await db.classroom.findUnique({
        where: { id: classroomId },
        select: { id: true, teacherId: true },
    });
    if (!classroom) {
        return { ok: false as const, response: createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404) };
    }
    if (session.user.role !== "ADMIN" && classroom.teacherId !== session.user.id) {
        return { ok: false as const, response: createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403) };
    }
    return { ok: true as const };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const guard = await assertTeacherOwnsClassroom(id);
    if (!guard.ok) return guard.response;

    const model = getOptionalDbModel<ReminderDeliveryModel>("lineAssignmentReminderDelivery");
    if (!model) {
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }

    const search = new URL(req.url).searchParams;
    const status = search.get("status")?.trim();
    const assignmentId = search.get("assignmentId")?.trim();
    const from = search.get("from");
    const to = search.get("to");
    const createdAt = {
        ...(from && !Number.isNaN(Date.parse(from)) ? { gte: new Date(from) } : {}),
        ...(to && !Number.isNaN(Date.parse(to)) ? { lte: new Date(to) } : {}),
    };
    const deliveries = await model.findMany({
        where: {
            classroomId: id,
            ...(status ? { status } : {}),
            ...(assignmentId ? { assignmentId } : {}),
            ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(100, Math.max(1, Number(search.get("take")) || 20)),
        select: {
            id: true,
            lineGroupId: true,
            classroomId: true,
            assignmentId: true,
            reminderKey: true,
            reminderType: true,
            targetCount: true,
            status: true,
            attemptCount: true,
            maxAttempts: true,
            errorCode: true,
            errorMessage: true,
            nextAttemptAt: true,
            lastAttemptAt: true,
            sentAt: true,
            failedAt: true,
            createdAt: true,
        },
    });

    const assignmentIds = Array.from(new Set(deliveries.map((delivery) => delivery.assignmentId)));
    const assignments =
        assignmentIds.length > 0
            ? await db.assignment.findMany({
                  where: { id: { in: assignmentIds } },
                  select: { id: true, name: true },
              })
            : [];
    const assignmentNameById = new Map(assignments.map((assignment) => [assignment.id, assignment.name]));

    return NextResponse.json({
        deliveries: deliveries.map((delivery) => ({
            ...delivery,
            assignmentName: assignmentNameById.get(delivery.assignmentId) ?? null,
            nextAttemptAt: delivery.nextAttemptAt?.toISOString() ?? null,
            lastAttemptAt: delivery.lastAttemptAt?.toISOString() ?? null,
            sentAt: delivery.sentAt?.toISOString() ?? null,
            failedAt: delivery.failedAt?.toISOString() ?? null,
            createdAt: delivery.createdAt.toISOString(),
        })),
    });
}
