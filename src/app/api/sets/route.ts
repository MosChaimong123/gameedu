import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";

function canManageQuestionSets(role?: string | null) {
    return role === "TEACHER" || role === "ADMIN"
}

export async function GET() {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        }

        if (!canManageQuestionSets(session.user.role)) {
            return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
        }

        // Fetch sets created by the current user
        const sets = await db.questionSet.findMany({
            where: {
                creatorId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        return NextResponse.json(sets)
    } catch (error) {
        console.error("[SETS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

type CreateSetRequest = {
    title?: string
    description?: string
    isPublic?: boolean
    coverImage?: string | null
}

export async function POST(req: Request) {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        }

        if (!canManageQuestionSets(session.user.role)) {
            return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
        }

        const body = await req.json() as CreateSetRequest
        const { title, description, isPublic, coverImage } = body

        if (!title) {
            return new NextResponse("Title is required", { status: 400 })
        }

        const set = await db.questionSet.create({
            data: {
                title,
                description,
                isPublic: isPublic || false,
                coverImage,
                creatorId: session.user.id as string,
                questions: [], // Start empty
            },
        })

        return NextResponse.json(set)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Error"
        console.error("[SETS_POST]", error)
        return new NextResponse(message, { status: 500 })
    }
}
