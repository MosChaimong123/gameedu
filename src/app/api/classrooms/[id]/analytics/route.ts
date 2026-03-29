import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type StudentAnalyticsRecord = {
  id: string;
  studentName: string;
  studentId: string;
  reason: string;
  value: number;
  timestamp: Date;
};

type AnalyticsStudent = {
  id: string;
  name: string;
  nickname: string | null;
  points: number;
  attendance: string | null;
  history: {
    id: string;
    reason: string;
    value: number;
    timestamp: Date;
  }[];
  achievements: {
    achievementId: string;
  }[];
};

// GET /api/classrooms/[id]/analytics — behavior + custom-achievement counts (no RPG economy)
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
          }
        }
      }
    });

    if (!classroom) return new NextResponse("Not Found", { status: 404 });

    let totalPositive = 0, totalNeedsWork = 0;
    const recentHistory: StudentAnalyticsRecord[] = [];
    const skillCounts: Record<string, number> = {};
    const dailyGrowth: Record<string, number> = {};

    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyGrowth[d.toISOString().split("T")[0]] = 0;
    }

    let totalAchievements = 0;
    const achievementCounts: Record<string, number> = {};
    const attendanceSummary: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, LEFT_EARLY: 0 };

    for (const student of classroom.students as AnalyticsStudent[]) {
      const achievementsCount = student.achievements.length;
      totalAchievements += achievementsCount;

      for (const ach of student.achievements) {
        achievementCounts[ach.achievementId] = (achievementCounts[ach.achievementId] || 0) + 1;
      }

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

    const studentStats = (classroom.students as AnalyticsStudent[]).map((s) => {
      const pos = s.history.filter((h) => h.value > 0).reduce((sum, h) => sum + h.value, 0);
      const neg = Math.abs(s.history.filter((h) => h.value < 0).reduce((sum, h) => sum + h.value, 0));
      const att = s.attendance || "PRESENT";
      return {
        id: s.id,
        name: s.name,
        nickname: s.nickname ?? null,
        points: s.points,
        totalPositive: pos,
        totalNeedsWork: neg,
        attendance: att,
        achievementCount: s.achievements.length,
      };
    });

    return NextResponse.json({
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
      ].filter((entry) => entry.value > 0),
      achievementSummary: {
        total: totalAchievements,
        avgPerStudent: classroom.students.length > 0
          ? Math.round((totalAchievements / classroom.students.length) * 10) / 10
          : 0,
      },
      achievementDistribution,
    });

  } catch (error) {
    console.error("[ANALYTICS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
