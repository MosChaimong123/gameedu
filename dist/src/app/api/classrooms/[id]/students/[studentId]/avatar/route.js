"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
async function PATCH(req, { params }) {
    const { id, studentId } = await params;
    try {
        const { avatar, loginCode } = await req.json();
        // Verify the student belongs to this classroom + loginCode matches (public route — no session)
        const student = await db_1.db.student.findUnique({
            where: { id: studentId, classId: id },
            select: { loginCode: true }
        });
        if (!student || student.loginCode !== loginCode) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        if (!avatar || typeof avatar !== "string") {
            return new server_1.NextResponse("Invalid avatar", { status: 400 });
        }
        const updated = await db_1.db.student.update({
            where: { id: studentId },
            data: { avatar },
            select: { id: true, avatar: true }
        });
        return server_1.NextResponse.json(updated);
    }
    catch (error) {
        console.error("[AVATAR_PATCH]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
