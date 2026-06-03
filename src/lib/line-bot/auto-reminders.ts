import { db, getOptionalDbModel } from "@/lib/db";
import { pushLineFlex } from "@/lib/line-bot/client";
import { canUseLineFeature, type LinePlanTeacher } from "@/lib/line-bot/plan-access";
import { createMissingStudentNameResolver } from "@/lib/line-bot/missing-student-names";
import { buildReminderFlexBubble, type ReminderFlexTone } from "@/lib/line-bot/reminder-flex";

type ReminderDeliveryModel = {
    create(input: {
        data: {
            lineBotGroupId: string;
            lineGroupId: string;
            classroomId: string;
            assignmentId: string;
            reminderKey: string;
            reminderType: string;
            targetCount: number;
        };
    }): Promise<unknown>;
};

type ReminderType = "before_1d" | "due_today" | "overdue_1d";

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

export type RunLineAutoRemindersResult = {
    scannedGroups: number;
    candidateCount: number;
    sentCount: number;
    skippedDuplicateCount: number;
    failedCount: number;
};

export async function runLineAutoReminders(input: { now?: Date } = {}): Promise<RunLineAutoRemindersResult> {
    const now = input.now ?? new Date();
    const deliveryModel = getOptionalDbModel<ReminderDeliveryModel>("lineAssignmentReminderDelivery");
    if (!deliveryModel) {
        throw new Error("lineAssignmentReminderDelivery Prisma model is not available. Run prisma generate/db push.");
    }

    const groups = await db.lineBotGroup.findMany({
        where: {
            isActive: true,
            classroomId: { not: null },
        },
        select: {
            id: true,
            lineGroupId: true,
            classroomId: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                    teacher: {
                        select: {
                            role: true,
                            plan: true,
                            planStatus: true,
                            planExpiry: true,
                        },
                    },
                    students: { select: { id: true, name: true } },
                    assignments: {
                        where: {
                            visible: true,
                            deadline: { not: null },
                        },
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

    const candidates = groups.flatMap((group) => buildCandidatesForGroup(group, now));
    let sentCount = 0;
    let skippedDuplicateCount = 0;
    let failedCount = 0;

    // Reuse one name resolver per group+classroom so bindings are loaded once.
    const resolverCache = new Map<
        string,
        Awaited<ReturnType<typeof createMissingStudentNameResolver>>
    >();
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
        try {
            await deliveryModel.create({
                data: {
                    lineBotGroupId: candidate.lineBotGroupId,
                    lineGroupId: candidate.lineGroupId,
                    classroomId: candidate.classroomId,
                    assignmentId: candidate.assignmentId,
                    reminderKey: candidate.reminderKey,
                    reminderType: candidate.reminderType,
                    targetCount: candidate.missingSubmissions,
                },
            });
        } catch (error) {
            if (isUniqueConstraintError(error)) {
                skippedDuplicateCount += 1;
                continue;
            }
            failedCount += 1;
            console.error("[line-auto-reminders] failed to record delivery", error);
            continue;
        }

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
            sentCount += 1;
        } catch (error) {
            failedCount += 1;
            console.error("[line-auto-reminders] failed to push LINE reminder", error);
        }
    }

    return {
        scannedGroups: groups.length,
        candidateCount: candidates.length,
        sentCount,
        skippedDuplicateCount,
        failedCount,
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
    now: Date
): ReminderCandidate[] {
    if (!group.classroomId || !group.classroom) return [];
    if (!canUseLineFeature(group.classroom.teacher, "lineAutoReminders")) return [];

    const nowKey = bangkokDateKey(now);
    return group.classroom.assignments.flatMap((assignment) => {
        if (!assignment.deadline) return [];

        const submitted = new Set(assignment.submissions.map((submission) => submission.studentId));
        const missing = group.classroom!.students.filter((student) => !submitted.has(student.id));
        if (missing.length <= 0) return [];

        const reminderType = getReminderType(now, assignment.deadline);
        if (!reminderType) return [];

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
                missingStudentList: missing.map((student) => ({ id: student.id, name: student.name })),
                reminderType,
                reminderKey: `${reminderType}:${nowKey}`,
            },
        ];
    });
}

function getReminderType(now: Date, deadline: Date): ReminderType | null {
    const diffDays = diffBangkokCalendarDays(deadline, now);
    if (diffDays === 1) return "before_1d";
    if (diffDays === 0) return "due_today";
    if (diffDays === -1) return "overdue_1d";
    return null;
}

const TONE_BY_TYPE: Record<ReminderType, ReminderFlexTone> = {
    before_1d: "before",
    due_today: "today",
    overdue_1d: "overdue",
};

function getAppUrl(): string | undefined {
    return (
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.LINE_BOT_CHAT_URL?.trim() ||
        undefined
    );
}

function diffBangkokCalendarDays(target: Date, base: Date): number {
    const targetParts = getBangkokDateParts(target);
    const baseParts = getBangkokDateParts(base);
    const targetDay = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);
    const baseDay = Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day);
    return Math.round((targetDay - baseDay) / (24 * 60 * 60 * 1000));
}

function bangkokDateKey(date: Date): string {
    const parts = getBangkokDateParts(date);
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getBangkokDateParts(date: Date): { year: number; month: number; day: number } {
    const bangkok = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return {
        year: bangkok.getUTCFullYear(),
        month: bangkok.getUTCMonth() + 1,
        day: bangkok.getUTCDate(),
    };
}

function isUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
    );
}
