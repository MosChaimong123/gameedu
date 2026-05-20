import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { isEmailVerificationApiEnabled } from "@/lib/auth/signup-policy";
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

async function findUserForVerification(normalizedEmail: string) {
  return db.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
    },
    select: { id: true, email: true, emailVerified: true },
  });
}

async function findUserForVerificationCode(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true },
  });
}

type VerificationRecord = {
  id: string;
  userId: string;
  email: string;
  referenceCode: string | null;
  codePlain: string | null;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
};

async function recordMatchesCode(
  candidate: VerificationRecord,
  params: { userId: string; email: string; code: string },
  now: Date
) {
  if (isEmailVerificationCodeExpired(candidate.expiresAt, now)) {
    return false;
  }
  if (candidate.attempts >= candidate.maxAttempts) {
    return false;
  }
  const plainMatches = codesMatchPlaintext(candidate.codePlain, params.code);
  const hashMatches = await emailVerificationCodeMatches(candidate.codeHash, params);
  return plainMatches || hashMatches;
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
    const json = await req.json();
    const parsed = bodySchema.parse(json);
    email = parsed.email;
    code = parsed.code;
    referenceCode = parsed.referenceCode;
  } catch {
    return createAppErrorResponse("INVALID_PAYLOAD", "Invalid verification payload", 400);
  }

  const normalizedEmail = normalizeVerificationEmail(email);
  const now = new Date();

  let user: Awaited<ReturnType<typeof findUserForVerification>> = null;
  let verification: VerificationRecord | null = null;

  if (referenceCode) {
    const byReference = await db.emailVerificationCode.findFirst({
      where: {
        email: normalizedEmail,
        referenceCode,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (byReference) {
      const referenceUser = await findUserForVerificationCode(byReference.userId);
      if (!referenceUser) {
        return createAppErrorResponse(
          "EMAIL_VERIFICATION_CODE_INVALID",
          "Invalid verification code",
          400
        );
      }

      if (referenceUser.emailVerified) {
        return NextResponse.json({ ok: true, alreadyVerified: true });
      }

      const referenceMatchParams = {
        userId: referenceUser.id,
        email: referenceUser.email ?? normalizedEmail,
        code,
      };

      if (await recordMatchesCode(byReference, referenceMatchParams, now)) {
        user = referenceUser;
        verification = byReference;
      } else {
        if (isEmailVerificationCodeExpired(byReference.expiresAt, now)) {
          return createAppErrorResponse(
            "EMAIL_VERIFICATION_CODE_EXPIRED",
            "Verification code expired",
            400
          );
        }
        if (byReference.attempts >= byReference.maxAttempts) {
          return createAppErrorResponse(
            "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS",
            "Too many invalid verification attempts",
            429
          );
        }

        const nextAttempts = byReference.attempts + 1;
        await db.emailVerificationCode.update({
          where: { id: byReference.id },
          data: {
            attempts: nextAttempts,
            ...(nextAttempts >= Math.max(byReference.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
              ? { consumedAt: now }
              : {}),
          },
        });

        return createAppErrorResponse(
          nextAttempts >= Math.max(byReference.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
            ? "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS"
            : "EMAIL_VERIFICATION_CODE_INVALID",
          nextAttempts >= Math.max(byReference.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
            ? "Too many invalid verification attempts"
            : "Invalid verification code",
          nextAttempts >= Math.max(byReference.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)
            ? 429
            : 400
        );
      }
    }
  }

  user = user ?? (await findUserForVerification(normalizedEmail));

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

  const matchParams = {
    userId: user.id,
    email: user.email ?? normalizedEmail,
    code,
  };

  if (!verification) {
    const activeVerifications = await db.emailVerificationCode.findMany({
      where: {
        userId: user.id,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
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

    for (const candidate of activeVerifications) {
      if (await recordMatchesCode(candidate, matchParams, now)) {
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
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: now },
  });
  await db.emailVerificationCode.updateMany({
    where: {
      userId: user.id,
      purpose: EMAIL_VERIFICATION_PURPOSE,
      OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
    },
    data: { consumedAt: now, codePlain: null },
  });

  return NextResponse.json({ ok: true, verified: true });
}
