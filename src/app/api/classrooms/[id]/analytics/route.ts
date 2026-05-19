import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guards";
import {
  ATTENDANCE_CHART_COLORS,
  ATTENDANCE_STATUSES,
  emptyAttendanceSummary,
  normalizeAttendanceStatus,
} from "@/lib/attendance-status";
import { checklistCheckedScore } from "@/lib/academic-score";
import { dbAssignmentTypeToFormType } from "@/lib/assignment-type";
import {
  AUTH_REQUIRED_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { parseWorksheetSubmissionContent } from "@/lib/worksheet-review";

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
  behaviorPoints: number;
  attendance: string | null;
  submissions: {
    assignmentId: string;
    score: number;
    submittedAt: Date;
    content?: string | null;
  }[];
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

type AnalyticsAssignment = {
  id: string;
  name: string;
  type: string | null;
  maxScore: number | null;
  passScore: number | null;
  deadline: Date | null;
  visible: boolean | null;
  checklists?: unknown;
};

// GET /api/classrooms/[id]/analytics — behavior + custom-achievement counts (no RPG economy)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSessionUser();
  if (!user) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);

  try {
    const classroom = await db.classroom.findUnique({
      where: { id, teacherId: user.id },
      select: {
        assignments: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
            checklists: true,
            maxScore: true,
            passScore: true,
            deadline: true,
            visible: true,
          },
        },
        students: {
          select: {
            id: true,
            name: true,
            nickname: true,
            behaviorPoints: true,
            attendance: true,
            submissions: {
              select: {
                assignmentId: true,
                score: true,
                submittedAt: true,
                content: true,
              },
            },
            history: {
              orderBy: { timestamp: "desc" },
              select: {
                id: true,
                reason: true,
                value: true,
                timestamp: true,
              },
            },
            achievements: {
              select: {
                achievementId: true,
              },
            },
          },
        },
      },
    });

    if (!classroom) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);

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
    const attendanceSummary = emptyAttendanceSummary();

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

      const att = normalizeAttendanceStatus(student.attendance);
      attendanceSummary[att]++;
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
        behaviorPoints: s.behaviorPoints,
        totalPositive: pos,
        totalNeedsWork: neg,
        attendance: att,
        achievementCount: s.achievements.length,
      };
    });

    // ── Assignment analytics ──────────────────────────────────────────
    const students = classroom.students as AnalyticsStudent[];
    const totalStudents = students.length;

    // Build submission map: assignmentId → { studentId → score }
    const subMap = new Map<string, Map<string, number>>();
    for (const student of students) {
      for (const sub of student.submissions) {
        if (!subMap.has(sub.assignmentId)) subMap.set(sub.assignmentId, new Map());
        subMap.get(sub.assignmentId)!.set(student.id, sub.score);
      }
    }

    const assignmentStats = ((classroom.assignments ?? []) as AnalyticsAssignment[])
      .filter((a) => a.visible !== false)
      .map((assignment) => {
        const subs = subMap.get(assignment.id) ?? new Map<string, number>();
        const submittedCount = subs.size;
        const isWorksheet = dbAssignmentTypeToFormType(assignment.type) === "worksheet";
        const scores = [...subs.values()].map((score) =>
          dbAssignmentTypeToFormType(assignment.type) === "checklist"
            ? checklistCheckedScore(score, assignment.checklists as never)
            : score
        );
        const avgScore = scores.length > 0
          ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
          : 0;
        const maxScore = assignment.maxScore ?? 100;
        const passScore = assignment.passScore ?? null;
        const passCount = passScore !== null ? scores.filter((s) => s >= passScore).length : null;
        const notSubmittedIds = totalStudents > 0
          ? students
              .filter((st) => !subs.has(st.id))
              .map((st) => ({ id: st.id, name: st.name }))
          : [];
        const worksheetPendingReviewCount = isWorksheet
          ? students.reduce((sum, student) => {
              const submission = student.submissions.find((entry) => entry.assignmentId === assignment.id);
              if (!submission) return sum;
              const parsed = parseWorksheetSubmissionContent(submission.content);
              return sum + (parsed?.itemResults.filter((item) => item.needsReview).length ?? 0);
            }, 0)
          : 0;
        const worksheetPendingSubmissionCount = isWorksheet
          ? students.reduce((sum, student) => {
              const submission = student.submissions.find((entry) => entry.assignmentId === assignment.id);
              if (!submission) return sum;
              const parsed = parseWorksheetSubmissionContent(submission.content);
              const needsReview = (parsed?.itemResults.some((item) => item.needsReview) ?? false);
              return sum + (needsReview ? 1 : 0);
            }, 0)
          : 0;
        const worksheetReviewedSubmissionCount = isWorksheet
          ? Math.max(0, submittedCount - worksheetPendingSubmissionCount)
          : 0;
        const worksheetReviewCompletionRate = isWorksheet && submittedCount > 0
          ? Math.round((worksheetReviewedSubmissionCount / submittedCount) * 100)
          : 0;

        return {
          id: assignment.id,
          name: assignment.name,
          type: assignment.type,
          maxScore,
          passScore,
          submittedCount,
          totalStudents,
          submissionRate: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0,
          avgScore,
          passCount,
          worksheetPendingReviewCount,
          worksheetPendingSubmissionCount,
          worksheetReviewedSubmissionCount,
          worksheetReviewCompletionRate,
          notSubmitted: notSubmittedIds,
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
      attendanceSummary: ATTENDANCE_STATUSES.map((status) => ({
        status,
        value: attendanceSummary[status],
        fill: ATTENDANCE_CHART_COLORS[status],
      })).filter((entry) => entry.value > 0),
      achievementSummary: {
        total: totalAchievements,
        avgPerStudent: classroom.students.length > 0
          ? Math.round((totalAchievements / classroom.students.length) * 10) / 10
          : 0,
      },
      achievementDistribution,
      assignmentStats,
    });

  } catch (error) {
    console.error("[ANALYTICS_GET]", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
