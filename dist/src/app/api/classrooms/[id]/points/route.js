"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const notifications_1 = require("@/lib/notifications");
const idle_engine_1 = require("@/lib/game/idle-engine");
async function POST(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { studentId, skillId, weight } = body;
        if (!studentId || !skillId) {
            return new server_1.NextResponse("Missing data", { status: 400 });
        }
        // Verify Class Ownership
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        // Get Skill details
        const skill = await db_1.db.skill.findUnique({
            where: { id: skillId }
        });
        if (!skill) {
            return new server_1.NextResponse("Skill not found", { status: 404 });
        }
        // Update Student Points
        const updatedStudent = await db_1.db.student.update({
            where: { id: studentId },
            data: {
                points: { increment: skill.weight },
                history: {
                    create: {
                        skillId: skill.id,
                        reason: skill.name,
                        value: skill.weight
                    }
                }
            }
        });
        // Trigger Stamina Refill if good deed is significant
        if (skill.weight >= 10) {
            await idle_engine_1.IdleEngine.handleStaminaRefill(studentId, skill.weight);
        }
        // Send Notification to Student
        await (0, notifications_1.sendNotification)({
            studentId,
            title: skill.weight > 0 ? "ได้รับคะแนน!" : "โดนหักคะแนน!",
            message: `คุณได้รับ ${skill.weight} คะแนน ในทักษะ: ${skill.name}`,
            type: "POINT",
            link: `/student/${updatedStudent.loginCode}`
        });
        return server_1.NextResponse.json(updatedStudent);
    }
    catch (error) {
        console.error("[POINTS_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
