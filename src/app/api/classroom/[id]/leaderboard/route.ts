import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";

// GET /api/classroom/[id]/leaderboard
// Returns students ranked by gold, points, and achievement count
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
        gameStats: true,
        achievements: { select: { id: true } },
        items: {
          where: { isEquipped: true },
          include: { item: true }
        }
      }
    });

    const ranked = students
      .map((s: any) => {
        const stats = IdleEngine.calculateCharacterStats(s.points, s.items);
        return {
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          points: s.points,
          gold: (s.gameStats as any)?.gold || 0,
          achievementCount: s.achievements.length,
          equippedCount: s.items.length,
          hp: stats.hp,
          atk: stats.atk,
          def: stats.def
        };
      })
      .sort((a: any, b: any) => b.gold - a.gold) // Primary: gold
      .map((s: any, idx: number) => ({ ...s, rank: idx + 1 }));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
