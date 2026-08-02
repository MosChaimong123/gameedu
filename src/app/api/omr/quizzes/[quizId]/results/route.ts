import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { getLimitsForUser } from "@/lib/plan/plan-access";
import {
  gradeOmrAnswers,
  parseOmrAnswerKey,
  parseOmrDetectedAnswers,
} from "@/lib/omr-grading";
import {
  OMR_QUESTION_COUNT,
  OMR_TEMPLATE_ID,
  isOmrStudentCode,
} from "@/lib/omr-template";

interface RouteParams {
  quizId: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { quizId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!isTeacherOrAdmin(session.user.role)) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const body = (await req.json()) as {
      studentCode?: unknown;
      answers?: unknown;
    };
    if (!isOmrStudentCode(body.studentCode)) {
      return createAppErrorResponse(
        "INVALID_PAYLOAD",
        "Student code must contain exactly 5 digits",
        400
      );
    }
    const parsedAnswers = parseOmrDetectedAnswers(body.answers);
    if (!parsedAnswers.ok) {
      return createAppErrorResponse("INVALID_PAYLOAD", parsedAnswers.message, 400);
    }

    const quiz = await db.oMRQuiz.findFirst({
      where: { id: quizId, teacherId: session.user.id },
      select: {
        id: true,
        classId: true,
        answerKey: true,
        questionCount: true,
      },
    });
    if (!quiz) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }
    if (!quiz.classId || quiz.questionCount !== OMR_QUESTION_COUNT) {
      return createAppErrorResponse(
        "INVALID_PAYLOAD",
        `Quiz must use the ${OMR_TEMPLATE_ID} template and belong to a classroom`,
        400
      );
    }

    const parsedAnswerKey = parseOmrAnswerKey(quiz.answerKey, { requireComplete: true });
    if (!parsedAnswerKey.ok) {
      return createAppErrorResponse("INVALID_PAYLOAD", parsedAnswerKey.message, 400);
    }

    const seatNumber = Number(body.studentCode);
    if (!Number.isInteger(seatNumber) || seatNumber <= 0) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Student code is invalid", 400);
    }
    const student = await db.student.findFirst({
      where: {
        classId: quiz.classId,
        order: seatNumber - 1,
      },
      select: { id: true, name: true, nickname: true, order: true },
    });
    if (!student) {
      return createAppErrorResponse(
        "INVALID_PAYLOAD",
        "Student code does not match this classroom",
        400
      );
    }

    const grading = gradeOmrAnswers(
      parsedAnswers.answers,
      parsedAnswerKey.answerKey as Record<string, "A" | "B" | "C" | "D" | "E">
    );
    const studentName = student.nickname?.trim() || student.name.trim();
    const existing = await db.oMRResult.findFirst({
      where: { quizId, studentId: student.id },
      select: { id: true },
    });

    // Re-scanning the same student's paper replaces the previous reading, so
    // only a new result consumes another monthly scan slot.
    if (!existing) {
      const limits = getLimitsForUser(
        session.user.role,
        session.user.plan,
        session.user.planStatus,
        session.user.planExpiry
      );
      if (Number.isFinite(limits.maxOmrScansPerMonth)) {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const used = await db.oMRResult.count({
          where: {
            scannedAt: { gte: start },
            quiz: { teacherId: session.user.id },
          },
        });
        if (used >= limits.maxOmrScansPerMonth) {
          return createAppErrorResponse(
            "PLAN_LIMIT_OMR_MONTHLY",
            "Monthly OMR scan limit reached for your plan",
            403
          );
        }
      }
    }

    const storedAnswers = {
      templateId: OMR_TEMPLATE_ID,
      studentCode: body.studentCode,
      detected: parsedAnswers.answers,
      graded: grading.answers,
    } as Prisma.InputJsonValue;
    const result = existing
      ? await db.oMRResult.update({
          where: { id: existing.id },
          data: {
            studentName,
            score: grading.score,
            total: grading.total,
            answers: storedAnswers,
            scannedAt: new Date(),
          },
        })
      : await db.oMRResult.create({
          data: {
            quizId,
            studentId: student.id,
            studentName,
            score: grading.score,
            total: grading.total,
            answers: storedAnswers,
          },
        });

    return NextResponse.json({
      ...result,
      grading: {
        score: grading.score,
        total: grading.total,
        studentName,
        studentCode: body.studentCode,
        answers: grading.answers,
      },
    });
  } catch (error) {
    console.error("[OMR_RESULTS_POST]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
