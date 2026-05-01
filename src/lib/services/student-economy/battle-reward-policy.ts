import type { Prisma, PrismaClient } from "@prisma/client";

type BattleRewardPolicyDb = Pick<PrismaClient, "battleSession"> | Prisma.TransactionClient;

export const DAILY_BATTLE_REWARD_CAP = 5;
export const BATTLE_PAIR_REWARD_COOLDOWN_HOURS = 6;

export type BattleRewardPayout = {
    goldReward: number;
    rewardBlockedReason: "daily_cap" | "pair_cooldown" | null;
    dailyRewardCount: number;
    dailyRewardCap: number;
    pairCooldownHours: number;
    pairCooldownUntil: string | null;
};

function bangkokDateKey(date: Date): string {
    const bkk = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return bkk.toISOString().slice(0, 10);
}

function startOfBangkokDayUtc(date: Date): Date {
    return new Date(`${bangkokDateKey(date)}T00:00:00.000+07:00`);
}

export async function resolveBattleRewardPayout(
    db: BattleRewardPolicyDb,
    input: {
        classId: string;
        winnerId: string;
        challengerId: string;
        defenderId: string;
        requestedGold: number;
        now?: Date;
    }
): Promise<BattleRewardPayout> {
    const now = input.now ?? new Date();
    const dayStart = startOfBangkokDayUtc(now);
    const cooldownStart = new Date(now.getTime() - BATTLE_PAIR_REWARD_COOLDOWN_HOURS * 3_600_000);

    const dailyRewardCount = await db.battleSession.count({
        where: {
            classId: input.classId,
            winnerId: input.winnerId,
            goldReward: { gt: 0 },
            interactivePending: false,
            createdAt: { gte: dayStart },
        },
    });

    if (dailyRewardCount >= DAILY_BATTLE_REWARD_CAP) {
        return {
            goldReward: 0,
            rewardBlockedReason: "daily_cap",
            dailyRewardCount,
            dailyRewardCap: DAILY_BATTLE_REWARD_CAP,
            pairCooldownHours: BATTLE_PAIR_REWARD_COOLDOWN_HOURS,
            pairCooldownUntil: null,
        };
    }

    const lastPairReward = await db.battleSession.findFirst({
        where: {
            classId: input.classId,
            goldReward: { gt: 0 },
            interactivePending: false,
            createdAt: { gte: cooldownStart },
            OR: [
                { challengerId: input.challengerId, defenderId: input.defenderId },
                { challengerId: input.defenderId, defenderId: input.challengerId },
            ],
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
    });

    if (lastPairReward?.createdAt) {
        const cooldownUntil = new Date(
            lastPairReward.createdAt.getTime() + BATTLE_PAIR_REWARD_COOLDOWN_HOURS * 3_600_000
        );
        return {
            goldReward: 0,
            rewardBlockedReason: "pair_cooldown",
            dailyRewardCount,
            dailyRewardCap: DAILY_BATTLE_REWARD_CAP,
            pairCooldownHours: BATTLE_PAIR_REWARD_COOLDOWN_HOURS,
            pairCooldownUntil: cooldownUntil.toISOString(),
        };
    }

    return {
        goldReward: Math.max(0, input.requestedGold),
        rewardBlockedReason: null,
        dailyRewardCount,
        dailyRewardCap: DAILY_BATTLE_REWARD_CAP,
        pairCooldownHours: BATTLE_PAIR_REWARD_COOLDOWN_HOURS,
        pairCooldownUntil: null,
    };
}
