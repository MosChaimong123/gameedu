import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const role = (auth?.user as any)?.role as string | undefined

            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
            const isOnAdmin = nextUrl.pathname.startsWith('/admin')
            const isOnStudentHome = nextUrl.pathname.startsWith('/student/home')

            // /admin → ADMIN only
            if (isOnAdmin) {
                if (!isLoggedIn) return false
                if (role !== 'ADMIN') return Response.redirect(new URL('/dashboard', nextUrl))
                return true
            }

            // /dashboard → TEACHER or ADMIN only
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                // @ts-ignore
                token.role = user.role
                // @ts-ignore
                token.school = user.school
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string
                // @ts-ignore
                session.user.role = token.role as string
                // @ts-ignore
                session.user.school = token.school as string
            }
            return session
        }
    },
    providers: [], // Providers configured in auth.ts
} satisfies NextAuthConfig
