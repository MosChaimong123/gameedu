/**
 * POST /api/classrooms/[id]/line-reminder-test-run
 *
 * Dry-run: computes what the auto-reminder cron would send right now for this
 * classroom, without writing any delivery records or pushing to LINE.
 *
 * Response shape: TestRunResult
 */

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
import { buildDryRunCandidates } from "@/lib/line-bot/dry-run";
import type { ClassroomLineReminderSettingSnapshot } from "@/lib/line-bot/reminder-settings";
import type { LineReminderType } from "@/lib/line-bot/reminder-settings";

export type TestRunCandidate = {
    assignmentId: string;
    assignmentName: string;
    deadline: string;        // ISO string
    reminderType: LineReminderType;
    reminderTypeLabel: string;
    missingCount: number;
    alreadySentToday: boolean;
};

export type TestRunResult = {
    asOf: string;            // ISO string — when the test run was computed
    wouldSendCount: number;
    alreadySentCount: number;
    blockedReason: string | null;
    lineGroupLinked: boolean;
    candidates: TestRunCandidate[];
};

const REMINDER_TYPE_LABEL: Record<LineReminderType, string> = {
    before_1d: "ก่อนครบกำหนด 1 วัน",
    due_today: "วันครบกำหนด",
    overdue_1d: "เลยกำหนด 1 วัน",
    weekly_summary: "สรุปรายสัปดาห์",
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

type DeliveryKeyModel = {
    findMany(input: {
        where: { classroomId: string };
        select: { reminderKey: true };
    }): Promise<Array<{ reminderKey: string }>>;
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

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const guard = await assertTeacherOwnsClassroom(id);
    if (!guard.ok) return guard.response;

    const now = new Date();

    // Load all needed data in parallel
    const [classroom, lineBotGroups, existingKeys, rawSetting] = await Promise.all([
        db.classroom.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                teacher: {
                    select: { role: true, plan: true, planStatus: true, planExpiry: true },
                },
                students: { select: { id: true, name: true } },
                assignments: {
                    where: { visible: true, deadline: { not: null } },
                    select: {
                        id: true,
                        name: true,
                        deadline: true,
                        submissions: { select: { studentId: true } },
                    },
                },
            },
        }),
        db.lineBotGroup.findMany({
            where: { classroomId: id, isActive: true },
            select: { id: true },
            take: 1,
        }),
        // Existing delivery keys so we can flag already-sent
        (async () => {
            const model = getOptionalDbModel<DeliveryKeyModel>("lineAssignmentReminderDelivery");
            if (!model) return new Set<string>();
            const rows = await model.findMany({
                where: { classroomId: id },
                select: { reminderKey: true },
            });
            return new Set(rows.map((r) => r.reminderKey));
        })(),
        (async () => {
            const model = getOptionalDbModel<ReminderSettingModel>("classroomLineReminderSetting");
            return model
                ? model.findUnique({
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
        })(),
    ]);

    if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    const lineGroupLinked = lineBotGroups.length > 0;
    const setting = normalizeClassroomLineReminderSetting(id, rawSetting);

    const dryRun = buildDryRunCandidates(classroom, setting, existingKeys, now);

    const allCandidates: TestRunCandidate[] = [
        ...dryRun.wouldSend.map((c) => ({
            assignmentId: c.assignmentId,
            assignmentName: c.assignmentName,
            deadline: c.deadline.toISOString(),
            reminderType: c.reminderType,
            reminderTypeLabel: REMINDER_TYPE_LABEL[c.reminderType],
            missingCount: c.missingCount,
            alreadySentToday: false,
        })),
        ...dryRun.alreadySent.map((c) => ({
            assignmentId: c.assignmentId,
            assignmentName: c.assignmentName,
            deadline: c.deadline.toISOString(),
            reminderType: c.reminderType,
            reminderTypeLabel: REMINDER_TYPE_LABEL[c.reminderType],
            missingCount: c.missingCount,
            alreadySentToday: true,
        })),
    ];

    const result: TestRunResult = {
        asOf: now.toISOString(),
        wouldSendCount: dryRun.wouldSend.length,
        alreadySentCount: dryRun.alreadySent.length,
        blockedReason: dryRun.blockedReason,
        lineGroupLinked,
        candidates: allCandidates,
    };

    return NextResponse.json(result);
}
