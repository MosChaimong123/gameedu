import { db } from "@/lib/db"
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        
        console.log(`[API_SETTINGS] Updating for user ${session.user.id}:`, body)

        // Update the user's settings field in DB
        // Since it's a Json field in MongoDB, we can just pass the object
        const updatedUser = await db.user.update({
            where: { id: session.user.id },
            data: {
                settings: body
            }
        })

        console.log(`[API_SETTINGS] Success for ${session.user.id}`)

        return NextResponse.json(updatedUser.settings)
    } catch (error) {
        console.error("[API_SETTINGS_ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
