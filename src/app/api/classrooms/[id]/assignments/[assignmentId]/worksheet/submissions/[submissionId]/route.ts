import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { reviewWorksheetSubmission } from "@/lib/services/assignments/worksheet-submissions";

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

    const body = (await req.json()) as ReviewPatchBody;
    const result = await reviewWorksheetSubmission({
      teacherId: session.user.id,
      classId: id,
      assignmentId,
      submissionId,
      itemScores: body.itemScores,
    });

    if (!result.ok) {
      return createAppErrorResponse(result.code, result.message, result.status);
    }

    return NextResponse.json(result.submission);
  } catch (error) {
    console.error("[WORKSHEET_SUBMISSION_REVIEW_PATCH]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
