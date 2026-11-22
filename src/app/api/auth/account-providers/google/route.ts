import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { verifyPassword } from "@/lib/auth/password-hash";
import { logAuditEvent } from "@/lib/security/audit-log";
import { consumeRateLimitWithStore, createRateLimitResponse, getRequestClientIdentifier } from "@/lib/security/rate-limit";
import { sendCredentialChangedNotification } from "@/lib/email/send-security-notification-email";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

const bodySchema = z.object({ currentPassword: z.string().min(1).max(128) });

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);
  const limits = await Promise.all([
    consumeRateLimitWithStore({ bucket: "auth:provider-unlink:user", key: userId, limit: 5, windowMs: 15 * 60_000 }),
    consumeRateLimitWithStore({ bucket: "auth:provider-unlink:ip", key: getRequestClientIdentifier(req), limit: 15, windowMs: 15 * 60_000 }),
  ]);
  const blocked = limits.find((result) => !result.allowed);
  if (blocked) return createRateLimitResponse(blocked);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true, email: true, authVersion: true, accounts: { select: { id: true, provider: true } } },
  });
  if (!user) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const googleAccounts = user.accounts.filter((account) => account.provider === "google");
  if (googleAccounts.length === 0) return createAppErrorResponse("NOT_FOUND", "Provider is not linked", 404);
  if (!user.password) {
    return createAppErrorResponse("LOGIN_METHOD_REQUIRED", "Cannot remove the last login method", 409);
  }
  if (!(await verifyPassword(parsed.data.currentPassword, user.password))) {
    return createAppErrorResponse("REAUTHENTICATION_FAILED", "Current password is incorrect", 403);
  }

  const result = await db.$transaction(async (tx) => {
    const deleted = await tx.account.deleteMany({ where: { userId, provider: "google" } });
    if (deleted.count === 0) throw new Error("PROVIDER_STATE_CHANGED");
    await tx.user.update({
      where: { id: userId },
      data: { authVersion: typeof user.authVersion === "number" ? { increment: 1 } : 1 },
    });
    const sessions = await tx.session.deleteMany({ where: { userId } });
    const securitySessions = await tx.userAuthSession.updateMany({
      where: { userId, ...activeUserAuthSessionFilter() },
      data: { revokedAt: new Date(), revokedReason: "provider_unlinked" },
    });
    return { accountsDeleted: deleted.count, sessionsDeleted: sessions.count, securitySessionsRevoked: securitySessions.count };
  });
  logAuditEvent({
    actorUserId: userId,
    action: "auth.provider_unlinked",
    category: "auth",
    targetType: "user",
    targetId: userId,
    metadata: { provider: "google", ...result },
  });
  if (user.email) {
    try { await sendCredentialChangedNotification(user.email, "provider"); }
    catch (error) { console.error("[provider-unlink] notification failed", error); }
  }
  return NextResponse.json({ ok: true, sessionsRevoked: result.sessionsDeleted });
}
