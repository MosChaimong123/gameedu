import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getQuestProgress } from "@/lib/game/quest-engine";
import { getBossRaidTemplate } from "@/lib/game/personal-classroom-boss";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classroomId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: {
        teacherId: true,
        gamifiedSettings: true,
        students: {
          select: {
            id: true,
            name: true,
            jobClass: true,
            gameStats: true,
            questProgress: true,
          },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (classroom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parseStats = (gs: unknown): Record<string, unknown> => {
      if (!gs) return {};
      if (typeof gs === "string") {
        try { return JSON.parse(gs) as Record<string, unknown>; } catch { return {}; }
      }
      return gs as Record<string, unknown>;
    };

    // Boss status — personal boss system
    const template = getBossRaidTemplate(
      (classroom.gamifiedSettings ?? {}) as Record<string, unknown>
    );

    let boss: { active: boolean; name: string; hpPct: number; elementKey: string | null; difficulty: string | null } | null = null;
    if (template) {
      // Average remaining HP% across students who have an active personal boss
      let totalHpPct = 0;
      let activeCount = 0;
      for (const s of classroom.students) {
        const pb = (parseStats(s.gameStats) as Record<string, unknown>)
          ?.personalClassroomBoss as Record<string, unknown> | undefined;
        if (pb && pb.active === true && typeof pb.currentHp === "number" && template.maxHp > 0) {
          totalHpPct += Math.max(0, (pb.currentHp as number) / template.maxHp) * 100;
          activeCount++;
        }
      }
      boss = {
        active: true,
        name: template.name,
        hpPct: activeCount > 0 ? Math.round(totalHpPct / activeCount) : 100,
        elementKey: template.elementKey ?? null,
        difficulty: template.difficulty ?? null,
      };
    }

    // Build student stat lists
    type StudentRow = { id: string; name: string; jobClass: string | null; gameStats: unknown; questProgress: unknown };
    const students: StudentRow[] = classroom.students;

    const toNum = (v: unknown): number => (typeof v === "number" ? v : 0);

    const sorted = (key: string) =>
      [...students]
        .sort((a, b) => toNum(parseStats(b.gameStats)[key]) - toNum(parseStats(a.gameStats)[key]))
        .slice(0, 5)
        .map((s) => ({ id: s.id, name: s.name, jobClass: s.jobClass, [key]: toNum(parseStats(s.gameStats)[key]) }));

    const topByLevel = sorted("level");
    const topByGold = sorted("gold");
    const topByArena = sorted("arenaPoints");

    // Quest activity — students with ≥1 daily quest completed today
    const today = new Date().toISOString().split("T")[0];
    let dailyActive = 0;
    for (const s of students) {
      const progress = getQuestProgress(s.questProgress);
      if (progress.daily.lastReset === today && progress.daily.completed.length > 0) {
        dailyActive++;
      }
    }

    return NextResponse.json({
      boss,
      topByLevel,
      topByGold,
      topByArena,
      questActivity: { totalStudents: students.length, dailyActive },
    });
  } catch (error) {
    console.error("[GAME_STATS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
