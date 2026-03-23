import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";
import {
  getNewlyUnlockedSkills,
  resolveEffectiveJobKey,
} from "@/lib/game/job-system";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const { id, assignmentId } = await params;

    try {
        const { studentCode, answers } = await req.json() as { studentCode: string; answers: number[] };

        if (!studentCode || !Array.isArray(answers)) {
            return new NextResponse("Bad Request", { status: 400 });
        }

        // Look up student by loginCode in this classroom
        const student = await db.student.findFirst({
            where: { loginCode: studentCode.toUpperCase(), classId: id },
            select: {
                id: true,
                points: true,
                gameStats: true,
                jobClass: true,
                jobTier: true,
                advanceClass: true,
                jobSkills: true,
                items: {
                    where: { isEquipped: true },
                    include: { item: true }
                }
            }
        });
        if (!student) return new NextResponse("Student Not Found", { status: 404 });

        // Fetch the assignment
        const assignment = await db.assignment.findUnique({
            where: { id: assignmentId, classId: id },
            select: { type: true, quizData: true, maxScore: true }
        });
        if (!assignment || assignment.type !== "quiz" || !assignment.quizData) {
            return new NextResponse("Not a quiz assignment", { status: 400 });
        }

        // Check for existing submission (no retakes)
        const existing = await db.assignmentSubmission.findUnique({
            where: { studentId_assignmentId: { studentId: student.id, assignmentId } }
        });
        if (existing) {
            return NextResponse.json({ alreadySubmitted: true, score: existing.score }, { status: 200 });
        }

        // Grade the quiz
        const quizData = assignment.quizData as { questions: { correctAnswer: number }[] };
        const questions = quizData.questions ?? [];
        let correct = 0;
        for (let i = 0; i < questions.length; i++) {
            if (answers[i] === questions[i].correctAnswer) correct++;
        }
        const score = questions.length > 0
            ? Math.round((correct / questions.length) * assignment.maxScore)
            : 0;

        // Save submission
        const submission = await db.assignmentSubmission.create({
            data: {
                studentId: student.id,
                assignmentId,
                score,
                cheatingLogs: []
            }
        });

        // Apply World Boss Damage using the new ATK-based calculation
        const battleResult = IdleEngine.calculateBossDamage(student.points, student.items);
        const scoreMultiplier = questions.length > 0 ? (correct / questions.length) : 0;
        const finalDamage = Math.max(1, Math.round(battleResult.damage * scoreMultiplier));
        
        const updatedBoss = await IdleEngine.applyBossDamage(id, student.id, { 
            damageOverride: finalDamage,
            consumeStamina: false 
        });

        // Grant XP for submitting (10 XP base + score scaling)
        const xpGain = 10 + Math.floor(score / 10);
        const currentGameStats = (student.gameStats as any) || IdleEngine.getDefaultStats();
        const xpResult = IdleEngine.calculateXpGain(currentGameStats, xpGain);

        // Check for newly unlocked skills on level-up (Req 11.6)
        let updatedJobSkills: string[] | undefined;
        if (xpResult.leveledUp && student.jobClass) {
            const currentSkillIds = (student.jobSkills as string[]) ?? [];
            const eff = resolveEffectiveJobKey({
                jobClass: student.jobClass,
                jobTier: student.jobTier,
                advanceClass: student.advanceClass,
            });
            const newSkills = getNewlyUnlockedSkills(
                eff,
                currentGameStats.level,
                xpResult.level,
                currentSkillIds
            );
            if (newSkills.length > 0) {
                updatedJobSkills = [...currentSkillIds, ...newSkills];
            }
        }

        await db.student.update({
            where: { id: student.id },
            data: {
                gameStats: {
                    ...currentGameStats,
                    level: xpResult.level,
                    xp: xpResult.xp
                } as any,
                ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {})
            }
        });

        return NextResponse.json({ 
            score, 
            correct, 
            total: questions.length, 
            submissionId: submission.id,
            updatedBoss,
            xpGained: xpGain,
            leveledUp: xpResult.leveledUp
        });

    } catch (error) {
        console.error("[QUIZ_SUBMIT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
