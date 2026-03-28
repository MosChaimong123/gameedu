"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
async function GET(_req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { code } = await params;
        const student = await db_1.db.student.findUnique({ where: { loginCode: code.toUpperCase() } });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        const materials = await db_1.db.material.findMany({
            where: { studentId: student.id },
            orderBy: { type: "asc" },
        });
        return server_1.NextResponse.json({ materials });
    }
    catch (error) {
        console.error("[MATERIALS_GET]", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
