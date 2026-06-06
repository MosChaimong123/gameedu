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
    errorMessage: string | null;
    sentAt: Date;
};

type ReminderDeliveryModel = {
    findMany(input: {
        where: { classroomId: string };
        orderBy: { sentAt: "desc" };
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
            errorMessage: true;
            sentAt: true;
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
    if (classroom.teacherId !== session.user.id) {
        return { ok: false as const, response: createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403) };
    }
    return { ok: true as const };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const guard = await assertTeacherOwnsClassroom(id);
    if (!guard.ok) return guard.response;

    const model = getOptionalDbModel<ReminderDeliveryModel>("lineAssignmentReminderDelivery");
    if (!model) {
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }

    const deliveries = await model.findMany({
        where: { classroomId: id },
        orderBy: { sentAt: "desc" },
        take: 20,
        select: {
            id: true,
            lineGroupId: true,
            classroomId: true,
            assignmentId: true,
            reminderKey: true,
            reminderType: true,
            targetCount: true,
            status: true,
            errorMessage: true,
            sentAt: true,
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
            sentAt: delivery.sentAt.toISOString(),
        })),
    });
}
