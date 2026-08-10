import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { isEmailVerificationApiEnabled } from "@/lib/auth/signup-policy";
import { sendVerificationCodeEmail } from "@/lib/email/send-verification-email";
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    digestRateLimitIdentifier,
    getRequestClientIdentifier,
    resetEmailVerificationAttemptLimits,
} from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";
import { resolveAuthSecret } from "@/lib/env";
import {
    decodeVerificationFlowHandle,
    encodeVerificationFlowHandle,
    VERIFICATION_FLOW_COOKIE,
    VERIFICATION_FLOW_MAX_AGE_SECONDS,
} from "@/lib/auth/verification-flow-handle";
import {
    activatePendingSignupVerification,
    activeSignupVerificationWhere,
    failPendingSignupVerification,
    SIGNUP_VERIFICATION_STATUS,
} from "@/lib/auth/signup-verification-lifecycle";
import {
    buildEmailVerificationExpiry,
    EMAIL_VERIFICATION_EXPIRES_MINUTES,
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    EMAIL_VERIFICATION_PURPOSE,
    generateEmailVerificationCode,
    generateVerificationReferenceCode,
    getEmailVerificationRetryAfterSeconds,
    hashEmailVerificationCodeForStorage,
    normalizeVerificationEmail,
} from "@/lib/email-verification";

const MINIMUM_PUBLIC_RESPONSE_MS = 750;

const bodySchema = z.object({
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
});

function maskEmail(email: string) {
    const [localPart = "", domain = ""] = email.split("@");
    const visibleLocal = localPart.slice(0, 2);
    const maskedLocal = `${visibleLocal}${"*".repeat(Math.max(0, localPart.length - visibleLocal.length))}`;
    return domain ? `${maskedLocal}@${domain}` : maskedLocal;
}

async function neutralAcceptedResponse(
    startedAt: number,
    development?: {
        flowHandle?: string;
        code?: string;
    }
) {
    const remainingMs = MINIMUM_PUBLIC_RESPONSE_MS - (Date.now() - startedAt);
    if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs));
    }

    const developmentCode = process.env.NODE_ENV !== "production" && /^\d{6}$/.test(development?.code ?? "")
        ? development?.code
        : undefined;
    const developmentFlowHandle = process.env.NODE_ENV !== "production"
        ? development?.flowHandle
        : undefined;
    const response = NextResponse.json(
        {
            ok: true,
            ...(developmentCode || developmentFlowHandle ? { devMode: true } : {}),
            ...(developmentCode ? { devCode: developmentCode } : {}),
        },
        {
            status: 202,
            headers: { "Cache-Control": "no-store, max-age=0" },
        }
    );
    if (developmentFlowHandle) {
        response.cookies.set(VERIFICATION_FLOW_COOKIE, developmentFlowHandle, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: VERIFICATION_FLOW_MAX_AGE_SECONDS,
        });
    }
    return response;
}

function requestCookie(req: Request, name: string) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    for (const part of cookieHeader.split(";")) {
        const [rawName, ...rawValue] = part.trim().split("=");
        if (rawName === name) return rawValue.join("=");
    }
    return undefined;
}

