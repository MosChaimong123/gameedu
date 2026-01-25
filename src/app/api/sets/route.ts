import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 })
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

export async function POST(req: Request) {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
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
    } catch (error: any) {
        console.error("[SETS_POST]", error)
        return new NextResponse(error.message || "Internal Error", { status: 500 })
    }
}
