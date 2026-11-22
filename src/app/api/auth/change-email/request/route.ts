import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { verifyPassword } from "@/lib/auth/password-hash";
import {
  buildEmailVerificationExpiry,
  EMAIL_VERIFICATION_EXPIRES_MINUTES,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  generateEmailVerificationCode,
  generateVerificationReferenceCode,
  hashEmailVerificationCodeForStorage,
  normalizeVerificationEmail,
} from "@/lib/email-verification";
import { sendVerificationCodeEmail } from "@/lib/email/send-verification-email";
import { sendEmailChangeSecurityNotification } from "@/lib/email/send-security-notification-email";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
  buildRateLimitKey,
  consumeRateLimitWithStore,
  createRateLimitResponse,
  digestRateLimitIdentifier,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export const EMAIL_CHANGE_PURPOSE = "EMAIL_CHANGE";

const bodySchema = z.object({
  newEmail: z.string().email().transform(normalizeVerificationEmail),
  currentPassword: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);

  const newEmailDigest = digestRateLimitIdentifier(parsed.data.newEmail);
  const clientIdentifier = getRequestClientIdentifier(req);
  const limits = await Promise.all([
    consumeRateLimitWithStore({ bucket: "auth:email-change:user", key: userId, limit: 5, windowMs: 15 * 60_000 }),
    consumeRateLimitWithStore({
      bucket: "auth:email-change:ip-account",
      key: buildRateLimitKey(clientIdentifier, newEmailDigest),
      limit: 5,
      windowMs: 15 * 60_000,
    }),
  ]);
  const blocked = limits.find((result) => !result.allowed);
  if (blocked) return createRateLimitResponse(blocked);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, password: true },
  });
  if (!user?.email) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  if (!user.password) {
    return createAppErrorResponse(
      "LOGIN_METHOD_REQUIRED",
      "Add a password or reauthenticate with your provider before changing email",
      409
    );
  }
  if (!(await verifyPassword(parsed.data.currentPassword, user.password))) {
    logAuditEvent({ actorUserId: userId, action: "auth.email_change.reauth_failed", category: "auth", status: "rejected", targetType: "user", targetId: userId });
    return createAppErrorResponse("REAUTHENTICATION_FAILED", "Current password is incorrect", 403);
  }
  if (normalizeVerificationEmail(user.email) === parsed.data.newEmail) {
    return createAppErrorResponse("EMAIL_CHANGE_CONFLICT", "New email must be different", 409);
  }
  if (await db.user.findUnique({ where: { email: parsed.data.newEmail }, select: { id: true } })) {
    return createAppErrorResponse("EMAIL_CHANGE_CONFLICT", "Email cannot be used", 409);
  }

  const now = new Date();
  const code = generateEmailVerificationCode();
  const referenceCode = generateVerificationReferenceCode();
  const pending = await db.emailVerificationCode.create({
    data: {
      userId,
      email: parsed.data.newEmail,
      referenceCode,
      codePlain: null,
      codeHash: hashEmailVerificationCodeForStorage(code),
      purpose: EMAIL_CHANGE_PURPOSE,
      status: "PENDING",
      attempts: 0,
      maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
      expiresAt: buildEmailVerificationExpiry(now),
      lastSentAt: now,
      consumedAt: null,
    },
  });

  try {
    const sent = await sendVerificationCodeEmail(
      parsed.data.newEmail,
      code,
      EMAIL_VERIFICATION_EXPIRES_MINUTES,
      referenceCode,
      "email-change"
    );
    if (process.env.NODE_ENV === "production" && (!sent.sent || !sent.messageId)) {
      throw new Error("EMAIL_PROVIDER_NOT_ACCEPTED");
    }
    const acceptedAt = new Date();
    await db.$transaction(async (tx) => {
      const activated = await tx.emailVerificationCode.updateMany({
        where: { id: pending.id, userId, purpose: EMAIL_CHANGE_PURPOSE, status: "PENDING", consumedAt: null },
        data: {
          status: "ACTIVE",
          emailProvider: sent.sent ? "resend" : "console",
          providerMessageId: sent.messageId,
          deliveryStatus: sent.sent ? "ACCEPTED" : null,
          providerAcceptedAt: sent.sent ? acceptedAt : null,
          deliveryUpdatedAt: sent.sent ? acceptedAt : null,
          lastSentAt: acceptedAt,
        },
      });
      if (activated.count !== 1) throw new Error("EMAIL_CHANGE_STATE_CHANGED");
      await tx.emailVerificationCode.updateMany({
        where: {
          userId,
          purpose: EMAIL_CHANGE_PURPOSE,
          id: { not: pending.id },
          consumedAt: null,
          status: "ACTIVE",
        },
        data: { status: "CONSUMED", consumedAt: acceptedAt, codePlain: null },
      });
    });

    try {
      await sendEmailChangeSecurityNotification(user.email);
    } catch (notificationError) {
      console.error("[change-email] old-address notification failed", notificationError);
      logAuditEvent({ actorUserId: userId, action: "auth.email_change.notification_failed", category: "auth", status: "error", targetType: "user", targetId: userId });
    }

    logAuditEvent({
      actorUserId: userId,
      action: "auth.email_change.requested",
      category: "auth",
      targetType: "user",
      targetId: userId,
      metadata: { newEmailDigest },
    });
    return NextResponse.json({
      ok: true,
      referenceCode,
      expiresInMinutes: EMAIL_VERIFICATION_EXPIRES_MINUTES,
      ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    }, { status: 202 });
  } catch (error) {
    const failedAt = new Date();
    await db.emailVerificationCode.updateMany({
      where: { id: pending.id, status: "PENDING" },
      data: { status: "FAILED", consumedAt: failedAt, codePlain: null, deliveryStatus: "FAILED", deliveryUpdatedAt: failedAt },
    });
    console.error("[change-email] OTP send failed", error);
    return createAppErrorResponse("INTERNAL_ERROR", "Could not send confirmation email", 503);
  }
}
