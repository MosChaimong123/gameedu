
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db as prisma } from "@/lib/db";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const game = await prisma.gameHistory.findUnique({
            where: {
                id: params.id,
            },
        });

        if (!game) {
            return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }

        // Security check: Only host can view details? 
        // Or maybe players who played it? For now, stick to Host.
        if (game.hostId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(game);

    } catch (error) {
        console.error("GET /api/history/[id] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
