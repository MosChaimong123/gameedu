import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseWorksheetDataFromAssignmentPayload } from "@/lib/worksheet-assignment";
import { parseWorksheetSubmissionContent } from "@/lib/worksheet-review";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type ReviewPatchBody = {
  itemScores?: Record<string, number>;
};

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; assignmentId: string; submissionId: string }>;
  }
) {
  try {
    const session = await auth();
    const { id, assignmentId, submissionId } = await params;

    if (!session?.user?.id) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const classroom = await db.classroom.findUnique({
      where: { id, teacherId: session.user.id },
      select: { id: true },
    });

    if (!classroom) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        classId: true,
        type: true,
        quizData: true,
      },
    });

    if (!assignment || assignment.classId !== id) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    if (String(assignment.type).toLowerCase() !== "worksheet") {
      return createAppErrorResponse("INVALID_PAYLOAD", "Assignment is not a worksheet", 400);
    }

    const worksheet = parseWorksheetDataFromAssignmentPayload(assignment.quizData);
    if (!worksheet) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Worksheet data is invalid", 400);
    }

    const submission = await db.assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        assignmentId: true,
        score: true,
        content: true,
      },
    });

    if (!submission || submission.assignmentId !== assignmentId) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    const parsedContent = parseWorksheetSubmissionContent(submission.content);
    if (!parsedContent) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Worksheet submission data is invalid", 400);
    }

    const body = (await req.json()) as ReviewPatchBody;
    const itemScores = body.itemScores ?? {};
    const allowedScoreMap = new Map(
      worksheet.pages.flatMap((page) =>
        page.items
          .filter((item) => {
            if (item.type === "short_text" || item.type === "media_prompt") {
              return item.answer.reviewMode === "manual";
            }
            return item.type === "file_upload" || item.type === "speaking";
          })
          .map((item) => {
            if (item.type === "short_text" || item.type === "media_prompt") {
              return [item.id, item.answer.points] as const;
            }
            if (item.type === "file_upload" || item.type === "speaking") {
              return [item.id, item.points] as const;
            }
            return null;
          })
          .filter((entry): entry is readonly [string, number] => entry !== null)
      )
    );

    const nextItemResults = parsedContent.itemResults.map((itemResult) => {
      if (!itemResult.needsReview) {
        return itemResult;
      }

      const requestedScore = itemScores[itemResult.itemId];
      if (typeof requestedScore !== "number" || Number.isNaN(requestedScore)) {
        return itemResult;
      }

      const allowedMax = allowedScoreMap.get(itemResult.itemId) ?? itemResult.maxScore;
      const clampedScore = Math.max(0, Math.min(allowedMax, Math.round(requestedScore)));

      return {
        ...itemResult,
        score: clampedScore,
        maxScore: allowedMax,
        correct: clampedScore === allowedMax ? true : clampedScore === 0 ? false : null,
        needsReview: false,
      };
    });

    const nextScore = nextItemResults.reduce((sum, item) => sum + item.score, 0);

    const nextContent = JSON.stringify({
      ...parsedContent,
      itemResults: nextItemResults,
      reviewedAt: new Date().toISOString(),
    });

    const updated = await db.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: nextScore,
        content: nextContent,
      },
      select: {
        id: true,
        score: true,
        content: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[WORKSHEET_SUBMISSION_REVIEW_PATCH]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
