import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";

function canManageQuestionSets(role?: string | null) {
    return role === "TEACHER" || role === "ADMIN"
}

type CreateFolderRequest = {
    name?: string
    parentFolderId?: string | null
}

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
    }

    if (!canManageQuestionSets(session.user.role)) {
        return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
    }

    try {
        const folders = await db.folder.findMany({
            where: {
                creatorId: session.user.id
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json(folders)
    } catch (error) {
        console.error("Failed to fetch folders", error)
        return new NextResponse(INTERNAL_ERROR_MESSAGE, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
    }

    if (!canManageQuestionSets(session.user.role)) {
        return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
    }

    try {
        const { name, parentFolderId } = await req.json() as CreateFolderRequest

        if (!name) {
            return new NextResponse("Folder name is required", { status: 400 })
        }

        if (parentFolderId) {
            const parentFolder = await db.folder.findFirst({
                where: {
                    id: parentFolderId,
                    creatorId: session.user.id,
                },
                select: {
                    id: true,
                },
            })

            if (!parentFolder) {
                return new NextResponse("Parent folder not found", { status: 404 })
            }
        }

        const folder = await db.folder.create({
            data: {
                name,
                creatorId: session.user.id,
                parentFolderId: parentFolderId || null
            }
        })

        return NextResponse.json(folder)
    } catch (error) {
        console.error("Failed to create folder", error)
        return new NextResponse(INTERNAL_ERROR_MESSAGE, { status: 500 })
    }
}
