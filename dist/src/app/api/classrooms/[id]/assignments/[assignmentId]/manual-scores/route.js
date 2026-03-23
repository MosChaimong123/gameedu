"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
const idle_engine_1 = require("@/lib/game/idle-engine");
async function POST(req, { params }) {
    const { id, assignmentId } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const { studentId, score } = await req.json();
        if (!studentId || score === undefined) {
            return new server_1.NextResponse("Missing data", { status: 400 });
        }
        // Fetch student items for damage calculation
        const student = await db_1.db.student.findUnique({
            where: { id: studentId },
            select: {
                points: true,
                items: {
                    where: { isEquipped: true },
                    include: { item: true }
                }
            }
        });
        // Verify Class Ownership & Assignment Existence
        const assignment = await db_1.db.assignment.findUnique({
            where: {
                id: assignmentId,
                classId: id,
                classroom: {
                    teacherId: session.user.id
                }
            }
        });
        if (!assignment) {
            return new server_1.NextResponse("Assignment not found or unauthorized", { status: 404 });
        }
        // Upsert Submission
        const submission = await db_1.db.assignmentSubmission.upsert({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId
                }
            },
            update: {
                score: score
            },
            create: {
                studentId,
                assignmentId,
                score: score,
                cheatingLogs: []
            }
        });
        // Apply World Boss Damage using the new ATK-based calculation
        const battleResult = idle_engine_1.IdleEngine.calculateBossDamage((student === null || student === void 0 ? void 0 : student.points) || 0, (student === null || student === void 0 ? void 0 : student.items) || []);
        const scoreMultiplier = assignment.maxScore > 0 ? (score / assignment.maxScore) : 0;
        const finalDamage = Math.max(1, Math.round(battleResult.damage * scoreMultiplier));
        const updatedBoss = await idle_engine_1.IdleEngine.applyBossDamage(id, studentId, {
            damageOverride: finalDamage,
            consumeStamina: false
        });
        return server_1.NextResponse.json({
            ...submission,
            updatedBoss
        });
    }
    catch (error) {
        console.error("[MANUAL_SCORE_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
