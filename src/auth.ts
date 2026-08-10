import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import type { Session } from "next-auth"
import type { JWT } from "next-auth/jwt"
import { CredentialsSignin } from "next-auth"
import { isEmailVerificationRequired } from "@/lib/auth/signup-policy"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { prismaAuthAdapter } from "@/lib/auth/prisma-auth-adapter"
import { authConfig } from "./auth.config"
import { isAppRole, type AppRole } from "@/lib/roles"
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    digestRateLimitIdentifier,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit"
import { isGoogleOAuthConfigured } from "@/lib/auth/google-oauth-env"
import { isAuthVersionCurrent, normalizeAuthVersion } from "@/lib/auth/session-version"
import { verifyPassword } from "@/lib/auth/password-hash"
import { isPasswordChangeAllowed } from "@/lib/auth/password-policy"
import { headers } from "next/headers"
import { getTrustedClientAddress } from "@/lib/security/rate-limit"
import { activeUserAuthSessionFilter, hashSessionIdentifier, registerUserAuthSession, validateAndTouchUserAuthSession } from "@/lib/auth/session-registry"
import { logAuditEvent } from "@/lib/security/audit-log"
import { sendNewDeviceLoginNotification } from "@/lib/email/send-security-notification-email"
import { verifyPasskeyAuthentication } from "@/lib/auth/passkeys"
import { resolveAuthSecret } from "@/lib/env"
import { decodeMfaSessionProof } from "@/lib/auth/mfa-session-proof"

class EmailNotVerified extends CredentialsSignin {
    code = "email_not_verified"
}

class RateLimitedSignin extends CredentialsSignin {
    code = "rate_limited"
}

/**
 * Read Google OAuth env at request time (lazy NextAuth init).
 * Avoids Next.js build-time inlining leaving client id/secret empty in the bundle
 * when vars exist only on the host at runtime.
 *
 * Supports Auth.js convention AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET as fallback.
 */
function resolveGoogleProvider() {
    if (!isGoogleOAuthConfigured()) {
        return null
    }
    const googleClientId =
        process.env.GOOGLE_CLIENT_ID?.trim() || process.env.AUTH_GOOGLE_ID?.trim()
    const googleClientSecret =
        process.env.GOOGLE_CLIENT_SECRET?.trim() || process.env.AUTH_GOOGLE_SECRET?.trim()
    return Google({
        clientId: googleClientId!,
        clientSecret: googleClientSecret!,
        // Same-email matching alone is never sufficient to link an identity.
        allowDangerousEmailAccountLinking: false,
    })
}

function normalizeSessionRole(role: unknown): AppRole | undefined {
    if (isAppRole(role)) {
        return role
    }
    return undefined
}

