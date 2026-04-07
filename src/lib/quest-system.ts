// ============================================================
// Extended Quest System — Weekly + Challenge
// (Daily quests remain in daily-quests.ts)
// ============================================================

import type { QuestStatus } from "@/lib/daily-quests";

// ── Weekly ──────────────────────────────────────────────────

export type WeeklyQuestId =
    | "wq_streak5"
    | "wq_submit3_week"
    | "wq_daily_complete";

export type WeeklyQuestDef = {
    id: WeeklyQuestId;
    icon: string;
    nameKey: string;
    descKey: string;
    goldReward: number;
    condition: "streak_5" | "submit_3_week" | "daily_complete";
};

export const WEEKLY_QUESTS: WeeklyQuestDef[] = [
    {
        id: "wq_streak5",
        icon: "🔥",
        nameKey: "wqStreak5Name",
        descKey: "wqStreak5Desc",
        goldReward: 80,
        condition: "streak_5",
    },
    {
        id: "wq_submit3_week",
        icon: "📚",
        nameKey: "wqSubmit3WeekName",
        descKey: "wqSubmit3WeekDesc",
        goldReward: 60,
        condition: "submit_3_week",
    },
    {
        id: "wq_daily_complete",
        icon: "⭐",
        nameKey: "wqDailyCompleteName",
        descKey: "wqDailyCompleteDesc",
        goldReward: 50,
        condition: "daily_complete",
    },
];

// ── Challenge ────────────────────────────────────────────────

export type ChallengeQuestId =
    | "cq_streak14"
    | "cq_submit10"
    | "cq_first_buy";

export type ChallengeQuestDef = {
    id: ChallengeQuestId;
    icon: string;
    nameKey: string;
    descKey: string;
    goldReward: number;
    condition: "streak_14" | "submit_10_total" | "has_item";
};

export const CHALLENGE_QUESTS: ChallengeQuestDef[] = [
    {
        id: "cq_streak14",
        icon: "⚡",
        nameKey: "cqStreak14Name",
        descKey: "cqStreak14Desc",
        goldReward: 150,
        condition: "streak_14",
    },
    {
        id: "cq_submit10",
        icon: "🏆",
        nameKey: "cqSubmit10Name",
        descKey: "cqSubmit10Desc",
        goldReward: 100,
        condition: "submit_10_total",
    },
    {
        id: "cq_first_buy",
        icon: "🛍️",
        nameKey: "cqFirstBuyName",
        descKey: "cqFirstBuyDesc",
        goldReward: 50,
        condition: "has_item",
    },
];

// ── Weekly date helpers ──────────────────────────────────────

/** ISO week key in UTC+7: "YYYY-WNN" */
export function thisWeekKey(): string {
    const now = new Date();
    const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    // Get ISO week: Thursday-based (ISO 8601)
    const tmp = new Date(bkk);
    tmp.setUTCHours(0, 0, 0, 0);
    // Set to nearest Thursday: current date + 4 - current day number (Mon=1..Sun=7)
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Milliseconds until next Monday 00:00 UTC+7 */
export function msUntilWeekReset(): number {
    const now = new Date();
    const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const day = bkk.getUTCDay(); // 0=Sun,1=Mon,...
    const daysUntilMon = (8 - day) % 7 || 7;
    const nextMon = new Date(bkk);
    nextMon.setUTCDate(bkk.getUTCDate() + daysUntilMon);
    nextMon.setUTCHours(0, 0, 0, 0);
    return nextMon.getTime() - now.getTime() - 7 * 60 * 60 * 1000;
}

export function getWeeklyClaimedThisWeek(raw: unknown): WeeklyQuestId[] {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (r.weekKey !== thisWeekKey()) return [];
    const ids = r.claimed;
    if (!Array.isArray(ids)) return [];
    return ids as WeeklyQuestId[];
}

export function getChallengeClaimedAll(raw: unknown): ChallengeQuestId[] {
    if (!Array.isArray(raw)) return [];
    return raw as ChallengeQuestId[];
}

// ── Condition checks ─────────────────────────────────────────

export type WeeklyCheckInput = {
    streak: number;
    submissionsThisWeek: number;
    allDailyClaimedToday: boolean;
};

export type ChallengeCheckInput = {
    streak: number;
    totalSubmissions: number;
    hasItem: boolean;
};

export function isWeeklyQuestCompleted(
    condition: WeeklyQuestDef["condition"],
    input: WeeklyCheckInput
): boolean {
    switch (condition) {
        case "streak_5":          return input.streak >= 5;
        case "submit_3_week":     return input.submissionsThisWeek >= 3;
        case "daily_complete":    return input.allDailyClaimedToday;
    }
}

export function isChallengeQuestCompleted(
    condition: ChallengeQuestDef["condition"],
    input: ChallengeCheckInput
): boolean {
    switch (condition) {
        case "streak_14":         return input.streak >= 14;
        case "submit_10_total":   return input.totalSubmissions >= 10;
        case "has_item":          return input.hasItem;
    }
}

// ── Build status lists ────────────────────────────────────────

export function buildWeeklyQuestStatuses(
    input: WeeklyCheckInput,
    claimedIds: WeeklyQuestId[]
): QuestStatus[] {
    return WEEKLY_QUESTS.map((q) => ({
        id: q.id as QuestStatus["id"],
        icon: q.icon,
        nameKey: q.nameKey,
        descKey: q.descKey,
        goldReward: q.goldReward,
        completed: isWeeklyQuestCompleted(q.condition, input),
        claimed: claimedIds.includes(q.id),
    }));
}

export function buildChallengeQuestStatuses(
    input: ChallengeCheckInput,
    claimedIds: ChallengeQuestId[]
): QuestStatus[] {
    return CHALLENGE_QUESTS.map((q) => ({
        id: q.id as QuestStatus["id"],
        icon: q.icon,
        nameKey: q.nameKey,
        descKey: q.descKey,
        goldReward: q.goldReward,
        completed: isChallengeQuestCompleted(q.condition, input),
        claimed: claimedIds.includes(q.id),
    }));
}
