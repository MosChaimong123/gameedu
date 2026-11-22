import { createAppErrorResponse } from "@/lib/api-error";
import { getStudentAccessSession } from "@/lib/auth/student-access-session";
import {
  civilizationSyncRequestSchema,
  isCivilizationIdleEnabled,
  isCivilizationIdleEnabledForClass,
} from "@/lib/civilization-idle";
import { executeCivilizationCommand } from "@/lib/services/civilization-idle/civilization-state";
import { civilizationCommandResultResponse } from "../_response";

export async function POST(request: Request) {
  if (!isCivilizationIdleEnabled()) {
    return createAppErrorResponse("NOT_FOUND", "Not found", 404);
  }
  const session = await getStudentAccessSession("student:write");
  if (!session) {
    return createAppErrorResponse("AUTH_REQUIRED", "Student access session required", 401);
  }
  if (!isCivilizationIdleEnabledForClass(session.classId)) {
    return createAppErrorResponse("NOT_FOUND", "Not found", 404);
  }

  const payload = await request.json().catch(() => null);
  const parsed = civilizationSyncRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return createAppErrorResponse("INVALID_PAYLOAD", "Invalid civilization sync", 400);
  }

  const result = await executeCivilizationCommand({
    studentId: session.student.id,
    commandId: parsed.data.commandId,
    expectedRevision: parsed.data.expectedRevision,
    command: { type: "SYNC" },
  });
  return civilizationCommandResultResponse(result);
}
