import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db, getOptionalDbModel } from "@/lib/db";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { normalizeClassroomLineReminderSetting } from "@/lib/line-bot/reminder-settings";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import { getNextCronRunAt } from "@/lib/line-bot/bangkok-date";
import type { ClassroomLineReminderSettingSnapshot } from "@/lib/line-bot/reminder-settings";

export type LineReminderReadinessCode =
    | "ready"
    | "auto_reminder_disabled"
    | "line_group_missing"
    | "no_linked_students"
    | "no_assignments_with_deadline"
    | "worker_unavailable";

export type LineReminderReadinessPayload = {
    readiness: LineReminderReadinessCode;
    blockers: LineReminderReadinessCode[];
    lineGroupLinked: boolean;
    linkedStudentCount: number;
    totalStudentCount: number;
    eligibleAssignmentCount: number;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    lastErrorMessage: string | null;
    /** Human-readable Thai description of next scheduled run */
    nextRunDescription: string;
    /** ISO timestamp of estimated next cron fire (Bangkok-aware) */
    nextRunAt: string;
};

type ReminderSettingModel = {
    findUnique(input: {
        where: { classroomId: string };
        select: {
            classroomId: true;
            enabled: true;
            beforeDeadline1d: true;
            dueToday: true;
            overdue1d: true;
            weeklySummary: true;
            timezone: true;
        };
    }): Promise<ClassroomLineReminderSettingSnapshot | null>;
};

type DeliveryModel = {
    findFirst(input: {
        where: { classroomId: string };
        orderBy: { sentAt: "desc" };
        select: { status: true; sentAt: true; errorMessage: true };
    }): Promise<{ status: string; sentAt: Date; errorMessage: string | null } | null>;
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

    // Parallel queries for all needed data
    const [classroom, students, assignments, lineBotGroups, lineLinks] = await Promise.all([
        // Teacher plan info
        db.classroom.findUnique({
            where: { id },
            select: {
                id: true,
                teacher: {
                    select: {
                        role: true,
                        plan: true,
                        planStatus: true,
                        planExpiry: true,
                    },
                },
            },
        }),
        // Student count
        db.student.findMany({
            where: { classroom: { id } },
            select: { id: true },
        }),
        // Eligible assignments (visible + has deadline)
        db.assignment.findMany({
            where: { classroom: { id }, visible: true, deadline: { not: null } },
            select: { id: true },
        }),
        // Active LINE group
        db.lineBotGroup.findMany({
            where: { classroomId: id, isActive: true },
            select: { id: true },
            take: 1,
        }),
        // LINE-linked students
        db.lineStudentAccountLink.findMany({
            where: { classroomId: id },
            select: { studentId: true },
        }),
    ]);

    if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    // Load reminder setting
    const settingModel = getOptionalDbModel<ReminderSettingModel>("classroomLineReminderSetting");
    const rawSetting = settingModel
        ? await settingModel.findUnique({
              where: { classroomId: id },
              select: {
                  classroomId: true,
                  enabled: true,
                  beforeDeadline1d: true,
                  dueToday: true,
                  overdue1d: true,
                  weeklySummary: true,
                  timezone: true,
              },
          })
        : null;
    const setting = normalizeClassroomLineReminderSetting(id, rawSetting);

    // Load last delivery
    const deliveryModel = getOptionalDbModel<DeliveryModel>("lineAssignmentReminderDelivery");
    const lastDelivery = deliveryModel
        ? await deliveryModel.findFirst({
              where: { classroomId: id },
              orderBy: { sentAt: "desc" },
              select: { status: true, sentAt: true, errorMessage: true },
          })
        : null;

    // Compute counts
    const lineGroupLinked = lineBotGroups.length > 0;
    const linkedStudentIds = new Set(lineLinks.map((l) => l.studentId));
    const linkedStudentCount = students.filter((s) => linkedStudentIds.has(s.id)).length;
    const totalStudentCount = students.length;
    const eligibleAssignmentCount = assignments.length;
    const workerAvailable = canUseLineFeature(classroom.teacher, "lineAutoReminders");

    // Build blockers list
    const blockers: LineReminderReadinessCode[] = [];
    if (!workerAvailable) blockers.push("worker_unavailable");
    if (!lineGroupLinked) blockers.push("line_group_missing");
    if (linkedStudentCount === 0) blockers.push("no_linked_students");
    if (eligibleAssignmentCount === 0) blockers.push("no_assignments_with_deadline");
    if (!setting.enabled) blockers.push("auto_reminder_disabled");

    // Primary readiness code (first hard blocker, ignoring disabled state)
    const readiness: LineReminderReadinessCode =
        !workerAvailable
            ? "worker_unavailable"
            : !lineGroupLinked
              ? "line_group_missing"
              : linkedStudentCount === 0
                ? "no_linked_students"
                : eligibleAssignmentCount === 0
                  ? "no_assignments_with_deadline"
                  : !setting.enabled
                    ? "auto_reminder_disabled"
                    : "ready";

    const hardBlockers = blockers.filter((b) => b !== "auto_reminder_disabled");
    const isReady = hardBlockers.length === 0 && setting.enabled;
    const nextRunAt = getNextCronRunAt(new Date()).toISOString();
    const nextRunDescription = isReady
        ? "ระบบจะตรวจสอบและส่งทุกวันตามที่ตั้งค่า cron ไว้"
        : "ยังไม่พร้อมส่ง — แก้ blocker ด้านล่างก่อน";

    const payload: LineReminderReadinessPayload = {
        readiness,
        blockers,
        lineGroupLinked,
        linkedStudentCount,
        totalStudentCount,
        eligibleAssignmentCount,
        lastRunAt: lastDelivery ? lastDelivery.sentAt.toISOString() : null,
        lastRunStatus: lastDelivery?.status ?? null,
        lastErrorMessage: lastDelivery?.errorMessage ?? null,
        nextRunDescription,
        nextRunAt,
    };

    return NextResponse.json(payload);
}
