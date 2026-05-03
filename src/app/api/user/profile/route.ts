import { db } from "@/lib/db"
import { requireSessionUser } from "@/lib/auth-guards"
import { NextResponse } from "next/server"
import {
    AUTH_REQUIRED_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";

export async function PATCH(req: Request) {
    try {
        const user = await requireSessionUser()
        if (!user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
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
        if (!updatedUser) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
        }

        return NextResponse.json(updatedUser)
    } catch (error: unknown) {
        console.error("[API_PROFILE] Error:", error)
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2025"
        ) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
        }
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
