"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
// POST /api/classroom/[id]/custom-achievements/award
// Body: { achievementId, studentId }
async function POST(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user))
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const { achievementId, studentId } = await req.json();
        // 1. Get classroom and find the achievement definition
        const classroom = await db_1.db.classroom.findUnique({
            where: { id },
            select: { gamifiedSettings: true }
        });
        if (!classroom)
            return server_1.NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        const settings = classroom.gamifiedSettings || {};
        const customAchievements = settings.customAchievements || [];
        const achievementDef = customAchievements.find((a) => a.id === achievementId);
        if (!achievementDef)
            return server_1.NextResponse.json({ error: "Achievement not found" }, { status: 404 });
        // 2. Check student exists and hasn't already received it
        const student = await db_1.db.student.findUnique({
            where: { id: studentId },
            select: { id: true, gameStats: true, achievements: { where: { achievementId } } }
        });
        if (!student)
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        if (student.achievements.length > 0) {
            return server_1.NextResponse.json({ error: "นักเรียนได้รับรางวัลนี้ไปแล้ว" }, { status: 400 });
        }
        // 3. Award achievement + gold (sequential operations - no replica set needed)
        const currentStats = student.gameStats || { gold: 0 };
        const newGold = (currentStats.gold || 0) + achievementDef.goldReward;
        await db_1.db.studentAchievement.create({
            data: {
                studentId,
                achievementId,
                goldRewarded: achievementDef.goldReward,
            }
        });
        await db_1.db.student.update({
            where: { id: studentId },
            data: {
                gameStats: { ...currentStats, gold: newGold },
            }
        });
        await db_1.db.pointHistory.create({
            data: {
                studentId,
                reason: `${achievementDef.icon} รางวัลพิเศษจากครู: ${achievementDef.name}`,
                value: achievementDef.goldReward,
            }
        });
        return server_1.NextResponse.json({ success: true, goldAwarded: achievementDef.goldReward });
    }
    catch (error) {
        console.error("Error awarding custom achievement:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
