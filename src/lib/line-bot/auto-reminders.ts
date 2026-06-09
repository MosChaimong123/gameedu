import { db } from "@/lib/db";
import { pushLineFlex } from "@/lib/line-bot/client";
import { canUseLineFeature, type LinePlanTeacher } from "@/lib/line-bot/plan-access";
import { createMissingStudentNameResolver } from "@/lib/line-bot/missing-student-names";
import { buildReminderFlexBubble, type ReminderFlexTone } from "@/lib/line-bot/reminder-flex";
import {
    isLineReminderTypeEnabled,
    normalizeClassroomLineReminderSetting,
    type ClassroomLineReminderSettingSnapshot,
    type LineReminderType,
} from "@/lib/line-bot/reminder-settings";
import {
    bangkokDateKey,
    bangkokWeekKey,
    diffBangkokCalendarDays,
    isBangkokMonday,
} from "@/lib/line-bot/bangkok-date";
import {
    getDeliveryModel,
    recordDelivery,
    markDeliverySent,
    markDeliveryFailed,
    classifyDispatchError,
    type LineDispatchRunResult,
    type LineDispatchItemResult,
} from "@/lib/line-bot/delivery-contract";

type ReminderSettingModel = {
    findMany(input: {
        where: { classroomId: { in: string[] } };
        select: {
            classroomId: true;
            enabled: true;
            beforeDeadline1d: true;
            dueToday: true;
            overdue1d: true;
            weeklySummary: true;
            timezone: true;
        };
    }): Promise<ClassroomLineReminderSettingSnapshot[]>;
};

type ReminderType = LineReminderType;

type ReminderCandidate = {
    lineBotGroupId: string;
    lineGroupId: string;
    classroomId: string;
    classroomName: string;
    assignmentId: string;
    assignmentName: string;
    deadline: Date;
    missingSubmissions: number;
    missingStudentList: Array<{ id: string; name: string }>;
    reminderType: ReminderType;
    reminderKey: string;
};

/** @deprecated Use LineDispatchRunResult for richer per-item data */
export type RunLineAutoRemindersResult = {
    scannedGroups: number;
    candidateCount: number;
    sentCount: number;
    skippedDuplicateCount: number;
    failedCount: number;
};

