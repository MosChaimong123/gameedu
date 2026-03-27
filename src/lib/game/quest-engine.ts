import { db } from "../db";
import { parseGameStats, toPrismaJson } from "./game-stats";

// ─── Types ─────────────────────────────────────────────────────────────────

export type QuestFrequency = "DAILY" | "WEEKLY";
export type QuestEvent =
  | "DAILY_LOGIN"
  | "BOSS_ATTACK"
  | "FARMING_WAVE"
  | "ASSIGNMENT_SUBMIT"
  | "ITEM_CRAFT"
  | "BOSS_KILL"
  | "PVP_WIN";

export interface QuestReward {
  gold?: number;
  xp?: number;
  materials?: { type: string; quantity: number }[];
}

export interface QuestDef {
  id: string;
  frequency: QuestFrequency;
  name: string;
  description: string;
  icon: string;
  event: QuestEvent;
  target: number;
  reward: QuestReward;
}

export interface QuestPeriodProgress {
  lastReset: string;
  completed: string[];
  counters: Record<string, number>;
}

export interface QuestProgress {
  daily: QuestPeriodProgress;
  weekly: QuestPeriodProgress;
}

// ─── Quest Definitions ──────────────────────────────────────────────────────

export const DAILY_QUESTS: QuestDef[] = [
  {
    id: "DAILY_LOGIN",
    frequency: "DAILY",
    name: "เช้านี้มาแล้ว!",
    description: "เข้าสู่ระบบนักเรียนวันนี้",
    icon: "☀️",
    event: "DAILY_LOGIN",
    target: 1,
    reward: { gold: 30 },
  },
  {
    id: "DAILY_BOSS_ATTACK",
    frequency: "DAILY",
    name: "นักรบแห่งห้อง",
    description: "โจมตี Boss 3 ครั้ง",
    icon: "⚔️",
    event: "BOSS_ATTACK",
    target: 3,
    reward: { gold: 50, materials: [{ type: "Stone Fragment", quantity: 1 }] },
  },
  {
    id: "DAILY_FARMING",
    frequency: "DAILY",
    name: "นักล่าไม่หยุดพัก",
    description: "ผ่าน Farming 5 Wave",
    icon: "🗡️",
    event: "FARMING_WAVE",
    target: 5,
    reward: { gold: 40, materials: [{ type: "Wolf Fang", quantity: 1 }] },
  },
  {
    id: "DAILY_ASSIGNMENT",
    frequency: "DAILY",
    name: "ขยันเรียน",
    description: "ส่งงาน 1 ชิ้น",
    icon: "📝",
    event: "ASSIGNMENT_SUBMIT",
    target: 1,
    reward: { gold: 80, xp: 20 },
  },
  {
    id: "DAILY_CRAFT",
    frequency: "DAILY",
    name: "ช่างฝีมือ",
    description: "Craft ไอเทม 1 ชิ้น",
    icon: "🔨",
    event: "ITEM_CRAFT",
    target: 1,
    reward: { gold: 50 },
  },
];

export const WEEKLY_QUESTS: QuestDef[] = [
  {
    id: "WEEKLY_ASSIGNMENT_5",
    frequency: "WEEKLY",
    name: "นักเรียนดีเด่น",
    description: "ส่งงาน 5 ชิ้นในสัปดาห์นี้",
    icon: "🌟",
    event: "ASSIGNMENT_SUBMIT",
    target: 5,
    reward: { gold: 300, materials: [{ type: "Iron Ore", quantity: 2 }] },
  },
  {
    id: "WEEKLY_BOSS_KILL",
    frequency: "WEEKLY",
    name: "ผู้พิชิตบอส",
    description: "ร่วมสังหาร Boss 1 ครั้ง",
    icon: "💀",
    event: "BOSS_KILL",
    target: 1,
    reward: { gold: 200, materials: [{ type: "Dragon Scale", quantity: 1 }] },
  },
  {
    id: "WEEKLY_PVP_WIN",
    frequency: "WEEKLY",
    name: "แชมป์สนามรบ",
    description: "ชนะ PvP 1 ครั้ง",
    icon: "🏆",
    event: "PVP_WIN",
    target: 1,
    reward: { gold: 150, materials: [{ type: "Wolf Fang", quantity: 2 }] },
  },
  {
    id: "WEEKLY_FARMING_20",
    frequency: "WEEKLY",
    name: "นักผจญภัย",
    description: "ผ่าน Farming 20 Wave ในสัปดาห์นี้",
    icon: "🌿",
    event: "FARMING_WAVE",
    target: 20,
    reward: { gold: 200, materials: [{ type: "Iron Ore", quantity: 2 }] },
  },
  {
    id: "WEEKLY_CRAFT_3",
    frequency: "WEEKLY",
    name: "ช่างฝีมือขั้นสูง",
    description: "Craft ไอเทม 3 ชิ้นในสัปดาห์นี้",
    icon: "⚒️",
    event: "ITEM_CRAFT",
    target: 3,
    reward: { gold: 150, materials: [{ type: "Stone Fragment", quantity: 3 }] },
  },
];

