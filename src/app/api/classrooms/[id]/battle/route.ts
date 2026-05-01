/**
 * POST /api/classrooms/[id]/battle
 * - mode "beginInteractive" — validate loadouts, create pending session, return fighters + sessionId
 * - mode "turnInteractive" — resolve one server-owned interactive turn and finalize when fainted
 * - mode "saveInteractive" — reject legacy client-reported interactive saves
 * - default — auto-resolve battle using each student's battleLoadout; consume items; save session
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    getNegamonSettings,
    getStudentMonsterState,
} from "@/lib/classroom-utils";
import type { LevelConfigInput } from "@/lib/classroom-utils";
import {
    calcGoldReward,
    initBattleFighter,
    makePRNG,
    resolveBattle,
    resolveServerOwnedInteractiveTurn,
    type BattleFighter,
    type TurnEvent,
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

const INTERACTIVE_SESSION_TTL_MS = 45 * 60 * 1000;
const BATTLE_START_RATE_WINDOW_MS = 60 * 1000;
const MAX_BATTLE_STARTS_PER_WINDOW = 8;
const MAX_PENDING_INTERACTIVE_SESSIONS = 3;

type InteractiveServerState = {
    mode: "interactive_server";
    seed: number;
    rngCursor: number;
    player: BattleFighter;
    opponent: BattleFighter;
    turns: TurnEvent[][];
    totalTurns: number;
    status: "active" | "finished";
    winnerId?: string;
    requestedGoldReward?: number;
    goldReward?: number;
    rewardBlockedReason?: string | null;
};

function createBattleSeed(...parts: Array<string | number>): number {
    const raw = parts.join(":");
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
        hash ^= raw.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function cloneFighter(fighter: BattleFighter): BattleFighter {
    return JSON.parse(JSON.stringify(fighter)) as BattleFighter;
}

function makeCountingRng(seed: number, cursor: number) {
    const base = makePRNG(seed);
    for (let i = 0; i < cursor; i += 1) base();
    let used = 0;
    return {
        rng: () => {
            used += 1;
            return base();
        },
        getCursor: () => cursor + used,
    };
}

function parseInteractiveServerState(raw: unknown): InteractiveServerState | null {
    if (!raw || typeof raw !== "object") return null;
    const state = raw as Partial<InteractiveServerState>;
    if (state.mode !== "interactive_server") return null;
    if (!state.player || !state.opponent || typeof state.seed !== "number") return null;
    return {
        mode: "interactive_server",
        seed: state.seed,
        rngCursor: typeof state.rngCursor === "number" ? state.rngCursor : 0,
        player: state.player,
        opponent: state.opponent,
        turns: Array.isArray(state.turns) ? state.turns : [],
        totalTurns: typeof state.totalTurns === "number" ? state.totalTurns : 0,
        status: state.status === "finished" ? "finished" : "active",
        winnerId: state.winnerId,
        requestedGoldReward: state.requestedGoldReward,
        goldReward: state.goldReward,
        rewardBlockedReason: state.rewardBlockedReason,
    };
}

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
    mode: "beginInteractive" | "auto";
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

    if (input.mode === "beginInteractive") {
        const pendingCount = await db.battleSession.count({
            where: {
                classId: input.classId,
                challengerId: input.challengerId,
                interactivePending: true,
                createdAt: { gte: new Date(now - INTERACTIVE_SESSION_TTL_MS) },
            },
        });
        if (pendingCount >= MAX_PENDING_INTERACTIVE_SESSIONS) {
            return NextResponse.json(
                {
                    error: "INTERACTIVE_SESSION_LIMIT",
                    maxPendingSessions: MAX_PENDING_INTERACTIVE_SESSIONS,
                },
                { status: 429 }
            );
        }
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
        mode?: "beginInteractive" | "turnInteractive" | "saveInteractive";
        moveId?: string;
        challengerLoadout?: unknown;
        sessionId?: string;
        winnerId?: string;
        goldReward?: number;
        totalTurns?: number;
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

    // ── beginInteractive ──
    if (mode === "beginInteractive") {
        const abuseLimit = await enforceBattleStartAbuseLimits({
            classId,
            challengerId,
            mode: "beginInteractive",
        });
        if (abuseLimit) return abuseLimit;

        const challengerLoadout = normalizeLoadoutInput(body.challengerLoadout);
        const chVal = validateBattleLoadout(challengerLoadout, chInv);
        if (!chVal.ok) {
            return NextResponse.json(
                { error: "INVALID_LOADOUT", code: chVal.code, message: chVal.message },
                { status: 400 }
            );
        }

        const { ids: defenderIds } = normalizeDefenderLoadout(defender.battleLoadout, defInv);

        const f1 = initBattleFighter(challengerMonster, challengerId, challenger.name, chVal.normalizedIds);
        const f2 = initBattleFighter(defenderMonster, defenderId, defender.name, defenderIds);

        const maxGoldIfChallengerWins = calcGoldReward(f1, f2);
        const maxGoldIfDefenderWins = calcGoldReward(f2, f1);
        const seed = createBattleSeed(classId, challengerId, defenderId, studentCode);
        const serverState: InteractiveServerState = {
            mode: "interactive_server",
            seed,
            rngCursor: 0,
            player: cloneFighter(f1),
            opponent: cloneFighter(f2),
            turns: [],
            totalTurns: 0,
            status: "active",
        };

        const session = await db.battleSession.create({
            data: {
                classId,
                challengerId,
                defenderId,
                result: serverState,
                winnerId: null,
                goldReward: 0,
                interactivePending: true,
                challengerBattleItems: chVal.normalizedIds,
                defenderBattleItems: defenderIds,
                maxGoldIfChallengerWins,
                maxGoldIfDefenderWins,
            },
        });

        return NextResponse.json({
            sessionId: session.id,
            player: f1,
            opponent: f2,
        });
    }

    if (mode === "turnInteractive") {
        const { sessionId, moveId } = body;
        if (!sessionId) {
            return NextResponse.json({ error: "INVALID_TURN" }, { status: 400 });
        }

        const session = await db.battleSession.findFirst({
            where: {
                id: sessionId,
                classId,
                challengerId,
                defenderId,
                interactivePending: true,
            },
        });
        if (!session) {
            return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
        }
        const sessionStateVersion = session.stateVersion ?? 0;

        if (Date.now() - session.createdAt.getTime() > INTERACTIVE_SESSION_TTL_MS) {
            const expired = await db.battleSession.updateMany({
                where: { id: sessionId, interactivePending: true, stateVersion: sessionStateVersion },
                data: {
                    interactivePending: false,
                    result: {
                        mode: "interactive_expired",
                        expiredAt: new Date().toISOString(),
                        previousResult: session.result,
                    },
                    stateVersion: { increment: 1 },
                },
            });
            if (expired.count !== 1) {
                return NextResponse.json({ error: "TURN_CONFLICT" }, { status: 409 });
            }
            return NextResponse.json({ error: "INTERACTIVE_SESSION_EXPIRED" }, { status: 410 });
        }

        const state = parseInteractiveServerState(session.result);
        if (!state || state.status !== "active") {
            return NextResponse.json({ error: "INVALID_SESSION_STATE" }, { status: 409 });
        }

        const player = cloneFighter(state.player);
        const opponent = cloneFighter(state.opponent);
        const { rng, getCursor } = makeCountingRng(state.seed, state.rngCursor);
        const turn = resolveServerOwnedInteractiveTurn(player, opponent, moveId, rng);
        if (turn.actorSide === "player" && !moveId) {
            return NextResponse.json(
                { error: "PLAYER_ACTION_REQUIRED", actorSide: "player" },
                { status: 409 }
            );
        }
        const events = turn.events;
        const faintedId = turn.faintedId;

        const nextTotalTurns = state.totalTurns + 1;
        const nextState: InteractiveServerState = {
            ...state,
            player,
            opponent,
            rngCursor: getCursor(),
            turns: [...state.turns, events],
            totalTurns: nextTotalTurns,
        };

        if (!faintedId) {
            const saved = await db.battleSession.updateMany({
                where: { id: sessionId, interactivePending: true, stateVersion: sessionStateVersion },
                data: {
                    result: nextState,
                    stateVersion: { increment: 1 },
                },
            });
            if (saved.count !== 1) {
                return NextResponse.json({ error: "TURN_CONFLICT" }, { status: 409 });
            }
            return NextResponse.json({
                events,
                faintedId: null,
                player,
                opponent,
                totalTurns: nextTotalTurns,
                actorSide: turn.actorSide,
                final: null,
            });
        }

        const winner = player.currentHp > 0 ? player : opponent;
        const loser = player.currentHp > 0 ? opponent : player;
        const requestedGold = calcGoldReward(winner, loser);

        const chFresh = await db.student.findUnique({
            where: { id: challengerId },
            select: { gold: true, inventory: true, battleLoadout: true },
        });
        const defFresh = await db.student.findUnique({
            where: { id: defenderId },
            select: { gold: true, inventory: true, battleLoadout: true },
        });
        if (!chFresh || !defFresh) {
            return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
        }

        let nextChInv: string[];
        try {
            nextChInv = removeBattleItemsFromInventory(
                Array.isArray(chFresh.inventory) ? (chFresh.inventory as string[]) : [],
                session.challengerBattleItems
            );
        } catch {
            return NextResponse.json({ error: "INVENTORY_MISMATCH" }, { status: 409 });
        }
        let nextDefInv: string[];
        try {
            nextDefInv = removeBattleItemsFromInventory(
                Array.isArray(defFresh.inventory) ? (defFresh.inventory as string[]) : [],
                session.defenderBattleItems
            );
        } catch {
            return NextResponse.json({ error: "INVENTORY_MISMATCH" }, { status: 409 });
        }

        let final: {
            winnerId: string;
            requestedGoldReward: number;
            goldReward: number;
            rewardBlockedReason: string | null;
            rewardPolicy: Awaited<ReturnType<typeof resolveBattleRewardPayout>>;
        };
        try {
            final = await db.$transaction(async (tx) => {
                const payoutPolicy = await resolveBattleRewardPayout(tx, {
                    classId,
                    winnerId: winner.studentId,
                    challengerId,
                    defenderId,
                    requestedGold,
                });
                const finalState: InteractiveServerState = {
                    ...nextState,
                    status: "finished",
                    winnerId: winner.studentId,
                    requestedGoldReward: requestedGold,
                    goldReward: payoutPolicy.goldReward,
                };
                const finalResult = {
                    ...finalState,
                    rewardBlockedReason: payoutPolicy.rewardBlockedReason,
                    rewardPolicy: payoutPolicy,
                };

                const finalized = await tx.battleSession.updateMany({
                    where: { id: sessionId, interactivePending: true, stateVersion: sessionStateVersion },
                    data: {
                        interactivePending: false,
                        winnerId: winner.studentId,
                        goldReward: payoutPolicy.goldReward,
                        result: finalResult,
                        stateVersion: { increment: 1 },
                    },
                });
                if (finalized.count !== 1) {
                    throw new Error("TURN_CONFLICT");
                }

                await tx.student.update({
                    where: { id: challengerId },
                    data: {
                        inventory: nextChInv,
                        battleLoadout: sanitizeLoadoutAgainstInventory(
                            Array.isArray(chFresh.battleLoadout) ? (chFresh.battleLoadout as string[]) : [],
                            nextChInv
                        ),
                    },
                });
                await tx.student.update({
                    where: { id: defenderId },
                    data: {
                        inventory: nextDefInv,
                        battleLoadout: sanitizeLoadoutAgainstInventory(
                            Array.isArray(defFresh.battleLoadout) ? (defFresh.battleLoadout as string[]) : [],
                            nextDefInv
                        ),
                    },
                });
                const winnerBalanceBefore = winner.studentId === challengerId ? chFresh.gold : defFresh.gold;
                const updatedWinner = await tx.student.update({
                    where: { id: winner.studentId },
                    data: { gold: { increment: payoutPolicy.goldReward } },
                    select: { gold: true },
                });
                if (payoutPolicy.goldReward > 0) {
                    await recordEconomyTransaction(tx, {
                        studentId: winner.studentId,
                        classId,
                        type: "earn",
                        source: "battle",
                        amount: payoutPolicy.goldReward,
                        balanceBefore: winnerBalanceBefore,
                        balanceAfter: updatedWinner.gold,
                        sourceRefId: sessionId,
                        idempotencyKey: `battle:${sessionId}:reward`,
                        metadata: {
                            mode: "interactive_server",
                            winnerId: winner.studentId,
                            challengerId,
                            defenderId,
                            requestedGoldReward: requestedGold,
                            goldReward: payoutPolicy.goldReward,
                            totalTurns: nextTotalTurns,
                            rewardPolicy: payoutPolicy,
                            challengerBattleItems: session.challengerBattleItems,
                            defenderBattleItems: session.defenderBattleItems,
                        },
                    });
                }

                return {
                    winnerId: winner.studentId,
                    requestedGoldReward: requestedGold,
                    goldReward: payoutPolicy.goldReward,
                    rewardBlockedReason: payoutPolicy.rewardBlockedReason,
                    rewardPolicy: payoutPolicy,
                };
            });
        } catch (error) {
            if (error instanceof Error && error.message === "TURN_CONFLICT") {
                return NextResponse.json({ error: "TURN_CONFLICT" }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({
            events,
            faintedId,
            player,
            opponent,
            totalTurns: nextTotalTurns,
            actorSide: turn.actorSide,
            final,
        });
    }

    // ── saveInteractive ──
    if (mode === "saveInteractive") {
        return NextResponse.json(
            { error: "SERVER_AUTHORITATIVE_REQUIRED" },
            { status: 410 }
        );
    }

    // ── default: auto-resolve (uses battleLoadout presets) ──
    const abuseLimit = await enforceBattleStartAbuseLimits({
        classId,
        challengerId,
        mode: "auto",
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
        const winnerBalanceBefore = result.winnerId === challengerId ? challenger.gold : defender.gold;
        if (payoutPolicy.goldReward > 0) {
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

    return NextResponse.json({ sessions, studentNames });
}
