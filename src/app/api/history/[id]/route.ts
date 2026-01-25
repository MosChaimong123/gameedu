import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const history = await prisma.gameHistory.findUnique({
            where: {
                id: id
            }
        })

        if (!history) {
            return NextResponse.json({ error: "Not found" }, { status: 404 })
        }

        if (history.hostId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        return NextResponse.json(history)

    } catch (error) {
        console.error("GET /api/history/[id] Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
