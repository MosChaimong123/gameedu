import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  ALL_QUESTS,
  getQuestProgress,
  completeQuest,
  trackQuestEvent,
} from "@/lib/game/quest-engine";
import { toPrismaJson } from "@/lib/game/game-stats";

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

    // Collect and clear pending notifications
    const pendingIds = [
      ...(progress.daily.pendingNotifications ?? []),
      ...(progress.weekly.pendingNotifications ?? []),
    ];
    if (pendingIds.length > 0) {
      progress.daily.pendingNotifications = [];
      progress.weekly.pendingNotifications = [];
      await db.student.update({
        where: { id: student.id },
        data: { questProgress: toPrismaJson({ daily: progress.daily, weekly: progress.weekly }) },
      });
    }
    const pendingNotifications = pendingIds.map((id) => {
      const q = ALL_QUESTS.find((x) => x.id === id);
      if (!q) return null;
      return { id: q.id, name: q.name, icon: q.icon, goldReward: q.reward.gold ?? 0 };
    }).filter(Boolean);

    const daily = DAILY_QUESTS.map((quest) => ({
      id: quest.id,
      name: quest.name,
      description: quest.description,
      icon: quest.icon,
      event: quest.event,
      target: quest.target,
      goldReward: quest.reward.gold ?? 0,
      completed: progress.daily.completed.includes(quest.id),
      counter: progress.daily.counters[quest.event] ?? 0,
    }));

    const weekly = WEEKLY_QUESTS.map((quest) => ({
      id: quest.id,
      name: quest.name,
      description: quest.description,
      icon: quest.icon,
      event: quest.event,
      target: quest.target,
      goldReward: quest.reward.gold ?? 0,
      completed: progress.weekly.completed.includes(quest.id),
      counter: progress.weekly.counters[quest.event] ?? 0,
    }));

    // `quests` = daily list for legacy UI (DailyQuestCard)
    return NextResponse.json({
      quests: daily,
      daily,
      weekly,
      progress,
      pendingNotifications,
    });
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