export async function POST(req: Request) {
    const startedAt = Date.now();
    const isLocalDevelopment = process.env.NODE_ENV === "development";
    const authSecret = resolveAuthSecret();
    const rawFlowHandle = requestCookie(req, VERIFICATION_FLOW_COOKIE);
    const existingFlow = authSecret && rawFlowHandle
        ? decodeVerificationFlowHandle(rawFlowHandle, authSecret)
        : null;
    let developmentFlowHandle: string | undefined;
    let developmentCode: string | undefined;

    if (!isEmailVerificationApiEnabled()) {
        return createAppErrorResponse(
            "EMAIL_VERIFICATION_DISABLED",
            "Email verification is temporarily disabled",
            503
        );
    }

    let identifier: string;
    try {
        const json = await req.json();
        identifier = normalizeVerificationEmail(bodySchema.parse(json).email);
    } catch {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid email", 400);
    }

    const clientIdentifier = getRequestClientIdentifier(req);
    const emailIdentifier = digestRateLimitIdentifier(identifier);
    if (!isLocalDevelopment) {
        const resendLimits = await Promise.all([
            consumeRateLimitWithStore({
                bucket: "auth:resend-verification:ip",
                key: clientIdentifier,
                limit: 20,
                windowMs: 15 * 60_000,
            }),
            consumeRateLimitWithStore({
                bucket: "auth:resend-verification:account",
                key: emailIdentifier,
                limit: 5,
                windowMs: 15 * 60_000,
            }),
            consumeRateLimitWithStore({
                bucket: "auth:resend-verification:ip-account",
                key: buildRateLimitKey(clientIdentifier, emailIdentifier),
                limit: 5,
                windowMs: 15 * 60_000,
            }),
        ]);
        if (resendLimits.some((limit) => !limit.allowed)) {
            return neutralAcceptedResponse(startedAt);
        }
    }

    try {
        const user = await db.user.findFirst({
            where: {
                email: { equals: identifier, mode: "insensitive" },
            },
            select: { id: true, email: true, emailVerified: true, password: true },
        });

        if (!user?.password || user.emailVerified) {
            return neutralAcceptedResponse(startedAt);
        }

        const issuedAt = new Date();
        const latestCode = await db.emailVerificationCode.findFirst({
            where: {
                ...activeSignupVerificationWhere(user.id),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
                id: true,
                lastSentAt: true,
            },
        });

        if (
            !isLocalDevelopment &&
            latestCode &&
            getEmailVerificationRetryAfterSeconds(latestCode.lastSentAt, issuedAt) > 0
        ) {
            return neutralAcceptedResponse(startedAt);
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
                purpose: EMAIL_VERIFICATION_PURPOSE,
                status: SIGNUP_VERIFICATION_STATUS.pending,
                attempts: 0,
                maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
                expiresAt: buildEmailVerificationExpiry(issuedAt),
                lastSentAt: issuedAt,
                consumedAt: null,
            },
        });

        try {
            const sendResult = await sendVerificationCodeEmail(
                identifier,
                verificationCode,
                EMAIL_VERIFICATION_EXPIRES_MINUTES,
                verificationReference
            );
            if (!sendResult.sent && process.env.NODE_ENV === "production") {
                throw new Error("EMAIL_PROVIDER_NOT_ACCEPTED");
            }
            await activatePendingSignupVerification({
                codeId: pendingCode.id,
                userId: user.id,
                provider: sendResult.sent ? "resend" : "console",
                providerMessageId: sendResult.messageId,
            });
            // Local development must remain testable even when the provider accepts
            // a message that never reaches the inbox (sandbox sender, suppression,
            // or delayed delivery). Production responses never include this value.
            if (process.env.NODE_ENV !== "production") {
                developmentCode = verificationCode;
            }
            if (
                process.env.NODE_ENV !== "production" &&
                !sendResult.sent &&
                authSecret &&
                existingFlow?.userId === user.id &&
                existingFlow.email === identifier
            ) {
                developmentFlowHandle = encodeVerificationFlowHandle(
                    { userId: user.id, email: identifier, devCode: verificationCode },
                    authSecret
                );
            }
        } catch (error) {
            await failPendingSignupVerification(pendingCode.id);
            console.error("[resend-verification] email delivery failed", error);
            logAuditEvent({
                actorUserId: user.id,
                action: "auth.resend_verification.failed",
                category: "auth",
                status: "error",
                targetType: "user",
                targetId: user.id,
                metadata: { emailMasked: maskEmail(identifier) },
            });
            return neutralAcceptedResponse(startedAt);
        }

        await resetEmailVerificationAttemptLimits(identifier);

        logAuditEvent({
            actorUserId: user.id,
            action: "auth.resend_verification.sent",
            category: "auth",
            status: "success",
            targetType: "user",
            targetId: user.id,
            metadata: { emailMasked: maskEmail(identifier) },
        });
    } catch (error) {
        console.error("[resend-verification] request failed", error);
        logAuditEvent({
            action: "auth.resend_verification.failed",
            category: "auth",
            status: "error",
            targetType: "verification",
            metadata: { emailMasked: maskEmail(identifier) },
        });
    }

    return neutralAcceptedResponse(startedAt, {
        flowHandle: developmentFlowHandle,
        code: developmentCode,
    });
}
