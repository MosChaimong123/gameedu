import { createAppErrorResponse } from "@/lib/api-error";
import { getStudentAccessSession } from "@/lib/auth/student-access-session";
import type { NextRequest } from "next/server";

type RouteContext<TParams> = { params: Promise<TParams> };
type RouteResult = unknown | Promise<unknown>;

export function withStudentAccess<THandlerParams extends Record<string, string> & { code: string }>(
  handler: (
    request: NextRequest,
    context: RouteContext<THandlerParams>
  ) => RouteResult,
  requiredScope: "student:read" | "student:write" = "student:read"
) {
  return async (request: NextRequest, context: RouteContext<Omit<THandlerParams, "code">>) => {
    const session = await getStudentAccessSession(requiredScope);
    if (!session) {
      return createAppErrorResponse("AUTH_REQUIRED", "Student access session required", 401);
    }
    const params = await context.params;
    const response = await handler(request, {
      params: Promise.resolve({ ...params, code: session.student.loginCode } as THandlerParams),
    });
    if (response instanceof Response) return response;
    return createAppErrorResponse("INTERNAL_ERROR", "Student route returned no response", 500);
  };
}
