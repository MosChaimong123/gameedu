import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  getQuestProgress,
  completeQuest,
  trackQuestEvent,
} from "@/lib/game/quest-engine";

// GET /api/student/[code]/daily-quests — Get quests + progress (daily + weekly)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true, questProgress: true },
    });

    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const progress = getQuestProgress(student.questProgress);

    const daily = DAILY_QUESTS.map((quest) => ({
      ...quest,
      completed: progress.daily.completed.includes(quest.id),
      counter: progress.daily.counters[quest.event] ?? 0,
    }));

    const weekly = WEEKLY_QUESTS.map((quest) => ({
      ...quest,
      completed: progress.weekly.completed.includes(quest.id),
      counter: progress.weekly.counters[quest.event] ?? 0,
    }));

    return NextResponse.json({ daily, weekly, progress });
  } catch (error) {
    console.error("Error fetching quests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/student/[code]/daily-quests — Trigger a quest event or complete a specific quest
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json() as { questId?: string; event?: string };

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true },
    });

    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Legacy: complete a specific quest by ID
    if (body.questId) {
      const result = await completeQuest(student.id, body.questId);
      return NextResponse.json(result);
    }

    // New: track an event (e.g. DAILY_LOGIN)
    if (body.event) {
      const completed = await trackQuestEvent(student.id, body.event as Parameters<typeof trackQuestEvent>[1]);
      return NextResponse.json({ success: true, completed });
    }

    return NextResponse.json({ error: "Missing questId or event" }, { status: 400 });
  } catch (error) {
    console.error("Error processing quest:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
