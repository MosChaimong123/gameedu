import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ folderId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
    }

    try {
        const { folderId } = await params
        const { name } = await req.json()

        const folder = await db.folder.update({
            where: {
                id: folderId,
                creatorId: session.user.id
            },
            data: {
                name
            }
        })

        return NextResponse.json(folder)
    } catch (error) {
        console.error("Failed to update folder", error)
        return new NextResponse(INTERNAL_ERROR_MESSAGE, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ folderId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 })
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 })
    }

    try {
        const { folderId } = await params
        // First, dissociate all question sets from this folder
        await db.questionSet.updateMany({
            where: {
                folderId: folderId,
                creatorId: session.user.id
            },
            data: {
                folderId: null
            }
        })

        // Then delete the folder
        await db.folder.delete({
            where: {
                id: folderId,
                creatorId: session.user.id
            }
        })

        return new NextResponse("Folder deleted successfully", { status: 200 })
    } catch (error) {
        console.error("Failed to delete folder", error)
        return new NextResponse(INTERNAL_ERROR_MESSAGE, { status: 500 })
    }
}
