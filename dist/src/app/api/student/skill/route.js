"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const idle_engine_1 = require("@/lib/game/idle-engine");
/**
 * POST /api/student/skill
 * Body: { skillId: string, studentId: string, classId: string }
 */
async function POST(req) {
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const { skillId, studentId, classId } = body;
        if (!skillId || !studentId || !classId) {
            return server_1.NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        // 1. Security check: User must own the student record
        const student = await db_1.db.student.findUnique({
            where: { id: studentId },
            select: { userId: true }
        });
        if (!student || student.userId !== session.user.id) {
            return server_1.NextResponse.json({ error: "Forbidden: You don't own this character" }, { status: 403 });
        }
        // 2. Process skill via IdleEngine
        const result = await idle_engine_1.IdleEngine.useSkill(studentId, skillId, classId);
        if (result.error) {
            return server_1.NextResponse.json({ error: result.error }, { status: 400 });
        }
        return server_1.NextResponse.json(result);
    }
    catch (err) {
        console.error("[SKILL_API_ERROR]", err);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
