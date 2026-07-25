import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";

type StudentNotificationResult =
  | { ok: false; code: "NOT_FOUND" | "INVALID_PAYLOAD"; message: string; status: number }
  | { ok: true; data: unknown };

async function resolveStudentIdByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  const student = await db.student.findFirst({
    where: {
      OR: getStudentLoginCodeVariants(normalizedCode).map((candidate) => ({ loginCode: candidate })),
    },
    select: { id: true },
  });

  return student?.id ?? null;
}

export async function listStudentNotifications(code: string): Promise<StudentNotificationResult> {
  const studentId = await resolveStudentIdByCode(code);
  if (!studentId) {
    return { ok: false, code: "NOT_FOUND", message: "Student not found", status: 404 };
  }

  const notifications = await db.notification.findMany({
    where: {
      studentId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  return { ok: true, data: notifications };
}

export async function updateStudentNotificationReadState(
  code: string,
  input: { id?: unknown; isRead?: unknown }
): Promise<StudentNotificationResult> {
  const studentId = await resolveStudentIdByCode(code);
  if (!studentId) {
    return { ok: false, code: "NOT_FOUND", message: "Student not found", status: 404 };
  }

  if (input.id === "all") {
    await db.notification.updateMany({
      where: { studentId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true, data: { success: true } };
  }

  if (typeof input.id !== "string" || typeof input.isRead !== "boolean") {
    return {
      ok: false,
      code: "INVALID_PAYLOAD",
      message: "Invalid notification update",
      status: 400,
    };
  }

  const notification = await db.notification.update({
    where: {
      id: input.id,
      studentId,
    },
    data: {
      isRead: input.isRead,
    },
  });

  return { ok: true, data: notification };
}

export async function deleteStudentNotification(
  code: string,
  id: string | null
): Promise<StudentNotificationResult> {
  const studentId = await resolveStudentIdByCode(code);
  if (!studentId) {
    return { ok: false, code: "NOT_FOUND", message: "Student not found", status: 404 };
  }

  if (!id || id.trim().length === 0) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Missing id", status: 400 };
  }

  await db.notification.delete({
    where: {
      id,
      studentId,
    },
  });

  return { ok: true, data: { success: true } };
}
