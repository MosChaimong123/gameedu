import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAppErrorResponse } from "@/lib/api-error";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import {
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";

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
    const rateLimit = await consumeRateLimitWithStore({
        bucket: "auth:resend-verification",
        key: getRequestClientIdentifier(req),
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

    const rawToken = randomBytes(32).toString("hex");
    const identifier = user.email ?? email;
    await db.verificationToken.deleteMany({ where: { identifier } });
    await db.verificationToken.create({
        data: {
            identifier,
            token: rawToken,
            expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
    });

    try {
        await sendVerificationEmail(identifier, rawToken);
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

    return NextResponse.json({ ok: true });
}
