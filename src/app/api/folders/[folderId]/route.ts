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

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ folderId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
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
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2025"
        ) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
        }
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ folderId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403)
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
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2025"
        ) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404)
        }
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
