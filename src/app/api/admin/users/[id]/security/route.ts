import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { verifyPassword } from "@/lib/auth/password-hash";
import { hasRecentAuthentication } from "@/lib/auth/session-policy";
import { logAuditEvent } from "@/lib/security/audit-log";
import { sendCredentialChangedNotification } from "@/lib/email/send-security-notification-email";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("disable"), reason: z.string().trim().min(3).max(200), currentPassword: z.string().max(128).optional() }),
  z.object({ action: z.literal("enable"), currentPassword: z.string().max(128).optional() }),
  z.object({ action: z.literal("revokeAll"), currentPassword: z.string().max(128).optional() }),
]);

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const actorId = session?.user?.id;
  if (!actorId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  if (session.user.role !== "ADMIN") return createAppErrorResponse("FORBIDDEN", "Forbidden", 403);
  const { id: targetId } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(targetId)) return createAppErrorResponse("NOT_FOUND", "User not found", 404);
  if (targetId === actorId) return createAppErrorResponse("FORBIDDEN", "Use account security for your own session", 403);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid security action", 400);

  if (!hasRecentAuthentication(session.user.authenticatedAt)) {
    const actor = await db.user.findUnique({ where: { id: actorId }, select: { password: true } });
    if (!actor?.password || !parsed.data.currentPassword || !(await verifyPassword(parsed.data.currentPassword, actor.password))) {
      return createAppErrorResponse("REAUTHENTICATION_FAILED", "Recent administrator authentication is required", 403);
    }
  }

  const target = await db.user.findUnique({ where: { id: targetId }, select: { id: true, email: true, authVersion: true } });
  if (!target) return createAppErrorResponse("NOT_FOUND", "User not found", 404);
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetId },
      data: {
        ...(parsed.data.action === "disable" ? { disabledAt: now, disabledReason: parsed.data.reason } : {}),
        ...(parsed.data.action === "enable" ? { disabledAt: null, disabledReason: null } : {}),
        authVersion: typeof target.authVersion === "number" ? { increment: 1 } : 1,
      },
    });
    const sessions = await tx.session.deleteMany({ where: { userId: targetId } });
    const securitySessions = await tx.userAuthSession.updateMany({
      where: { userId: targetId, ...activeUserAuthSessionFilter() },
      data: { revokedAt: now, revokedReason: `admin_${parsed.data.action}` },
    });
    return { databaseSessionsDeleted: sessions.count, securitySessionsRevoked: securitySessions.count };
  });
  logAuditEvent({
    actorUserId: actorId,
    action: `admin.user.security.${parsed.data.action}`,
    category: "admin",
    targetType: "user",
    targetId,
    metadata: result,
  });
  if (target.email) {
    try { await sendCredentialChangedNotification(target.email, "account"); }
    catch (error) { console.error("[admin-user-security] notification failed", error); }
  }
  return NextResponse.json({ ok: true, ...result });
}
