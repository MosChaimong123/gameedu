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
import { parseOmrAnswerKey } from "@/lib/omr-grading";
import { OMR_QUESTION_COUNT, OMR_TEMPLATE_ID } from "@/lib/omr-template";

interface RouteParams {
  quizId: string;
}

async function requireOwnedQuiz(quizId: string, teacherId: string) {
  return db.oMRQuiz.findFirst({
    where: { id: quizId, teacherId },
    select: { id: true },
  });
}

export async function GET(
  _req: Request,
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

    const quiz = await db.oMRQuiz.findFirst({
      where: { id: quizId, teacherId: session.user.id },
      include: {
        classroom: { select: { id: true, name: true } },
        results: {
          orderBy: { scannedAt: "desc" },
          include: { student: { select: { name: true, nickname: true, order: true } } },
        },
      },
    });
    if (!quiz) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }
    return NextResponse.json(quiz);
  } catch (error) {
    console.error("[OMR_QUIZ_GET]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}

export async function PUT(
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
    if (!(await requireOwnedQuiz(quizId, session.user.id))) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    const body = (await req.json()) as Record<string, unknown>;
    if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Title is required", 400);
    }
    if (
      body.description !== undefined &&
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Description must be a string", 400);
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

    let normalizedAnswerKey: Record<string, string> | undefined;
    if (body.answerKey !== undefined) {
      const parsed = parseOmrAnswerKey(body.answerKey);
      if (!parsed.ok) {
        return createAppErrorResponse("INVALID_PAYLOAD", parsed.message, 400);
      }
      normalizedAnswerKey = parsed.answerKey;
    }

    let normalizedClassId: string | undefined;
    if (body.classId !== undefined) {
      if (typeof body.classId !== "string" || !body.classId.trim()) {
        return createAppErrorResponse("INVALID_PAYLOAD", "Classroom is required", 400);
      }
      const classroom = await db.classroom.findFirst({
        where: { id: body.classId.trim(), teacherId: session.user.id },
        select: { id: true },
      });
      if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
      }
      normalizedClassId = classroom.id;
    }

    const quiz = await db.oMRQuiz.update({
      where: { id: quizId },
      data: {
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined
          ? {
              description:
                typeof body.description === "string"
                  ? body.description.trim() || null
                  : null,
            }
          : {}),
        ...(normalizedAnswerKey ? { answerKey: normalizedAnswerKey } : {}),
        ...(normalizedClassId ? { classId: normalizedClassId } : {}),
        questionCount: OMR_QUESTION_COUNT,
      },
      include: {
        classroom: { select: { id: true, name: true } },
        results: {
          orderBy: { scannedAt: "desc" },
          include: { student: { select: { name: true, nickname: true, order: true } } },
        },
      },
    });
    return NextResponse.json(quiz);
  } catch (error) {
    console.error("[OMR_QUIZ_PUT]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}

export async function DELETE(
  _req: Request,
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
    if (!(await requireOwnedQuiz(quizId, session.user.id))) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }
    await db.oMRQuiz.delete({ where: { id: quizId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[OMR_QUIZ_DELETE]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
