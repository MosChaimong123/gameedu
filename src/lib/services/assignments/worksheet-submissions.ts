import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { gradeWorksheetSubmission } from "@/lib/grade-worksheet-submission";
import { parseWorksheetDataFromAssignmentPayload } from "@/lib/worksheet-assignment";
import { parseWorksheetSubmissionContent } from "@/lib/worksheet-review";
import {
  loadWorksheetTakeContext,
  WORKSHEET_ERR_BAD_REQUEST,
} from "@/lib/worksheet-take-context";
import type { WorksheetStudentAnswers } from "@/lib/worksheet-schema";

type SubmitWorksheetArgs = {
  classId: string;
  assignmentId: string;
  studentCode?: string;
  answers?: WorksheetStudentAnswers;
};

type ReviewWorksheetSubmissionArgs = {
  teacherId: string;
  classId: string;
  assignmentId: string;
  submissionId: string;
  itemScores?: Record<string, number>;
};

type ExportWorksheetSubmissionsArgs = {
  teacherId: string;
  classId: string;
  assignmentId: string;
};

export type SubmitWorksheetResult =
  | { ok: false; code: "INVALID_PAYLOAD" | "NOT_FOUND" | "FORBIDDEN"; message: string; status: number }
  | { ok: false; code: "INTERNAL_ERROR"; message: string; status: 500 }
  | { ok: true; status?: 200; body: Record<string, unknown> };

export type ReviewWorksheetSubmissionResult =
  | { ok: false; code: "FORBIDDEN" | "NOT_FOUND" | "INVALID_PAYLOAD"; message: string; status: number }
  | { ok: true; submission: unknown };

export type ExportWorksheetSubmissionsResult =
  | { ok: false; code: "FORBIDDEN" | "NOT_FOUND"; message: string; status: number }
  | { ok: true; csv: string };

export async function submitWorksheetAssignment(
  args: SubmitWorksheetArgs
): Promise<SubmitWorksheetResult> {
  if (!args.studentCode || !args.answers || typeof args.answers !== "object") {
    return {
      ok: false,
      code: "INVALID_PAYLOAD",
      message: WORKSHEET_ERR_BAD_REQUEST,
      status: 400,
    };
  }

  const ctx = await loadWorksheetTakeContext(args.classId, args.assignmentId, args.studentCode);
  if (ctx.kind === "denied") {
    return {
      ok: false,
      code: ctx.status === 404 ? "NOT_FOUND" : ctx.status === 403 ? "FORBIDDEN" : "INVALID_PAYLOAD",
      message: ctx.message,
      status: ctx.status,
    };
  }
  if (ctx.kind === "already_submitted") {
    return { ok: true, body: { alreadySubmitted: true, score: ctx.score } };
  }

  const grade = gradeWorksheetSubmission(ctx.worksheet, args.answers);
  const content = JSON.stringify({
    mode: "worksheet",
    answers: args.answers,
    itemResults: grade.itemResults,
  });

  const submission = ctx.hasPreviousSubmission
    ? await db.assignmentSubmission.update({
        where: {
          studentId_assignmentId: {
            studentId: ctx.studentId,
            assignmentId: args.assignmentId,
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
          assignmentId: args.assignmentId,
          score: grade.score,
          content,
          cheatingLogs: [] as Prisma.InputJsonValue,
        },
      });

  return {
    ok: true,
    body: {
      score: grade.score,
      maxScore: grade.maxScore,
      submissionId: submission.id,
      showScoreToStudent: ctx.showScoreToStudent,
      replacedPreviousSubmission: ctx.hasPreviousSubmission,
    },
  };
}

export async function reviewWorksheetSubmission(
  args: ReviewWorksheetSubmissionArgs
): Promise<ReviewWorksheetSubmissionResult> {
  const classroom = await db.classroom.findUnique({
    where: { id: args.classId, teacherId: args.teacherId },
    select: { id: true },
  });
  if (!classroom) {
    return { ok: false, code: "FORBIDDEN", message: "Forbidden", status: 403 };
  }

  const assignment = await db.assignment.findUnique({
    where: { id: args.assignmentId },
    select: {
      id: true,
      classId: true,
      type: true,
      quizData: true,
    },
  });
  if (!assignment || assignment.classId !== args.classId) {
    return { ok: false, code: "NOT_FOUND", message: "Not found", status: 404 };
  }
  if (String(assignment.type).toLowerCase() !== "worksheet") {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Assignment is not a worksheet", status: 400 };
  }

  const worksheet = parseWorksheetDataFromAssignmentPayload(assignment.quizData);
  if (!worksheet) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Worksheet data is invalid", status: 400 };
  }

  const submission = await db.assignmentSubmission.findUnique({
    where: { id: args.submissionId },
    select: {
      id: true,
      assignmentId: true,
      score: true,
      content: true,
    },
  });
  if (!submission || submission.assignmentId !== args.assignmentId) {
    return { ok: false, code: "NOT_FOUND", message: "Not found", status: 404 };
  }

  const parsedContent = parseWorksheetSubmissionContent(submission.content);
  if (!parsedContent) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Worksheet submission data is invalid", status: 400 };
  }

  const itemScores = args.itemScores ?? {};
  const allowedScoreMap = new Map(
    worksheet.pages.flatMap((page) =>
      page.items
        .filter((item) => {
          if (item.type === "short_text") {
            return item.answer.reviewMode === "manual";
          }
          return false;
        })
        .map((item) => {
          if (item.type === "short_text") {
            return [item.id, item.answer.points] as const;
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
    where: { id: args.submissionId },
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

  return { ok: true, submission: updated };
}

function sanitizeFormulaString(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function sanitizeFormulaValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeFormulaString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeFormulaValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        sanitizeFormulaValue(entryValue),
      ])
    );
  }
  return value;
}

