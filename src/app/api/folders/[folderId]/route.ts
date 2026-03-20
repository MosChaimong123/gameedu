import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ folderId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 })
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
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ folderId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 })
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
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
