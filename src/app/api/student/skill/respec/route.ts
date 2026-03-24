import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseGameStats, toPrismaJson } from "@/lib/game/game-stats";
import { RPG_ROUTE_ERROR, RpgRouteError, toSkillTreeErrorResponse } from "@/lib/game/rpg-route-errors";
import {
  applySkillRespec,
  calculateRespecCost,
  normalizeSkillTreeState,
} from "@/lib/game/skill-tree";

type RespecBody = {
  studentId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { studentId } = (await req.json()) as RespecBody;
    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: studentId },
        select: { id: true, userId: true, gameStats: true },
      });
      if (!student) throw new RpgRouteError(RPG_ROUTE_ERROR.studentNotFound);
      if (student.userId !== userId) throw new Error("FORBIDDEN");

      const gameStats = parseGameStats(student.gameStats);
      const level = gameStats.level ?? 1;
      const cost = calculateRespecCost(level);
      if ((gameStats.gold ?? 0) < cost) {
        throw new RpgRouteError(RPG_ROUTE_ERROR.insufficientGold);
      }

      const state = normalizeSkillTreeState(
        {
          skillPointsAvailable: gameStats.skillPointsAvailable,
          skillPointsSpent: gameStats.skillPointsSpent,
          skillTreeProgress: gameStats.skillTreeProgress,
          lastRespecAt: gameStats.lastRespecAt,
        },
        level
      );
      const nextState = applySkillRespec(state);
      const nextStats = {
        ...gameStats,
        ...nextState,
        gold: Math.max(0, (gameStats.gold ?? 0) - cost),
      };

      await tx.student.update({
        where: { id: studentId },
        data: { gameStats: toPrismaJson(nextStats) },
      });

      return {
        skillPointsAvailable: nextState.skillPointsAvailable,
        skillPointsSpent: nextState.skillPointsSpent,
        progress: nextState.skillTreeProgress,
        gold: nextStats.gold,
        respecCost: cost,
        lastRespecAt: nextState.lastRespecAt,
      };
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const knownErrorResponse = toSkillTreeErrorResponse(error);
    if (knownErrorResponse) return knownErrorResponse;
    console.error("[SKILL_TREE_RESPEC_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
