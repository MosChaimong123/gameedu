import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // Await params as per Next.js 15/16 changes if necessary, 
        // though usually params is accessible directly in older versions.
        // In Next.js 15+ params is a Promise.
        const { id } = await params

        const set = await db.questionSet.findUnique({
            where: {
                id: id,
                creatorId: session.user.id,
            },
        })

        if (!set) {
            return new NextResponse("Not Found", { status: 404 })
        }

        return NextResponse.json(set)
    } catch (error) {
        console.error("[SET_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { id } = await params
        const body = await req.json()
        const { title, description, questions, isPublic, coverImage } = body

        // Check ownership
        const existingSet = await db.questionSet.findUnique({
            where: {
                id: id,
                creatorId: session.user.id,
            },
        })

        if (!existingSet) {
            return new NextResponse("Not Found", { status: 404 })
        }

        const updatedSet = await db.questionSet.update({
            where: {
                id: id,
            },
            data: {
                title,
                description,
                questions,
                isPublic,
                coverImage,
            },
        })

        return NextResponse.json(updatedSet)
    } catch (error) {
        console.error("[SET_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
