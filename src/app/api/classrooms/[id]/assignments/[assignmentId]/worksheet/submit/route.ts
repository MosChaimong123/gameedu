import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  INTERNAL_ERROR_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { gradeWorksheetSubmission } from "@/lib/grade-worksheet-submission";
import {
  loadWorksheetTakeContext,
  WORKSHEET_ERR_BAD_REQUEST,
} from "@/lib/worksheet-take-context";
import type { WorksheetStudentAnswers } from "@/lib/worksheet-schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await params;

  try {
    const body = (await req.json()) as {
      studentCode?: string;
      answers?: WorksheetStudentAnswers;
    };

    if (!body.studentCode || !body.answers || typeof body.answers !== "object") {
      return createAppErrorResponse("INVALID_PAYLOAD", WORKSHEET_ERR_BAD_REQUEST, 400);
    }

    const ctx = await loadWorksheetTakeContext(id, assignmentId, body.studentCode);
    if (ctx.kind === "denied") {
      const code = ctx.status === 404 ? "NOT_FOUND" : ctx.status === 403 ? "FORBIDDEN" : "INVALID_PAYLOAD";
      return createAppErrorResponse(code, ctx.message, ctx.status);
    }
    if (ctx.kind === "already_submitted") {
      return NextResponse.json({ alreadySubmitted: true, score: ctx.score }, { status: 200 });
    }

    const grade = gradeWorksheetSubmission(ctx.worksheet, body.answers);

    const submission = await db.assignmentSubmission.create({
      data: {
        studentId: ctx.studentId,
        assignmentId,
        score: grade.score,
        content: JSON.stringify({
          mode: "worksheet",
          answers: body.answers,
          itemResults: grade.itemResults,
        }),
        cheatingLogs: [] as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      score: grade.score,
      maxScore: grade.maxScore,
      submissionId: submission.id,
      showScoreToStudent: ctx.showScoreToStudent,
    });
  } catch (error) {
    console.error("[WORKSHEET_SUBMIT]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
