import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { generateStudentLoginCode } from "@/lib/student-login-code";
import { logAuditEvent } from "@/lib/security/audit-log";

async function authorizeClassroom(classId: string) {
  const session = await auth();
  if (!session?.user?.id || !isTeacherOrAdmin(session.user.role)) return null;
  const classroom = await db.classroom.findFirst({
    where: session.user.role === "ADMIN" ? { id: classId } : { id: classId, teacherId: session.user.id },
    select: { id: true },
  });
  return classroom ? session.user : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await authorizeClassroom(id);
  if (!actor) return createAppErrorResponse("FORBIDDEN", "Forbidden", 403);
  const students = await db.student.findMany({
    where: { classId: id },
    select: {
      id: true,
      name: true,
      userId: true,
      loginCodeLastUsedAt: true,
      loginCodeRotatedAt: true,
      loginCodeDisabledAt: true,
      _count: { select: { accessSessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } },
    },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(students.map((student) => ({
    id: student.id,
    name: student.name,
    linked: Boolean(student.userId),
    lastUsedAt: student.loginCodeLastUsedAt,
    rotatedAt: student.loginCodeRotatedAt,
    disabled: Boolean(student.loginCodeDisabledAt),
    activeSessionCount: student._count.accessSessions,
  })));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await authorizeClassroom(id);
  if (!actor) return createAppErrorResponse("FORBIDDEN", "Forbidden", 403);
  const body = await req.json().catch(() => null) as { action?: unknown; studentId?: unknown } | null;
  const action = body?.action;
  const studentId = typeof body?.studentId === "string" ? body.studentId : null;
  if (action !== "rotate" && action !== "revoke") {
    return createAppErrorResponse("INVALID_PAYLOAD", "Invalid action", 400);
  }

  const targets = await db.student.findMany({
    where: { classId: id, ...(studentId ? { id: studentId } : {}) },
    select: { id: true },
  });
  if (targets.length === 0) return createAppErrorResponse("NOT_FOUND", "Student not found", 404);

  const now = new Date();
  const rotatedCodes: Array<{ studentId: string; loginCode: string }> = [];
  for (const target of targets) {
    if (action === "rotate") {
      let loginCode = generateStudentLoginCode();
      while (await db.student.findUnique({ where: { loginCode }, select: { id: true } })) {
        loginCode = generateStudentLoginCode();
      }
      await db.student.update({
        where: { id: target.id },
        data: {
          loginCode,
          loginCodeVersion: { increment: 1 },
          loginCodeRotatedAt: now,
          loginCodeDisabledAt: null,
        },
      });
      rotatedCodes.push({ studentId: target.id, loginCode });
    } else {
      await db.student.update({
        where: { id: target.id },
        data: { loginCodeVersion: { increment: 1 }, loginCodeDisabledAt: now },
      });
    }
  }
  await db.studentAccessSession.updateMany({
    where: { studentId: { in: targets.map((target) => target.id) }, revokedAt: null },
    data: { revokedAt: now, revokedReason: action === "rotate" ? "teacher_code_rotated" : "teacher_code_revoked" },
  });

  logAuditEvent({
    actorUserId: actor.id,
    action: `auth.student_code.${action}d`,
    category: "auth",
    status: "success",
    targetType: studentId ? "student" : "classroom",
    targetId: studentId ?? id,
    metadata: { classroomId: id, affectedCount: targets.length },
  });
  return NextResponse.json({ success: true, affectedCount: targets.length, rotatedCodes });
}
