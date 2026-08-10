import type { NextAuthConfig } from "next-auth"

function appendAuthError(path: string, error: string) {
    const search = new URLSearchParams({ error })
    return `${path}?${search.toString()}`
}

export const authConfig = {
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const role = auth?.user?.role

            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
            const isOnAdmin = nextUrl.pathname.startsWith("/admin")
            const isOnStudentHome = nextUrl.pathname.startsWith("/student/home")
            const isOnMfa = nextUrl.pathname.startsWith("/auth/mfa")
            const mfaEnrolled = Boolean(auth?.user?.mfaEnrolled)
            const mfaVerified = auth?.user?.mfaLevel === 1
            // Controlled rollout: MFA setup remains available, but it must not
            // block normal sign-in until real-device staging has passed. Enable
            // enforcement explicitly only after the rollout checklist is green.
            const enforceMfa = process.env.AUTH_MFA_ENFORCEMENT?.trim().toLowerCase() === "enforce"
            const roleRequiredUrl = new URL(appendAuthError("/login", "role_required"), nextUrl)

            if (isOnMfa) return isLoggedIn

            if (enforceMfa && isLoggedIn && role === "ADMIN" && (!mfaEnrolled || !mfaVerified)) {
                return Response.redirect(new URL(mfaEnrolled ? "/auth/mfa" : "/auth/mfa/setup", nextUrl))
            }
            if (enforceMfa && isLoggedIn && role === "TEACHER" && mfaEnrolled && !mfaVerified) {
                return Response.redirect(new URL("/auth/mfa", nextUrl))
            }

            // /admin -> ADMIN only
            if (isOnAdmin) {
                if (!isLoggedIn) return false
                if (role !== "ADMIN") {
                    if (role === "STUDENT") return Response.redirect(new URL("/student/home", nextUrl))
                    if (role === "TEACHER") return Response.redirect(new URL("/dashboard", nextUrl))
                    return Response.redirect(roleRequiredUrl)
                }
                return true
            }

            // /dashboard -> TEACHER or ADMIN only
            if (isOnDashboard) {
                if (!isLoggedIn) return false
                if (role === "STUDENT") return Response.redirect(new URL("/student/home", nextUrl))
                if (role !== "TEACHER" && role !== "ADMIN") {
                    return Response.redirect(roleRequiredUrl)
                }
                return true
            }

            // /student/home -> STUDENT only
            if (isOnStudentHome) {
                if (!isLoggedIn) return false
                if (role === "TEACHER") return Response.redirect(new URL("/dashboard", nextUrl))
                if (role === "ADMIN") return Response.redirect(new URL("/admin", nextUrl))
                if (role !== "STUDENT") return Response.redirect(roleRequiredUrl)
                return true
            }

            return true
        },
        async jwt({ token, user, trigger, session: sessionData }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.school = user.school
                token.name = user.name
                token.picture = user.image
            }

            if (trigger === "update" && sessionData) {
                if (sessionData.name) token.name = sessionData.name
                if (sessionData.image) token.picture = sessionData.image
            }

            return token
        },
        async session({ session, token }) {
            if (token) {
                if (token.id) session.user.id = token.id as string
                if (token.role) session.user.role = token.role
                if (token.school) session.user.school = token.school

                if (token.name !== undefined) session.user.name = token.name
                session.user.image = token.picture as string
            }
            return session
        },
    },
    providers: [],
} satisfies NextAuthConfig
