/**
 * Dry-run logic for LINE auto reminders.
 *
 * Computes what would be sent if the cron ran right now — without writing
 * any delivery records or pushing to LINE.
 *
 * Extracted from auto-reminders.ts so the same candidate-building logic
 * is reused in both the real cron path and the teacher-facing test-run path.
 */

import {
    isLineReminderTypeEnabled,
    normalizeClassroomLineReminderSetting,
    type ClassroomLineReminderSettingSnapshot,
    type LineReminderType,
} from "@/lib/line-bot/reminder-settings";
import { canUseLineFeature, type LinePlanTeacher } from "@/lib/line-bot/plan-access";
import {
    bangkokDateKey,
    bangkokWeekKey,
    diffBangkokCalendarDays,
    isBangkokMonday,
} from "@/lib/line-bot/bangkok-date";

export type DryRunCandidate = {
    assignmentId: string;
    assignmentName: string;
    deadline: Date;
    reminderType: LineReminderType;
    reminderKey: string;
    missingCount: number;
};

export type DryRunResult = {
    wouldSend: DryRunCandidate[];
    /** Candidates skipped because a delivery record already exists for this reminderKey */
    alreadySent: DryRunCandidate[];
    /** Why the whole classroom is blocked (null = no classroom-level blocker) */
    blockedReason: string | null;
};

type AssignmentInput = {
    id: string;
    name: string;
    deadline: Date | null;
    submissions: Array<{ studentId: string }>;
};

type ClassroomInput = {
    id: string;
    name: string;
    teacher: LinePlanTeacher;
    students: Array<{ id: string; name: string }>;
    assignments: AssignmentInput[];
};

export function buildDryRunCandidates(
    classroom: ClassroomInput,
    setting: ClassroomLineReminderSettingSnapshot,
    existingReminderKeys: Set<string>,
    now: Date
): DryRunResult {
    if (!canUseLineFeature(classroom.teacher, "lineAutoReminders")) {
        return { wouldSend: [], alreadySent: [], blockedReason: "worker_unavailable" };
    }
    if (!setting.enabled) {
        return { wouldSend: [], alreadySent: [], blockedReason: "auto_reminder_disabled" };
    }

    const wouldSend: DryRunCandidate[] = [];
    const alreadySent: DryRunCandidate[] = [];

    for (const assignment of classroom.assignments) {
        if (!assignment.deadline) continue;

        const submitted = new Set(assignment.submissions.map((s) => s.studentId));
        const missingCount = classroom.students.filter((s) => !submitted.has(s.id)).length;
        if (missingCount <= 0) continue;

        const reminderType = getReminderType(now, assignment.deadline, setting);
        if (!reminderType) continue;
        if (!isLineReminderTypeEnabled(setting, reminderType)) continue;

        const reminderKey =
            reminderType === "weekly_summary"
                ? `${reminderType}:${bangkokWeekKey(now)}`
                : `${reminderType}:${bangkokDateKey(now)}`;

        const candidate: DryRunCandidate = {
            assignmentId: assignment.id,
            assignmentName: assignment.name,
            deadline: assignment.deadline,
            reminderType,
            reminderKey,
            missingCount,
        };

        if (existingReminderKeys.has(reminderKey)) {
            alreadySent.push(candidate);
        } else {
            wouldSend.push(candidate);
        }
    }

    return { wouldSend, alreadySent, blockedReason: null };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function getReminderType(
    now: Date,
    deadline: Date,
    setting: ClassroomLineReminderSettingSnapshot
): LineReminderType | null {
    const diffDays = diffBangkokCalendarDays(deadline, now);
    if (diffDays === 1) return "before_1d";
    if (diffDays === 0) return "due_today";
    if (diffDays === -1) return "overdue_1d";
    if (diffDays < -1 && setting.weeklySummary && isBangkokMonday(now)) return "weekly_summary";
    return null;
}
