import { db } from "@/lib/db";
import { parseGameStats, toPrismaJson } from "./game-stats";

export interface DailyQuestDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  goldReward: number;
}

/** All daily quest definitions */
export const DAILY_QUESTS: DailyQuestDef[] = [
  {
    id: "DAILY_LOGIN",
    name: "เช้านี้มาแล้ว!",
    description: "เข้าสู่ระบบนักเรียนวันนี้",
    icon: "☀️",
    goldReward: 30,
  },
  {
    id: "DAILY_SHOP_VISIT",
    name: "แวะเยี่ยมร้านค้า",
    description: "เปิดแท็บร้านค้าวันนี้",
    icon: "🛒",
    goldReward: 20,
  },
  {
    id: "DAILY_INVENTORY_CHECK",
    name: "ตรวจสอบอุปกรณ์",
    description: "เปิดแท็บคลังแสงวันนี้",
    icon: "🎒",
    goldReward: 20,
  },
];

export interface QuestProgress {
  lastQuestDate: string; // YYYY-MM-DD
  completedQuests: string[]; // array of quest IDs completed today
}

type QuestStudent = {
  gameStats: unknown;
  questProgress: unknown;
};

function getTodayDateStr() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Returns the current quest progress for today.
 * Resets completed quests if it's a new day.
 */
export function getQuestProgress(rawProgress: unknown): QuestProgress {
  const today = getTodayDateStr();
  const progress =
    rawProgress && typeof rawProgress === "object"
      ? (rawProgress as QuestProgress)
      : null;

  if (!progress || progress.lastQuestDate !== today) {
    return { lastQuestDate: today, completedQuests: [] };
  }
  return progress;
}

/**
 * Marks a quest as complete and grants Gold reward.
 * Returns { success, newGold, message }
 */
export async function completeQuest(
  studentId: string,
  questId: string
): Promise<{ success: boolean; newGold?: number; message: string }> {
  const quest = DAILY_QUESTS.find((q) => q.id === questId);
  if (!quest) return { success: false, message: "Quest not found" };

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { gameStats: true, questProgress: true }
  }) as QuestStudent | null;

  if (!student) return { success: false, message: "Student not found" };

  const progress = getQuestProgress(student.questProgress);

  if (progress.completedQuests.includes(questId)) {
    return { success: false, message: "ทำภารกิจนี้ไปแล้ววันนี้" };
  }

  // Update progress
  const updatedProgress: QuestProgress = {
    lastQuestDate: progress.lastQuestDate,
    completedQuests: [...progress.completedQuests, questId],
  };

  const currentStats = parseGameStats(student.gameStats);
  const newGold = (currentStats.gold || 0) + quest.goldReward;

  await db.student.update({
    where: { id: studentId },
    data: {
      questProgress: toPrismaJson(updatedProgress),
      gameStats: toPrismaJson({ ...currentStats, gold: newGold }),
      history: {
        create: {
          reason: `${quest.icon} ภารกิจประจำวัน: ${quest.name}`,
          value: quest.goldReward,
          timestamp: new Date(),
        }
      }
    }
  });

  return { success: true, newGold, message: `ได้รับ ${quest.goldReward} Gold!` };
}
