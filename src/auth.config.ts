import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                // Optional: Redirect to dashboard if logged in and visiting home
                // return Response.redirect(new URL('/dashboard', nextUrl))
            }
            return true
        },
    },
    providers: [], // Providers configured in auth.ts
} satisfies NextAuthConfig
