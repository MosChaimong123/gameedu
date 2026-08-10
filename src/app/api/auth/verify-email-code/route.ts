import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/security/audit-log";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { isEmailVerificationApiEnabled } from "@/lib/auth/signup-policy";
import { VERIFICATION_FLOW_COOKIE } from "@/lib/auth/verification-flow-handle";
import {
  buildRateLimitKey,
  consumeRateLimitWithStore,
  createRateLimitResponse,
  digestRateLimitIdentifier,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import {
  activeSignupVerificationWhere,
  SIGNUP_VERIFICATION_STATUS,
} from "@/lib/auth/signup-verification-lifecycle";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_PURPOSE,
  codesMatchPlaintext,
  emailVerificationCodeMatches,
  isEmailVerificationCodeExpired,
  normalizeVerificationCodeInput,
  normalizeVerificationEmail,
  normalizeVerificationReferenceCode,
} from "@/lib/email-verification";

const bodySchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  code: z
    .string()
    .trim()
    .transform((s) => normalizeVerificationCodeInput(s))
    .refine((s) => /^\d{6}$/.test(s), "Verification code must be 6 digits"),
  referenceCode: z
    .string()
    .trim()
    .transform((s) => normalizeVerificationReferenceCode(s))
    .refine((s) => /^TP-[A-Z0-9]{4}$/.test(s), "Invalid reference code")
    .optional(),
});

type VerificationRecord = {
  id: string;
  userId: string;
  email: string;
  referenceCode: string | null;
  codePlain: string | null;
  codeHash: string;
  purpose?: string | null;
  status?: string | null;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
};

class SignupVerificationStateChangedError extends Error {}