export async function runLineAutoReminders(
    input: { now?: Date } = {}
): Promise<LineDispatchRunResult> {
    const startedAt = new Date();
    const now = input.now ?? startedAt;

    const deliveryModel = getDeliveryModel();
    if (!deliveryModel) {
        throw new Error("lineAssignmentReminderDelivery Prisma model is not available. Run prisma generate/db push.");
    }

    const groups = await db.lineBotGroup.findMany({
        where: { isActive: true, classroomId: { not: null } },
        select: {
            id: true,
            lineGroupId: true,
            classroomId: true,
            classroom: {
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
            },
        },
    });

    // Load reminder settings for all classrooms in one query
    const { getOptionalDbModel } = await import("@/lib/db");
    const settingModel = getOptionalDbModel<ReminderSettingModel>("classroomLineReminderSetting");
    const classroomIds = Array.from(new Set(groups.flatMap((g) => g.classroom?.id ?? [])));
    const settingRows =
        settingModel && classroomIds.length > 0
            ? await settingModel.findMany({
                  where: { classroomId: { in: classroomIds } },
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
            : [];
    const settingsByClassroomId = new Map(
        settingRows.map((row) => [row.classroomId, normalizeClassroomLineReminderSetting(row.classroomId, row)])
    );

    const candidates = groups.flatMap((group) =>
        buildCandidatesForGroup(group, now, settingsByClassroomId.get(group.classroom?.id ?? ""))
    );

    let sentCount = 0;
    let skippedDuplicateCount = 0;
    let failedCount = 0;
    const items: LineDispatchItemResult[] = [];

    // Reuse one name resolver per group+classroom so bindings are loaded once.
    const resolverCache = new Map<string, Awaited<ReturnType<typeof createMissingStudentNameResolver>>>();
    async function getResolverFor(candidate: ReminderCandidate) {
        const key = `${candidate.lineGroupId}:${candidate.classroomId}`;
        let resolver = resolverCache.get(key);
        if (!resolver) {
            resolver = await createMissingStudentNameResolver({
                lineGroupId: candidate.lineGroupId,
                classroomId: candidate.classroomId,
            });
            resolverCache.set(key, resolver);
        }
        return resolver;
    }

    for (const candidate of candidates) {
        const baseItem = {
            classroomId: candidate.classroomId,
            assignmentId: candidate.assignmentId,
            reminderType: candidate.reminderType,
            reminderKey: candidate.reminderKey,
        };

        const recorded = await recordDelivery(deliveryModel, {
            lineBotGroupId: candidate.lineBotGroupId,
            lineGroupId: candidate.lineGroupId,
            classroomId: candidate.classroomId,
            assignmentId: candidate.assignmentId,
            reminderKey: candidate.reminderKey,
            reminderType: candidate.reminderType,
            targetCount: candidate.missingSubmissions,
            triggeredBy: "cron",
        });

        if (recorded.type === "duplicate") {
            skippedDuplicateCount += 1;
            items.push({ ...baseItem, status: "duplicate" });
            continue;
        }

        if (recorded.type === "error") {
            failedCount += 1;
            items.push({ ...baseItem, status: "record_error", errorMessage: recorded.message });
            console.error("[line-auto-reminders] failed to record delivery", recorded.message);
            continue;
        }

        const deliveryId = recorded.id;

        try {
            const resolveMissingNames = await getResolverFor(candidate);
            const missingStudents = await resolveMissingNames(candidate.missingStudentList);
            const bubble = buildReminderFlexBubble({
                tone: TONE_BY_TYPE[candidate.reminderType],
                classroomName: candidate.classroomName,
                assignmentName: candidate.assignmentName,
                deadline: candidate.deadline,
                missingSubmissions: candidate.missingSubmissions,
                missingStudents,
                footerUrl: getAppUrl(),
            });
            await pushLineFlex(
                candidate.lineGroupId,
                `กริ่งเตือนงานค้าง: ${candidate.assignmentName} (ยังขาด ${candidate.missingSubmissions} คน)`,
                bubble
            );
            await markDeliverySent(deliveryModel, deliveryId);
            sentCount += 1;
            items.push({ ...baseItem, status: "sent" });
        } catch (error) {
            failedCount += 1;
            const errorCode = classifyDispatchError(error);
            await markDeliveryFailed(deliveryModel, deliveryId, errorCode, error);
            items.push({ ...baseItem, status: "failed", errorCode });
            console.error("[line-auto-reminders] failed to push LINE reminder", error);
        }
    }

    const completedAt = new Date();
    return {
        triggeredBy: "cron",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        scannedGroups: groups.length,
        candidateCount: candidates.length,
        sentCount,
        skippedDuplicateCount,
        failedCount,
        items,
    };
}

function buildCandidatesForGroup(
    group: {
        id: string;
        lineGroupId: string;
        classroomId: string | null;
        classroom: {
            id: string;
            name: string;
            teacher: LinePlanTeacher;
            students: Array<{ id: string; name: string }>;
            assignments: Array<{
                id: string;
                name: string;
                deadline: Date | null;
                submissions: Array<{ studentId: string }>;
            }>;
        } | null;
    },
    now: Date,
    setting?: ClassroomLineReminderSettingSnapshot
): ReminderCandidate[] {
    if (!group.classroomId || !group.classroom) return [];
    if (!canUseLineFeature(group.classroom.teacher, "lineAutoReminders")) return [];

    const reminderSetting = normalizeClassroomLineReminderSetting(group.classroom.id, setting);
    if (!reminderSetting.enabled) return [];

    const nowKey = bangkokDateKey(now);
    return group.classroom.assignments.flatMap((assignment) => {
        if (!assignment.deadline) return [];

        const submitted = new Set(assignment.submissions.map((s) => s.studentId));
        const missing = group.classroom!.students.filter((s) => !submitted.has(s.id));
        if (missing.length <= 0) return [];

        const reminderType = getReminderType(now, assignment.deadline, reminderSetting);
        if (!reminderType) return [];
        if (!isLineReminderTypeEnabled(reminderSetting, reminderType)) return [];

        const reminderKey =
            reminderType === "weekly_summary"
                ? `${reminderType}:${bangkokWeekKey(now)}`
                : `${reminderType}:${nowKey}`;

        return [
            {
                lineBotGroupId: group.id,
                lineGroupId: group.lineGroupId,
                classroomId: group.classroom!.id,
                classroomName: group.classroom!.name,
                assignmentId: assignment.id,
                assignmentName: assignment.name,
                deadline: assignment.deadline,
                missingSubmissions: missing.length,
                missingStudentList: missing.map((s) => ({ id: s.id, name: s.name })),
                reminderType,
                reminderKey,
            },
        ];
    });
}

function getReminderType(
    now: Date,
    deadline: Date,
    setting: ClassroomLineReminderSettingSnapshot
): ReminderType | null {
    const diffDays = diffBangkokCalendarDays(deadline, now);
    if (diffDays === 1) return "before_1d";
    if (diffDays === 0) return "due_today";
    if (diffDays === -1) return "overdue_1d";
    if (diffDays < -1 && setting.weeklySummary && isBangkokMonday(now)) return "weekly_summary";
    return null;
}

const TONE_BY_TYPE: Record<ReminderType, ReminderFlexTone> = {
    before_1d: "before",
    due_today: "today",
    overdue_1d: "overdue",
    weekly_summary: "overdue",
};

function getAppUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.LINE_BOT_CHAT_URL?.trim() || undefined;
}
