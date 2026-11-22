import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import {
  emailVerificationCodeMatches,
  isEmailVerificationCodeExpired,
  normalizeVerificationCodeInput,
  normalizeVerificationReferenceCode,
} from "@/lib/email-verification";
import { logAuditEvent } from "@/lib/security/audit-log";
import { EMAIL_CHANGE_PURPOSE } from "../request/route";
import { activeUserAuthSessionFilter } from "@/lib/auth/session-registry";

const bodySchema = z.object({
  code: z.string().transform(normalizeVerificationCodeInput).refine((value) => /^\d{6}$/.test(value)),
  referenceCode: z.string().transform(normalizeVerificationReferenceCode).refine((value) => /^TP-[A-Z0-9]{4}$/.test(value)),
});

function activeWhere(userId: string): Prisma.EmailVerificationCodeWhereInput {
  return { userId, purpose: EMAIL_CHANGE_PURPOSE, status: "ACTIVE", consumedAt: null };
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return createAppErrorResponse("AUTH_REQUIRED", "Unauthorized", 401);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return createAppErrorResponse("INVALID_PAYLOAD", "Invalid request", 400);

  const [user, candidate] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { email: true, authVersion: true } }),
    db.emailVerificationCode.findFirst({
      where: { ...activeWhere(userId), referenceCode: parsed.data.referenceCode },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);
  if (!user?.email || !candidate) {
    return createAppErrorResponse("EMAIL_VERIFICATION_CODE_INVALID", "Invalid or expired code", 400);
  }
  const now = new Date();
  if (isEmailVerificationCodeExpired(candidate.expiresAt, now)) {
    await db.emailVerificationCode.updateMany({
      where: { id: candidate.id, ...activeWhere(userId) },
      data: { status: "EXPIRED", consumedAt: now, codePlain: null },
    });
    return createAppErrorResponse("EMAIL_VERIFICATION_CODE_EXPIRED", "Code expired", 400);
  }
  if (candidate.attempts >= candidate.maxAttempts) {
    return createAppErrorResponse("EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS", "Too many attempts", 429);
  }
  const matches = await emailVerificationCodeMatches(candidate.codeHash, {
    userId,
    email: candidate.email,
    code: parsed.data.code,
  });
  if (!matches) {
    const tooMany = candidate.attempts + 1 >= candidate.maxAttempts;
    await db.emailVerificationCode.updateMany({
      where: { id: candidate.id, ...activeWhere(userId), attempts: candidate.attempts, expiresAt: { gt: now } },
      data: {
        attempts: { increment: 1 },
        ...(tooMany ? { status: "FAILED", consumedAt: now, codePlain: null } : {}),
      },
    });
    return createAppErrorResponse(
      tooMany ? "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS" : "EMAIL_VERIFICATION_CODE_INVALID",
      tooMany ? "Too many attempts" : "Invalid code",
      tooMany ? 429 : 400
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const claimed = await tx.emailVerificationCode.updateMany({
        where: { id: candidate.id, ...activeWhere(userId), attempts: candidate.attempts, expiresAt: { gt: now } },
        data: { status: "CONSUMED", consumedAt: now, codePlain: null },
      });
      if (claimed.count !== 1) throw new Error("EMAIL_CHANGE_STATE_CHANGED");
      const changed = await tx.user.updateMany({
        where: { id: userId, email: user.email },
        data: {
          email: candidate.email,
          emailVerified: now,
          authVersion: typeof user.authVersion === "number" ? { increment: 1 } : 1,
        },
      });
      if (changed.count !== 1) throw new Error("EMAIL_CHANGE_STATE_CHANGED");
      await tx.emailVerificationCode.updateMany({
        where: { ...activeWhere(userId), id: { not: candidate.id } },
        data: { status: "CONSUMED", consumedAt: now, codePlain: null },
      });
      const sessions = await tx.session.deleteMany({ where: { userId } });
      const securitySessions = await tx.userAuthSession.updateMany({
        where: { userId, ...activeUserAuthSessionFilter() },
        data: { revokedAt: now, revokedReason: "email_changed" },
      });
      return { databaseSessionsDeleted: sessions.count, securitySessionsRevoked: securitySessions.count };
    });
    logAuditEvent({
      actorUserId: userId,
      action: "auth.email_change.completed",
      category: "auth",
      targetType: "user",
      targetId: userId,
      metadata: result,
    });
    return NextResponse.json({ ok: true, sessionsRevoked: result.securitySessionsRevoked });
  } catch (error) {
    console.error("[change-email] confirmation failed", error);
    return createAppErrorResponse("EMAIL_CHANGE_CONFLICT", "Email change could not be completed", 409);
  }
}
