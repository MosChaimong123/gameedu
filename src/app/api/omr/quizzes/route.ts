import { NextResponse } from "next/server";
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
import { OMR_QUESTION_COUNT, OMR_TEMPLATE_ID } from "@/lib/omr-template";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!isTeacherOrAdmin(session.user.role)) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const quizzes = await db.oMRQuiz.findMany({
      where: { teacherId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        classroom: { select: { id: true, name: true } },
        results: { orderBy: { scannedAt: "desc" } },
        _count: { select: { results: true } },
      },
    });
    return NextResponse.json(quizzes);
  } catch (error) {
    console.error("[OMR_QUIZZES_GET]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!isTeacherOrAdmin(session.user.role)) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      classId?: unknown;
      questionCount?: unknown;
    };
    if (typeof body.title !== "string" || !body.title.trim()) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Title is required", 400);
    }
    if (
      body.description !== undefined &&
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Description must be a string", 400);
    }
    if (typeof body.classId !== "string" || !body.classId.trim()) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Classroom is required", 400);
    }
    if (
      body.questionCount !== undefined &&
      body.questionCount !== OMR_QUESTION_COUNT
    ) {
      return createAppErrorResponse(
        "INVALID_PAYLOAD",
        `Only the ${OMR_QUESTION_COUNT}-question ${OMR_TEMPLATE_ID} template is supported`,
        400
      );
    }

    const classroom = await db.classroom.findFirst({
      where: { id: body.classId.trim(), teacherId: session.user.id },
      select: { id: true },
    });
    if (!classroom) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    const answerKey = Object.fromEntries(
      Array.from({ length: OMR_QUESTION_COUNT }, (_, index) => [String(index + 1), ""])
    );
    const quiz = await db.oMRQuiz.create({
      data: {
        title: body.title.trim(),
        description:
          typeof body.description === "string" ? body.description.trim() || null : null,
        questionCount: OMR_QUESTION_COUNT,
        answerKey,
        teacherId: session.user.id,
        classId: classroom.id,
      },
      include: {
        classroom: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
    });
    return NextResponse.json(quiz);
  } catch (error) {
    console.error("[OMR_QUIZZES_POST]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
