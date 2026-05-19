import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_PURPOSE,
  emailVerificationCodeMatches,
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

  let user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, emailVerified: true },
  });
  if (!user) {
    user = await db.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
      select: { id: true, email: true, emailVerified: true },
    });
  }

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

  const now = new Date();
  const activeVerifications = await db.emailVerificationCode.findMany({
    where: {
      userId: user.id,
      purpose: EMAIL_VERIFICATION_PURPOSE,
      consumedAt: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 5,
  });

  if (activeVerifications.length === 0) {
    return createAppErrorResponse(
      "EMAIL_VERIFICATION_CODE_INVALID",
      "No active verification code. Request a new code.",
      400
    );
  }

  const matchParams = {
    userId: user.id,
    email: user.email ?? normalizedEmail,
    code,
  };

  let verification = null as (typeof activeVerifications)[number] | null;
  for (const candidate of activeVerifications) {
    if (isEmailVerificationCodeExpired(candidate.expiresAt, now)) {
      continue;
    }
    if (candidate.attempts >= candidate.maxAttempts) {
      continue;
    }
    if (await emailVerificationCodeMatches(candidate.codeHash, matchParams)) {
      verification = candidate;
      break;
    }
  }

  if (!verification) {
    const latest = activeVerifications[0];
    const allExpired = activeVerifications.every((entry) =>
      isEmailVerificationCodeExpired(entry.expiresAt, now)
    );
    if (allExpired) {
      return createAppErrorResponse(
        "EMAIL_VERIFICATION_CODE_EXPIRED",
        "Verification code expired",
        400
      );
    }

    if (latest.attempts >= latest.maxAttempts) {
      return createAppErrorResponse(
        "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS",
        "Too many invalid verification attempts",
        429
      );
    }

    const nextAttempts = latest.attempts + 1;
    await db.emailVerificationCode.update({
      where: { id: latest.id },
      data: {
        attempts: nextAttempts,
        ...(nextAttempts >= Math.max(latest.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
          ? { consumedAt: now }
          : {}),
      },
    });

    return createAppErrorResponse(
      nextAttempts >= Math.max(latest.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
        ? "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS"
        : "EMAIL_VERIFICATION_CODE_INVALID",
      nextAttempts >= Math.max(latest.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
        ? "Too many invalid verification attempts"
        : "Invalid verification code",
      nextAttempts >= Math.max(latest.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
        ? 429
        : 400
    );
  }

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

