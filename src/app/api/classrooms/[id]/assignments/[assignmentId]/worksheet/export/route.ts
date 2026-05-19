import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guards";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  NOT_FOUND_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
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
    },
  });

  if (!assignment || assignment.classId !== id || String(assignment.type).toLowerCase() !== "worksheet") {
    return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
  }

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
      "reviewedAt",
      "answers",
      "itemResults",
    ].join(","),
    ...submissions.map((submission) => {
      const parsed = parseWorksheetSubmissionContent(submission.content);
      const pendingReviewCount =
        parsed?.itemResults.filter((item) => item.needsReview).length ?? 0;

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
        escapeCsvValue(parsed?.reviewedAt ?? ""),
        escapeCsvValue(parsed?.answers ?? {}),
        escapeCsvValue(parsed?.itemResults ?? []),
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
