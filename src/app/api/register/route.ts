import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const registerSchema = z.object({
    name: z.string().min(2),
    username: z.string().min(3, "Username must be at least 3 chars").regex(/^[a-zA-Z0-9_\u0E00-\u0E7F\-\.]+$/, "Username must only contain letters, numbers, or .-_"),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.string().default("STUDENT"),
})

export async function POST(req: Request) {
    let step = "init";
    try {
        step = "parse_body";
        const body = await req.json()
        const { name, username, email, password, role } = registerSchema.parse(body)

        step = "check_uniqueness";
        const existingEmail = await db.user.findUnique({ where: { email } })
        if (existingEmail) {
            return new NextResponse("Email already exists", { status: 400 })
        }

        const existingUsername = await db.user.findUnique({ where: { username } })
        if (existingUsername) {
            return new NextResponse("Username already taken", { status: 400 })
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
                role
            },
        })

        return NextResponse.json({
            user: { name: user.name, email: user.email, role: user.role }
        })
    } catch (error: any) {
        console.error(`[REGISTER_ERROR] Step: ${step}`, error)

        if (error instanceof z.ZodError) {
            const errors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
            return new NextResponse(`Invalid data: ${errors}`, { status: 400 })
        }

        return new NextResponse(`Internal Error (${step}): ${error.message || "Unknown"}`, { status: 500 })
    }
}
