import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/student/[code]/battles/[battleId]/decline
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; battleId: string }> }
) {
  try {
    const { code, battleId } = await params;

    const defender = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true }
    });
    if (!defender) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const battle = await db.studentBattle.findUnique({ where: { id: battleId } });
    if (!battle || battle.defenderId !== defender.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (battle.status !== "PENDING") {
      return NextResponse.json({ error: "Already resolved" }, { status: 400 });
    }

    await db.studentBattle.update({
      where: { id: battleId },
      data: { status: "DECLINED", resolvedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