function createAuthConfig(): NextAuthConfig {
    const googleProvider = resolveGoogleProvider()

    if (process.env.NODE_ENV === "production" && !googleProvider) {
        console.error(
            "[auth] Google OAuth disabled: set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET " +
                "(or AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET) on the server. " +
                "Sign-in with Google will return Configuration until both are non-empty at runtime."
        )
    }

    return {
        ...authConfig,
        trustHost: true,
        adapter: prismaAuthAdapter(db),
        session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
        providers: [
            ...(googleProvider ? [googleProvider] : []),
            Credentials({
            // ... (keep credentials as is)
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials, request) => {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const email = (credentials.email as string).trim().toLowerCase()
                const password = credentials.password as string
                const clientIdentifier = getRequestClientIdentifier(request)
                const accountIdentifier = digestRateLimitIdentifier(email)
                const auditFailure = (action: "auth.login.failed" | "auth.login.rate_limited", reason: string) => {
                    logAuditEvent({
                        actorUserId: null,
                        action,
                        category: "auth",
                        status: "rejected",
                        reason,
                        targetType: "authentication_attempt",
                        metadata: { authMethod: "credentials" },
                    })
                }
                const rateLimits = await Promise.all([
                    consumeRateLimitWithStore({
                        bucket: "auth:login:ip",
                        key: clientIdentifier,
                        limit: 30,
                        windowMs: 60_000,
                    }),
                    consumeRateLimitWithStore({
                        bucket: "auth:login:account",
                        key: accountIdentifier,
                        limit: 10,
                        windowMs: 60_000,
                    }),
                    consumeRateLimitWithStore({
                        bucket: "auth:login:ip-account",
                        key: buildRateLimitKey(clientIdentifier, accountIdentifier),
                        limit: 10,
                        windowMs: 60_000,
                    }),
                ])

                if (rateLimits.some((rateLimit) => !rateLimit.allowed)) {
                    auditFailure("auth.login.rate_limited", "rate_limited")
                    throw new RateLimitedSignin()
                }

                const user = await db.user.findFirst({
                    where: {
                        email: { equals: email, mode: "insensitive" },
                    },
                })

                if (!user || !user.password || user.disabledAt) {
                    auditFailure("auth.login.failed", "invalid_credentials")
                    return null
                }

                const isPasswordValid = await verifyPassword(password, user.password)

                if (!isPasswordValid) {
                    auditFailure("auth.login.failed", "invalid_credentials")
                    return null
                }

                if (!user.emailVerified) {
                    if (isEmailVerificationRequired()) {
                        throw new EmailNotVerified()
                    }
                    await db.user.update({
                        where: { id: user.id },
                        data: { emailVerified: new Date() },
                    })
                }

                const normalizedRole = normalizeSessionRole(user.role)
                if (!normalizedRole) {
                    auditFailure("auth.login.failed", "invalid_credentials")
                    return null
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: normalizedRole,
                    school: user.school,
                    authVersion: normalizeAuthVersion(user.authVersion),
                    passwordUpgradeRequired: !isPasswordChangeAllowed(password),
                    mfaEnrolled: Boolean(user.mfaEnabledAt),
                }
            },
        }),
        Credentials({
            id: "passkey",
            name: "Passkey",
            credentials: { response: { label: "WebAuthn response", type: "text" } },
            authorize: async (credentials) => {
                if (typeof credentials?.response !== "string" || credentials.response.length > 64_000) return null
                let response: unknown
                try {
                    response = JSON.parse(credentials.response)
                } catch {
                    return null
                }
                const user = await verifyPasskeyAuthentication(response as never)
                const role = normalizeSessionRole(user?.role)
                if (!user || !role) return null
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role,
                    school: user.school,
                    authVersion: normalizeAuthVersion(user.authVersion),
                    passwordUpgradeRequired: false,
                    mfaEnrolled: true,
                    mfaLevel: 1,
                    mfaVerifiedAt: Date.now(),
                }
            },
        }),
    ],
    events: {
        async signOut(message) {
            const token = "token" in message ? message.token : null
            if (!token?.securitySessionToken) return
            await db.userAuthSession.updateMany({
                where: { sessionIdHash: hashSessionIdentifier(token.securitySessionToken), ...activeUserAuthSessionFilter() },
                data: { revokedAt: new Date(), revokedReason: "signed_out" },
            })
        },
    },
    callbacks: {
        ...authConfig.callbacks,
        jwt: async ({ token, user, account, trigger, session }) => {
            // Initial sign in
            if (user) {
                token.id = user.id
                token.email = user.email
                if (user.name !== undefined) token.name = user.name
                token.picture = user.image
                const normalizedUserRole = normalizeSessionRole(user.role)
                if (normalizedUserRole) {
                    token.role = normalizedUserRole
                }
                token.authVersion = normalizeAuthVersion(user.authVersion)
                token.passwordUpgradeRequired = user.passwordUpgradeRequired
                token.mfaEnrolled = user.mfaEnrolled
                token.mfaLevel = user.mfaLevel ?? 0
                token.mfaVerifiedAt = user.mfaVerifiedAt
            }

            if (token.id && !token.securitySessionToken) {
                try {
                    const requestHeaders = await headers()
                    const registered = await registerUserAuthSession({
                        userId: token.id as string,
                        role: normalizeSessionRole(token.role),
                        authMethod: account?.provider ?? (user ? "credentials" : "legacy-session-migration"),
                        mfaLevel: token.mfaLevel,
                        metadata: {
                            userAgent: requestHeaders.get("user-agent"),
                            clientAddress: getTrustedClientAddress({ headers: requestHeaders }),
                        },
                    })
                    token.securitySessionToken = registered.rawSessionId
                    token.securitySessionId = registered.record.id
                    // Existing pre-registry JWTs are enrolled for revocation but are not
                    // promoted to "recently authenticated" without a fresh sign-in.
                    if (user) token.authenticatedAt = Date.now()
                    logAuditEvent({
                        actorUserId: token.id as string,
                        action: registered.isNewDevice ? "auth.login.new_device" : "auth.login.succeeded",
                        category: "auth",
                        targetType: "user",
                        targetId: token.id as string,
                        metadata: { authMethod: account?.provider ?? "credentials", deviceLabel: registered.record.deviceLabel },
                    })
                    if (registered.isNewDevice && registered.notificationEmail) {
                        try {
                            await sendNewDeviceLoginNotification(registered.notificationEmail, registered.record.deviceLabel)
                        } catch (notificationError) {
                            console.error("[AUTH_SESSION] New-device notification failed", notificationError)
                        }
                    }
                } catch (error) {
                    console.error("[AUTH_SESSION] Could not register security session", error)
                    return null
                }
            }

            // Sync with DB if updated (SHIELDED FROM EDGE)
            if (trigger === "update" || (token.id && typeof process !== "undefined" && process.env.NEXT_RUNTIME !== "edge")) {
                try {
                    // We only do this if we can actually reach the DB
                    const freshUser = await db.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            name: true,
                            image: true,
                            role: true,
                            school: true,
                            settings: true,
                            plan: true,
                            planStatus: true,
                            planExpiry: true,
                            authVersion: true,
                            disabledAt: true,
                            mfaEnabledAt: true,
                        },
                    })

                    if (!freshUser || freshUser.disabledAt) {
                        return null
                    }

                    if (token.securitySessionToken) {
                        const securitySession = await validateAndTouchUserAuthSession({
                            userId: token.id as string,
                            rawSessionId: token.securitySessionToken,
                            role: normalizeSessionRole(freshUser.role),
                        })
                        if (!securitySession) return null
                        token.securitySessionId = securitySession.id
                        token.mfaLevel = securitySession.mfaLevel
                    }

                    const currentAuthVersion = normalizeAuthVersion(freshUser.authVersion)
                    if (!isAuthVersionCurrent({
                        tokenVersion: token.authVersion,
                        currentVersion: currentAuthVersion,
                        isNewSignIn: Boolean(user),
                    })) {
                        return null
                    }

                    token.authVersion = currentAuthVersion
                    if (freshUser.name !== undefined) token.name = freshUser.name
                    token.picture = freshUser.image
                    const normalizedFreshRole = normalizeSessionRole(freshUser.role)
                    if (normalizedFreshRole) {
                        token.role = normalizedFreshRole
                    }
                    token.school = freshUser.school
                    token.settings = freshUser.settings
                    token.plan = freshUser.plan
                    token.planStatus = freshUser.planStatus
                    token.planExpiry =
                        freshUser.planExpiry instanceof Date && !Number.isNaN(freshUser.planExpiry.getTime())
                            ? freshUser.planExpiry.toISOString()
                            : null
                    token.mfaEnrolled = Boolean(freshUser.mfaEnabledAt)
                } catch (error) {
                    // Registry/status checks protect revocation and disabled accounts. Once
                    // enrolled, all roles fail closed rather than silently restoring access.
                    if (token.securitySessionToken || token.role === "ADMIN") {
                        console.error("[AUTH_JWT] Security state check failed closed", error)
                        return null
                    }
                    console.log("[AUTH_JWT] Skipping DB sync for a pre-registry non-admin token")
                }
            }

            // Fallback: If session data passed in update, use it
            if (trigger === "update" && session) {
                if (session.name) token.name = session.name
                if (session.image) token.picture = session.image
                const updateUser = session.user as { mfaProof?: unknown } | undefined
                const secret = resolveAuthSecret()
                const proof = typeof updateUser?.mfaProof === "string" && secret
                    ? decodeMfaSessionProof(updateUser.mfaProof, secret)
                    : null
                if (
                    proof &&
                    proof.userId === token.id &&
                    proof.securitySessionId === token.securitySessionId
                ) {
                    token.mfaLevel = 1
                    token.mfaVerifiedAt = proof.verifiedAt
                }
            }

            return token
        },
        async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
            if (token) {
                if (token.id) session.user.id = token.id as string
                if (token.role != null) {
                    session.user.role = token.role
                }
                if (token.school) session.user.school = token.school
                
                if (token.name !== undefined) session.user.name = token.name
                session.user.image = token.picture as string
                session.user.settings = token.settings
                session.user.plan = token.plan
                session.user.planStatus = token.planStatus
                session.user.planExpiry = token.planExpiry ?? null
                if (typeof token.passwordUpgradeRequired === "boolean") {
                    session.user.passwordUpgradeRequired = token.passwordUpgradeRequired
                }
                session.user.securitySessionId = token.securitySessionId
                session.user.authenticatedAt = token.authenticatedAt
                session.user.mfaEnrolled = Boolean(token.mfaEnrolled)
                session.user.mfaLevel = token.mfaLevel === 1 ? 1 : 0
                session.user.mfaVerifiedAt = token.mfaVerifiedAt
            }
            return session
        }
    },
    }
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth(() => createAuthConfig())
