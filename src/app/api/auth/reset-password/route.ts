import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    createRateLimitResponse,
    digestRateLimitIdentifier,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import {
    codesMatchPlaintext,
    emailVerificationCodeMatches,
    isEmailVerificationCodeExpired,
    normalizeVerificationCodeInput,
    normalizeVerificationEmail,
    normalizeVerificationReferenceCode,
} from "@/lib/email-verification";

const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";
const PASSWORD_RESET_VERIFY_WINDOW_MS = 15 * 60_000;

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
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type ResetRecord = {
    id: string;
    userId: string;
    email: string;
    referenceCode: string | null;
    codePlain: string | null;
    codeHash: string;
    purpose: string;
    attempts: number;
    maxAttempts: number;
    expiresAt: Date;
    status?: string | null;
};

class PasswordResetCodeStateChangedError extends Error {}

function activePasswordResetWhere(): Prisma.EmailVerificationCodeWhereInput {
    return {
        purpose: PASSWORD_RESET_PURPOSE,
        AND: [
            { OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }] },
            { OR: [{ status: "ACTIVE" }, { status: { isSet: false } }] },
        ],
    };
}

function passwordResetCandidateCasWhere(
    candidate: ResetRecord,
    now: Date
): Prisma.EmailVerificationCodeWhereInput {
    return {
        id: candidate.id,
        attempts: candidate.attempts,
        expiresAt: { gt: now },
        ...activePasswordResetWhere(),
    };
}

async function incrementInvalidAttempt(candidate: ResetRecord, now: Date) {
    const nextAttempts = candidate.attempts + 1;
    const tooMany = nextAttempts >= candidate.maxAttempts;
    const result = await db.emailVerificationCode.updateMany({
        where: passwordResetCandidateCasWhere(candidate, now),
        data: {
            attempts: { increment: 1 },
            ...(tooMany ? { consumedAt: now, status: "FAILED", codePlain: null } : {}),
        },
    });
    return { updated: result.count === 1, tooMany };
}

async function recordMatchesCode(
    candidate: ResetRecord,
    params: { userId: string; email: string; code: string },
    now: Date
) {
    if (candidate.purpose !== PASSWORD_RESET_PURPOSE) return false;
    if (candidate.status && candidate.status !== "ACTIVE") return false;
    if (isEmailVerificationCodeExpired(candidate.expiresAt, now)) return false;
    if (candidate.attempts >= candidate.maxAttempts) return false;
    const plainMatches = process.env.NODE_ENV !== "production" && codesMatchPlaintext(candidate.codePlain, params.code);
    const hashMatches = await emailVerificationCodeMatches(candidate.codeHash, params);
    return plainMatches || hashMatches;
}

