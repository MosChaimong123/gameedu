import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { resolveQuizReviewMode, type QuizReviewMode } from "@/lib/quiz-review-policy";
import {
    getQuizExpiresAt,
    getQuizSecondsRemaining,
    isQuizAttemptExpired,
    isQuizSubmissionCompleted,
    isQuizSubmissionInProgress,
} from "@/lib/quiz-attempt";
import {
    QUIZ_PLAIN_ERR_ASSIGNMENT_CLOSED,
    QUIZ_PLAIN_ERR_BAD_REQUEST,
    QUIZ_PLAIN_ERR_NO_QUESTIONS,
    QUIZ_PLAIN_ERR_NOT_QUIZ_ASSIGNMENT,
    QUIZ_PLAIN_ERR_STUDENT_NOT_FOUND,
    QUIZ_PLAIN_ERR_TIME_EXPIRED,
} from "@/lib/quiz-load-error-messages";

export type QuizQuestionRow = {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
};

export type QuizTimerState = {
    timeLimitMinutes: number | null;
    attemptStartedAt: string;
    expiresAt: string | null;
    secondsRemaining: number | null;
};

export type QuizTakeContextResult =
    | {
          kind: "ok";
          studentId: string;
          assignmentName: string;
          questions: QuizQuestionRow[];
          maxScore: number;
          reviewMode: QuizReviewMode;
          timer: QuizTimerState | null;
      }
    | { kind: "already_submitted"; score: number }
    | { kind: "denied"; status: number; message: string };

/**
 * โหลดบริบทการทำควิซ (นักเรียนในห้อง, งานยังเปิด, ยังไม่ส่ง)
 * ใช้ร่วมกับ submit / ดึงข้อทีละข้อ / เช็คคำตอบทีละข้อ
 */
export async function loadQuizTakeContext(
    classId: string,
    assignmentId: string,
    studentCode: string
): Promise<QuizTakeContextResult> {
    const trimmed = studentCode.trim();
    if (!trimmed) {
        return { kind: "denied", status: 400, message: QUIZ_PLAIN_ERR_BAD_REQUEST };
    }

    const student = await db.student.findFirst({
        where: {
            classId,
            OR: getStudentLoginCodeVariants(trimmed).map((loginCode) => ({ loginCode })),
        },
        select: { id: true },
    });
    if (!student) {
        return { kind: "denied", status: 404, message: QUIZ_PLAIN_ERR_STUDENT_NOT_FOUND };
    }

    const assignment = await db.assignment.findUnique({
        where: { id: assignmentId, classId },
        select: {
            type: true,
            name: true,
            quizData: true,
            maxScore: true,
            visible: true,
            deadline: true,
            timeLimitMinutes: true,
            quizReviewMode: true,
            classroom: { select: { quizReviewMode: true } },
        },
    });

    if (!assignment || assignment.type !== "quiz" || !assignment.visible || !assignment.quizData) {
        return { kind: "denied", status: 400, message: QUIZ_PLAIN_ERR_NOT_QUIZ_ASSIGNMENT };
    }
    if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
        return { kind: "denied", status: 403, message: QUIZ_PLAIN_ERR_ASSIGNMENT_CLOSED };
    }

    const existing = await db.assignmentSubmission.findUnique({
        where: {
            studentId_assignmentId: { studentId: student.id, assignmentId },
        },
        select: { score: true, attemptStartedAt: true, quizCompletedAt: true },
    });

    if (existing && isQuizSubmissionCompleted(existing)) {
        return { kind: "already_submitted", score: existing.score };
    }

    if (
        existing &&
        isQuizSubmissionInProgress(existing) &&
        existing.attemptStartedAt &&
        isQuizAttemptExpired(existing.attemptStartedAt, assignment.timeLimitMinutes)
    ) {
        return { kind: "denied", status: 403, message: QUIZ_PLAIN_ERR_TIME_EXPIRED };
    }

    const raw = assignment.quizData as { questions?: QuizQuestionRow[] };
    const questions = Array.isArray(raw.questions) ? raw.questions : [];
    if (questions.length === 0) {
        return { kind: "denied", status: 400, message: QUIZ_PLAIN_ERR_NO_QUESTIONS };
    }

    const reviewMode = resolveQuizReviewMode({
        assignmentMode: assignment.quizReviewMode,
        classroomMode: assignment.classroom?.quizReviewMode ?? null,
    });

    const limitMinutes = assignment.timeLimitMinutes ?? null;
    let timer: QuizTimerState | null = null;
    if (limitMinutes != null && limitMinutes > 0) {
        const startedAt =
            existing?.attemptStartedAt && isQuizSubmissionInProgress(existing)
                ? existing.attemptStartedAt
                : new Date();
        const expiresAt = getQuizExpiresAt(startedAt, limitMinutes);
        timer = {
            timeLimitMinutes: limitMinutes,
            attemptStartedAt: startedAt.toISOString(),
            expiresAt: expiresAt?.toISOString() ?? null,
            secondsRemaining: getQuizSecondsRemaining(startedAt, limitMinutes),
        };
    }

    return {
        kind: "ok",
        studentId: student.id,
        assignmentName: assignment.name,
        questions,
        maxScore: assignment.maxScore ?? questions.length,
        reviewMode,
        timer,
    };
}

/** เริ่มจับเวลาเมื่อนักเรียนเปิดข้อแรก (สร้างแถว in_progress) */
export async function ensureQuizAttemptStarted(input: {
    studentId: string;
    assignmentId: string;
}): Promise<{ attemptStartedAt: Date }> {
    const existing = await db.assignmentSubmission.findUnique({
        where: {
            studentId_assignmentId: {
                studentId: input.studentId,
                assignmentId: input.assignmentId,
            },
        },
        select: { score: true, attemptStartedAt: true, quizCompletedAt: true },
    });

    if (existing && isQuizSubmissionCompleted(existing)) {
        return { attemptStartedAt: existing.attemptStartedAt ?? new Date() };
    }

    if (existing?.attemptStartedAt && isQuizSubmissionInProgress(existing)) {
        return { attemptStartedAt: existing.attemptStartedAt };
    }

    const startedAt = new Date();
    await db.assignmentSubmission.upsert({
        where: {
            studentId_assignmentId: {
                studentId: input.studentId,
                assignmentId: input.assignmentId,
            },
        },
        create: {
            studentId: input.studentId,
            assignmentId: input.assignmentId,
            score: 0,
            attemptStartedAt: startedAt,
            quizCompletedAt: null,
        },
        update: {
            attemptStartedAt: startedAt,
        },
    });

    return { attemptStartedAt: startedAt };
}
