import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { resolveQuizReviewMode, type QuizReviewMode } from "@/lib/quiz-review-policy";

export type QuizQuestionRow = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
};

export type QuizTakeContextResult =
  | {
      kind: "ok";
      studentId: string;
      assignmentName: string;
      questions: QuizQuestionRow[];
      maxScore: number;
      reviewMode: QuizReviewMode;
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
    return { kind: "denied", status: 400, message: "Bad Request" };
  }

  const student = await db.student.findFirst({
    where: {
      classId,
      OR: getStudentLoginCodeVariants(trimmed).map((loginCode) => ({ loginCode })),
    },
    select: { id: true },
  });
  if (!student) {
    return { kind: "denied", status: 404, message: "Student Not Found" };
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
      quizReviewMode: true,
      classroom: { select: { quizReviewMode: true } },
    },
  });

  if (!assignment || assignment.type !== "quiz" || !assignment.visible || !assignment.quizData) {
    return { kind: "denied", status: 400, message: "Not a quiz assignment" };
  }
  if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
    return { kind: "denied", status: 403, message: "Assignment closed" };
  }

  const existing = await db.assignmentSubmission.findUnique({
    where: {
      studentId_assignmentId: { studentId: student.id, assignmentId },
    },
    select: { score: true },
  });
  if (existing) {
    return { kind: "already_submitted", score: existing.score };
  }

  const raw = assignment.quizData as { questions?: QuizQuestionRow[] };
  const questions = Array.isArray(raw.questions) ? raw.questions : [];
  if (questions.length === 0) {
    return { kind: "denied", status: 400, message: "No questions" };
  }

  const reviewMode = resolveQuizReviewMode({
    assignmentMode: assignment.quizReviewMode,
    classroomMode: assignment.classroom?.quizReviewMode ?? null,
  });

  return {
    kind: "ok",
    studentId: student.id,
    assignmentName: assignment.name,
    questions,
    maxScore: assignment.maxScore ?? questions.length,
    reviewMode,
  };
}
