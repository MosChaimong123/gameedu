import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { isEmailVerificationApiEnabled } from "@/lib/auth/signup-policy";
import { sendVerificationCodeEmail } from "@/lib/email/send-verification-email";
import { resetEmailVerificationAttemptLimits } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    buildEmailVerificationExpiry,
    EMAIL_VERIFICATION_EXPIRES_MINUTES,
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    EMAIL_VERIFICATION_PURPOSE,
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    generateEmailVerificationCode,
    generateVerificationReferenceCode,
    getEmailVerificationRetryAfterSeconds,
    hashEmailVerificationCodeForStorage,
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
    if (!isEmailVerificationApiEnabled()) {
        return createAppErrorResponse(
            "EMAIL_VERIFICATION_DISABLED",
            "Email verification is temporarily disabled",
            503
        );
    }

    let email: string;
    try {
        const json = await req.json();
        email = bodySchema.parse(json).email;
    } catch {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid email", 400);
    }

    const identifier = normalizeVerificationEmail(email);
    const user = await db.user.findFirst({
        where: {
            email: { equals: identifier, mode: "insensitive" },
        },
        select: { id: true, email: true, emailVerified: true, password: true },
    });

    if (!user?.password) {
        return NextResponse.json({ ok: true });
    }

    if (user.emailVerified) {
        return NextResponse.json({ ok: true });
    }

    const issuedAt = new Date();
    const latestCode = await db.emailVerificationCode.findFirst({
        where: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
            id: true,
            lastSentAt: true,
        },
    });

    if (latestCode) {
        const retryAfterSeconds = getEmailVerificationRetryAfterSeconds(
            latestCode.lastSentAt,
            issuedAt
        );
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
    const verificationReference = generateVerificationReferenceCode();
    const verificationCodeHash = hashEmailVerificationCodeForStorage(verificationCode);

    await db.emailVerificationCode.deleteMany({
        where: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
        },
    });
    await db.emailVerificationCode.create({
        data: {
            userId: user.id,
            email: identifier,
            referenceCode: verificationReference,
            codePlain: verificationCode,
            codeHash: verificationCodeHash,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            attempts: 0,
            maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
            expiresAt: buildEmailVerificationExpiry(issuedAt),
            lastSentAt: issuedAt,
            consumedAt: null,
        },
    });

    const persistedCode = await db.emailVerificationCode.findFirst({
        where: {
            userId: user.id,
            email: identifier,
            referenceCode: verificationReference,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
        },
        select: { id: true },
    });

    if (!persistedCode) {
        console.error("[resend-verification] created code was not readable", {
            userId: user.id,
            emailMasked: maskEmail(identifier),
            referenceCode: verificationReference,
        });
        logAuditEvent({
            actorUserId: user.id,
            action: "auth.resend_verification.persistence_failed",
            category: "auth",
            status: "error",
            targetType: "user",
            targetId: user.id,
            metadata: { emailMasked: maskEmail(identifier), referenceCode: verificationReference },
        });
        return createAppErrorResponse(
            "INTERNAL_ERROR",
            "Could not prepare verification code",
            503
        );
    }

    let emailSent = false;
    try {
        const sendResult = await sendVerificationCodeEmail(
            identifier,
            verificationCode,
            EMAIL_VERIFICATION_EXPIRES_MINUTES,
            verificationReference
        );
        emailSent = sendResult.sent;
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

    const responseBody: {
        ok: true;
        sent: boolean;
        cooldownSeconds: number;
        referenceCode: string;
        devCode?: string;
    } = {
        ok: true,
        sent: emailSent,
        cooldownSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
        referenceCode: verificationReference,
    };

    if (!emailSent && process.env.NODE_ENV !== "production") {
        responseBody.devCode = verificationCode;
    }

    return NextResponse.json(responseBody);
}
