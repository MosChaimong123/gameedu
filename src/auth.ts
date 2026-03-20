import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(db),
    session: { strategy: "jwt" },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            // ... (keep credentials as is)
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const email = credentials.email as string
                const password = credentials.password as string

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

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: user.role,
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
                token.name = user.name
                token.picture = user.image
            }

            // Sync with DB if updated (SHIELDED FROM EDGE)
            if (trigger === "update" || (token.id && typeof process !== "undefined" && process.env.NEXT_RUNTIME !== "edge")) {
                try {
                    // We only do this if we can actually reach the DB
                    const freshUser = await db.user.findUnique({
                        where: { id: token.id as string },
                        select: { name: true, image: true, role: true, school: true, settings: true, plan: true, planStatus: true }
                    })
                    
                    if (freshUser) {
                        token.name = freshUser.name
                        token.picture = freshUser.image
                        token.role = freshUser.role
                        token.school = freshUser.school
                        token.settings = freshUser.settings
                        token.plan = freshUser.plan
                        token.planStatus = freshUser.planStatus
                    }
                } catch (error) {
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
        async session({ session, token }) {
            if (token) {
                if (token.id) session.user.id = token.id as string
                // @ts-ignore
                if (token.role) session.user.role = token.role as string
                // @ts-ignore
                if (token.school) session.user.school = token.school as string
                
                session.user.name = token.name
                session.user.image = token.picture as string
                // @ts-ignore
                session.user.settings = token.settings
                // @ts-ignore
                session.user.plan = token.plan
                // @ts-ignore
                session.user.planStatus = token.planStatus
            }
            return session
        }
    }
})
