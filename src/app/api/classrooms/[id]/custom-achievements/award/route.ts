import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

type CustomAchievement = {
  id: string;
  name: string;
  icon: string;
  goldReward: number;
};

type GamifiedSettings = {
  customAchievements?: CustomAchievement[];
};

// POST /api/classrooms/[id]/custom-achievements/award
// Body: { achievementId, studentId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { achievementId, studentId } = await req.json();

    // 1. Get classroom and find the achievement definition
    const classroom = await db.classroom.findUnique({
      where: { id },
      select: { gamifiedSettings: true }
    });
    if (!classroom) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });

    const settings = (classroom.gamifiedSettings as GamifiedSettings | null) || {};
    const customAchievements = settings.customAchievements || [];
    const achievementDef = customAchievements.find((a) => a.id === achievementId);

    if (!achievementDef) return NextResponse.json({ error: "Achievement not found" }, { status: 404 });

    // 2. Check student exists and hasn't already received it
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { id: true, achievements: { where: { achievementId } } }
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    if (student.achievements.length > 0) {
      return NextResponse.json({ error: "นักเรียนได้รับรางวัลนี้ไปแล้ว" }, { status: 400 });
    }

    await db.studentAchievement.create({
      data: {
        studentId,
        achievementId,
        goldRewarded: achievementDef.goldReward,
      }
    });

    await db.student.update({
      where: { id: studentId },
      data: {
        points: { increment: achievementDef.goldReward },
      }
    });

    await db.pointHistory.create({
      data: {
        studentId,
        reason: `${achievementDef.icon} รางวัลพิเศษจากครู: ${achievementDef.name}`,
        value: achievementDef.goldReward,
      }
    });

    return NextResponse.json({ success: true, pointsAwarded: achievementDef.goldReward });
  } catch (error) {
    console.error("Error awarding custom achievement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
