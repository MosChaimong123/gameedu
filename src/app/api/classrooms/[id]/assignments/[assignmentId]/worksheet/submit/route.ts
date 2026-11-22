import { NextResponse } from "next/server";
import {
  INTERNAL_ERROR_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { submitWorksheetAssignment } from "@/lib/services/assignments/worksheet-submissions";
import type { WorksheetStudentAnswers } from "@/lib/worksheet-schema";
import { getStudentAccessCodeForClass } from "@/lib/auth/student-access-session";

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

    const studentCode = await getStudentAccessCodeForClass(body.studentCode, id, "student:write");
    if (!studentCode) return createAppErrorResponse("AUTH_REQUIRED", "Student access session required", 401);
    const result = await submitWorksheetAssignment({
      classId: id,
      assignmentId,
      studentCode,
      answers: body.answers,
    });

    if (!result.ok) {
      return createAppErrorResponse(result.code, result.message, result.status);
    }

    return NextResponse.json(result.body, { status: result.status ?? 200 });
  } catch (error) {
    console.error("[WORKSHEET_SUBMIT]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
