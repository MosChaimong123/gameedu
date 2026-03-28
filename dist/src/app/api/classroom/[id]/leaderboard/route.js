"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const idle_engine_1 = require("@/lib/game/idle-engine");
// GET /api/classroom/[id]/leaderboard
// Returns students ranked by gold, points, and achievement count
async function GET(req, { params }) {
    try {
        const { id } = await params;
        const students = await db_1.db.student.findMany({
            where: { classId: id },
            select: {
                id: true,
                name: true,
                avatar: true,
                points: true,
                gameStats: true,
                achievements: { select: { id: true } },
                items: {
                    where: { isEquipped: true },
                    include: { item: true }
                }
            }
        });
        const ranked = students
            .map((s) => {
            var _a;
            const stats = idle_engine_1.IdleEngine.calculateCharacterStats(s.points, s.items);
            return {
                id: s.id,
                name: s.name,
                avatar: s.avatar,
                points: s.points,
                gold: ((_a = s.gameStats) === null || _a === void 0 ? void 0 : _a.gold) || 0,
                achievementCount: s.achievements.length,
                equippedCount: s.items.length,
                hp: stats.hp,
                atk: stats.atk,
                def: stats.def
            };
        })
            .sort((a, b) => b.gold - a.gold) // Primary: gold
            .map((s, idx) => ({ ...s, rank: idx + 1 }));
        return server_1.NextResponse.json(ranked);
    }
    catch (error) {
        console.error("Error fetching leaderboard:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
