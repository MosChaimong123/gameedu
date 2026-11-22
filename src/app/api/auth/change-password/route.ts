import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { verifyPassword } from "@/lib/auth/password-hash";
import { passwordChangeSchema } from "@/lib/auth/password-policy";
import { changeUserPassword, PasswordPolicyError, PasswordReuseError } from "@/lib/auth/change-user-password";
import { logAuditEvent } from "@/lib/security/audit-log";
import { consumeRateLimitWithStore, createRateLimitResponse } from "@/lib/security/rate-limit";
import { sendCredentialChangedNotification } from "@/lib/email/send-security-notification-email";

const bodySchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordChangeSchema });

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("PASSWORD_POLICY_VIOLATION", "Password does not meet policy", 400);
  const limit = await consumeRateLimitWithStore({ bucket: "auth:change-password:user", key: userId, limit: 5, windowMs: 15 * 60_000 });
  if (!limit.allowed) return createRateLimitResponse(limit);
  const user = await db.user.findUnique({ where: { id: userId }, select: { password: true, email: true } });
  if (!user?.password || !(await verifyPassword(parsed.data.currentPassword, user.password))) {
    return createAppErrorResponse("REAUTHENTICATION_FAILED", "Current password is incorrect", 403);
  }
  try {
    const result = await changeUserPassword({ userId, newPassword: parsed.data.newPassword });
    logAuditEvent({ actorUserId: userId, action: "auth.password.changed", category: "auth", targetType: "user", targetId: userId, metadata: result });
    if (user.email) {
      try { await sendCredentialChangedNotification(user.email, "password"); }
      catch (error) { console.error("[change-password] notification failed", error); }
    }
    return NextResponse.json({ ok: true, signInRequired: true, sessionsRevoked: result.securitySessionsRevoked });
  } catch (error) {
    if (error instanceof PasswordReuseError || error instanceof PasswordPolicyError) {
      return createAppErrorResponse("PASSWORD_POLICY_VIOLATION", "Choose a different secure password", 400);
    }
    console.error("[change-password] failed", error);
    return createAppErrorResponse("INTERNAL_ERROR", "Password could not be changed", 500);
  }
}
