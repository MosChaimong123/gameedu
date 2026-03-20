import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 })
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
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const { name, parentFolderId } = await req.json()

        if (!name) {
            return new NextResponse("Folder name is required", { status: 400 })
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
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
