import type { CSSProperties } from "react";
import type { RankEntry } from "@/lib/classroom-utils";

export type ChecklistItem = string | { text: string; points?: number };

export interface AssignmentRecord {
    id: string;
    name: string;
    description?: string | null;
    visible?: boolean;
    type?: string;
    checklists?: ChecklistItem[];
    maxScore?: number;
    passScore?: number;
    deadline?: string | Date | null;
}

export interface SubmissionRecord {
    assignmentId: string;
    score: number;
    submittedAt?: Date | string;
}

export interface HistoryRecord {
    timestamp: string;
    value: number;
    reason: string;
}

export interface UnlockedAchievement {
    achievementId: string;
    goldRewarded: number;
    unlockedAt: string;
}

export interface TeacherRecord {
    name?: string | null;
}

export interface ClassroomRecord {
    id: string;
    name: string;
    teacher: TeacherRecord;
    gamifiedSettings: Record<string, unknown>;
    levelConfig?: unknown;
    assignments?: AssignmentRecord[];
}

export interface DashboardStudent {
    id: string;
    classId: string;
    loginCode: string;
    name: string;
    nickname?: string | null;
    avatar?: string | null;
    userId?: string | null;
    behaviorPoints: number;
    gold: number;
    streak: number;
    lastCheckIn: string | null;
    inventory: string[];
    /** Preset battle consumables when defending (max 1 per category). */
    battleLoadout: string[];
    equippedFrame: string | null;
    negamonSkills: string[];
}

export type StudentDashboardMode = "learn" | "game";

export type StudentDashboardTranslateFn = (
    key: string,
    params?: Record<string, string | number>
) => string;

export interface StudentDashboardViewModel {
    student: DashboardStudent;
    classroom: ClassroomRecord;
    history: HistoryRecord[];
    submissions: SubmissionRecord[];
    academicTotal: number;
    totalPositive: number;
    totalNegative: number;
    rankEntry: RankEntry;
    themeClass: string;
    themeStyle: CSSProperties;
    classIcon: string | null;
    isImageIcon: boolean;
}

export interface StudentDashboardClientProps extends StudentDashboardViewModel {
    currentUserId?: string;
    code: string;
}
