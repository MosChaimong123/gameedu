import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const history = await prisma.gameHistory.findMany({
            where: {
                hostId: session.user.id
            },
            orderBy: {
                endedAt: 'desc'
            },
            select: {
                id: true,
                gameMode: true,
                startedAt: true,
                endedAt: true,
                players: true // We might want just a count here? For now, fetch all.
            }
        })

        // Transform for list view (e.g. just player count)
        const summary = history.map(h => ({
            id: h.id,
            gameMode: h.gameMode,
            startedAt: h.startedAt,
            endedAt: h.endedAt,
            playerCount: Array.isArray(h.players) ? h.players.length : 0
        }))

        return NextResponse.json(summary)

    } catch (error) {
        console.error("GET /api/history Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { gameMode, pin, startedAt, settings, players } = body

        const record = await prisma.gameHistory.create({
            data: {
                hostId: session.user.id,
                gameMode,
                pin,
                startedAt: new Date(startedAt),
                settings,
                players
            }
        })

        return NextResponse.json(record)

    } catch (error) {
        console.error("POST /api/history Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
