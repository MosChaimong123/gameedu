import { NextResponse } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";
import { getStudentAccessSession } from "@/lib/auth/student-access-session";
import { isCivilizationIdleEnabled, isCivilizationIdleEnabledForClass } from "@/lib/civilization-idle";
import { readCivilizationState } from "@/lib/services/civilization-idle/civilization-state";

export async function GET() {
  if (!isCivilizationIdleEnabled()) {
    return createAppErrorResponse("NOT_FOUND", "Not found", 404);
  }
  const session = await getStudentAccessSession("student:read");
  if (!session) {
    return createAppErrorResponse("AUTH_REQUIRED", "Student access session required", 401);
  }
  if (!isCivilizationIdleEnabledForClass(session.classId)) {
    return createAppErrorResponse("NOT_FOUND", "Not found", 404);
  }

  const result = await readCivilizationState(session.student.id);
  if (!result.ok) {
    return createAppErrorResponse("INTERNAL_ERROR", "Civilization state is invalid", 500);
  }
  return NextResponse.json({ ok: true, ...result.value });
}
