import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    digestRateLimitIdentifier,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import {
    buildEmailVerificationExpiry,
    EMAIL_VERIFICATION_EXPIRES_MINUTES,
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    generateEmailVerificationCode,
    generateVerificationReferenceCode,
    getEmailVerificationRetryAfterSeconds,
    hashEmailVerificationCodeForStorage,
    normalizeVerificationEmail,
} from "@/lib/email-verification";

const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";
const PASSWORD_RESET_MIN_RESPONSE_MS = 350;
const PASSWORD_RESET_PROCESSING_LOCK_SECONDS = 120;
const PASSWORD_RESET_REQUEST_WINDOW_MS = 15 * 60_000;

type NeutralPasswordResetResponse = {
    ok: true;
    requestAccepted: true;
    cooldownSeconds: number;
    referenceCode?: string;
    devCode?: string;
};

const bodySchema = z.object({
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
});

function maskEmail(email: string) {
    const [localPart = "", domain = ""] = email.split("@");
    const visibleLocal = localPart.slice(0, 2);
    const maskedLocal = `${visibleLocal}${"*".repeat(Math.max(0, localPart.length - visibleLocal.length))}`;
    return domain ? `${maskedLocal}@${domain}` : maskedLocal;
}

function isUniqueConstraintError(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function activePasswordResetWhere(userId: string): Prisma.EmailVerificationCodeWhereInput {
    return {
        userId,
        purpose: PASSWORD_RESET_PURPOSE,
        AND: [
            { OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }] },
            { OR: [{ status: "ACTIVE" }, { status: { isSet: false } }] },
        ],
    };
}

async function failPendingPasswordReset(params: {
    codeId: string;
    requestToken: string;
}) {
    const settled = await Promise.allSettled([
        db.emailVerificationCode.update({
            where: { id: params.codeId },
            data: { status: "FAILED", consumedAt: new Date(), codePlain: null },
        }),
        db.passwordResetIssuanceLock.deleteMany({ where: { requestToken: params.requestToken } }),
    ]);
    for (const result of settled) {
        if (result.status === "rejected") {
            console.error("[forgot-password] pending cleanup failed", result.reason);
        }
    }
}

async function createNeutralResponse(
    responseStartedAt: number,
    developmentMetadata?: { referenceCode: string; devCode?: string }
) {
    const configuredMinimum = Number(process.env.PASSWORD_RESET_MIN_RESPONSE_MS);
    const minimumResponseMs = Number.isFinite(configuredMinimum)
        ? Math.max(0, configuredMinimum)
        : PASSWORD_RESET_MIN_RESPONSE_MS;
    const remainingDelayMs = minimumResponseMs - (Date.now() - responseStartedAt);
    if (remainingDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelayMs));
    }

    const responseBody: NeutralPasswordResetResponse = {
        ok: true,
        requestAccepted: true,
        cooldownSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    };

    // Development-only metadata keeps local OTP testing usable without making
    // production responses reveal whether an account exists.
    if (process.env.NODE_ENV !== "production" && developmentMetadata) {
        responseBody.referenceCode = developmentMetadata.referenceCode;
        if (developmentMetadata.devCode) {
            responseBody.devCode = developmentMetadata.devCode;
        }
    }

    return NextResponse.json(responseBody, { status: 202 });
}

