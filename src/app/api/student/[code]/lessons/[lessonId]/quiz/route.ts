import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLessonQuizDraft } from "@/lib/lessons/lesson-quiz";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ code: string; lessonId: string }> }
) {
    const { code, lessonId } = await params;

    const loginCode = code.trim();
    if (!loginCode) {
        return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
    }

    const student = await db.student.findFirst({
        where: { OR: getStudentLoginCodeVariants(loginCode).map((candidate) => ({ loginCode: candidate })) },
        select: { id: true, classId: true },
    });
    if (!student) {
        return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }

    const assignment = await db.lessonAssignment.findFirst({
        where: {
            classId: student.classId,
            lesson: { id: lessonId, status: "PUBLISHED" },
        },
        include: {
            lesson: { select: { content: true } },
        },
    });
    if (!assignment?.lesson) {
        return NextResponse.json({ error: "LESSON_NOT_FOUND" }, { status: 404 });
    }

    const draft = getLessonQuizDraft(assignment.lesson.content);
    if (!draft) {
        return NextResponse.json({ error: "QUIZ_NOT_READY" }, { status: 404 });
    }

    return NextResponse.json(draft.questions);
}