export const ALL_QUESTS: QuestDef[] = [...DAILY_QUESTS, ...WEEKLY_QUESTS];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentWeekStr(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function emptyPeriod(reset: string): QuestPeriodProgress {
  return { lastReset: reset, completed: [], counters: {} };
}

// ─── getQuestProgress ───────────────────────────────────────────────────────

export function getQuestProgress(raw: unknown): QuestProgress {
  const today = getTodayDateStr();
  const thisWeek = getCurrentWeekStr();
  const existing =
    raw && typeof raw === "object" ? (raw as Partial<QuestProgress>) : {};

  const daily: QuestPeriodProgress =
    existing.daily?.lastReset === today ? existing.daily : emptyPeriod(today);
  const weekly: QuestPeriodProgress =
    existing.weekly?.lastReset === thisWeek
      ? existing.weekly
      : emptyPeriod(thisWeek);

  return { daily, weekly };
}

// ─── trackQuestEvent ─────────────────────────────────────────────────────────

export async function trackQuestEvent(
  studentId: string,
  event: QuestEvent
): Promise<string[]> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { gameStats: true, questProgress: true },
  });
  if (!student) return [];

  const progress = getQuestProgress(student.questProgress);
  const stats = parseGameStats(student.gameStats);
  const newlyCompleted: string[] = [];

  const relevant = ALL_QUESTS.filter((q) => q.event === event);
  if (relevant.length === 0) return [];

  let totalGold = 0;
  let totalXp = 0;
  const materialsToAdd: { type: string; quantity: number }[] = [];
  const historyEntries: { reason: string; value: number }[] = [];

  for (const quest of relevant) {
    const period =
      quest.frequency === "DAILY" ? progress.daily : progress.weekly;
    if (period.completed.includes(quest.id)) continue;

    period.counters[event] = (period.counters[event] ?? 0) + 1;

    if (period.counters[event] >= quest.target) {
      period.completed.push(quest.id);
      newlyCompleted.push(quest.id);
      if (quest.reward.gold) totalGold += quest.reward.gold;
      if (quest.reward.xp) totalXp += quest.reward.xp;
      if (quest.reward.materials) materialsToAdd.push(...quest.reward.materials);
      historyEntries.push({
        reason: `${quest.icon} ภารกิจ: ${quest.name} (+${quest.reward.gold ?? 0} ทอง)`,
        value: quest.reward.gold ?? 0,
      });
    }
  }

  const newGold = (stats.gold ?? 0) + totalGold;
  const newXp = (stats.xp ?? 0) + totalXp;

  await db.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: studentId },
      data: {
        questProgress: toPrismaJson({ daily: progress.daily, weekly: progress.weekly }),
        gameStats: toPrismaJson({ ...stats, gold: newGold, xp: newXp }),
      },
    });
    for (const mat of materialsToAdd) {
      await tx.material.upsert({
        where: { studentId_type: { studentId, type: mat.type } },
        update: { quantity: { increment: mat.quantity } },
        create: { studentId, type: mat.type, quantity: mat.quantity },
      });
    }
    for (const entry of historyEntries) {
      await tx.pointHistory.create({
        data: { studentId, reason: entry.reason, value: entry.value, timestamp: new Date() },
      });
    }
  });

  return newlyCompleted;
}

// ─── Legacy completeQuest ────────────────────────────────────────────────────

export async function completeQuest(
  studentId: string,
  questId: string
): Promise<{ success: boolean; newGold?: number; message: string }> {
  const quest = ALL_QUESTS.find((q) => q.id === questId);
  if (!quest) return { success: false, message: "Quest not found" };

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { gameStats: true, questProgress: true },
  });
  if (!student) return { success: false, message: "Student not found" };

  const progress = getQuestProgress(student.questProgress);
  const period = quest.frequency === "DAILY" ? progress.daily : progress.weekly;

  if (period.completed.includes(questId)) {
    return { success: false, message: "ทำภารกิจนี้ไปแล้วในรอบนี้" };
  }

  period.completed.push(questId);
  const stats = parseGameStats(student.gameStats);
  const newGold = (stats.gold ?? 0) + (quest.reward.gold ?? 0);

  await db.student.update({
    where: { id: studentId },
    data: {
      questProgress: toPrismaJson({ daily: progress.daily, weekly: progress.weekly }),
      gameStats: toPrismaJson({ ...stats, gold: newGold }),
      history: {
        create: {
          reason: `${quest.icon} ภารกิจ: ${quest.name}`,
          value: quest.reward.gold ?? 0,
          timestamp: new Date(),
        },
      },
    },
  });

  return { success: true, newGold, message: `ได้รับ ${quest.reward.gold ?? 0} Gold!` };
}
