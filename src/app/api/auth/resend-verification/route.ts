import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
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
    const verificationCode = await db.$transaction(async (tx) => {
        const latestCode = await tx.emailVerificationCode.findFirst({
            where: {
                userId: user.id,
                purpose: EMAIL_VERIFICATION_PURPOSE,
                consumedAt: null,
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
                return { cooldownSeconds: retryAfterSeconds } as const;
            }
        }

        const nextCode = generateEmailVerificationCode();
        const nextHash = hashEmailVerificationCodeForStorage(nextCode);
        await tx.emailVerificationCode.deleteMany({
            where: {
                userId: user.id,
                purpose: EMAIL_VERIFICATION_PURPOSE,
            },
        });
        await tx.emailVerificationCode.create({
            data: {
                userId: user.id,
                email: identifier,
                codeHash: nextHash,
                purpose: EMAIL_VERIFICATION_PURPOSE,
                attempts: 0,
                maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
                expiresAt: buildEmailVerificationExpiry(issuedAt),
                lastSentAt: issuedAt,
            },
        });

        return { code: nextCode } as const;
    });

    if ("cooldownSeconds" in verificationCode) {
        return createAppErrorResponse(
            "EMAIL_VERIFICATION_CODE_COOLDOWN",
            "Please wait before requesting another code",
            429,
            { headers: { "Retry-After": String(verificationCode.cooldownSeconds) } }
        );
    }

    let emailSent = false;
    try {
        const sendResult = await sendVerificationCodeEmail(
            identifier,
            verificationCode.code,
            EMAIL_VERIFICATION_EXPIRES_MINUTES
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
        devCode?: string;
    } = {
        ok: true,
        sent: emailSent,
        cooldownSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    };

    if (!emailSent && process.env.NODE_ENV !== "production") {
        responseBody.devCode = verificationCode.code;
    }

    return NextResponse.json(responseBody);
}
