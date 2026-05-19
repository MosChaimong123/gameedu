import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import {
  buildRateLimitKey,
  consumeRateLimitWithStore,
  createRateLimitResponse,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_PURPOSE,
  hashEmailVerificationCode,
  isEmailVerificationCodeExpired,
  normalizeVerificationEmail,
} from "@/lib/email-verification";

const bodySchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export async function POST(req: Request) {
  const clientIdentifier = getRequestClientIdentifier(req);
  const rateLimit = await consumeRateLimitWithStore({
    bucket: "auth:verify-email-code",
    key: clientIdentifier,
    limit: 10,
    windowMs: 15 * 60_000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  let email: string;
  let code: string;

  try {
    const json = await req.json();
    const parsed = bodySchema.parse(json);
    email = parsed.email;
    code = parsed.code;
  } catch {
    return createAppErrorResponse("INVALID_PAYLOAD", "Invalid verification payload", 400);
  }

  const normalizedEmail = normalizeVerificationEmail(email);
  const emailRateLimit = await consumeRateLimitWithStore({
    bucket: "auth:verify-email-code:email",
    key: buildRateLimitKey(clientIdentifier, normalizedEmail),
    limit: 10,
    windowMs: 15 * 60_000,
  });

  if (!emailRateLimit.allowed) {
    return createRateLimitResponse(emailRateLimit.retryAfterSeconds);
  }

  const user = await db.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
    },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    return createAppErrorResponse(
      "EMAIL_VERIFICATION_CODE_INVALID",
      "Invalid verification code",
      400
    );
  }

  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const verification = await db.emailVerificationCode.findFirst({
    where: {
      userId: user.id,
      purpose: EMAIL_VERIFICATION_PURPOSE,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    return createAppErrorResponse(
      "EMAIL_VERIFICATION_CODE_INVALID",
      "No active verification code. Request a new code.",
      400
    );
  }

  if (isEmailVerificationCodeExpired(verification.expiresAt)) {
    return createAppErrorResponse(
      "EMAIL_VERIFICATION_CODE_EXPIRED",
      "Verification code expired",
      400
    );
  }

  if (verification.attempts >= verification.maxAttempts) {
    return createAppErrorResponse(
      "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS",
      "Too many invalid verification attempts",
      429
    );
  }

  const codeHash = hashEmailVerificationCode(normalizedEmail, code);
  if (codeHash !== verification.codeHash) {
    const nextAttempts = verification.attempts + 1;
    await db.emailVerificationCode.update({
      where: { id: verification.id },
      data: {
        attempts: nextAttempts,
        ...(nextAttempts >= Math.max(verification.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
          ? { consumedAt: new Date() }
          : {}),
      },
    });

    return createAppErrorResponse(
      nextAttempts >= Math.max(verification.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
        ? "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS"
        : "EMAIL_VERIFICATION_CODE_INVALID",
      nextAttempts >= Math.max(verification.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
        ? "Too many invalid verification attempts"
        : "Invalid verification code",
      nextAttempts >= Math.max(verification.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
        ? 429
        : 400
    );
  }

  const now = new Date();
  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: now },
  });
  await db.emailVerificationCode.updateMany({
    where: {
      userId: user.id,
      purpose: EMAIL_VERIFICATION_PURPOSE,
      consumedAt: null,
    },
    data: { consumedAt: now },
  });

  return NextResponse.json({ ok: true, verified: true });
}

