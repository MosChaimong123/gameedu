import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { skillId } = await request.json();

    if (!skillId) {
        return NextResponse.json({ error: "Missing skillId" }, { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { loginCode: code },
      select: { id: true }
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await IdleEngine.useSkillOnMonster(student.id, skillId);

    return NextResponse.json(result);

  } catch (error) {
    console.error("[Farming API] Skill Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
