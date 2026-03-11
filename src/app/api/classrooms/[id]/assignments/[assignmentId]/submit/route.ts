import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";

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
            select: { id: true }
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

        // Apply World Boss Damage
        const damage = 10 + score; // Base 10 + score as bonus
        const updatedBoss = await IdleEngine.applyBossDamage(id, damage);

        return NextResponse.json({ 
            score, 
            correct, 
            total: questions.length, 
            submissionId: submission.id,
            updatedBoss
        });

    } catch (error) {
        console.error("[QUIZ_SUBMIT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
