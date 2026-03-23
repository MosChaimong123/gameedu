"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const achievement_engine_1 = require("@/lib/game/achievement-engine");
// GET /api/student/[code]/achievements — Get all achievements + unlock status
async function GET(req, { params }) {
    try {
        const { code } = await params;
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true, achievements: true }
        });
        if (!student)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const unlockedMap = new Map(student.achievements.map((a) => [a.achievementId, a]));
        const result = achievement_engine_1.ACHIEVEMENTS.map((def) => {
            var _a, _b, _c, _d;
            return ({
                ...def,
                unlocked: unlockedMap.has(def.id),
                unlockedAt: (_b = (_a = unlockedMap.get(def.id)) === null || _a === void 0 ? void 0 : _a.unlockedAt) !== null && _b !== void 0 ? _b : null,
                goldRewarded: (_d = (_c = unlockedMap.get(def.id)) === null || _c === void 0 ? void 0 : _c.goldRewarded) !== null && _d !== void 0 ? _d : def.goldReward,
            });
        });
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error("Error fetching achievements:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// POST /api/student/[code]/achievements — Check and grant newly unlocked achievements
async function POST(req, { params }) {
    try {
        const { code } = await params;
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true }
        });
        if (!student)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const newlyUnlocked = await (0, achievement_engine_1.checkAndGrantAchievements)(student.id);
        return server_1.NextResponse.json({
            success: true,
            newlyUnlocked: newlyUnlocked.map((a) => ({
                id: a.id,
                name: a.name,
                icon: a.icon,
                goldReward: a.goldReward,
            }))
        });
    }
    catch (error) {
        console.error("Error checking achievements:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
