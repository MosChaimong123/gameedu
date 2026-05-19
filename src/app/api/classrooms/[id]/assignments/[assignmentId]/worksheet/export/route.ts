import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guards";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  NOT_FOUND_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { parseWorksheetDataFromAssignmentPayload } from "@/lib/worksheet-assignment";
import { parseWorksheetSubmissionContent } from "@/lib/worksheet-review";

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

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; assignmentId: string }>;
  }
) {
  const { id, assignmentId } = await params;
  const user = await requireSessionUser();
  if (!user) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }

  const classroom = await db.classroom.findUnique({
    where: { id, teacherId: user.id },
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
      name: true,
      type: true,
      maxScore: true,
      quizData: true,
    },
  });

  if (!assignment || assignment.classId !== id || String(assignment.type).toLowerCase() !== "worksheet") {
    return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
  }

  const worksheet = parseWorksheetDataFromAssignmentPayload(assignment.quizData);
  if (!worksheet) {
    return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
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
    where: { assignmentId },
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

  return new NextResponse(csvRows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="worksheet-submissions.csv"',
      "Cache-Control": "no-store",
    },
  });
}
