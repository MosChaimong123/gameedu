const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export type ClassroomPageQuery = {
    defaultTab: "classroom" | "attendance" | "analytics" | "board" | "economy";
    classFocus: "assignments" | null;
    highlightAssignmentId: string | null;
    studentLookup: string | null;
    manageStudentId: string | null;
    historyStudentId: string | null;
    rewardGamePin: string | null;
};

export function normalizeClassroomPageQuery(searchParams?: {
    tab?: string;
    focus?: string;
    highlightAssignmentId?: string;
    studentLookup?: string;
    manageStudentId?: string;
    historyStudentId?: string;
    rewardGamePin?: string;
}): ClassroomPageQuery {
    const tabParam = searchParams?.tab;
    const allowedTabs = new Set(["classroom", "attendance", "analytics", "board", "economy"]);
    const defaultTab = (
        tabParam && allowedTabs.has(tabParam) ? tabParam : "classroom"
    ) as ClassroomPageQuery["defaultTab"];

    const focusParam = searchParams?.focus;
    const classFocus = focusParam === "assignments" ? "assignments" : null;
    const rawHighlight = searchParams?.highlightAssignmentId?.trim();
    const highlightAssignmentId =
        rawHighlight && OBJECT_ID_RE.test(rawHighlight) ? rawHighlight : null;
    const rawStudentLookup = searchParams?.studentLookup?.trim();
    const studentLookup = rawStudentLookup ? rawStudentLookup.slice(0, 80) : null;
    const rawManageStudentId = searchParams?.manageStudentId?.trim();
    const manageStudentId = rawManageStudentId && OBJECT_ID_RE.test(rawManageStudentId) ? rawManageStudentId : null;
    const rawHistoryStudentId = searchParams?.historyStudentId?.trim();
    const historyStudentId = rawHistoryStudentId && OBJECT_ID_RE.test(rawHistoryStudentId) ? rawHistoryStudentId : null;
    const rawRewardGamePin = searchParams?.rewardGamePin?.trim();
    const rewardGamePin = rawRewardGamePin ? rawRewardGamePin.slice(0, 32) : null;

    return { defaultTab, classFocus, highlightAssignmentId, studentLookup, manageStudentId, historyStudentId, rewardGamePin };
}
