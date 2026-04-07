import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { sumAcademicTotal } from "@/lib/academic-score";
import { getRankEntry, type LevelConfigInput } from "@/lib/classroom-utils";
import { calcGoldRateBonus } from "@/lib/negamon-passives";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { getActiveGoldMultiplier } from "@/lib/classroom-utils";

type ClaimPassiveGoldDeps = {

    db: PrismaClient;
    now: () => Date;
};

export type ClaimPassiveGoldResult =
    | {
        ok: false;
        reason: "not_found";
    }
    | {
        ok: true;
        alreadyClaimed: boolean;
        goldEarned: number;
        goldRate: number;
        newGold: number;
        lastGoldAt: string | null;
      };

export async function claimPassiveGold(
    code: string,
    deps: ClaimPassiveGoldDeps = { db, now: () => new Date() }
): Promise<ClaimPassiveGoldResult> {
    const student = await deps.db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
        },
        select: {
            id: true,
            gold: true,
            createdAt: true,
            lastGoldAt: true,
            negamonSkills: true,
            classroom: {
                select: {
                    levelConfig: true,
                    gamifiedSettings: true,
                    assignments: {
                        select: {
                            id: true,
                            type: true,
                            checklists: true,
                        },
                    },
                },
            },
            submissions: {
                select: {
                    assignmentId: true,
                    score: true,
                },
            },
        },
    });

    if (!student) {
        return { ok: false, reason: "not_found" };
    }

    const academicTotal = sumAcademicTotal(student.classroom.assignments, student.submissions);
    const rankEntry = getRankEntry(academicTotal, student.classroom.levelConfig as LevelConfigInput);
    const negamonSkills = (student.negamonSkills as string[]) ?? [];
    
    // Base rate from rank + bonuses
    const baseGoldRate = (rankEntry.goldRate ?? 0) + calcGoldRateBonus(negamonSkills);
    
    // Multiplier from Active Events
    const multiplier = getActiveGoldMultiplier(student.classroom.gamifiedSettings);
    const goldRate = baseGoldRate * multiplier;

    if (goldRate <= 0) {
        return {
            ok: true,
            alreadyClaimed: true,
            goldEarned: 0,
            goldRate,
            newGold: student.gold ?? 0,
            lastGoldAt: student.lastGoldAt instanceof Date ? student.lastGoldAt.toISOString() : null,
        };
    }

    const now = deps.now();
    const since = student.lastGoldAt ?? student.createdAt ?? now;
    const hoursSince = Math.min(72, Math.max(0, (now.getTime() - since.getTime()) / 3_600_000));
    
    // Calculation: (Base * Hours) * Multiplier? 
    // Usually it's easier to just multiply the rate.
    const goldEarned = Math.floor(goldRate * hoursSince);

    if (goldEarned <= 0) {
        return {
            ok: true,
            alreadyClaimed: true,
            goldEarned: 0,
            goldRate,
            newGold: student.gold ?? 0,
            lastGoldAt: student.lastGoldAt instanceof Date ? student.lastGoldAt.toISOString() : null,
        };
    }

    const updated = await deps.db.student.update({
        where: { id: student.id },
        data: {
            gold: { increment: goldEarned },
            lastGoldAt: now,
        },
        select: {
            gold: true,
            lastGoldAt: true,
        },
    });

    return {
        ok: true,
        alreadyClaimed: false,
        goldEarned,
        goldRate,
        newGold: updated.gold,
        lastGoldAt: updated.lastGoldAt instanceof Date ? updated.lastGoldAt.toISOString() : null,
    };
}