export async function POST(req: Request) {
    let email: string;
    try {
        const json = await req.json();
        email = bodySchema.parse(json).email;
    } catch {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid email", 400);
    }

    const identifier = normalizeVerificationEmail(email);
    const responseStartedAt = Date.now();
    const clientIdentifier = getRequestClientIdentifier(req);
    const emailDigest = digestRateLimitIdentifier(identifier);
    const [ipLimit, emailLimit] = await Promise.all([
        consumeRateLimitWithStore({
            bucket: "auth:forgot-password:ip",
            key: buildRateLimitKey(clientIdentifier),
            limit: 20,
            windowMs: PASSWORD_RESET_REQUEST_WINDOW_MS,
        }),
        consumeRateLimitWithStore({
            bucket: "auth:forgot-password:email",
            key: emailDigest,
            limit: 5,
            windowMs: PASSWORD_RESET_REQUEST_WINDOW_MS,
        }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
        return createNeutralResponse(responseStartedAt);
    }
    logAuditEvent({
        action: "auth.password_reset.request_accepted",
        category: "auth",
        status: "success",
        targetType: "password_reset_request",
        metadata: { emailDigest },
    });
    const user = await db.user.findFirst({
        where: {
            email: { equals: identifier, mode: "insensitive" },
        },
        select: { id: true, email: true, password: true },
    });

    // Use the same public response as credential accounts to avoid account enumeration.
    if (!user?.password) {
        return createNeutralResponse(responseStartedAt);
    }

    const issuedAt = new Date();
    const requestToken = randomUUID();
    await db.passwordResetIssuanceLock.deleteMany({
        where: { userId: user.id, lockedUntil: { lte: issuedAt } },
    });
    try {
        await db.passwordResetIssuanceLock.create({
            data: {
                userId: user.id,
                requestToken,
                lockedUntil: new Date(issuedAt.getTime() + PASSWORD_RESET_PROCESSING_LOCK_SECONDS * 1000),
            },
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return createNeutralResponse(responseStartedAt);
        }
        throw error;
    }

    const latestCode = await db.emailVerificationCode.findFirst({
        where: {
            ...activePasswordResetWhere(user.id),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, lastSentAt: true },
    });

    if (latestCode) {
        const retryAfterSeconds = getEmailVerificationRetryAfterSeconds(latestCode.lastSentAt, issuedAt);
        if (retryAfterSeconds > 0) {
            await db.passwordResetIssuanceLock.update({
                where: { requestToken },
                data: { lockedUntil: new Date(issuedAt.getTime() + retryAfterSeconds * 1000) },
            });
            return createNeutralResponse(responseStartedAt);
        }
    }

    const verificationCode = generateEmailVerificationCode();
    const verificationReference = generateVerificationReferenceCode();
    const verificationCodeHash = hashEmailVerificationCodeForStorage(verificationCode);

    const pendingCode = await db.emailVerificationCode.create({
        data: {
            userId: user.id,
            email: identifier,
            referenceCode: verificationReference,
            codePlain: null,
            codeHash: verificationCodeHash,
            purpose: PASSWORD_RESET_PURPOSE,
            status: "PENDING",
            attempts: 0,
            maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
            expiresAt: buildEmailVerificationExpiry(issuedAt),
            lastSentAt: issuedAt,
            consumedAt: null,
        },
    });

    let emailSent = false;
    let providerMessageId: string | undefined;
    try {
        const sendResult = await sendPasswordResetEmail(
            identifier,
            verificationCode,
            EMAIL_VERIFICATION_EXPIRES_MINUTES,
            verificationReference
        );
        emailSent = sendResult.sent;
        providerMessageId = sendResult.messageId;
        if (!emailSent && process.env.NODE_ENV === "production") {
            throw new Error("EMAIL_PROVIDER_NOT_ACCEPTED");
        }
        if (emailSent && !providerMessageId) {
            throw new Error("EMAIL_PROVIDER_MESSAGE_ID_MISSING");
        }
    } catch (e) {
        console.error("[forgot-password]", e);
        await failPendingPasswordReset({ codeId: pendingCode.id, requestToken });
        logAuditEvent({
            actorUserId: user.id,
            action: "auth.password_reset.send_failed",
            category: "auth",
            status: "error",
            targetType: "user",
            targetId: user.id,
            metadata: { emailMasked: maskEmail(identifier) },
        });
        logAuditEvent({
            actorUserId: user.id,
            action: "auth.password_reset.delivery_failed",
            category: "auth",
            status: "error",
            targetType: "user",
            targetId: user.id,
            metadata: { stage: "provider_request", emailDigest },
        });
        return createNeutralResponse(responseStartedAt);
    }

    const acceptedAt = new Date();
    await db.$transaction([
        db.emailVerificationCode.updateMany({
            where: {
                ...activePasswordResetWhere(user.id),
                id: { not: pendingCode.id },
            },
            data: { status: "CONSUMED", consumedAt: acceptedAt, codePlain: null },
        }),
        db.emailVerificationCode.update({
            where: { id: pendingCode.id },
            data: {
                status: "ACTIVE",
                lastSentAt: acceptedAt,
                ...(emailSent
                    ? {
                        emailProvider: "resend",
                        providerMessageId,
                        deliveryStatus: "ACCEPTED",
                        providerAcceptedAt: acceptedAt,
                        deliveryUpdatedAt: acceptedAt,
                    }
                    : {}),
            },
        }),
        db.passwordResetIssuanceLock.update({
            where: { requestToken },
            data: {
                lockedUntil: new Date(
                    acceptedAt.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
                ),
            },
        }),
    ]);

    logAuditEvent({
        actorUserId: user.id,
        action: emailSent ? "auth.password_reset.otp_sent" : "auth.password_reset.otp_activated_dev",
        category: "auth",
        status: "success",
        targetType: "user",
        targetId: user.id,
        metadata: { emailMasked: maskEmail(identifier) },
    });
    if (emailSent) {
        logAuditEvent({
            actorUserId: user.id,
            action: "auth.password_reset.provider_accepted",
            category: "auth",
            status: "success",
            targetType: "user",
            targetId: user.id,
            metadata: { provider: "resend", referenceCode: verificationReference },
        });
    }

    return createNeutralResponse(responseStartedAt, {
        referenceCode: verificationReference,
        devCode: !emailSent ? verificationCode : undefined,
    });
}
