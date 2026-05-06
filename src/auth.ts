import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import type { Session } from "next-auth"
import type { JWT } from "next-auth/jwt"
import { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { prismaAuthAdapter } from "@/lib/auth/prisma-auth-adapter"
import { googleOauth2WebProvider } from "@/lib/auth/google-oauth2-provider"
import { authConfig } from "./auth.config"
import { isAppRole, type AppRole } from "@/lib/roles"
import {
    buildRateLimitKey,
    consumeRateLimitWithStore,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit"

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
    const googleClientId =
        process.env.GOOGLE_CLIENT_ID?.trim() || process.env.AUTH_GOOGLE_ID?.trim()
    const googleClientSecret =
        process.env.GOOGLE_CLIENT_SECRET?.trim() || process.env.AUTH_GOOGLE_SECRET?.trim()
    if (!googleClientId || !googleClientSecret) {
        return null
    }
    return googleOauth2WebProvider(googleClientId, googleClientSecret)
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
        session: { strategy: "jwt" },
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
                const rateLimit = await consumeRateLimitWithStore({
                    bucket: "auth-credentials:authorize",
                    key: buildRateLimitKey(
                        getRequestClientIdentifier(request),
                        email.toLowerCase()
                    ),
                    limit: 10,
                    windowMs: 60_000,
                })

                if (!rateLimit.allowed) {
                    throw new RateLimitedSignin()
                }

                const user = await db.user.findUnique({
                    where: {
                        email,
                    },
                })

                if (!user || !user.password) {
                    return null
                }

                const bcrypt = await import("bcryptjs")
                const isPasswordValid = await bcrypt.compare(password, user.password)

                if (!isPasswordValid) {
                    return null
                }

                if (!user.emailVerified) {
                    throw new EmailNotVerified()
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: isAppRole(user.role) ? user.role : ("USER" satisfies AppRole),
                    school: user.school,
                }
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        jwt: async ({ token, user, trigger, session }) => {
            // Initial sign in
            if (user) {
                token.id = user.id
                token.email = user.email
                if (user.name !== undefined) token.name = user.name
                token.picture = user.image
                if (user.role !== undefined && user.role !== null) {
                    token.role = isAppRole(user.role) ? user.role : ("USER" satisfies AppRole)
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
                        },
                    })

                    if (freshUser) {
                        if (freshUser.name !== undefined) token.name = freshUser.name
                        token.picture = freshUser.image
                        token.role = isAppRole(freshUser.role) ? freshUser.role : ("USER" satisfies AppRole)
                        token.school = freshUser.school
                        token.settings = freshUser.settings
                        token.plan = freshUser.plan
                        token.planStatus = freshUser.planStatus
                        token.planExpiry =
                            freshUser.planExpiry instanceof Date && !Number.isNaN(freshUser.planExpiry.getTime())
                                ? freshUser.planExpiry.toISOString()
                                : null
                    }
                } catch {
                    // If it's an edge error, we just keep the existing token
                    console.log("[AUTH_JWT] Skipping DB sync (likely Edge or DB down)")
                }
            }

            // Fallback: If session data passed in update, use it
            if (trigger === "update" && session) {
                if (session.name) token.name = session.name
                if (session.image) token.picture = session.image
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
            }
            return session
        }
    },
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth(() => createAuthConfig())
