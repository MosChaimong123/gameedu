import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    codesMatchPlaintext,
    emailVerificationCodeMatches,
    isEmailVerificationCodeExpired,
    normalizeVerificationCodeInput,
    normalizeVerificationEmail,
    normalizeVerificationReferenceCode,
} from "@/lib/email-verification";

const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";

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
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

type ResetRecord = {
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
    candidate: ResetRecord,
    params: { userId: string; email: string; code: string },
    now: Date
) {
    if (isEmailVerificationCodeExpired(candidate.expiresAt, now)) return false;
    if (candidate.attempts >= candidate.maxAttempts) return false;
    const plainMatches = codesMatchPlaintext(candidate.codePlain, params.code);
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

    const user = await db.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        select: { id: true, email: true },
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
                purpose: PASSWORD_RESET_PURPOSE,
                OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        if (byReference) {
            const matchParams = { userId: user.id, email: user.email ?? normalizedEmail, code };

            if (await recordMatchesCode(byReference, matchParams, now)) {
                record = byReference;
            } else {
                if (isEmailVerificationCodeExpired(byReference.expiresAt, now)) {
                    return createAppErrorResponse("EMAIL_VERIFICATION_CODE_EXPIRED", "Reset code expired", 400);
                }
                if (byReference.attempts >= byReference.maxAttempts) {
                    return createAppErrorResponse("EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS", "Too many invalid attempts", 429);
                }

                const nextAttempts = byReference.attempts + 1;
                await db.emailVerificationCode.update({
                    where: { id: byReference.id },
                    data: {
                        attempts: nextAttempts,
                        ...(nextAttempts >= Math.max(byReference.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS) ? { consumedAt: now } : {}),
                    },
                });

                const tooMany = nextAttempts >= Math.max(byReference.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS);
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
                purpose: PASSWORD_RESET_PURPOSE,
                OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
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
                return createAppErrorResponse("EMAIL_VERIFICATION_CODE_EXPIRED", "Reset code expired", 400);
            }
            if (latest.attempts >= latest.maxAttempts) {
                return createAppErrorResponse("EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS", "Too many invalid attempts", 429);
            }

            const nextAttempts = latest.attempts + 1;
            await db.emailVerificationCode.update({
                where: { id: latest.id },
                data: {
                    attempts: nextAttempts,
                    ...(nextAttempts >= Math.max(latest.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS) ? { consumedAt: now } : {}),
                },
            });

            const tooMany = nextAttempts >= Math.max(latest.maxAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS);
            return createAppErrorResponse(
                tooMany ? "EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS" : "EMAIL_VERIFICATION_CODE_INVALID",
                tooMany ? "Too many invalid attempts" : "Invalid reset code",
                tooMany ? 429 : 400
            );
        }
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    await db.emailVerificationCode.updateMany({
        where: {
            userId: user.id,
            purpose: PASSWORD_RESET_PURPOSE,
            OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
        },
        data: { consumedAt: now, codePlain: null },
    });

    logAuditEvent({
        actorUserId: user.id,
        action: "auth.password_reset.completed",
        category: "auth",
        status: "success",
        targetType: "user",
        targetId: user.id,
        metadata: {},
    });

    return NextResponse.json({ ok: true });
}
