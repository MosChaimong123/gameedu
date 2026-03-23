import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const student = await db.student.findUnique({
      where: { loginCode: code },
      select: {
          id: true,
          gameStats: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const farming = IdleEngine.getFarmingState(student);

    return NextResponse.json({
      success: true,
      farming
    });

  } catch (error) {
    console.error("[Farming API] GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
