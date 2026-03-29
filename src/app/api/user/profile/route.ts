import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { name, image } = await req.json()
        console.log(`[API_PROFILE] Updating user ${session.user.id}:`, { name, hasImage: !!image })

        const updatedUser = await db.user.update({
            where: { id: session.user.id },
            data: { name, image }
        })

        console.log("[API_PROFILE] Update success")
        return NextResponse.json(updatedUser)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Error"
        console.error("[API_PROFILE] Error:", error)
        return new NextResponse(message, { status: 500 })
    }
}
