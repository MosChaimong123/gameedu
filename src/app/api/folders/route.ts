import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type CreateFolderRequest = {
    name?: string
    parentFolderId?: string | null
}

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
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
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
    }

    try {
        const { name, parentFolderId } = await req.json() as CreateFolderRequest

        if (!name) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Folder name is required", 400)
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
                return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
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
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
