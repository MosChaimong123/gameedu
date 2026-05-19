import { db } from "@/lib/db"
import { createAppErrorResponse } from "@/lib/api-error"
import { NextResponse } from "next/server"
import { ZodError, z } from "zod"
import {
    consumeRateLimitWithStore,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit"
import { logAuditEvent } from "@/lib/security/audit-log"
import { sendVerificationCodeEmail } from "@/lib/email/send-verification-email"
import {
    buildEmailVerificationExpiry,
    EMAIL_VERIFICATION_EXPIRES_MINUTES,
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    EMAIL_VERIFICATION_PURPOSE,
    generateEmailVerificationCode,
    generateVerificationReferenceCode,
    hashEmailVerificationCodeForStorage,
    normalizeVerificationEmail,
} from "@/lib/email-verification"

const registerSchema = z.object({
    name: z.string().min(2),
    username: z.string().min(3, "Username must be at least 3 chars").regex(/^[a-zA-Z0-9_\u0E00-\u0E7F\-\.]+$/, "Username must only contain letters, numbers, or .-_"),
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
    password: z.string().min(6),
    school: z.string().optional(),
    /** สมัครทางหน้าเว็บได้แค่ STUDENT หรือ TEACHER — ไม่รับ ADMIN จาก client */
    role: z.preprocess(
        (v) => (v === null || v === "" ? undefined : v),
        z.enum(["STUDENT", "TEACHER"]).default("STUDENT")
    ),
})

function maskEmail(email: string) {
    const [localPart = "", domain = ""] = email.split("@")
    const visibleLocal = localPart.slice(0, 2)
    const maskedLocal = `${visibleLocal}${"*".repeat(Math.max(0, localPart.length - visibleLocal.length))}`
    return domain ? `${maskedLocal}@${domain}` : maskedLocal
}

function maskIdentifier(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ""
    const visiblePrefix = trimmed.slice(0, 2)
    const visibleSuffix = trimmed.length > 4 ? trimmed.slice(-2) : ""
    const maskedMiddle = "*".repeat(Math.max(0, trimmed.length - visiblePrefix.length - visibleSuffix.length))
    return `${visiblePrefix}${maskedMiddle}${visibleSuffix}`
}

export async function POST(req: Request) {
    let step = "init";
    try {
        const rateLimit = await consumeRateLimitWithStore({
            bucket: "register:post",
            key: getRequestClientIdentifier(req),
            limit: 10,
            windowMs: 60_000,
        })

        if (!rateLimit.allowed) {
            logAuditEvent({
                action: "auth.register.denied",
                category: "auth",
                status: "rejected",
                reason: "rate_limited",
                targetType: "register",
                metadata: { client: getRequestClientIdentifier(req) },
            })
            return createRateLimitResponse(rateLimit.retryAfterSeconds)
        }

        step = "parse_body";
        const body = await req.json()
        const { name, username, email, password, school, role: registrationRole } = registerSchema.parse(body)

        step = "check_uniqueness";
        const existingEmail = await db.user.findUnique({ where: { email } })
        if (existingEmail) {
            logAuditEvent({
                action: "auth.register.denied",
                category: "auth",
                status: "rejected",
                reason: "email_exists",
                targetType: "register",
                metadata: { emailMasked: maskEmail(email) },
            })
            return createAppErrorResponse("REGISTER_EMAIL_ALREADY_EXISTS", "Email already exists", 400)
        }

        const existingUsername = await db.user.findUnique({ where: { username } })
        if (existingUsername) {
            logAuditEvent({
                action: "auth.register.denied",
                category: "auth",
                status: "rejected",
                reason: "username_taken",
                targetType: "register",
                metadata: { usernameMasked: maskIdentifier(username) },
            })
            return createAppErrorResponse("REGISTER_USERNAME_TAKEN", "Username already taken", 400)
        }

        step = "hash_password";
        const bcrypt = await import("bcryptjs");
        const hashedPassword = await bcrypt.hash(password, 12)

        step = "create_user";
        const user = await db.user.create({
            data: {
                name,
                username,
                email,
                password: hashedPassword,
                role: registrationRole,
                school,
                emailVerified: null,
            },
        })

        step = "verification_code";
        const normalizedEmail = normalizeVerificationEmail(email)
        const verificationCode = generateEmailVerificationCode()
        const verificationReference = generateVerificationReferenceCode()
        const verificationCodeHash = hashEmailVerificationCodeForStorage(verificationCode)
        await db.emailVerificationCode.deleteMany({
            where: {
                userId: user.id,
                purpose: EMAIL_VERIFICATION_PURPOSE,
            },
        })
        await db.emailVerificationCode.create({
            data: {
                userId: user.id,
                email: normalizedEmail,
                referenceCode: verificationReference,
                codePlain: verificationCode,
                codeHash: verificationCodeHash,
                purpose: EMAIL_VERIFICATION_PURPOSE,
                attempts: 0,
                maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
                expiresAt: buildEmailVerificationExpiry(),
            },
        })

        step = "send_verification_email";
        try {
            await sendVerificationCodeEmail(
                normalizedEmail,
                verificationCode,
                EMAIL_VERIFICATION_EXPIRES_MINUTES,
                verificationReference
            )
        } catch (e) {
            console.error("[REGISTER] verification email failed", e)
            logAuditEvent({
                actorUserId: user.id,
                action: "auth.register.verification_email_failed",
                category: "auth",
                status: "error",
                targetType: "user",
                targetId: user.id,
                metadata: {
                    message: e instanceof Error ? e.message : "unknown",
                },
            })
            if (process.env.NODE_ENV === "production") {
                await db.emailVerificationCode.updateMany({
                    where: {
                        userId: user.id,
                        purpose: EMAIL_VERIFICATION_PURPOSE,
                        consumedAt: null,
                    },
                    data: {
                        consumedAt: new Date(),
                    },
                })
                await db.user.delete({ where: { id: user.id } })
                return createAppErrorResponse(
                    "REGISTER_VERIFICATION_EMAIL_FAILED",
                    "Could not send verification email. Please try again later.",
                    503
                )
            }
        }

        logAuditEvent({
            actorUserId: user.id,
            action: "auth.register.succeeded",
            category: "auth",
            status: "success",
            targetType: "user",
            targetId: user.id,
            metadata: { role: user.role },
        })

        return NextResponse.json({
            user: { name: user.name, email: user.email, role: user.role },
            verifyRequired: true,
            verifyMethod: "code",
        })
    } catch (error: unknown) {
        console.error(`[REGISTER_ERROR] Step: ${step}`, error)

        if (error instanceof ZodError) {
            const errors = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
            logAuditEvent({
                action: "auth.register.denied",
                category: "auth",
                status: "rejected",
                reason: "invalid_payload",
                targetType: "register",
                metadata: { step, errors },
            })
            return createAppErrorResponse("INVALID_PAYLOAD", `Invalid data: ${errors}`, 400)
        }

        const message = error instanceof Error ? error.message : "Unknown"
        logAuditEvent({
            action: "auth.register.failed",
            category: "auth",
            status: "error",
            reason: "internal_error",
            targetType: "register",
            metadata: { step, message },
        })
        return createAppErrorResponse("INTERNAL_ERROR", "Internal error", 500)
    }
}
