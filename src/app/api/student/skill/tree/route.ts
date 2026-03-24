import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseGameStats } from "@/lib/game/game-stats";
import { getMergedClassDef, resolveEffectiveJobKey } from "@/lib/game/job-system";
import { buildSkillTreeView, normalizeSkillTreeState } from "@/lib/game/skill-tree";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const studentId = new URL(req.url).searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: {
        userId: true,
        gameStats: true,
        jobClass: true,
        jobTier: true,
        advanceClass: true,
      },
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    if (student.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const gameStats = parseGameStats(student.gameStats);
    const level = gameStats.level ?? 1;
    const skillState = normalizeSkillTreeState(
      {
        skillPointsAvailable: gameStats.skillPointsAvailable,
        skillPointsSpent: gameStats.skillPointsSpent,
        skillTreeProgress: gameStats.skillTreeProgress,
        lastRespecAt: gameStats.lastRespecAt,
      },
      level
    );
    const jobKey = resolveEffectiveJobKey({
      jobClass: student.jobClass,
      jobTier: student.jobTier,
      advanceClass: student.advanceClass,
    });
    const classDef = getMergedClassDef(jobKey);
    const nodes = buildSkillTreeView({
      skills: classDef.skills,
      state: skillState,
      level,
    });

    return NextResponse.json({
      success: true,
      level,
      skillTree: nodes,
      skillPointsAvailable: skillState.skillPointsAvailable,
      skillPointsSpent: skillState.skillPointsSpent,
      progress: skillState.skillTreeProgress,
      respecCost: Math.max(0, 500 + level * 75),
      lastRespecAt: skillState.lastRespecAt ?? null,
    });
  } catch (error) {
    console.error("[SKILL_TREE_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
