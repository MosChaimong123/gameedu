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

type QuestType = "daily" | "weekly" | "challenge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveStudent(code: string): Promise<any | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db.student as any).findFirst({
        where: { OR: getStudentLoginCodeVariants(code).map((c: string) => ({ loginCode: c })) },
        select: {
            id: true,
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
        const newGold = student.gold + goldEarned;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.student as any).update({
            where: { id: student.id },
            data: {
                gold: newGold,
                dailyQuestsClaimed: {
                    date: todayDateKey(),
                    claimed: [...claimedIds, questId],
                },
            },
        });
        return NextResponse.json({ ok: true, newGold, goldEarned });
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
        const newGold = student.gold + goldEarned;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.student as any).update({
            where: { id: student.id },
            data: {
                gold: newGold,
                weeklyQuestsClaimed: {
                    weekKey: thisWeekKey(),
                    claimed: [...claimedIds, questId],
                },
            },
        });
        return NextResponse.json({ ok: true, newGold, goldEarned });
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
        const newGold = student.gold + goldEarned;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.student as any).update({
            where: { id: student.id },
            data: {
                gold: newGold,
                challengeQuestsClaimed: [...claimedIds, questId],
            },
        });
        return NextResponse.json({ ok: true, newGold, goldEarned });
    }

    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
}
