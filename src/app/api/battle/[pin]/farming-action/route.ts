import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { gameManager } from "@/lib/game-engine/manager";

/**
 * POST /api/battle/[pin]/farming-action
 * Submit farming skill action
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pin: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pin } = await params;
    const { type, skillId, socketId } = await req.json();

    if (!socketId || typeof socketId !== "string") {
      return NextResponse.json({ error: "Missing socketId" }, { status: 400 });
    }

    // Validate action type
    if (type !== "SKILL") {
      return NextResponse.json(
        { error: "Invalid action type. Must be SKILL" },
        { status: 400 }
      );
    }

    // Get the battle game
    const game = gameManager.getGame(pin);
    if (!game) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    const player = (game as any)?.players?.find((p: any) => p.id === socketId);
    if (!player) {
      return NextResponse.json({ error: "Player not found for provided socketId" }, { status: 400 });
    }

    // Forward into BattleTurnEngine with a minimal fake socket.
    let emittedError: any = null;
    const fakeSocket = {
      id: socketId,
      emit: (eventName: string, data: any) => {
        if (eventName === "error") emittedError = data;
      },
    } as any;

    game.handleEvent("farming-action", { type, skillId, pin }, fakeSocket);
    if (emittedError) {
      return NextResponse.json(
        { error: emittedError?.message ?? emittedError ?? "Farming action failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Farming Action API] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
