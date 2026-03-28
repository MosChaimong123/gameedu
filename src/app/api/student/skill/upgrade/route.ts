import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseGameStats, toPrismaJson } from "@/lib/game/game-stats";
import { buildGlobalSkillMap, getSkillsForLevel, resolveEffectiveJobKey } from "@/lib/game/job-system";
import { RPG_ROUTE_ERROR, RpgRouteError, toSkillTreeErrorResponse } from "@/lib/game/rpg-route-errors";
import {
  applySkillUpgrade,
  clampSkillTreeStateToSkills,
  getEffectiveSkillAtRank,
  normalizeSkillTreeState,
  validateSkillUpgrade,
} from "@/lib/game/skill-tree";

type UpgradeBody = {
  studentId?: string;
  skillId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { studentId, skillId } = (await req.json()) as UpgradeBody;
    if (!studentId || !skillId) {
      return NextResponse.json({ error: "Missing studentId or skillId" }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          userId: true,
          gameStats: true,
          jobClass: true,
          jobTier: true,
          advanceClass: true,
          jobSkills: true,
        },
      });
      if (!student) throw new RpgRouteError(RPG_ROUTE_ERROR.studentNotFound);
      if (student.userId !== userId) throw new Error("FORBIDDEN");

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

      const skill = buildGlobalSkillMap()[skillId];
      if (!skill) throw new RpgRouteError(RPG_ROUTE_ERROR.skillNotFound);

      // Server-side lock: skill must be unlocked by current job path + level,
      // and must exist in student's persisted jobSkills.
      const effectiveJobKey = resolveEffectiveJobKey({
        jobClass: student.jobClass,
        jobTier: student.jobTier,
        advanceClass: student.advanceClass,
      });
      const classSkills = getSkillsForLevel(effectiveJobKey, level);
      const balancedState = clampSkillTreeStateToSkills(skillState, classSkills);
      const unlockedByLevel = new Set(
        classSkills.map((s) => s.id)
      );
      const persistedJobSkills = Array.isArray(student.jobSkills)
        ? (student.jobSkills as string[])
        : [];
      const unlockedByStorage = new Set(persistedJobSkills);

      if (!unlockedByLevel.has(skillId) || !unlockedByStorage.has(skillId)) {
        throw new RpgRouteError(
          RPG_ROUTE_ERROR.skillUpgradeBlocked,
          "ทักษะนี้ยังไม่ถูกปลดล็อกตามเลเวล/สายอาชีพ"
        );
      }

      const validation = validateSkillUpgrade({ skill, state: balancedState, level });
      if (!validation.ok) {
        throw new RpgRouteError(RPG_ROUTE_ERROR.skillUpgradeBlocked, validation.message);
      }

      const nextState = applySkillUpgrade(balancedState, skill.id);
      const nextStats = {
        ...gameStats,
        ...nextState,
      };

      await tx.student.update({
        where: { id: studentId },
        data: { gameStats: toPrismaJson(nextStats) },
      });

      const effectiveSkill = getEffectiveSkillAtRank(skill, validation.nextRank);
      return {
        skillId: skill.id,
        rank: validation.nextRank,
        skillPointsAvailable: nextState.skillPointsAvailable,
        skillPointsSpent: nextState.skillPointsSpent,
        cost: effectiveSkill.cost,
        damageMultiplier: effectiveSkill.damageMultiplier ?? null,
        healMultiplier: effectiveSkill.healMultiplier ?? null,
      };
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const knownErrorResponse = toSkillTreeErrorResponse(error);
    if (knownErrorResponse) return knownErrorResponse;
    console.error("[SKILL_TREE_UPGRADE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
