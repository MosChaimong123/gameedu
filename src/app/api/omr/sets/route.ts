import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { db } from "@/lib/db"
import { isTeacherOrAdmin } from "@/lib/role-guards"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
    }

    try {
        const sets = await db.questionSet.findMany({
            where: {
                creatorId: session.user.id
            },
            select: {
                id: true,
                title: true,
                questions: true,
                updatedAt: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        return NextResponse.json(sets)
    } catch {
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
