"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
// POST /api/student/[code]/battles/[battleId]/decline
async function POST(req, { params }) {
    try {
        const { code, battleId } = await params;
        const defender = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true }
        });
        if (!defender)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        const battle = await db_1.db.studentBattle.findUnique({ where: { id: battleId } });
        if (!battle || battle.defenderId !== defender.id) {
            return server_1.NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
        if (battle.status !== "PENDING") {
            return server_1.NextResponse.json({ error: "Already resolved" }, { status: 400 });
        }
        await db_1.db.studentBattle.update({
            where: { id: battleId },
            data: { status: "DECLINED", resolvedAt: new Date() }
        });
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
