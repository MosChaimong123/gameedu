"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const quest_engine_1 = require("@/lib/game/quest-engine");
// GET /api/student/[code]/daily-quests — Get quests + today's progress
async function GET(req, { params }) {
    try {
        const { code } = await params;
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true, questProgress: true }
        });
        if (!student)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const progress = (0, quest_engine_1.getQuestProgress)(student.questProgress);
        const result = quest_engine_1.DAILY_QUESTS.map((quest) => ({
            ...quest,
            completed: progress.completedQuests.includes(quest.id),
        }));
        return server_1.NextResponse.json({ quests: result, progress });
    }
    catch (error) {
        console.error("Error fetching daily quests:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// POST /api/student/[code]/daily-quests — Complete a quest
async function POST(req, { params }) {
    try {
        const { code } = await params;
        const { questId } = await req.json();
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true }
        });
        if (!student)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const result = await (0, quest_engine_1.completeQuest)(student.id, questId);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error("Error completing daily quest:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
