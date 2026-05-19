import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { sendVerificationCodeEmail } from "@/lib/email/send-verification-email";
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    buildEmailVerificationExpiry,
    EMAIL_VERIFICATION_EXPIRES_MINUTES,
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    EMAIL_VERIFICATION_PURPOSE,
    generateEmailVerificationCode,
    getEmailVerificationRetryAfterSeconds,
    hashEmailVerificationCode,
    normalizeVerificationEmail,
} from "@/lib/email-verification";

const bodySchema = z.object({
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
});

function maskEmail(email: string) {
    const [localPart = "", domain = ""] = email.split("@");
    const visibleLocal = localPart.slice(0, 2);
    const maskedLocal = `${visibleLocal}${"*".repeat(Math.max(0, localPart.length - visibleLocal.length))}`;
    return domain ? `${maskedLocal}@${domain}` : maskedLocal;
}

export async function POST(req: Request) {
    const clientIdentifier = getRequestClientIdentifier(req);
    const rateLimit = await consumeRateLimitWithStore({
        bucket: "auth:resend-verification",
        key: clientIdentifier,
        limit: 5,
        windowMs: 60 * 60_000,
    });

    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    let email: string;
    try {
        const json = await req.json();
        email = bodySchema.parse(json).email;
    } catch {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid email", 400);
    }

    const identifier = normalizeVerificationEmail(email);
    const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email: true, emailVerified: true, password: true },
    });

    if (!user?.password) {
        return NextResponse.json({ ok: true });
    }

    if (user.emailVerified) {
        return NextResponse.json({ ok: true });
    }

    const verifyRateLimit = await consumeRateLimitWithStore({
        bucket: "auth:resend-verification:email",
        key: buildRateLimitKey(clientIdentifier, identifier),
        limit: 5,
        windowMs: 60 * 60_000,
    });
    if (!verifyRateLimit.allowed) {
        return createRateLimitResponse(verifyRateLimit.retryAfterSeconds);
    }

    const latestCode = await db.emailVerificationCode.findFirst({
        where: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            consumedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            lastSentAt: true,
        },
    });

    if (latestCode) {
        const retryAfterSeconds = getEmailVerificationRetryAfterSeconds(latestCode.lastSentAt);
        if (retryAfterSeconds > 0) {
            return createAppErrorResponse(
                "EMAIL_VERIFICATION_CODE_COOLDOWN",
                "Please wait before requesting another code",
                429,
                { headers: { "Retry-After": String(retryAfterSeconds) } }
            );
        }
    }

    const verificationCode = generateEmailVerificationCode();
    await db.emailVerificationCode.updateMany({
        where: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            consumedAt: null,
        },
        data: {
            consumedAt: new Date(),
        },
    });
    await db.emailVerificationCode.create({
        data: {
            userId: user.id,
            email: identifier,
            codeHash: hashEmailVerificationCode(identifier, verificationCode),
            purpose: EMAIL_VERIFICATION_PURPOSE,
            attempts: 0,
            maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
            expiresAt: buildEmailVerificationExpiry(),
        },
    });

    try {
        await sendVerificationCodeEmail(
            identifier,
            verificationCode,
            EMAIL_VERIFICATION_EXPIRES_MINUTES
        );
    } catch (e) {
        console.error("[resend-verification]", e);
        logAuditEvent({
            actorUserId: user.id,
            action: "auth.resend_verification.failed",
            category: "auth",
            status: "error",
            targetType: "user",
            targetId: user.id,
            metadata: { emailMasked: maskEmail(identifier) },
        });
        return createAppErrorResponse("INTERNAL_ERROR", "Could not send email", 503);
    }

    logAuditEvent({
        actorUserId: user.id,
        action: "auth.resend_verification.sent",
        category: "auth",
        status: "success",
        targetType: "user",
        targetId: user.id,
        metadata: { emailMasked: maskEmail(identifier) },
    });

    return NextResponse.json({
        ok: true,
        cooldownSeconds: 60,
    });
}
