import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ACHIEVEMENTS, checkAndGrantAchievements } from "@/lib/game/achievement-engine";

// GET /api/student/[code]/achievements — Get all achievements + unlock status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true, achievements: true }
    });

    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const unlockedMap = new Map(student.achievements.map((a: any) => [a.achievementId, a]));

    const result = ACHIEVEMENTS.map(def => ({
      ...def,
      unlocked: unlockedMap.has(def.id),
      unlockedAt: unlockedMap.get(def.id)?.unlockedAt ?? null,
      goldRewarded: unlockedMap.get(def.id)?.goldRewarded ?? def.goldReward,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/student/[code]/achievements — Check and grant newly unlocked achievements
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true }
    });

    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newlyUnlocked = await checkAndGrantAchievements(student.id);

    return NextResponse.json({
      success: true,
      newlyUnlocked: newlyUnlocked.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        goldReward: a.goldReward,
      }))
    });
  } catch (error) {
    console.error("Error checking achievements:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
