import { db, getOptionalDbModel } from "@/lib/db";
import { pushLineText } from "@/lib/line-bot/client";
import { canUseLineFeature, type LinePlanTeacher } from "@/lib/line-bot/plan-access";

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
                    students: { select: { id: true } },
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
            await pushLineText(candidate.lineGroupId, formatAutoReminderMessage(candidate));
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
            students: Array<{ id: string }>;
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
        const missingSubmissions = group.classroom!.students.filter((student) => !submitted.has(student.id)).length;
        if (missingSubmissions <= 0) return [];

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
                missingSubmissions,
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

function formatAutoReminderMessage(candidate: ReminderCandidate): string {
    const typeLabel: Record<ReminderType, string> = {
        before_1d: "ใกล้ถึงกำหนดส่ง",
        due_today: "ถึงกำหนดส่งวันนี้",
        overdue_1d: "เลยกำหนดส่งแล้ว",
    };

    return [
        "กริ่งเตือนงานอัตโนมัติ",
        `ห้อง ${candidate.classroomName}`,
        `${typeLabel[candidate.reminderType]}: ${candidate.assignmentName}`,
        `ยังขาด ${candidate.missingSubmissions} คน`,
        `กำหนดส่ง: ${formatBangkokDateTime(candidate.deadline)}`,
        "",
        "นักเรียนเปิด GameEdu เพื่อตรวจงานของตัวเองได้เลย",
    ].join("\n");
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

function formatBangkokDateTime(date: Date): string {
    return date.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    });
}

function isUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
    );
}
