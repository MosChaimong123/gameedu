import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  INTERNAL_ERROR_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { calcAssignmentEXP, getNegamonSettings } from "@/lib/classroom-utils";
import { gradeWorksheetSubmission } from "@/lib/grade-worksheet-submission";
import { notifyNegamonRankUpIfNeeded } from "@/lib/negamon/negamon-rank-notify";
import {
  loadWorksheetTakeContext,
  WORKSHEET_ERR_BAD_REQUEST,
} from "@/lib/worksheet-take-context";
import type { WorksheetStudentAnswers } from "@/lib/worksheet-schema";

async function awardWorksheetNegamonExpIfEligible(input: {
  classId: string;
  studentId: string;
  assignmentName: string;
  score: number;
  maxScore: number;
  hasPreviousSubmission: boolean;
  hasManualReviewItems: boolean;
}) {
  if (input.hasPreviousSubmission || input.hasManualReviewItems) {
    return null;
  }

  const classroom = await db.classroom.findUnique({
    where: { id: input.classId },
    select: { levelConfig: true, gamifiedSettings: true },
  });
  const negamon = getNegamonSettings(classroom?.gamifiedSettings);
  if (!classroom || !negamon?.enabled) {
    return null;
  }

  const expBonus = calcAssignmentEXP(
    input.score,
    Math.max(1, input.maxScore),
    negamon.expPerPoint
  );
  if (expBonus <= 0) {
    return null;
  }

  const before = await db.student.findUnique({
    where: { id: input.studentId },
    select: { behaviorPoints: true, loginCode: true },
  });
  if (!before) {
    return null;
  }

  const pct = Math.round((input.score / Math.max(1, input.maxScore)) * 100);
  const after = await db.student.update({
    where: { id: input.studentId },
    data: {
      behaviorPoints: { increment: expBonus },
      history: {
        create: {
          value: expBonus,
          reason: `Negamon Worksheet: ${input.assignmentName} (${pct}%)`,
        },
      },
    },
    select: { behaviorPoints: true, loginCode: true },
  });

  await notifyNegamonRankUpIfNeeded({
    studentId: input.studentId,
    loginCode: after.loginCode,
    oldPoints: before.behaviorPoints,
    newPoints: after.behaviorPoints,
    levelConfig: classroom.levelConfig,
    gamifiedSettings: classroom.gamifiedSettings,
  });

  return { expBonus };
}

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

    const content = JSON.stringify({
      mode: "worksheet",
      answers: body.answers,
      itemResults: grade.itemResults,
    });

    const submission = ctx.hasPreviousSubmission
      ? await db.assignmentSubmission.update({
          where: {
            studentId_assignmentId: {
              studentId: ctx.studentId,
              assignmentId,
            },
          },
          data: {
            score: grade.score,
            content,
            cheatingLogs: [] as Prisma.InputJsonValue,
            submittedAt: new Date(),
          },
        })
      : await db.assignmentSubmission.create({
          data: {
            studentId: ctx.studentId,
            assignmentId,
            score: grade.score,
            content,
            cheatingLogs: [] as Prisma.InputJsonValue,
          },
        });

    const reward = await awardWorksheetNegamonExpIfEligible({
      classId: id,
      studentId: ctx.studentId,
      assignmentName: ctx.assignmentName,
      score: grade.score,
      maxScore: grade.maxScore,
      hasPreviousSubmission: ctx.hasPreviousSubmission,
      hasManualReviewItems: grade.itemResults.some((item) => item.needsReview),
    });

    return NextResponse.json({
      score: grade.score,
      maxScore: grade.maxScore,
      submissionId: submission.id,
      showScoreToStudent: ctx.showScoreToStudent,
      replacedPreviousSubmission: ctx.hasPreviousSubmission,
      expBonus: reward?.expBonus ?? 0,
    });
  } catch (error) {
    console.error("[WORKSHEET_SUBMIT]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
