import type { AssignmentOverviewRangeDays } from "@/lib/services/teacher/get-teacher-assignment-overview";
import type { TeacherAssignmentOverviewItem } from "@/lib/services/teacher/get-teacher-assignment-overview";

export function buildAssignmentOverviewUrl(rangeDays: AssignmentOverviewRangeDays) {
    return `/api/teacher/assignments/overview?range=${rangeDays}d`;
}

export function buildAssignmentClassroomHref(classId: string, assignmentId?: string) {
    const q = new URLSearchParams({
        tab: "classroom",
        focus: "assignments",
    });
    if (assignmentId) q.set("highlightAssignmentId", assignmentId);
    return `/dashboard/classrooms/${classId}?${q.toString()}`;
}

export function buildAttendanceTabHref(classId: string) {
    return `/dashboard/classrooms/${classId}?tab=attendance`;
}

export function buildClassroomAssignmentsHref(classId: string) {
    return buildAssignmentClassroomHref(classId);
}

export function formatAssignmentClassSummary(
    template: string,
    counts: { overdueCount: number; dueWithinRangeCount: number; missingSubmissionSlots: number }
) {
    return template
        .replace("{overdue}", String(counts.overdueCount))
        .replace("{dueSoon}", String(counts.dueWithinRangeCount))
        .replace("{missing}", String(counts.missingSubmissionSlots));
}

export function getReminderCandidates(items: TeacherAssignmentOverviewItem[], limit = 3) {
    return items
        .filter((item) => item.missingSubmissions > 0 && (item.overdue || item.dueWithinRange))
        .slice(0, limit);
}

export function buildAssignmentReminderMessage(item: TeacherAssignmentOverviewItem) {
    const dueLine = item.deadline
        ? `Due: ${new Date(item.deadline).toLocaleString()}`
        : "Due: not set";
    const status = item.overdue ? "Status: overdue" : "Status: due soon";

    return [
        "GameEdu reminder",
        `Class: ${item.classroomName}`,
        `Assignment: ${item.name}`,
        dueLine,
        status,
        `Still missing: ${item.missingSubmissions} submission(s)`,
        "",
        "Please open GameEdu and submit your work when ready.",
    ].join("\n");
}
