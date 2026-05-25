import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { getActiveGoldMultiplier, getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { createGameRewardResult, type GameHistoryEvent, type GameRewardResult } from "@/lib/game-core";
import {
    applyNegamonProgressionReward,
    createNegamonLearningRewardFinalizationPlan,
    createNegamonMonsterSnapshot,
    createPointHistoryRowsFromLearningRewardEvents,
    type NegamonProgressionPersistencePlan,
} from "@/lib/game-negamon";
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
        reward: GameRewardResult;
        progression: NegamonProgressionPersistencePlan | null;
        historyEvents: GameHistoryEvent[];
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

function buildLastCheckInGuard(studentId: string, lastCheckIn: Date | null) {
    if (lastCheckIn) {
        return { id: studentId, lastCheckIn };
    }

    return {
        id: studentId,
        OR: [{ lastCheckIn: null }, { lastCheckIn: { isSet: false } }],
    };
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
            name: true,
            gold: true,
            behaviorPoints: true,
            negamonSkills: true,
            lastCheckIn: true,
            streak: true,
            classroom: {
                select: {
                    gamifiedSettings: true,
                    levelConfig: true,
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
    const rewardId = `checkin:${student.id}:${bangkokDateKey(now)}`;
    const negamon = getNegamonSettings(student.classroom.gamifiedSettings);
    const currentSkills = Array.isArray(student.negamonSkills)
        ? (student.negamonSkills as string[])
        : [];
    const expReward = negamon?.enabled ? Math.max(0, Math.floor(negamon.expPerAttendance ?? 0)) : 0;

    return deps.db.$transaction(async (tx) => {
        const updatedCount = await tx.student.updateMany({
            where: buildLastCheckInGuard(student.id, student.lastCheckIn),
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

        const pointDelta =
            expReward <= 0 || !negamon
                ? 0
                : Math.ceil(expReward / Math.max(1, Math.floor(negamon.expPerPoint ?? 6)));
        const monsterBefore =
            negamon && expReward > 0
                ? createNegamonMonsterSnapshot({
                      studentId: student.id,
                      studentName: student.name,
                      points: Math.max(0, Math.floor(student.behaviorPoints ?? 0)),
                      levelConfig: student.classroom.levelConfig as LevelConfigInput,
                      negamonSettings: negamon,
                      equippedSkillIds: currentSkills,
                  })
                : null;
        const monsterAfter =
            negamon && expReward > 0
                ? createNegamonMonsterSnapshot({
                      studentId: student.id,
                      studentName: student.name,
                      points: Math.max(0, Math.floor(student.behaviorPoints ?? 0)) + pointDelta,
                      levelConfig: student.classroom.levelConfig as LevelConfigInput,
                      negamonSettings: negamon,
                      equippedSkillIds: currentSkills,
                  })
                : null;
        const rewardPlan =
            monsterBefore && monsterAfter
                ? createNegamonLearningRewardFinalizationPlan({
                      source: "attendance",
                      sourceId: rewardId,
                      studentId: student.id,
                      classId: student.classId,
                      monsterBefore,
                      goldReward: goldEarned,
                      expReward,
                      rankIndexAfter: monsterAfter.rankIndex,
                      unlockedSkillIdsAfter: monsterAfter.unlockedSkillIds,
                      createdAt: now,
                  })
                : null;
        const progressionResult =
            rewardPlan?.ok
                ? await applyNegamonProgressionReward({
                      studentId: student.id,
                      student: {
                          behaviorPoints: Math.max(0, Math.floor(student.behaviorPoints ?? 0)),
                          negamonSkills: currentSkills,
                      },
                      progression: rewardPlan.progression,
                      expPerPoint: negamon?.expPerPoint,
                      canonicalUnlockedSkillIdsBefore: monsterBefore?.unlockedSkillIds ?? [],
                      studentDelegate: tx.student,
                  })
                : null;
        const historyRows =
            rewardPlan && progressionResult?.plan
                ? createPointHistoryRowsFromLearningRewardEvents({
                      studentId: student.id,
                      source: "attendance",
                      sourceId: rewardId,
                      behaviorPointDelta: progressionResult.plan.behaviorPointDelta,
                      historyEvents: rewardPlan.historyEvents,
                  })
                : [];
        if (historyRows.length > 0) {
            await tx.pointHistory.createMany({ data: historyRows });
        }

        await recordEconomyTransaction(tx, {
            studentId: student.id,
            classId: student.classId,
            type: "earn",
            source: "checkin",
            amount: goldEarned,
            balanceBefore: updated.gold - goldEarned,
            balanceAfter: updated.gold,
            idempotencyKey: rewardId,
            metadata: {
                streak: newStreak,
                baseGold,
                bonusGold,
                eventMultiplier: multiplier,
                checkInDate: bangkokDateKey(now),
                rewardIdempotencyKey: rewardPlan?.idempotencyKey,
                expReward,
            },
        });

        return {
            ok: true,
            success: true,
            goldEarned,
            bonusGold,
            streak: updated.streak,
            newGold: updated.gold,
            reward:
                rewardPlan?.reward ??
                createGameRewardResult({
                    gold: goldEarned,
                    idempotencyKey: rewardId,
                }),
            progression: progressionResult?.plan ?? null,
            historyEvents: rewardPlan?.historyEvents ?? [],
        };
    });
}
