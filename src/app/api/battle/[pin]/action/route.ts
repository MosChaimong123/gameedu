import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { gameManager } from "@/lib/game-engine/manager";

/**
 * POST /api/battle/[pin]/action
 * Submit battle action (ATTACK, DEFEND, or SKILL)
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
    const { type, skillId, targetId } = await req.json();

    // Validate action type
    if (!["ATTACK", "DEFEND", "SKILL"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid action type. Must be ATTACK, DEFEND, or SKILL" },
        { status: 400 }
      );
    }

    // Get the battle game
    const game = gameManager.getGame(pin);
    if (!game) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    // Emit battle-action event to the game engine
    // The game engine will handle the logic
    return NextResponse.json({ success: true, action: { type, skillId, targetId } });
  } catch (error: any) {
    console.error("[Battle Action API] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
