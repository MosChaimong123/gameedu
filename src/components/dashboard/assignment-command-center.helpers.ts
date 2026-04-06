import type { AssignmentOverviewRangeDays } from "@/lib/services/teacher/get-teacher-assignment-overview";

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
