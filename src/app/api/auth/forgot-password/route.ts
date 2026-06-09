import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import { logAuditEvent } from "@/lib/security/audit-log";
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
        select: { id: true, email: true, password: true },
    });

    // Always return ok to avoid revealing whether an email exists
    if (!user?.password) {
        return NextResponse.json({ ok: true });
    }

    const issuedAt = new Date();
    const latestCode = await db.emailVerificationCode.findFirst({
        where: {
            userId: user.id,
            purpose: PASSWORD_RESET_PURPOSE,
            OR: [{ consumedAt: null }, { consumedAt: { isSet: false } }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, lastSentAt: true },
    });

    if (latestCode) {
        const retryAfterSeconds = getEmailVerificationRetryAfterSeconds(latestCode.lastSentAt, issuedAt);
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
        where: { userId: user.id, purpose: PASSWORD_RESET_PURPOSE },
    });
    await db.emailVerificationCode.create({
        data: {
            userId: user.id,
            email: identifier,
            referenceCode: verificationReference,
            codePlain: verificationCode,
            codeHash: verificationCodeHash,
            purpose: PASSWORD_RESET_PURPOSE,
            attempts: 0,
            maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
            expiresAt: buildEmailVerificationExpiry(issuedAt),
            lastSentAt: issuedAt,
            consumedAt: null,
        },
    });

    let emailSent = false;
    try {
        const sendResult = await sendPasswordResetEmail(
            identifier,
            verificationCode,
            EMAIL_VERIFICATION_EXPIRES_MINUTES,
            verificationReference
        );
        emailSent = sendResult.sent;
    } catch (e) {
        console.error("[forgot-password]", e);
        logAuditEvent({
            actorUserId: user.id,
            action: "auth.password_reset.send_failed",
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
        action: "auth.password_reset.otp_sent",
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
