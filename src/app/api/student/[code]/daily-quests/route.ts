import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DAILY_QUESTS, getQuestProgress, completeQuest } from "@/lib/game/quest-engine";

// GET /api/student/[code]/daily-quests — Get quests + today's progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true, questProgress: true }
    });

    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const progress = getQuestProgress(student.questProgress);

    const result = DAILY_QUESTS.map((quest: any) => ({
      ...quest,
      completed: progress.completedQuests.includes(quest.id),
    }));

    return NextResponse.json({ quests: result, progress });
  } catch (error) {
    console.error("Error fetching daily quests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/student/[code]/daily-quests — Complete a quest
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { questId } = await req.json();

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true }
    });

    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await completeQuest(student.id, questId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error completing daily quest:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
