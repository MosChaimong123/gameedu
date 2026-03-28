"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const idle_engine_1 = require("@/lib/game/idle-engine");
async function GET(request, { params }) {
    try {
        const { code } = await params;
        const student = await db_1.db.student.findUnique({
            where: { loginCode: code },
            select: {
                id: true,
                gameStats: true
            }
        });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        const farming = idle_engine_1.IdleEngine.getFarmingState(student);
        return server_1.NextResponse.json({
            success: true,
            farming
        });
    }
    catch (error) {
        console.error("[Farming API] GET Error:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
