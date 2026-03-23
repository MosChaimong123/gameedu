"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const idle_engine_1 = require("@/lib/game/idle-engine");
const job_system_1 = require("@/lib/game/job-system");
async function POST(req, { params }) {
    var _a, _b;
    const { id, assignmentId } = await params;
    try {
        const { studentCode, answers } = await req.json();
        if (!studentCode || !Array.isArray(answers)) {
            return new server_1.NextResponse("Bad Request", { status: 400 });
        }
        // Look up student by loginCode in this classroom
        const student = await db_1.db.student.findFirst({
            where: { loginCode: studentCode.toUpperCase(), classId: id },
            select: {
                id: true,
                points: true,
                gameStats: true,
                jobClass: true,
                jobSkills: true,
                items: {
                    where: { isEquipped: true },
                    include: { item: true }
                }
            }
        });
        if (!student)
            return new server_1.NextResponse("Student Not Found", { status: 404 });
        // Fetch the assignment
        const assignment = await db_1.db.assignment.findUnique({
            where: { id: assignmentId, classId: id },
            select: { type: true, quizData: true, maxScore: true }
        });
        if (!assignment || assignment.type !== "quiz" || !assignment.quizData) {
            return new server_1.NextResponse("Not a quiz assignment", { status: 400 });
        }
        // Check for existing submission (no retakes)
        const existing = await db_1.db.assignmentSubmission.findUnique({
            where: { studentId_assignmentId: { studentId: student.id, assignmentId } }
        });
        if (existing) {
            return server_1.NextResponse.json({ alreadySubmitted: true, score: existing.score }, { status: 200 });
        }
        // Grade the quiz
        const quizData = assignment.quizData;
        const questions = (_a = quizData.questions) !== null && _a !== void 0 ? _a : [];
        let correct = 0;
        for (let i = 0; i < questions.length; i++) {
            if (answers[i] === questions[i].correctAnswer)
                correct++;
        }
        const score = questions.length > 0
            ? Math.round((correct / questions.length) * assignment.maxScore)
            : 0;
        // Save submission
        const submission = await db_1.db.assignmentSubmission.create({
            data: {
                studentId: student.id,
                assignmentId,
                score,
                cheatingLogs: []
            }
        });
        // Apply World Boss Damage using the new ATK-based calculation
        const battleResult = idle_engine_1.IdleEngine.calculateBossDamage(student.points, student.items);
        const scoreMultiplier = questions.length > 0 ? (correct / questions.length) : 0;
        const finalDamage = Math.max(1, Math.round(battleResult.damage * scoreMultiplier));
        const updatedBoss = await idle_engine_1.IdleEngine.applyBossDamage(id, student.id, {
            damageOverride: finalDamage,
            consumeStamina: false
        });
        // Grant XP for submitting (10 XP base + score scaling)
        const xpGain = 10 + Math.floor(score / 10);
        const currentGameStats = student.gameStats || idle_engine_1.IdleEngine.getDefaultStats();
        const xpResult = idle_engine_1.IdleEngine.calculateXpGain(currentGameStats, xpGain);
        // Check for newly unlocked skills on level-up (Req 11.6)
        let updatedJobSkills;
        if (xpResult.leveledUp && student.jobClass) {
            const currentSkillIds = (_b = student.jobSkills) !== null && _b !== void 0 ? _b : [];
            const newSkills = (0, job_system_1.getNewlyUnlockedSkills)(student.jobClass, currentGameStats.level, xpResult.level, currentSkillIds);
            if (newSkills.length > 0) {
                updatedJobSkills = [...currentSkillIds, ...newSkills];
            }
        }
        await db_1.db.student.update({
            where: { id: student.id },
            data: {
                gameStats: {
                    ...currentGameStats,
                    level: xpResult.level,
                    xp: xpResult.xp
                },
                ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {})
            }
        });
        return server_1.NextResponse.json({
            score,
            correct,
            total: questions.length,
            submissionId: submission.id,
            updatedBoss,
            xpGained: xpGain,
            leveledUp: xpResult.leveledUp
        });
    }
    catch (error) {
        console.error("[QUIZ_SUBMIT]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
