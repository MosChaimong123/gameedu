"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function updateProfile(data: { name?: string, image?: string }) {
    try {
        console.log("[ACTION_UPDATE_PROFILE] Start", { name: data.name, hasImage: !!data.image })
        const session = await auth()
        
        if (!session?.user?.id) {
            console.error("[ACTION_UPDATE_PROFILE] Unauthorized - No user ID")
            return { error: "Unauthorized: Please log in again" }
        }

        console.log(`[ACTION_UPDATE_PROFILE] DB Update for ${session.user.id}...`)
        const updated = await db.user.update({
            where: { id: session.user.id },
            data: {
                name: data.name,
                image: data.image
            }
        })
        console.log("[ACTION_UPDATE_PROFILE] DB Success")

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/profile")

        return { success: true, name: updated.name }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown server error"
        console.error("[ACTION_UPDATE_PROFILE] CRITICAL ERROR:", error)
        return { error: message }
    }
}
