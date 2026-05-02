import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import {
    buildQuestStatuses,
    getClaimedToday,
    todayDateKey,
    DAILY_QUESTS,
    isQuestCompleted,
    type QuestId,
    type QuestStatus,
} from "@/lib/daily-quests";
import {
    buildWeeklyQuestStatuses,
    buildChallengeQuestStatuses,
    getWeeklyClaimedThisWeek,
    getChallengeClaimedAll,
    thisWeekKey,
    isWeeklyQuestCompleted,
    isChallengeQuestCompleted,
    WEEKLY_QUESTS,
    CHALLENGE_QUESTS,
    type WeeklyQuestId,
    type ChallengeQuestId,
} from "@/lib/quest-system";
import { getActiveGoldMultiplier } from "@/lib/classroom-utils";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";

type QuestType = "daily" | "weekly" | "challenge";
type ClaimField = "dailyQuestsClaimed" | "weeklyQuestsClaimed" | "challengeQuestsClaimed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveStudent(code: string): Promise<any | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db.student as any).findFirst({
        where: { OR: getStudentLoginCodeVariants(code).map((c: string) => ({ loginCode: c })) },
        select: {
            id: true,
            classId: true,
            loginCode: true,
            streak: true,
            lastCheckIn: true,
            gold: true,
            inventory: true,
            dailyQuestsClaimed: true,
            weeklyQuestsClaimed: true,
            challengeQuestsClaimed: true,
            classroom: {
                select: {
                    gamifiedSettings: true
                }
            },
            submissions: {
                select: { id: true, submittedAt: true },
            },
        },
    });
}

async function persistQuestClaim(params: {
    student: {
        id: string;
        classId: string | null;
        gold: number;
        dailyQuestsClaimed?: unknown;
        weeklyQuestsClaimed?: unknown;
        challengeQuestsClaimed?: unknown;
    };
    questType: QuestType;
    questId: string;
    field: ClaimField;
    nextClaimed: unknown;
    goldEarned: number;
    idempotencyKey: string;
    metadata: Record<string, unknown>;
}) {
    const { student, field, nextClaimed, goldEarned } = params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any).$transaction(async (tx: any) => {
        const updatedCount = await tx.student.updateMany({
            where: {
                id: student.id,
                // Prisma JSON fields in `where` must use JsonFilter (`equals` / `not` / `isSet`)
                [field]: { equals: student[field] ?? null },
            },
            data: {
                gold: { increment: goldEarned },
                [field]: nextClaimed,
            },
        });

        if (updatedCount.count !== 1) {
            return { ok: false as const, reason: "ALREADY_CLAIMED" as const };
        }

        const updated = await tx.student.findUniqueOrThrow({
            where: { id: student.id },
            select: { gold: true },
        });

        await recordEconomyTransaction(tx, {
            studentId: student.id,
            classId: student.classId,
            type: "earn",
            source: "quest",
            amount: goldEarned,
            balanceBefore: student.gold,
            balanceAfter: updated.gold,
            idempotencyKey: params.idempotencyKey,
            metadata: {
                questType: params.questType,
                questId: params.questId,
                ...params.metadata,
            },
        });

        return { ok: true as const, newGold: updated.gold };
    });
}

/** GET — ดึง quest status ทุกประเภท */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const student = await resolveStudent(code);
    if (!student) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0) - 7 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    // Daily
    const dailyClaimedIds = getClaimedToday(student.dailyQuestsClaimed);
    const checkInput = {
        streak: student.streak,
        lastCheckIn: student.lastCheckIn,
        hasSubmitToday: student.submissions.some(
            (s: { submittedAt: Date | null }) =>
                s.submittedAt && new Date(s.submittedAt) >= todayStart
        ),
    };
    const daily = buildQuestStatuses(checkInput, dailyClaimedIds);

    // Weekly
    const weeklyClaimedIds = getWeeklyClaimedThisWeek(student.weeklyQuestsClaimed);
    const submissionsThisWeek = student.submissions.filter(
        (s: { submittedAt: Date | null }) =>
            s.submittedAt && new Date(s.submittedAt) >= weekStart
    ).length;
    const allDailyClaimedToday =
        daily.length > 0 && daily.every((q: QuestStatus) => q.claimed);
    const weekly = buildWeeklyQuestStatuses(
        { streak: student.streak, submissionsThisWeek, allDailyClaimedToday },
        weeklyClaimedIds
    );

    // Challenge
    const challengeClaimedIds = getChallengeClaimedAll(student.challengeQuestsClaimed);
    const challenge = buildChallengeQuestStatuses(
        {
            streak: student.streak,
            totalSubmissions: student.submissions.length,
            hasItem: student.inventory.length > 0,
        },
        challengeClaimedIds
    );

    return NextResponse.json({ daily, weekly, challenge, gold: student.gold });
}

