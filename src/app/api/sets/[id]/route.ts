import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";

function canManageQuestionSets(role?: string | null) {
    return role === "TEACHER" || role === "ADMIN"
}

type UpdateSetRequest = {
    title?: string
    description?: string | null
    questions?: Prisma.InputJsonValue
    isPublic?: boolean
    coverImage?: string | null
    folderId?: string | null
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || !session.user) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        }

        if (!canManageQuestionSets(session.user.role)) {
            return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
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
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        }

        if (!canManageQuestionSets(session.user.role)) {
            return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
        }

        const { id } = await params
        const body = await req.json() as UpdateSetRequest
        const { title, description, questions, isPublic, coverImage, folderId } = body

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

        if (folderId) {
            const targetFolder = await db.folder.findFirst({
                where: {
                    id: folderId,
                    creatorId: session.user.id,
                },
                select: {
                    id: true,
                },
            })

            if (!targetFolder) {
                return new NextResponse("Folder not found", { status: 404 })
            }
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
                folderId,
            },
        })

        return NextResponse.json(updatedSet)
    } catch (error) {
        console.error("[SET_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session || !session.user) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
        }

        if (!canManageQuestionSets(session.user.role)) {
            return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
        }

        const { id } = await params

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

        await db.questionSet.delete({
            where: {
                id: id,
            },
        })

        return new NextResponse(null, { status: 200 })
    } catch (error) {
        console.error("[SET_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
