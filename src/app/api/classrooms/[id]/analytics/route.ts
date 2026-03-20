import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// GET /api/classrooms/[id]/analytics
// Returns enriched data including game stats per student
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const classroom = await db.classroom.findUnique({
      where: { id, teacherId: session.user.id },
      include: {
        students: {
          include: {
            history: { orderBy: { timestamp: "desc" } },
            achievements: true,
            items: { include: { item: true } },
          }
        }
      }
    });

    if (!classroom) return new NextResponse("Not Found", { status: 404 });

    // === Behavior Data ===
    let totalPositive = 0, totalNeedsWork = 0;
    const recentHistory: any[] = [];
    const skillCounts: Record<string, number> = {};
    const dailyGrowth: Record<string, number> = {};

    // Prepare last 14 days
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyGrowth[d.toISOString().split("T")[0]] = 0;
    }

    // === Game Data ===
    let totalGold = 0;
    let totalAchievements = 0;
    let totalItems = 0;
    const goldPerStudent: { name: string; gold: number; points: number; achievements: number }[] = [];
    const achievementCounts: Record<string, number> = {};
    const attendanceSummary: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, LEFT_EARLY: 0 };

    for (const student of classroom.students) {
      const gold = (student.gameStats as any)?.gold || 0;
      const achievementsCount = student.achievements.length;
      const itemsCount = student.items.length;

      totalGold += gold;
      totalAchievements += achievementsCount;
      totalItems += itemsCount;

      goldPerStudent.push({
        name: student.nickname || student.name.split(" ")[0] || student.name,
        gold,
        points: student.points,
        achievements: achievementsCount
      });

      // Achievement breakdown
      for (const ach of student.achievements) {
        achievementCounts[ach.achievementId] = (achievementCounts[ach.achievementId] || 0) + 1;
      }

      // Behavior
      for (const record of student.history) {
        if (record.value > 0) totalPositive += record.value;
        else totalNeedsWork += Math.abs(record.value);

        skillCounts[record.reason] = (skillCounts[record.reason] || 0) + 1;
        const recDate = new Date(record.timestamp).toISOString().split("T")[0];
        if (recDate in dailyGrowth) dailyGrowth[recDate] += Math.abs(record.value);

        recentHistory.push({
          id: record.id,
          studentName: student.name,
          studentId: student.id,
          reason: record.reason,
          value: record.value,
          timestamp: record.timestamp
        });
      }

      const att = student.attendance || "PRESENT";
      if (att in attendanceSummary) attendanceSummary[att as keyof typeof attendanceSummary]++;
    }

    recentHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const growthData = Object.entries(dailyGrowth).map(([date, value]) => ({
      date: new Date(date).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      points: value
    }));

    const skillDistribution = Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const achievementDistribution = Object.entries(achievementCounts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Gold leaderboard
    const goldLeaderboard = [...goldPerStudent].sort((a, b) => b.gold - a.gold).slice(0, 10);

    // === Student full stats ===
    const studentStats = classroom.students.map((s: any) => {
      const pos = s.history.filter((h: any) => h.value > 0).reduce((sum: number, h: any) => sum + h.value, 0);
      const neg = Math.abs(s.history.filter((h: any) => h.value < 0).reduce((sum: number, h: any) => sum + h.value, 0));
      const att = s.attendance || "PRESENT";
      return {
        id: s.id,
        name: s.name,
        nickname: s.nickname ?? null,
        points: s.points,
        gold: (s.gameStats as any)?.gold || 0,
        totalPositive: pos,
        totalNeedsWork: neg,
        attendance: att,
        achievementCount: s.achievements.length,
        itemCount: s.items.length,
      };
    });

    return NextResponse.json({
      // Behavior
      summary: [
        { name: "Positive", value: totalPositive, fill: "#22c55e" },
        { name: "Needs Work", value: totalNeedsWork, fill: "#ef4444" }
      ],
      growthData,
      skillDistribution,
      recentHistory: recentHistory.slice(0, 100),
      studentStats,
      attendanceSummary: [
        { name: "มาเรียน", value: attendanceSummary.PRESENT, fill: "#22c55e" },
        { name: "สาย", value: attendanceSummary.LATE, fill: "#f59e0b" },
        { name: "ขาดเรียน", value: attendanceSummary.ABSENT, fill: "#ef4444" },
        { name: "ออกก่อน", value: attendanceSummary.LEFT_EARLY, fill: "#f97316" },
      ].filter((e: any) => e.value > 0),
      // Game
      gameSummary: {
        totalGold,
        avgGold: classroom.students.length > 0 ? Math.round(totalGold / classroom.students.length) : 0,
        totalAchievements,
        totalItems,
      },
      goldLeaderboard,
      achievementDistribution,
    });

  } catch (error) {
    console.error("[ANALYTICS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
