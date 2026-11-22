import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createStudentAccessSession,
  getStudentAccessCookieOptions,
  STUDENT_ACCESS_COOKIE,
} from "@/lib/auth/student-access-session";
import {
  buildRateLimitKey,
  consumeRateLimitWithStore,
  digestRateLimitIdentifier,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import { isCurrentStudentLoginCode, normalizeStudentLoginCode } from "@/lib/student-login-code";
import { createAppErrorResponse } from "@/lib/api-error";
import { logAuditEvent } from "@/lib/security/audit-log";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { code?: unknown } | null;
  const code = normalizeStudentLoginCode(typeof body?.code === "string" ? body.code : "");
  const clientKey = getRequestClientIdentifier(req);
  const codeKey = digestRateLimitIdentifier(code || "invalid");
  const limits = await Promise.all([
    consumeRateLimitWithStore({ bucket: "auth:student-code-exchange:client", key: clientKey, limit: 20, windowMs: 15 * 60_000 }),
    consumeRateLimitWithStore({ bucket: "auth:student-code-exchange:code", key: codeKey, limit: 10, windowMs: 15 * 60_000 }),
    consumeRateLimitWithStore({ bucket: "auth:student-code-exchange:client-code", key: buildRateLimitKey(clientKey, codeKey), limit: 5, windowMs: 15 * 60_000 }),
  ]);
  if (limits.some((result) => !result.allowed)) {
    return createAppErrorResponse("RATE_LIMITED", "Too many attempts", 429);
  }

  if (!isCurrentStudentLoginCode(code)) {
    return createAppErrorResponse("INVALID_LOGIN_CODE", "Invalid student access code", 401);
  }

  const student = await db.student.findUnique({
    where: { loginCode: code },
    select: { id: true, classId: true, loginCodeVersion: true, loginCodeDisabledAt: true },
  });
  if (!student || student.loginCodeDisabledAt) {
    return createAppErrorResponse("INVALID_LOGIN_CODE", "Invalid student access code", 401);
  }

  const now = new Date();
  const clientDigest = digestRateLimitIdentifier(clientKey);
  const userAgent = req.headers.get("user-agent") ?? "";
  const { token, expiresAt } = await createStudentAccessSession({
    studentId: student.id,
    classId: student.classId,
    codeVersion: student.loginCodeVersion,
    clientDigest,
    userAgentDigest: userAgent ? digestRateLimitIdentifier(userAgent) : undefined,
  });
  await db.student.update({
    where: { id: student.id },
    data: { loginCodeLastUsedAt: now },
  });

  logAuditEvent({
    action: "auth.student_code.exchanged",
    category: "auth",
    status: "success",
    targetType: "student",
    targetId: student.id,
    metadata: { classroomId: student.classId },
  });

  const response = NextResponse.json({ success: true, redirectTo: "/student/access" });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(STUDENT_ACCESS_COOKIE, token, getStudentAccessCookieOptions(expiresAt));
  return response;
}
