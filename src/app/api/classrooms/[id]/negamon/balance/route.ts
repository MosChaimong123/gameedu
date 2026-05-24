import { NextResponse } from "next/server";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { requireSessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { buildNegamonContentCatalog } from "@/lib/game-negamon";
import {
  buildNegamonTeacherBalanceReport,
  NEGAMON_BALANCE_GUARDRAILS,
  readNegamonBalanceSettings,
} from "@/lib/negamon/teacher-balance-report";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSessionUser();
  if (!user) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }

  const classroom = await db.classroom.findUnique({
    where: { id, teacherId: user.id },
    select: {
      id: true,
      gamifiedSettings: true,
      students: {
        select: {
          id: true,
          name: true,
          nickname: true,
          behaviorPoints: true,
          gold: true,
        },
      },
    },
  });
  if (!classroom) {
    return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
  }

  const [pointHistoryRows, economyRows, battleRows] = await Promise.all([
    db.pointHistory.findMany({
      where: {
        reason: { startsWith: "negamon_" },
        student: { classId: id },
      },
      orderBy: { timestamp: "desc" },
      take: 500,
      select: {
        studentId: true,
        value: true,
        reason: true,
      },
    }),
    db.economyTransaction.findMany({
      where: {
        classId: id,
        source: { in: ["battle", "quest", "checkin"] },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        studentId: true,
        source: true,
        amount: true,
        metadata: true,
      },
    }),
    db.battleSession.findMany({
      where: { classId: id },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        challengerId: true,
        defenderId: true,
        winnerId: true,
        result: true,
      },
    }),
  ]);

  const report = buildNegamonTeacherBalanceReport({
    students: classroom.students,
    pointHistoryRows,
    economyRows,
    battleRows,
    catalog: buildNegamonContentCatalog(),
  });

  return NextResponse.json({
    classId: id,
    balanceSettings: readNegamonBalanceSettings(classroom.gamifiedSettings),
    guardrails: NEGAMON_BALANCE_GUARDRAILS,
    ...report,
  });
}
