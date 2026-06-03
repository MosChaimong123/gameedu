/**
 * POST /api/classrooms/[id]/battle
 * - legacy auto-battle is retired.
 * Interactive Negamon battles are served by /battle/v4/*.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeBattleRead } from "@/lib/services/battle-read-auth";
import {
    aggregateGameHistoryAnalytics,
} from "@/lib/game-core";
import {
    createNegamonBattleSessionHistorySummaryV4,
    createNegamonBattleSessionViewV4,
} from "@/lib/game-negamon/core/session-v4";

export async function POST(
    _req: NextRequest,
    _ctx: { params: Promise<{ id: string }> }
) {
    return NextResponse.json(
        {
            error: "NEGAMON_AUTO_BATTLE_RETIRED",
            replacement: "/api/classrooms/[id]/battle/v4/start",
        },
        { status: 410 }
    );
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId") ?? undefined;
    const studentCode = url.searchParams.get("studentCode") ?? undefined;

    const auth = await authorizeBattleRead({ classId, studentId, studentCode });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const where: Record<string, unknown> = {
        classId,
        winnerId: { not: null },
        ...(auth.scope === "student"
            ? {
                  OR: [{ challengerId: auth.studentId }, { defenderId: auth.studentId }],
              }
            : studentId
              ? {
                    OR: [{ challengerId: studentId }, { defenderId: studentId }],
                }
              : {}),
    };

    if (studentId && auth.scope === "teacher") {
        const student = await db.student.findFirst({
            where: { id: studentId, classId },
            select: { id: true },
        });
        if (!student) {
            return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
        }
    }

    const sessions = await db.battleSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
            id: true,
            classId: true,
            challengerId: true,
            defenderId: true,
            winnerId: true,
            goldReward: true,
            interactivePending: true,
            stateVersion: true,
            result: true,
            createdAt: true,
        },
    });

    const historyStudentId = auth.scope === "student" ? auth.studentId : studentId;
    const battleViews = sessions
        .map((session) =>
            createNegamonBattleSessionViewV4({
                id: session.id,
                classId: session.classId,
                challengerId: session.challengerId,
                defenderId: session.defenderId,
                winnerId: session.winnerId,
                goldReward: session.goldReward,
                interactivePending: session.interactivePending,
                stateVersion: session.stateVersion,
                createdAt: session.createdAt,
                result: session.result,
            })
        )
        .filter((view): view is NonNullable<typeof view> => Boolean(view));
    const gameHistory = historyStudentId
        ? battleViews
              .map((view) => createNegamonBattleSessionHistorySummaryV4({ view, studentId: historyStudentId }))
              .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        : [];

    const studentIds = [
        ...new Set<string>(
            sessions.flatMap((s: { challengerId: string; defenderId: string }) => [
                s.challengerId,
                s.defenderId,
            ])
        ),
    ];

    const students =
        studentIds.length > 0
            ? await db.student.findMany({
                  where: { id: { in: studentIds } },
                  select: { id: true, name: true },
              })
            : [];

    const studentNames: Record<string, string> = {};
    for (const s of students as { id: string; name: string }[]) {
        studentNames[s.id] = s.name;
    }

    return NextResponse.json({
        sessions,
        battleViews,
        studentNames,
        gameHistory,
        gameHistoryAnalytics: aggregateGameHistoryAnalytics(gameHistory),
    });
}
