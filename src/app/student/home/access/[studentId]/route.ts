import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  createStudentAccessSession,
  getStudentAccessCookieOptions,
  STUDENT_ACCESS_COOKIE,
} from "@/lib/auth/student-access-session";
import { digestRateLimitIdentifier, getRequestClientIdentifier } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const account = await auth();
  if (!account?.user?.id) return NextResponse.redirect(new URL("/login?audience=student", req.url));
  const { studentId } = await params;
  const student = await db.student.findFirst({
    where: { id: studentId, userId: account.user.id },
    select: { id: true, classId: true, loginCodeVersion: true, loginCodeDisabledAt: true },
  });
  if (!student || student.loginCodeDisabledAt) return NextResponse.redirect(new URL("/student/home", req.url));

  const { token, expiresAt } = await createStudentAccessSession({
    studentId: student.id,
    classId: student.classId,
    codeVersion: student.loginCodeVersion,
    clientDigest: digestRateLimitIdentifier(getRequestClientIdentifier(req)),
    userAgentDigest: digestRateLimitIdentifier(req.headers.get("user-agent") ?? "unknown"),
  });
  const requestedNext = req.nextUrl.searchParams.get("next") ?? "/student/access";
  const next = requestedNext === "/student/access" || requestedNext.startsWith("/student/access/")
    ? requestedNext
    : "/student/access";
  const response = NextResponse.redirect(new URL(next, req.url));
  response.cookies.set(STUDENT_ACCESS_COOKIE, token, getStudentAccessCookieOptions(expiresAt));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
