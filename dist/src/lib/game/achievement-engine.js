"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACHIEVEMENTS = void 0;
exports.checkAndGrantAchievements = checkAndGrantAchievements;
const db_1 = require("@/lib/db");
/** All achievement definitions (code-side, no DB table needed) */
exports.ACHIEVEMENTS = [
    {
        id: "FIRST_LOGIN",
        name: "ก้าวแรก",
        description: "เข้าระบบนักเรียนเป็นครั้งแรก",
        icon: "🌟",
        goldReward: 50,
        check: (_) => true, // Always unlocked on first check
    },
    {
        id: "FIRST_ITEM",
        name: "นักช้อปมือใหม่",
        description: "ซื้อไอเทมจากร้านค้าครั้งแรก",
        icon: "🛒",
        goldReward: 100,
        check: (s) => s.itemsBought >= 1,
    },
    {
        id: "FIRST_ENHANCE",
        name: "ช่างตีเหล็ก",
        description: "ตีบวกไอเทมเป็นครั้งแรก",
        icon: "🔨",
        goldReward: 150,
        check: (s) => s.enhancementsMax >= 1,
    },
    {
        id: "BOSS_SLAYER",
        name: "ผู้พิชิตบอส",
        description: "ร่วมพิชิต World Boss สำเร็จ",
        icon: "⚔️",
        goldReward: 300,
        check: (s) => s.bossesDefeated >= 1,
    },
    {
        id: "SCORE_100",
        name: "นักเรียนดีเด่น",
        description: "ได้คะแนนวิชาการรวมถึง 100 คะแนน",
        icon: "📚",
        goldReward: 200,
        check: (s) => s.academicTotal >= 100,
    },
    {
        id: "BEHAVIOR_500",
        name: "ยอดเยี่ยมด้านพฤติกรรม",
        description: "มีคะแนนพฤติกรรมสะสม 500 คะแนนขึ้นไป",
        icon: "💎",
        goldReward: 200,
        check: (s) => s.points >= 500,
    },
    {
        id: "ENHANCE_5",
        name: "ผู้ครองเกราะเทพ",
        description: "ตีบวกไอเทมขึ้นถึงระดับ +5",
        icon: "🏆",
        goldReward: 500,
        check: (s) => s.enhancementsMax >= 5,
    },
    {
        id: "BEHAVIOR_5000",
        name: "ตำนานแห่งห้องเรียน",
        description: "มีคะแนนพฤติกรรมสะสม 5,000 คะแนนขึ้นไป",
        icon: "👑",
        goldReward: 1000,
        check: (s) => s.points >= 5000,
    },
];
/**
 * Checks for newly unlocked achievements and grants rewards.
 * Returns a list of newly unlocked achievement IDs.
 */
async function checkAndGrantAchievements(studentId) {
    // 1. Fetch student with all data needed
    const student = await db_1.db.student.findUnique({
        where: { id: studentId },
        include: {
            items: true,
            achievements: true,
            history: { where: { reason: { contains: "รางวัลพิชิต" } } },
            submissions: { select: { score: true, assignment: { select: { type: true, checklists: true } } } },
            classroom: { select: { assignments: { select: { id: true } } } }
        }
    });
    if (!student)
        return [];
    // 2. Build stats object
    const unlockedIds = new Set(student.achievements.map((a) => a.achievementId));
    const academicTotal = student.submissions.reduce((sum, sub) => {
        var _a;
        if (((_a = sub.assignment) === null || _a === void 0 ? void 0 : _a.type) === 'checklist') {
            const items = sub.assignment.checklists || [];
            return sum + items.reduce((cs, item, i) => {
                const checked = (sub.score & (1 << i)) !== 0;
                return checked ? cs + (item.points || 1) : cs;
            }, 0);
        }
        return sum + (sub.score || 0);
    }, 0);
    const stats = {
        points: student.points,
        academicTotal,
        bossesDefeated: student.history.length,
        itemsBought: student.items.length,
        enhancementsMax: student.items.reduce((max, item) => Math.max(max, item.enhancementLevel || 0), 0),
        historyCount: student.history.length,
    };
    // 3. Find newly unlocked achievements
    const newlyUnlocked = [];
    for (const achievement of exports.ACHIEVEMENTS) {
        if (!unlockedIds.has(achievement.id) && achievement.check(stats)) {
            newlyUnlocked.push(achievement);
        }
    }
    if (newlyUnlocked.length === 0)
        return [];
    // 4. Grant rewards and save to DB
    const totalGold = newlyUnlocked.reduce((sum, a) => sum + a.goldReward, 0);
    const currentStats = student.gameStats || { gold: 0 };
    await db_1.db.$transaction([
        // Save achievements
        ...newlyUnlocked.map(a => db_1.db.studentAchievement.create({
            data: {
                studentId,
                achievementId: a.id,
                goldRewarded: a.goldReward,
            }
        })),
        // Grant gold + history entries
        db_1.db.student.update({
            where: { id: studentId },
            data: {
                gameStats: { ...currentStats, gold: (currentStats.gold || 0) + totalGold },
                history: {
                    create: newlyUnlocked.map(a => ({
                        reason: `🏆 ปลดล็อก Achievement: ${a.name}`,
                        value: a.goldReward,
                        timestamp: new Date()
                    }))
                }
            }
        })
    ]);
    return newlyUnlocked;
}
