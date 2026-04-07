import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { calcCheckinBonus, hasStreakShield } from "@/lib/negamon-passives";
import { getActiveGoldMultiplier } from "@/lib/classroom-utils";

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function streakReward(streak: number): number {
    if (streak >= 7) return 20;
    if (streak >= 2) return 10;
    return 5;
}

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    const student = await db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((c) => ({ loginCode: c })),
        },
        select: { 
            id: true, 
            lastCheckIn: true, 
            streak: true, 
            negamonSkills: true,
            classroom: {
                select: {
                    gamifiedSettings: true
                }
            }
        },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();
    const last = student.lastCheckIn ? new Date(student.lastCheckIn) : null;
    const skills = (student.negamonSkills as string[]) ?? [];

    if (last && isSameDay(last, now)) {
        return NextResponse.json({ alreadyDone: true }, { status: 200 });
    }

    // Streak logic
    let newStreak = 1;
    if (last) {
        const ms = Math.abs(now.getTime() - last.getTime());
        const days = Math.floor(ms / 86_400_000);
        if (days === 1) {
            newStreak = (student.streak ?? 0) + 1;
        } else if (days === 2 && hasStreakShield(skills)) {
            newStreak = (student.streak ?? 0) + 1;
        }
    }

    const baseGold = streakReward(newStreak);
    const bonusGold = calcCheckinBonus(skills);
    
    // Apply Multiplier
    const multiplier = getActiveGoldMultiplier(student.classroom.gamifiedSettings);
    const goldEarned = Math.floor((baseGold + bonusGold) * multiplier);

    const updated = await db.student.update({
        where: { id: student.id },
        data: {
            lastCheckIn: now,
            streak: newStreak,
            gold: { increment: goldEarned },
        },
        select: { gold: true, streak: true },
    });

    return NextResponse.json({
        success: true,
        goldEarned,
        bonusGold,
        streak: updated.streak,
        newGold: updated.gold,
    });
}
