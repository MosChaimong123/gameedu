"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const idle_engine_1 = require("@/lib/game/idle-engine");
async function POST(request, { params }) {
    try {
        const { code } = await params;
        const { skillId } = await request.json();
        if (!skillId) {
            return server_1.NextResponse.json({ error: "Missing skillId" }, { status: 400 });
        }
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code },
            select: { id: true }
        });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        const result = await idle_engine_1.IdleEngine.useSkillOnMonster(student.id, skillId);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error("[Farming API] Skill Error:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
