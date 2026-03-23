"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAILY_QUESTS = void 0;
exports.getQuestProgress = getQuestProgress;
exports.completeQuest = completeQuest;
const db_1 = require("@/lib/db");
/** All daily quest definitions */
exports.DAILY_QUESTS = [
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
function getTodayDateStr() {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}
/**
 * Returns the current quest progress for today.
 * Resets completed quests if it's a new day.
 */
function getQuestProgress(rawProgress) {
    const today = getTodayDateStr();
    const progress = rawProgress;
    if (!progress || progress.lastQuestDate !== today) {
        return { lastQuestDate: today, completedQuests: [] };
    }
    return progress;
}
/**
 * Marks a quest as complete and grants Gold reward.
 * Returns { success, newGold, message }
 */
async function completeQuest(studentId, questId) {
    const quest = exports.DAILY_QUESTS.find((q) => q.id === questId);
    if (!quest)
        return { success: false, message: "Quest not found" };
    const student = await db_1.db.student.findUnique({
        where: { id: studentId },
        select: { gameStats: true, questProgress: true }
    });
    if (!student)
        return { success: false, message: "Student not found" };
    const progress = getQuestProgress(student.questProgress);
    if (progress.completedQuests.includes(questId)) {
        return { success: false, message: "ทำภารกิจนี้ไปแล้ววันนี้" };
    }
    // Update progress
    const updatedProgress = {
        lastQuestDate: progress.lastQuestDate,
        completedQuests: [...progress.completedQuests, questId],
    };
    const currentStats = student.gameStats || { gold: 0 };
    const newGold = (currentStats.gold || 0) + quest.goldReward;
    await db_1.db.student.update({
        where: { id: studentId },
        data: {
            questProgress: updatedProgress,
            gameStats: { ...currentStats, gold: newGold },
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