export async function POST(req: Request) {
    let email: string;
    let code: string;
    let referenceCode: string | undefined;
    let newPassword: string;

    try {
        const json = await req.json();
        const parsed = bodySchema.parse(json);
        email = parsed.email;
        code = parsed.code;
        referenceCode = parsed.referenceCode;
        newPassword = parsed.newPassword;
    } catch {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid reset payload", 400);
    }

    const normalizedEmail = normalizeVerificationEmail(email);
    const now = new Date();
    const clientIdentifier = getRequestClientIdentifier(req);
    const recoveryDigest = digestRateLimitIdentifier(
        buildRateLimitKey(normalizedEmail, referenceCode ?? "no-reference")
    );
    const [ipLimit, recoveryLimit] = await Promise.all([
        consumeRateLimitWithStore({
            bucket: "auth:reset-password:ip",
            key: buildRateLimitKey(clientIdentifier),
            limit: 30,
            windowMs: PASSWORD_RESET_VERIFY_WINDOW_MS,
        }),
        consumeRateLimitWithStore({
            bucket: "auth:reset-password:recovery",
            key: recoveryDigest,
            limit: 10,
            windowMs: PASSWORD_RESET_VERIFY_WINDOW_MS,
        }),
    ]);
    if (!ipLimit.allowed || !recoveryLimit.allowed) {
        return createRateLimitResponse(Math.max(ipLimit.retryAfterSeconds, recoveryLimit.retryAfterSeconds));
    }

    const user = await db.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        select: { id: true, email: true, authVersion: true },
    });

    if (!user) {
        return createAppErrorResponse("EMAIL_VERIFICATION_CODE_INVALID", "Invalid reset code", 400);
    }

    let record: ResetRecord | null = null;

    if (referenceCode) {
        const byReference = await db.emailVerificationCode.findFirst({
            where: {
                email: normalizedEmail,
                referenceCode,
                ...activePasswordResetWhere(),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        if (byReference) {
            const matchParams = { userId: user.id, email: user.email ?? normalizedEmail, code };

            if (await recordMatchesCode(byReference, matchParams, now)) {
                record = byReference;
            } else {
                if (isEmailVerificationCodeExpired(byReference.expiresAt, now)) {
                    await db.emailVerificationCode.update({
                        where: { id: byReference.id },
                        data: { status: "EXPIRED", consumedAt: now, codePlain: null },
                    });
                    return createAppErrorResponse("EMAIL_VERIFICATION_CODE_EXPIRED", "Reset code expired", 400);
                }
                if (byReference.attempts >= byReference.maxAttempts) {
                    return createAppErrorResponse("EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS", "Too many invalid attempts", 429);
                }

                const { updated, tooMany } = await incrementInvalidAttempt(byReference, now);
                if (!updated) {
                    return createAppErrorResponse("EMAIL_VERIFICATION_CODE_INVALID", "Invalid reset code", 400);
                }
                return createAppErrorResponse(
                    tooMany ? "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS" : "EMAIL_VERIFICATION_CODE_INVALID",
                    tooMany ? "Too many invalid attempts" : "Invalid reset code",
                    tooMany ? 429 : 400
                );
            }
        }
    }

    if (!record) {
        const activeRecords = await db.emailVerificationCode.findMany({
            where: {
                userId: user.id,
                ...activePasswordResetWhere(),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 5,
        });

        if (activeRecords.length === 0) {
            return createAppErrorResponse("EMAIL_VERIFICATION_CODE_INVALID", "No active reset code. Request a new code.", 400);
        }

        const matchParams = { userId: user.id, email: user.email ?? normalizedEmail, code };
        for (const candidate of activeRecords) {
            if (await recordMatchesCode(candidate, matchParams, now)) {
                record = candidate;
                break;
            }
        }

        if (!record) {
            const latest = activeRecords[0];
            const allExpired = activeRecords.every((e) => isEmailVerificationCodeExpired(e.expiresAt, now));
            if (allExpired) {
                await db.emailVerificationCode.updateMany({
                    where: { id: { in: activeRecords.map((entry) => entry.id) } },
                    data: { status: "EXPIRED", consumedAt: now, codePlain: null },
                });
                return createAppErrorResponse("EMAIL_VERIFICATION_CODE_EXPIRED", "Reset code expired", 400);
            }
            if (latest.attempts >= latest.maxAttempts) {
                return createAppErrorResponse("EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS", "Too many invalid attempts", 429);
            }

            const { updated, tooMany } = await incrementInvalidAttempt(latest, now);
            if (!updated) {
                return createAppErrorResponse("EMAIL_VERIFICATION_CODE_INVALID", "Invalid reset code", 400);
            }
            return createAppErrorResponse(
                tooMany ? "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS" : "EMAIL_VERIFICATION_CODE_INVALID",
                tooMany ? "Too many invalid attempts" : "Invalid reset code",
                tooMany ? 429 : 400
            );
        }
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const authVersionUpdate =
        typeof user.authVersion === "number" && Number.isSafeInteger(user.authVersion) && user.authVersion >= 0
            ? { increment: 1 }
            : 1;
    let deletedDatabaseSessions = 0;

    try {
        deletedDatabaseSessions = await db.$transaction(async (tx) => {
            const claimed = await tx.emailVerificationCode.updateMany({
                where: passwordResetCandidateCasWhere(record, now),
                data: { status: "CONSUMED", consumedAt: now, codePlain: null },
            });
            if (claimed.count !== 1) {
                throw new PasswordResetCodeStateChangedError();
            }
            await tx.emailVerificationCode.updateMany({
                where: {
                    userId: user.id,
                    ...activePasswordResetWhere(),
                },
                data: { status: "CONSUMED", consumedAt: now, codePlain: null },
            });
            await tx.user.update({
                where: { id: user.id },
                data: { password: hashedPassword, authVersion: authVersionUpdate },
            });
            const deletedSessions = await tx.session.deleteMany({ where: { userId: user.id } });
            return deletedSessions.count;
        });
    } catch (error) {
        if (error instanceof PasswordResetCodeStateChangedError) {
            return createAppErrorResponse("EMAIL_VERIFICATION_CODE_INVALID", "Invalid reset code", 400);
        }
        throw error;
    }

    logAuditEvent({
        actorUserId: user.id,
        action: "auth.password_reset.completed",
        category: "auth",
        status: "success",
        targetType: "user",
        targetId: user.id,
        metadata: {},
    });
    logAuditEvent({
        actorUserId: user.id,
        action: "auth.password_reset.sessions_revoked",
        category: "auth",
        status: "success",
        targetType: "user",
        targetId: user.id,
        metadata: { strategy: "jwt", databaseSessionsDeleted: deletedDatabaseSessions },
    });

    return NextResponse.json({ ok: true });
}