function effectiveMaxAttempts(candidate: VerificationRecord) {
  return Number.isInteger(candidate.maxAttempts) && candidate.maxAttempts > 0
    ? Math.min(candidate.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
    : EMAIL_VERIFICATION_MAX_ATTEMPTS;
}

function invalidCodeResponse() {
  return createAppErrorResponse(
    "EMAIL_VERIFICATION_CODE_INVALID",
    "Invalid verification code",
    400
  );
}

function candidateCasWhere(
  candidate: VerificationRecord,
  now: Date
): Prisma.EmailVerificationCodeWhereInput {
  return {
    id: candidate.id,
    attempts: candidate.attempts,
    expiresAt: { gt: now },
    ...activeSignupVerificationWhere(),
  };
}

async function recordMatchesCode(
  candidate: VerificationRecord,
  params: { userId: string; email: string; code: string },
  now: Date
) {
  if (candidate.purpose && candidate.purpose !== EMAIL_VERIFICATION_PURPOSE) return false;
  if (candidate.status && candidate.status !== SIGNUP_VERIFICATION_STATUS.active) return false;
  if (isEmailVerificationCodeExpired(candidate.expiresAt, now)) return false;
  if (candidate.attempts >= effectiveMaxAttempts(candidate)) return false;
  const plainMatches =
    process.env.NODE_ENV !== "production" &&
    codesMatchPlaintext(candidate.codePlain, params.code);
  const hashMatches = await emailVerificationCodeMatches(candidate.codeHash, params);
  return plainMatches || hashMatches;
}

async function expireCandidate(candidate: VerificationRecord, now: Date) {
  await db.emailVerificationCode.updateMany({
    where: {
      id: candidate.id,
      ...activeSignupVerificationWhere(),
    },
    data: {
      status: SIGNUP_VERIFICATION_STATUS.expired,
      consumedAt: now,
      codePlain: null,
    },
  });
}

async function incrementInvalidAttempt(candidate: VerificationRecord, now: Date) {
  const nextAttempts = candidate.attempts + 1;
  const tooMany = nextAttempts >= effectiveMaxAttempts(candidate);
  const updated = await db.emailVerificationCode.updateMany({
    where: candidateCasWhere(candidate, now),
    data: {
      attempts: { increment: 1 },
      ...(tooMany
        ? {
            status: SIGNUP_VERIFICATION_STATUS.failed,
            consumedAt: now,
            codePlain: null,
          }
        : {}),
    },
  });
  return { updated: updated.count === 1, tooMany };
}

async function rejectInvalidCandidate(candidate: VerificationRecord, now: Date) {
  if (isEmailVerificationCodeExpired(candidate.expiresAt, now)) {
    await expireCandidate(candidate, now);
    return createAppErrorResponse(
      "EMAIL_VERIFICATION_CODE_EXPIRED",
      "Verification code expired",
      400
    );
  }
  if (candidate.attempts >= effectiveMaxAttempts(candidate)) {
    return createAppErrorResponse(
      "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS",
      "Too many invalid verification attempts",
      429
    );
  }

  const { updated, tooMany } = await incrementInvalidAttempt(candidate, now);
  if (!updated) return invalidCodeResponse();
  return createAppErrorResponse(
    tooMany
      ? "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS"
      : "EMAIL_VERIFICATION_CODE_INVALID",
    tooMany
      ? "Too many invalid verification attempts"
      : "Invalid verification code",
    tooMany ? 429 : 400
  );
}

export async function POST(req: Request) {
  if (!isEmailVerificationApiEnabled()) {
    return createAppErrorResponse(
      "EMAIL_VERIFICATION_DISABLED",
      "Email verification is temporarily disabled",
      503
    );
  }

  let email: string;
  let code: string;
  let referenceCode: string | undefined;
  try {
    const parsed = bodySchema.parse(await req.json());
    email = parsed.email;
    code = parsed.code;
    referenceCode = parsed.referenceCode;
  } catch {
    return createAppErrorResponse(
      "INVALID_PAYLOAD",
      "Invalid verification payload",
      400
    );
  }

  const normalizedEmail = normalizeVerificationEmail(email);
  const clientIdentifier = getRequestClientIdentifier(req);
  const challengeIdentifier = digestRateLimitIdentifier(
    buildRateLimitKey(normalizedEmail, referenceCode ?? "no-reference")
  );
  const verificationLimits = await Promise.all([
    consumeRateLimitWithStore({
      bucket: "auth:verify-email:ip",
      key: clientIdentifier,
      limit: 30,
      windowMs: 15 * 60_000,
    }),
    consumeRateLimitWithStore({
      bucket: "auth:verify-email:challenge",
      key: challengeIdentifier,
      limit: 10,
      windowMs: 15 * 60_000,
    }),
    consumeRateLimitWithStore({
      bucket: "auth:verify-email:ip-challenge",
      key: buildRateLimitKey(clientIdentifier, challengeIdentifier),
      limit: 10,
      windowMs: 15 * 60_000,
    }),
  ]);
  const blockedVerificationLimit = verificationLimits.find((result) => !result.allowed);
  if (blockedVerificationLimit) return createRateLimitResponse(blockedVerificationLimit);

  const now = new Date();
  const user = await db.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user || user.emailVerified) return invalidCodeResponse();

  let verification: VerificationRecord | null = null;

  if (referenceCode) {
    const byReference = await db.emailVerificationCode.findFirst({
      where: {
        email: normalizedEmail,
        referenceCode,
        ...activeSignupVerificationWhere(user.id),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (byReference) {
      const matchParams = {
        userId: user.id,
        email: user.email ?? normalizedEmail,
        code,
      };
      if (await recordMatchesCode(byReference, matchParams, now)) {
        verification = byReference;
      } else {
        return rejectInvalidCandidate(byReference, now);
      }
    }
  }

  if (!verification) {
    const activeVerifications = await db.emailVerificationCode.findMany({
      where: activeSignupVerificationWhere(user.id),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    });

    if (activeVerifications.length === 0) return invalidCodeResponse();

    const matchParams = {
      userId: user.id,
      email: user.email ?? normalizedEmail,
      code,
    };
    for (const candidate of activeVerifications) {
      if (await recordMatchesCode(candidate, matchParams, now)) {
        verification = candidate;
        break;
      }
    }

    if (!verification) {
      const latest = activeVerifications[0];
      const allExpired = activeVerifications.every((candidate) =>
        isEmailVerificationCodeExpired(candidate.expiresAt, now)
      );
      if (allExpired) {
        await db.emailVerificationCode.updateMany({
          where: {
            id: { in: activeVerifications.map((candidate) => candidate.id) },
            ...activeSignupVerificationWhere(user.id),
          },
          data: {
            status: SIGNUP_VERIFICATION_STATUS.expired,
            consumedAt: now,
            codePlain: null,
          },
        });
        return createAppErrorResponse(
          "EMAIL_VERIFICATION_CODE_EXPIRED",
          "Verification code expired",
          400
        );
      }
      return rejectInvalidCandidate(latest, now);
    }
  }

  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.emailVerificationCode.updateMany({
        where: candidateCasWhere(verification as VerificationRecord, now),
        data: {
          status: SIGNUP_VERIFICATION_STATUS.consumed,
          consumedAt: now,
          codePlain: null,
        },
      });
      if (claimed.count !== 1) throw new SignupVerificationStateChangedError();

      const verified = await tx.user.updateMany({
        where: {
          id: user.id,
          OR: [{ emailVerified: null }, { emailVerified: { isSet: false } }],
        },
        data: { emailVerified: now },
      });
      if (verified.count !== 1) throw new SignupVerificationStateChangedError();

      await tx.emailVerificationCode.updateMany({
        where: {
          ...activeSignupVerificationWhere(user.id),
          id: { not: (verification as VerificationRecord).id },
        },
        data: {
          status: SIGNUP_VERIFICATION_STATUS.consumed,
          consumedAt: now,
          codePlain: null,
        },
      });
    });
  } catch (error) {
    if (error instanceof SignupVerificationStateChangedError) {
      return invalidCodeResponse();
    }
    throw error;
  }

  const response = NextResponse.json({ ok: true, verified: true });
  logAuditEvent({ actorUserId: user.id, action: "auth.verification.completed", category: "auth", status: "success", targetType: "user", targetId: user.id });
  response.cookies.set(VERIFICATION_FLOW_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
