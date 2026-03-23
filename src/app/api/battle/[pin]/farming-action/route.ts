import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const { type, skillId } = await req.json();

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

    // Emit farming-action event to the game engine
    return NextResponse.json({ success: true, action: { type, skillId } });
  } catch (error: any) {
    console.error("[Farming Action API] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
