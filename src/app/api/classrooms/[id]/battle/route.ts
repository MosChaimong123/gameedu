/**
 * POST /api/classrooms/[id]/battle
 * Body: { challengerId, defenderId, studentCode }
 *
 * Resolves the entire battle immediately and stores the result.
 * Returns the BattleSession id + result.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    getNegamonSettings,
    getStudentMonsterState,
} from "@/lib/classroom-utils";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import { initBattleFighter, resolveBattle } from "@/lib/battle-engine";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;
    const body = (await req.json()) as {
        challengerId: string;
        defenderId: string;
        studentCode: string;
        /** "init"  → return fighter data only (no battle run/save)
         *  "save"  → save a pre-computed interactive result
         *  default → run full battle + save */
        mode?: "init" | "save";
        // For mode === "save":
        winnerId?: string;
        goldReward?: number;
        totalTurns?: number;
    };
    const { challengerId, defenderId, studentCode, mode } = body;

    if (!challengerId || !defenderId || challengerId === defenderId) {
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    // Fetch classroom + both students
    const classroom = await db.classroom.findUnique({
        where: { id: classId },
        select: { id: true, gamifiedSettings: true, levelConfig: true },
    });
    if (!classroom) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // Verify challenger owns this loginCode
    const challenger = await db.student.findFirst({
        where: { id: challengerId, classId, loginCode: studentCode },
        select: { id: true, name: true, behaviorPoints: true, inventory: true },
    });
    if (!challenger) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const defender = await db.student.findFirst({
        where: { id: defenderId, classId },
        select: { id: true, name: true, behaviorPoints: true, inventory: true },
    });
    if (!defender) return NextResponse.json({ error: "DEFENDER_NOT_FOUND" }, { status: 404 });

    // Get monster states
    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) {
        return NextResponse.json({ error: "NEGAMON_DISABLED" }, { status: 400 });
    }

    const levelConfig = classroom.levelConfig as LevelConfigInput;

    const challengerMonster = getStudentMonsterState(
        challengerId, challenger.behaviorPoints, levelConfig, negamon
    );
    const defenderMonster = getStudentMonsterState(
        defenderId, defender.behaviorPoints, levelConfig, negamon
    );

    if (!challengerMonster || !defenderMonster) {
        return NextResponse.json({ error: "NO_MONSTER" }, { status: 400 });
    }

    if (challengerMonster.unlockedMoves.length === 0 || defenderMonster.unlockedMoves.length === 0) {
        return NextResponse.json({ error: "NO_MOVES" }, { status: 400 });
    }

    const challengerInventory = Array.isArray(challenger.inventory) ? challenger.inventory as string[] : [];
    const defenderInventory   = Array.isArray(defender.inventory)   ? defender.inventory   as string[] : [];
    const f1 = initBattleFighter(challengerMonster, challengerId, challenger.name, challengerInventory);
    const f2 = initBattleFighter(defenderMonster,   defenderId,   defender.name,  defenderInventory);

    // ── mode: "init" — return fighter data only (no battle run/save) ──
    if (mode === "init") {
        return NextResponse.json({ player: f1, opponent: f2 });
    }

    // ── mode: "save" — save a pre-computed interactive result ──
    if (mode === "save") {
        const { winnerId, goldReward = 30, totalTurns = 0 } = body;
        if (!winnerId || (winnerId !== challengerId && winnerId !== defenderId)) {
            return NextResponse.json({ error: "INVALID_WINNER" }, { status: 400 });
        }
        const session = await db.battleSession.create({
            data: {
                classId, challengerId, defenderId,
                result: { mode: "interactive", totalTurns },
                winnerId,
                goldReward,
            },
        });
        await db.student.update({
            where: { id: winnerId },
            data: { gold: { increment: goldReward } },
        });
        return NextResponse.json({ sessionId: session.id, winnerId, goldReward });
    }

    // ── default — resolve full battle + save ──
    const result = resolveBattle(f1, f2);

    // Store session
    const session = await db.battleSession.create({
        data: {
            classId,
            challengerId,
            defenderId,
            result,
            winnerId: result.winnerId,
            goldReward: result.goldReward,
        },
    });

    // Award gold to winner
    await db.student.update({
        where: { id: result.winnerId },
        data: { gold: { increment: result.goldReward } },
    });

    return NextResponse.json({ sessionId: session.id, result });
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId") ?? undefined;

    const where: Record<string, unknown> = { classId };
    if (studentId) {
        where.OR = [{ challengerId: studentId }, { defenderId: studentId }];
    }

    const sessions = await db.battleSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
            id: true, challengerId: true, defenderId: true,
            winnerId: true, goldReward: true, createdAt: true,
        },
    });

    // Collect all unique student IDs and fetch their names
    const studentIds = [...new Set<string>(
        sessions.flatMap((s: { challengerId: string; defenderId: string }) => [s.challengerId, s.defenderId])
    )];

    const students = studentIds.length > 0
        ? await db.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, name: true },
        })
        : [];

    const studentNames: Record<string, string> = {};
    for (const s of students as { id: string; name: string }[]) {
        studentNames[s.id] = s.name;
    }

    return NextResponse.json({ sessions, studentNames });
}
