import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { plan } = await req.json()
        if (!["PLUS", "PRO"].includes(plan)) {
            return new NextResponse("Invalid Plan", { status: 400 })
        }

        // Simulating 30 days of Plus
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 30)

        const updatedUser = await db.user.update({
            where: { id: session.user.id },
            data: {
                plan: plan,
                planStatus: "ACTIVE",
                planExpiry: expiryDate,
            }
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error("[UPGRADE_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
