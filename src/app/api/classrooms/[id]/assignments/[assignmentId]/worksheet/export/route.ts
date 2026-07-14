import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth-guards";
import {
  AUTH_REQUIRED_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { exportWorksheetSubmissionsCsv } from "@/lib/services/assignments/worksheet-submissions";

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
  if (!user?.id) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }

  const result = await exportWorksheetSubmissionsCsv({
    teacherId: user.id,
    classId: id,
    assignmentId,
  });
  if (!result.ok) {
    return createAppErrorResponse(result.code, result.message, result.status);
  }

  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="worksheet-submissions.csv"',
      "Cache-Control": "no-store",
    },
  });
}
