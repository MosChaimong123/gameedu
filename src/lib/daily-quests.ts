// ============================================================
// Daily Quest System
// ============================================================

export type QuestId =
    | "quest_login"
    | "quest_checkin"
    | "quest_streak3"
    | "quest_streak7"
    | "quest_submit";

export type QuestCondition =
    | "auto"          // สมบูรณ์ทันทีที่เปิดแอป
    | "checkin"       // lastCheckIn = วันนี้
    | "streak_3"      // streak >= 3
    | "streak_7"      // streak >= 7
    | "submit_today"; // มี submission ที่ submittedAt = วันนี้

export type DailyQuestDef = {
    id: QuestId;
    icon: string;
    nameKey: string;
    descKey: string;
    goldReward: number;
    condition: QuestCondition;
};

export const DAILY_QUESTS: DailyQuestDef[] = [
    {
        id: "quest_login",
        icon: "🌅",
        nameKey: "questLoginName",
        descKey: "questLoginDesc",
        goldReward: 5,
        condition: "auto",
    },
    {
        id: "quest_checkin",
        icon: "📅",
        nameKey: "questCheckinName",
        descKey: "questCheckinDesc",
        goldReward: 10,
        condition: "checkin",
    },
    {
        id: "quest_streak3",
        icon: "🔥",
        nameKey: "questStreak3Name",
        descKey: "questStreak3Desc",
        goldReward: 15,
        condition: "streak_3",
    },
    {
        id: "quest_streak7",
        icon: "⚡",
        nameKey: "questStreak7Name",
        descKey: "questStreak7Desc",
        goldReward: 30,
        condition: "streak_7",
    },
    {
        id: "quest_submit",
        icon: "📝",
        nameKey: "questSubmitName",
        descKey: "questSubmitDesc",
        goldReward: 20,
        condition: "submit_today",
    },
];

export type QuestStatus = {
    id: QuestId;
    icon: string;
    nameKey: string;
    descKey: string;
    goldReward: number;
    completed: boolean; // เงื่อนไขผ่านแล้ว
    claimed: boolean;   // รับรางวัลแล้ว
};

/** วันนี้ในรูปแบบ YYYY-MM-DD (UTC+7) */
export function todayDateKey(): string {
    const now = new Date();
    const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return bkk.toISOString().slice(0, 10);
}

/** ดึง IDs ที่ claim แล้ววันนี้จาก JSON field */
export function getClaimedToday(raw: unknown): QuestId[] {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (r.date !== todayDateKey()) return [];
    const ids = r.claimed;
    if (!Array.isArray(ids)) return [];
    return ids as QuestId[];
}

type CheckInput = {
    streak: number;
    lastCheckIn: string | Date | null;
    hasSubmitToday: boolean;
};

/** ตรวจว่าเงื่อนไข quest ผ่านไหม */
export function isQuestCompleted(condition: QuestCondition, input: CheckInput): boolean {
    const todayKey = todayDateKey();
    switch (condition) {
        case "auto":
            return true;
        case "checkin": {
            if (!input.lastCheckIn) return false;
            const d = new Date(input.lastCheckIn);
            const bkk = new Date(d.getTime() + 7 * 60 * 60 * 1000);
            return bkk.toISOString().slice(0, 10) === todayKey;
        }
        case "streak_3":
            return input.streak >= 3;
        case "streak_7":
            return input.streak >= 7;
        case "submit_today":
            return input.hasSubmitToday;
    }
}

/** สร้าง QuestStatus list ครบทุก quest */
export function buildQuestStatuses(input: CheckInput, claimedIds: QuestId[]): QuestStatus[] {
    return DAILY_QUESTS.map((q) => ({
        id: q.id,
        icon: q.icon,
        nameKey: q.nameKey,
        descKey: q.descKey,
        goldReward: q.goldReward,
        completed: isQuestCompleted(q.condition, input),
        claimed: claimedIds.includes(q.id),
    }));
}
