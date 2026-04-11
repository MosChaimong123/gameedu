import type { StudentDashboardMode } from "@/lib/services/student-dashboard/student-dashboard.types";

export const STUDENT_DASHBOARD_LEARN_TABS = ["assignments", "board", "history"] as const;
export const STUDENT_DASHBOARD_GAME_TABS = [
    "quests",
    "monster",
    "battle",
    "leaderboard",
    "gamehistory",
] as const;

export type StudentDashboardLearnTab = (typeof STUDENT_DASHBOARD_LEARN_TABS)[number];
export type StudentDashboardGameTab = (typeof STUDENT_DASHBOARD_GAME_TABS)[number];

export function isStudentDashboardLearnTab(value: string): value is StudentDashboardLearnTab {
    return (STUDENT_DASHBOARD_LEARN_TABS as readonly string[]).includes(value);
}

export function isStudentDashboardGameTab(value: string): value is StudentDashboardGameTab {
    return (STUDENT_DASHBOARD_GAME_TABS as readonly string[]).includes(value);
}

export function studentDashboardTabToMode(tab: string): StudentDashboardMode | null {
    if (isStudentDashboardLearnTab(tab)) return "learn";
    if (isStudentDashboardGameTab(tab)) return "game";
    return null;
}

/** ค่า `open` / `negamon` ใน query → เส้นทางภายใต้ /student/[code]/negamon */
export type StudentDashboardNegamonOpenTarget = "codex" | "profile";

export function parseStudentDashboardNegamonOpenParam(
    value: string | null
): StudentDashboardNegamonOpenTarget | null {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    if (v === "codex") return "codex";
    if (v === "profile" || v === "partner" || v === "monster" || v === "info") return "profile";
    return null;
}
