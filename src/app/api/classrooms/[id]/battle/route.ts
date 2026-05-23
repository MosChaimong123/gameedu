/**
 * POST /api/classrooms/[id]/battle
 * - auto-resolve battle using each student's battleLoadout; consume items; save session.
 * Interactive Negamon V2 battles are served by /battle/lite/*.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    getNegamonSettings,
    getStudentMonsterState,
} from "@/lib/classroom-utils";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import {
    initBattleFighter,
    resolveBattle,
} from "@/lib/battle-engine";
import {
    normalizeLoadoutInput,
    removeBattleItemsFromInventory,
    sanitizeLoadoutAgainstInventory,
    validateBattleLoadout,
} from "@/lib/battle-loadout";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";
import { resolveBattleRewardPayout } from "@/lib/services/student-economy/battle-reward-policy";
import { authorizeBattleRead } from "@/lib/services/battle-read-auth";
import {
    aggregateGameHistoryAnalytics,
    createBattleHistorySummary,
} from "@/lib/game-core";

const BATTLE_START_RATE_WINDOW_MS = 60 * 1000;
const MAX_BATTLE_STARTS_PER_WINDOW = 8;

function normalizeDefenderLoadout(
    raw: unknown,
    inventory: string[]
): { ids: string[]; hadInvalidPreset: boolean } {
    const arr = normalizeLoadoutInput(raw);
    const v = validateBattleLoadout(arr, inventory);
    if (v.ok) return { ids: v.normalizedIds, hadInvalidPreset: false };
    return { ids: [], hadInvalidPreset: arr.length > 0 };
}

async function enforceBattleStartAbuseLimits(input: {
    classId: string;
    challengerId: string;
}) {
    const now = Date.now();
    const recentStartCount = await db.battleSession.count({
        where: {
            classId: input.classId,
            challengerId: input.challengerId,
            createdAt: { gte: new Date(now - BATTLE_START_RATE_WINDOW_MS) },
        },
    });
    if (recentStartCount >= MAX_BATTLE_STARTS_PER_WINDOW) {
        return NextResponse.json(
            {
                error: "BATTLE_RATE_LIMITED",
                retryAfterSeconds: Math.ceil(BATTLE_START_RATE_WINDOW_MS / 1000),
            },
            {
                status: 429,
                headers: { "Retry-After": String(Math.ceil(BATTLE_START_RATE_WINDOW_MS / 1000)) },
            }
        );
    }

    return null;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: classId } = await params;
    const body = (await req.json()) as {
        challengerId: string;
        defenderId: string;
        studentCode: string;
        mode?: string;
    };
    const { challengerId, defenderId, studentCode, mode } = body;

    if (!challengerId || !defenderId || challengerId === defenderId) {
        return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const classroom = await db.classroom.findUnique({
        where: { id: classId },
        select: { id: true, gamifiedSettings: true, levelConfig: true },
    });
    if (!classroom) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const challenger = await db.student.findFirst({
        where: { id: challengerId, classId, loginCode: studentCode },
        select: {
            id: true,
            name: true,
            behaviorPoints: true,
            gold: true,
            inventory: true,
            battleLoadout: true,
        },
    });
    if (!challenger) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const defender = await db.student.findFirst({
        where: { id: defenderId, classId },
        select: {
            id: true,
            name: true,
            behaviorPoints: true,
            gold: true,
            inventory: true,
            battleLoadout: true,
        },
    });
    if (!defender) return NextResponse.json({ error: "DEFENDER_NOT_FOUND" }, { status: 404 });

    const negamon = getNegamonSettings(classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) {
        return NextResponse.json({ error: "NEGAMON_DISABLED" }, { status: 400 });
    }

    const levelConfig = classroom.levelConfig as LevelConfigInput;

    const challengerMonster = getStudentMonsterState(
        challengerId,
        challenger.behaviorPoints,
        levelConfig,
        negamon
    );
    const defenderMonster = getStudentMonsterState(
        defenderId,
        defender.behaviorPoints,
        levelConfig,
        negamon
    );

    if (!challengerMonster || !defenderMonster) {
        return NextResponse.json({ error: "NO_MONSTER" }, { status: 400 });
    }

    const chInv = Array.isArray(challenger.inventory) ? (challenger.inventory as string[]) : [];
    const defInv = Array.isArray(defender.inventory) ? (defender.inventory as string[]) : [];

    if (mode === "beginInteractive" || mode === "turnInteractive" || mode === "saveInteractive") {
        return NextResponse.json(
            { error: "NEGAMON_LEGACY_BATTLE_REMOVED" },
            { status: 410 }
        );
    }

    const abuseLimit = await enforceBattleStartAbuseLimits({
        classId,
        challengerId,
    });
    if (abuseLimit) return abuseLimit;

    const chPreset = normalizeDefenderLoadout(challenger.battleLoadout, chInv);
    const defPreset = normalizeDefenderLoadout(defender.battleLoadout, defInv);
    const chIds = chPreset.ids;
    const defIds = defPreset.ids;

    const f1 = initBattleFighter(challengerMonster, challengerId, challenger.name, chIds);
    const f2 = initBattleFighter(defenderMonster, defenderId, defender.name, defIds);

    const result = resolveBattle(f1, f2);

    let nextChInv: string[];
    try {
        nextChInv = removeBattleItemsFromInventory([...chInv], chIds);
    } catch {
        return NextResponse.json({ error: "INVENTORY_MISMATCH" }, { status: 409 });
    }
    let nextDefInv: string[];
    try {
        nextDefInv = removeBattleItemsFromInventory([...defInv], defIds);
    } catch {
        return NextResponse.json({ error: "INVENTORY_MISMATCH" }, { status: 409 });
    }

    const completed = await db.$transaction(async (tx) => {
        const payoutPolicy = await resolveBattleRewardPayout(tx, {
            classId,
            winnerId: result.winnerId,
            challengerId,
            defenderId,
            requestedGold: result.goldReward,
        });
        const resultForSave = {
            ...result,
            requestedGoldReward: result.goldReward,
            goldReward: payoutPolicy.goldReward,
            rewardBlockedReason: payoutPolicy.rewardBlockedReason,
            rewardPolicy: payoutPolicy,
        };

        await tx.student.update({
            where: { id: challengerId },
            data: {
                inventory: nextChInv,
                battleLoadout: sanitizeLoadoutAgainstInventory(chIds, nextChInv),
            },
        });
        await tx.student.update({
            where: { id: defenderId },
            data: {
                inventory: nextDefInv,
                battleLoadout: sanitizeLoadoutAgainstInventory(defIds, nextDefInv),
            },
        });
        const session = await tx.battleSession.create({
            data: {
                classId,
                challengerId,
                defenderId,
                result: resultForSave,
                winnerId: result.winnerId,
                goldReward: payoutPolicy.goldReward,
                interactivePending: false,
                challengerBattleItems: chIds,
                defenderBattleItems: defIds,
            },
        });
        const winner = await tx.student.update({
            where: { id: result.winnerId },
            data: { gold: { increment: payoutPolicy.goldReward } },
            select: { gold: true },
        });
        if (payoutPolicy.goldReward > 0) {
            const winnerBalanceBefore = winner.gold - payoutPolicy.goldReward;
            await recordEconomyTransaction(tx, {
                studentId: result.winnerId,
                classId,
                type: "earn",
                source: "battle",
                amount: payoutPolicy.goldReward,
                balanceBefore: winnerBalanceBefore,
                balanceAfter: winner.gold,
                sourceRefId: session.id,
                idempotencyKey: `battle:${session.id}:reward`,
                metadata: {
                    mode: "auto",
                    winnerId: result.winnerId,
                    challengerId,
                    defenderId,
                    requestedGoldReward: result.goldReward,
                    goldReward: payoutPolicy.goldReward,
                    totalTurns: result.totalTurns,
                    rewardPolicy: payoutPolicy,
                    challengerBattleItems: chIds,
                    defenderBattleItems: defIds,
                },
            });
        }
        return session;
    });

    return NextResponse.json({ sessionId: completed.id, result: completed.result });
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
            challengerId: true,
            defenderId: true,
            winnerId: true,
            goldReward: true,
            createdAt: true,
        },
    });

    const historyStudentId = auth.scope === "student" ? auth.studentId : studentId;
    const gameHistory = historyStudentId
        ? sessions.map((session) =>
              createBattleHistorySummary({
                  id: session.id,
                  classId,
                  studentId: historyStudentId,
                  challengerId: session.challengerId,
                  defenderId: session.defenderId,
                  winnerId: session.winnerId,
                  goldReward: session.goldReward,
                  createdAt: session.createdAt,
              })
          )
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
        studentNames,
        gameHistory,
        gameHistoryAnalytics: aggregateGameHistoryAnalytics(gameHistory),
    });
}
