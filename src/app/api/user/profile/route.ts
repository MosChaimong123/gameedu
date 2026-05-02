import { db } from "@/lib/db"
import { requireSessionUser } from "@/lib/auth-guards"
import { NextResponse } from "next/server"
import { AUTH_REQUIRED_MESSAGE, INTERNAL_ERROR_MESSAGE, createAppErrorResponse } from "@/lib/api-error";

export async function PATCH(req: Request) {
    try {
        const user = await requireSessionUser()
        if (!user?.id) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        }

        const body = await req.json() as {
            name?: unknown
            image?: unknown
        }
        const name = typeof body.name === "string" ? body.name.trim() : undefined
        const image = typeof body.image === "string" ? body.image.trim() : undefined
        const updatedUser = await db.user.update({
            where: { id: user.id },
            data: { name, image },
            select: {
                id: true,
                name: true,
                image: true,
                email: true,
                role: true,
            },
        })

        return NextResponse.json(updatedUser)
    } catch (error: unknown) {
        console.error("[API_PROFILE] Error:", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
