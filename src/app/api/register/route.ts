import { db } from "@/lib/db"
import { isPublicSignupEnabled } from "@/lib/auth/signup-policy"
import { createAppErrorResponse } from "@/lib/api-error"
import { NextResponse } from "next/server"
import { ZodError, z } from "zod"
import {
    consumeRateLimitWithStore,
    createRateLimitResponse,
    digestRateLimitIdentifier,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit"
import { logAuditEvent } from "@/lib/security/audit-log"
import { sendVerificationCodeEmail } from "@/lib/email/send-verification-email"
import { resolveAuthSecret } from "@/lib/env"
import {
    encodeVerificationFlowHandle,
    VERIFICATION_FLOW_COOKIE,
    VERIFICATION_FLOW_MAX_AGE_SECONDS,
} from "@/lib/auth/verification-flow-handle"
import {
    activatePendingSignupVerification,
    failPendingSignupVerification,
    SIGNUP_VERIFICATION_STATUS,
} from "@/lib/auth/signup-verification-lifecycle"
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
import { newPasswordSchema } from "@/lib/auth/password-policy"
import { validateNewPassword } from "@/lib/auth/password-policy-server"
import { hashPassword } from "@/lib/auth/password-hash"

const registerSchema = z.object({
    name: z.string().min(2),
    username: z.string().min(3, "Username must be at least 3 chars").regex(/^[a-zA-Z0-9_\u0E00-\u0E7F\-\.]+$/, "Username must only contain letters, numbers, or .-_"),
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
    password: newPasswordSchema,
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
        if (!isPublicSignupEnabled()) {
            logAuditEvent({
                action: "auth.register.denied",
                category: "auth",
                status: "rejected",
                reason: "signup_disabled",
                targetType: "register",
            })
            return createAppErrorResponse(
                "REGISTRATION_DISABLED",
                "Registration is temporarily disabled",
                503
            )
        }

        const authSecret = resolveAuthSecret()
        if (!authSecret) {
            return createAppErrorResponse("INTERNAL_ERROR", "Auth not configured", 500)
        }

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
            return createRateLimitResponse(rateLimit)
        }

        step = "parse_body";
        const body = await req.json()
        const { name, username, email, password, school, role: registrationRole } = registerSchema.parse(body)
        const passwordValidation = await validateNewPassword(password)
        if (!passwordValidation.valid) {
            return createAppErrorResponse("PASSWORD_POLICY_VIOLATION", "Password does not meet security policy", 400)
        }
        const clientIdentifier = getRequestClientIdentifier(req)
        const emailIdentifier = digestRateLimitIdentifier(email)
        const registrationLimits = await Promise.all([
            consumeRateLimitWithStore({
                bucket: "auth:register:account",
                key: emailIdentifier,
                limit: 5,
                windowMs: 15 * 60_000,
            }),
            consumeRateLimitWithStore({
                bucket: "auth:register:ip-account",
                key: `${clientIdentifier}:${emailIdentifier}`,
                limit: 5,
                windowMs: 15 * 60_000,
            }),
        ])
        const blockedRegistrationLimit = registrationLimits.find((result) => !result.allowed)
        if (blockedRegistrationLimit) return createRateLimitResponse(blockedRegistrationLimit)

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
        const hashedPassword = await hashPassword(password)

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
        const pendingCode = await db.emailVerificationCode.create({
            data: {
                userId: user.id,
                email: normalizedEmail,
                referenceCode: verificationReference,
                codePlain: null,
                codeHash: verificationCodeHash,
                purpose: EMAIL_VERIFICATION_PURPOSE,
                status: SIGNUP_VERIFICATION_STATUS.pending,
                attempts: 0,
                maxAttempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
                expiresAt: buildEmailVerificationExpiry(),
                consumedAt: null,
            },
        })

        step = "send_verification_email";
        let verificationEmailSent = false
        try {
            const sendResult = await sendVerificationCodeEmail(
                normalizedEmail,
                verificationCode,
                EMAIL_VERIFICATION_EXPIRES_MINUTES,
                verificationReference
            )
            if (!sendResult.sent && process.env.NODE_ENV === "production") {
                throw new Error("EMAIL_PROVIDER_NOT_ACCEPTED")
            }
            verificationEmailSent = sendResult.sent
            await activatePendingSignupVerification({
                codeId: pendingCode.id,
                userId: user.id,
                provider: sendResult.sent ? "resend" : "console",
                providerMessageId: sendResult.messageId,
            })
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
            await failPendingSignupVerification(pendingCode.id)
            return createAppErrorResponse(
                "REGISTER_VERIFICATION_EMAIL_FAILED",
                "Could not send verification email. Please try again later.",
                503
            )
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

        const response = NextResponse.json({
            user: { name: user.name, email: user.email, role: user.role },
            verifyRequired: true,
            verifyMethod: "code",
        })
        response.cookies.set(
            VERIFICATION_FLOW_COOKIE,
            encodeVerificationFlowHandle(
                {
                    userId: user.id,
                    email: normalizedEmail,
                    ...(process.env.NODE_ENV !== "production" && !verificationEmailSent
                        ? { devCode: verificationCode }
                        : {}),
                },
                authSecret
            ),
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: VERIFICATION_FLOW_MAX_AGE_SECONDS,
            }
        )
        return response
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
