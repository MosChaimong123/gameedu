import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const role = auth?.user?.role

            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
            const isOnAdmin = nextUrl.pathname.startsWith('/admin')
            const isOnStudentHome = nextUrl.pathname.startsWith('/student/home')

            // /admin → ADMIN only
            if (isOnAdmin) {
                if (!isLoggedIn) return false
                if (role !== 'ADMIN') return Response.redirect(new URL('/dashboard', nextUrl))
                return true
            }

            // /dashboard → not STUDENT (TEACHER, ADMIN, USER, etc.)
            if (isOnDashboard) {
                if (!isLoggedIn) return false
                if (role === 'STUDENT') return Response.redirect(new URL('/student/home', nextUrl))
                return true
            }

            // /student/home → authenticated users
            if (isOnStudentHome) {
                if (!isLoggedIn) return false
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
        }
    },
    providers: [], // Providers configured in auth.ts
} satisfies NextAuthConfig
