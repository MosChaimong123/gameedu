"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
async function POST(req, { params }) {
    var _a;
    try {
        const { id: classroomId } = await params;
        const session = await (0, auth_1.auth)();
        const body = await req.json();
        const { bossName, maxHp, rewardGold, deadline, image } = body;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // 1. Verify teacher owns the classroom
        const classroom = await db_1.db.classroom.findUnique({
            where: { id: classroomId },
            select: { teacherId: true },
        });
        if (!classroom || classroom.teacherId !== session.user.id) {
            return server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        // 2. Update classroom with boss settings
        const updatedClassroom = await db_1.db.classroom.update({
            where: { id: classroomId },
            data: {
                gamifiedSettings: {
                    boss: {
                        active: true,
                        name: bossName || "มังกรแห่งความเกียจคร้าน",
                        maxHp: maxHp || 1000,
                        currentHp: maxHp || 1000,
                        rewardGold: rewardGold || 500,
                        image: image || "/assets/monsters/lethargy_dragon.png",
                        deadline: deadline || null,
                        createdAt: new Date().toISOString(),
                    }
                }
            }
        });
        return server_1.NextResponse.json({
            success: true,
            boss: updatedClassroom.gamifiedSettings.boss,
        });
    }
    catch (error) {
        console.error("Error summoning boss:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
async function DELETE(req, { params }) {
    var _a;
    try {
        const { id: classroomId } = await params;
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // 1. Verify teacher
        const classroom = await db_1.db.classroom.findUnique({
            where: { id: classroomId },
            select: { teacherId: true },
        });
        if (!classroom || classroom.teacherId !== session.user.id) {
            return server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        // 2. Remove boss
        await db_1.db.classroom.update({
            where: { id: classroomId },
            data: {
                gamifiedSettings: null,
            }
        });
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("Error dismissing boss:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
