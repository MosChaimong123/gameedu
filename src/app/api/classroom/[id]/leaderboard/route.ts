import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/classroom/[id]/leaderboard — behavior points (พฤติกรรม)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const students = await db.student.findMany({
      where: { classId: id },
      select: {
        id: true,
        name: true,
        avatar: true,
        points: true,
      }
    });

    const ranked = students
      .map((s) => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        points: s.points,
        gold: 0,
        achievementCount: 0,
        equippedCount: 0,
        hp: 0,
        atk: 0,
        def: 0,
      }))
      .sort((a, b) => b.points - a.points)
      .map((s, idx: number) => ({ ...s, rank: idx + 1 }));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
