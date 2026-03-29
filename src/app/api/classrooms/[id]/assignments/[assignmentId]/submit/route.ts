import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

        const student = await db.student.findFirst({
            where: { loginCode: studentCode.toUpperCase(), classId: id },
            select: { id: true },
        });
        if (!student) return new NextResponse("Student Not Found", { status: 404 });

        const assignment = await db.assignment.findUnique({
            where: { id: assignmentId, classId: id },
            select: { type: true, quizData: true, maxScore: true }
        });
        if (!assignment || assignment.type !== "quiz" || !assignment.quizData) {
            return new NextResponse("Not a quiz assignment", { status: 400 });
        }

        const existing = await db.assignmentSubmission.findUnique({
            where: { studentId_assignmentId: { studentId: student.id, assignmentId } }
        });
        if (existing) {
            return NextResponse.json({ alreadySubmitted: true, score: existing.score }, { status: 200 });
        }

        const quizData = assignment.quizData as { questions: { correctAnswer: number }[] };
        const questions = quizData.questions ?? [];
        let correct = 0;
        for (let i = 0; i < questions.length; i++) {
            if (answers[i] === questions[i].correctAnswer) correct++;
        }
        const score = questions.length > 0
            ? Math.round((correct / questions.length) * assignment.maxScore)
            : 0;

        const submission = await db.assignmentSubmission.create({
            data: {
                studentId: student.id,
                assignmentId,
                score,
                cheatingLogs: []
            }
        });

        return NextResponse.json({
            score,
            correct,
            total: questions.length,
            submissionId: submission.id,
        });

    } catch (error) {
        console.error("[QUIZ_SUBMIT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
