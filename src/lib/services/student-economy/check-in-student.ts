import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { getActiveGoldMultiplier } from "@/lib/classroom-utils";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";

type CheckInStudentDeps = {
    db: PrismaClient;
    now: () => Date;
};

export type CheckInStudentResult =
    | { ok: false; reason: "not_found" }
    | { ok: true; alreadyDone: true }
    | {
        ok: true;
        success: true;
        goldEarned: number;
        bonusGold: number;
        streak: number;
        newGold: number;
      };

function bangkokDateKey(date: Date): string {
    const bkk = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return bkk.toISOString().slice(0, 10);
}

function isSameBangkokDay(a: Date, b: Date): boolean {
    return bangkokDateKey(a) === bangkokDateKey(b);
}

function bangkokDayNumber(date: Date): number {
    const [year, month, day] = bangkokDateKey(date).split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function bangkokCalendarDayDiff(from: Date, to: Date): number {
    return bangkokDayNumber(to) - bangkokDayNumber(from);
}

function streakReward(streak: number): number {
    if (streak >= 7) return 20;
    if (streak >= 2) return 10;
    return 5;
}

export async function checkInStudent(
    code: string,
    deps: CheckInStudentDeps = { db, now: () => new Date() }
): Promise<CheckInStudentResult> {
    const student = await deps.db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
        },
        select: {
            id: true,
            classId: true,
            gold: true,
            lastCheckIn: true,
            streak: true,
            classroom: {
                select: {
                    gamifiedSettings: true,
                },
            },
        },
    });

    if (!student) {
        return { ok: false, reason: "not_found" };
    }

    const now = deps.now();
    const last = student.lastCheckIn ? new Date(student.lastCheckIn) : null;
    if (last && isSameBangkokDay(last, now)) {
        return { ok: true, alreadyDone: true };
    }

    let newStreak = 1;
    if (last) {
        const days = bangkokCalendarDayDiff(last, now);
        if (days === 1) {
            newStreak = (student.streak ?? 0) + 1;
        }
    }

    const baseGold = streakReward(newStreak);
    const bonusGold = 0;
    const multiplier = getActiveGoldMultiplier(student.classroom.gamifiedSettings);
    const goldEarned = Math.floor((baseGold + bonusGold) * multiplier);

    return deps.db.$transaction(async (tx) => {
        const updatedCount = await tx.student.updateMany({
            where: {
                id: student.id,
                lastCheckIn: student.lastCheckIn ?? null,
            },
            data: {
                lastCheckIn: now,
                streak: newStreak,
                gold: { increment: goldEarned },
            },
        });

        if (updatedCount.count !== 1) {
            return { ok: true, alreadyDone: true };
        }

        const updated = await tx.student.findUniqueOrThrow({
            where: { id: student.id },
            select: { gold: true, streak: true },
        });

        await recordEconomyTransaction(tx, {
            studentId: student.id,
            classId: student.classId,
            type: "earn",
            source: "checkin",
            amount: goldEarned,
            balanceBefore: student.gold,
            balanceAfter: updated.gold,
            idempotencyKey: `checkin:${student.id}:${bangkokDateKey(now)}`,
            metadata: {
                streak: newStreak,
                baseGold,
                bonusGold,
                eventMultiplier: multiplier,
                checkInDate: bangkokDateKey(now),
            },
        });

        return {
            ok: true,
            success: true,
            goldEarned,
            bonusGold,
            streak: updated.streak,
            newGold: updated.gold,
        };
    });
}