/** POST — claim รางวัล quest (ทุกประเภท) */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const body = (await req.json()) as { questId: string; questType: QuestType };
    const { questId, questType = "daily" } = body;

    const student = await resolveStudent(code);
    if (!student) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0) - 7 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    
    // Multiplier from Active Events
    const multiplier = getActiveGoldMultiplier(student.classroom.gamifiedSettings);

    if (questType === "daily") {
        const questDef = DAILY_QUESTS.find((q) => q.id === questId);
        if (!questDef) return NextResponse.json({ error: "INVALID_QUEST" }, { status: 400 });

        const claimedIds = getClaimedToday(student.dailyQuestsClaimed);
        if (claimedIds.includes(questId as QuestId))
            return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });

        const completed = isQuestCompleted(questDef.condition, {
            streak: student.streak,
            lastCheckIn: student.lastCheckIn,
            hasSubmitToday: student.submissions.some(
                (s: { submittedAt: Date | null }) =>
                    s.submittedAt && new Date(s.submittedAt) >= todayStart
            ),
        });
        if (!completed) return NextResponse.json({ error: "NOT_COMPLETED" }, { status: 400 });

        const goldEarned = Math.floor(questDef.goldReward * multiplier);
        const claimResult = await persistQuestClaim({
            student,
            questType,
            questId,
            field: "dailyQuestsClaimed",
            nextClaimed: {
                date: todayDateKey(),
                claimed: [...claimedIds, questId],
            },
            goldEarned,
            idempotencyKey: `quest:${student.id}:daily:${todayDateKey()}:${questId}`,
            metadata: {
                baseReward: questDef.goldReward,
                eventMultiplier: multiplier,
                date: todayDateKey(),
            },
        });
        if (!claimResult.ok) return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });
        return NextResponse.json({ ok: true, newGold: claimResult.newGold, goldEarned });
    }

    if (questType === "weekly") {
        const questDef = WEEKLY_QUESTS.find((q) => q.id === questId);
        if (!questDef) return NextResponse.json({ error: "INVALID_QUEST" }, { status: 400 });

        const claimedIds = getWeeklyClaimedThisWeek(student.weeklyQuestsClaimed);
        if (claimedIds.includes(questId as WeeklyQuestId))
            return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });

        const submissionsThisWeek = student.submissions.filter(
            (s: { submittedAt: Date | null }) =>
                s.submittedAt && new Date(s.submittedAt) >= weekStart
        ).length;
        const dailyClaimedToday = getClaimedToday(student.dailyQuestsClaimed);
        const allDailyClaimedToday = dailyClaimedToday.length >= DAILY_QUESTS.length;

        const completed = isWeeklyQuestCompleted(questDef.condition, {
            streak: student.streak,
            submissionsThisWeek,
            allDailyClaimedToday,
        });
        if (!completed) return NextResponse.json({ error: "NOT_COMPLETED" }, { status: 400 });

        const goldEarned = Math.floor(questDef.goldReward * multiplier);
        const weekKey = thisWeekKey();
        const claimResult = await persistQuestClaim({
            student,
            questType,
            questId,
            field: "weeklyQuestsClaimed",
            nextClaimed: {
                weekKey,
                claimed: [...claimedIds, questId],
            },
            goldEarned,
            idempotencyKey: `quest:${student.id}:weekly:${weekKey}:${questId}`,
            metadata: {
                baseReward: questDef.goldReward,
                eventMultiplier: multiplier,
                weekKey,
            },
        });
        if (!claimResult.ok) return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });
        return NextResponse.json({ ok: true, newGold: claimResult.newGold, goldEarned });
    }

    if (questType === "challenge") {
        const questDef = CHALLENGE_QUESTS.find((q) => q.id === questId);
        if (!questDef) return NextResponse.json({ error: "INVALID_QUEST" }, { status: 400 });

        const claimedIds = getChallengeClaimedAll(student.challengeQuestsClaimed);
        if (claimedIds.includes(questId as ChallengeQuestId))
            return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });

        const completed = isChallengeQuestCompleted(questDef.condition, {
            streak: student.streak,
            totalSubmissions: student.submissions.length,
            hasItem: student.inventory.length > 0,
        });
        if (!completed) return NextResponse.json({ error: "NOT_COMPLETED" }, { status: 400 });

        const goldEarned = Math.floor(questDef.goldReward * multiplier);
        const claimResult = await persistQuestClaim({
            student,
            questType,
            questId,
            field: "challengeQuestsClaimed",
            nextClaimed: [...claimedIds, questId],
            goldEarned,
            idempotencyKey: `quest:${student.id}:challenge:${questId}`,
            metadata: {
                baseReward: questDef.goldReward,
                eventMultiplier: multiplier,
            },
        });
        if (!claimResult.ok) return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });
        return NextResponse.json({ ok: true, newGold: claimResult.newGold, goldEarned });
    }

    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
}