function escapeCsvValue(value: unknown) {
  const text =
    typeof value === "string"
      ? sanitizeFormulaString(value)
      : JSON.stringify(sanitizeFormulaValue(value ?? ""));
  const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${sanitized.replace(/"/g, "\"\"")}"`;
}

function getWorksheetItemLabel(item: {
  type: string;
  label?: string;
  prompt?: string;
  pageNumber?: number;
}) {
  return item.label?.trim() || item.prompt?.trim() || `${item.type} (page ${item.pageNumber ?? 1})`;
}

function flattenWorksheetAnswer(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => flattenWorksheetAnswer(entry))
      .filter((entry) => entry.length > 0)
      .join(" | ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key}:${flattenWorksheetAnswer(entry)}`)
      .join(" | ");
  }
  return "";
}

export async function exportWorksheetSubmissionsCsv(
  args: ExportWorksheetSubmissionsArgs
): Promise<ExportWorksheetSubmissionsResult> {
  const classroom = await db.classroom.findUnique({
    where: { id: args.classId, teacherId: args.teacherId },
    select: { id: true },
  });
  if (!classroom) {
    return { ok: false, code: "FORBIDDEN", message: "Forbidden", status: 403 };
  }

  const assignment = await db.assignment.findUnique({
    where: { id: args.assignmentId },
    select: {
      id: true,
      classId: true,
      name: true,
      type: true,
      maxScore: true,
      quizData: true,
    },
  });
  if (!assignment || assignment.classId !== args.classId || String(assignment.type).toLowerCase() !== "worksheet") {
    return { ok: false, code: "NOT_FOUND", message: "Not found", status: 404 };
  }

  const worksheet = parseWorksheetDataFromAssignmentPayload(assignment.quizData);
  if (!worksheet) {
    return { ok: false, code: "NOT_FOUND", message: "Not found", status: 404 };
  }

  const worksheetItems = worksheet.pages.flatMap((page) =>
    page.items.map((item, index) => ({
      id: item.id,
      type: item.type,
      pageNumber: page.pageNumber,
      itemNumber: index + 1,
      label: "label" in item && typeof item.label === "string" ? item.label : undefined,
      prompt: "prompt" in item && typeof item.prompt === "string" ? item.prompt : undefined,
    }))
  );

  const itemColumnHeaders = worksheetItems.flatMap((item) => [
    `item_${item.pageNumber}_${item.itemNumber}_label`,
    `item_${item.pageNumber}_${item.itemNumber}_answer`,
    `item_${item.pageNumber}_${item.itemNumber}_score`,
    `item_${item.pageNumber}_${item.itemNumber}_maxScore`,
    `item_${item.pageNumber}_${item.itemNumber}_needsReview`,
  ]);

  const submissions = await db.assignmentSubmission.findMany({
    where: { assignmentId: args.assignmentId },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      score: true,
      content: true,
      submittedAt: true,
      student: {
        select: {
          id: true,
          name: true,
          nickname: true,
          loginCode: true,
        },
      },
    },
  });

  const csvRows = [
    [
      "submissionId",
      "submittedAt",
      "studentId",
      "studentName",
      "studentNickname",
      "loginCode",
      "score",
      "maxScore",
      "pendingReviewCount",
      "reviewedItemCount",
      "reviewCompletionRate",
      "pendingReviewSubmission",
      "reviewedAt",
      "answers",
      "itemResults",
      ...itemColumnHeaders,
    ].join(","),
    ...submissions.map((submission) => {
      const parsed = parseWorksheetSubmissionContent(submission.content);
      const pendingReviewCount = parsed?.itemResults.filter((item) => item.needsReview).length ?? 0;
      const reviewedItemCount = parsed?.itemResults.filter((item) => !item.needsReview).length ?? 0;
      const totalItemCount = parsed?.itemResults.length ?? 0;
      const reviewCompletionRate =
        totalItemCount > 0 ? Math.round((reviewedItemCount / totalItemCount) * 100) : 0;
      const itemResultMap = new Map((parsed?.itemResults ?? []).map((item) => [item.itemId, item]));
      const flattenedItemColumns = worksheetItems.flatMap((item) => {
        const result = itemResultMap.get(item.id);
        const answer = parsed?.answers?.[item.id];
        return [
          escapeCsvValue(getWorksheetItemLabel(item)),
          escapeCsvValue(flattenWorksheetAnswer(answer)),
          escapeCsvValue(result?.score ?? ""),
          escapeCsvValue(result?.maxScore ?? ""),
          escapeCsvValue(result?.needsReview ?? ""),
        ];
      });

      return [
        escapeCsvValue(submission.id),
        escapeCsvValue(submission.submittedAt.toISOString()),
        escapeCsvValue(submission.student.id),
        escapeCsvValue(submission.student.name),
        escapeCsvValue(submission.student.nickname ?? ""),
        escapeCsvValue(submission.student.loginCode),
        escapeCsvValue(submission.score),
        escapeCsvValue(assignment.maxScore),
        escapeCsvValue(pendingReviewCount),
        escapeCsvValue(reviewedItemCount),
        escapeCsvValue(reviewCompletionRate),
        escapeCsvValue(pendingReviewCount > 0),
        escapeCsvValue(parsed?.reviewedAt ?? ""),
        escapeCsvValue(parsed?.answers ?? {}),
        escapeCsvValue(parsed?.itemResults ?? []),
        ...flattenedItemColumns,
      ].join(",");
    }),
  ];

  return { ok: true, csv: csvRows.join("\n") };
}
