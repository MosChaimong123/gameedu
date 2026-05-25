import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import {
    getClaimedToday,
    todayDateKey,
    DAILY_QUESTS,
    isQuestCompleted,
    type QuestId,
} from "@/lib/daily-quests";
import {
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
import { getActiveGoldMultiplier, getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import {
    createGameRewardResult,
    createGameStatePatch,
    type GameHistoryEvent,
    type GameRewardResult,
} from "@/lib/game-core";
import {
    applyNegamonProgressionReward,
    calculateNegamonQuestExpReward,
    createNegamonLearningRewardFinalizationPlan,
    createNegamonMonsterSnapshot,
    createPointHistoryRowsFromLearningRewardEvents,
    type NegamonProgressionPersistencePlan,
} from "@/lib/game-negamon";
import {
    createQuestClaimRewardPlan,
    createQuestProgressSnapshot,
    createQuestChainClaimId,
    findQuestChainStep,
    getChainClaimedAll,
    resolveGameQuestRewardRule,
    type GameQuestType,
} from "@/lib/game-quests";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";
import { normalizeRewardItemIds, normalizeStudentInventoryItemIds } from "@/lib/shop-item-migration";

type QuestType = GameQuestType;
type ClaimField = "dailyQuestsClaimed" | "weeklyQuestsClaimed" | "challengeQuestsClaimed";

/** MongoDB Prisma does not support `isSet` on JSON filters — skip guard when unset. */
function buildClaimFieldGuard(field: ClaimField, currentValue: unknown) {
    if (currentValue == null) {
        return {};
    }

    return {
        [field]: { equals: currentValue },
    };
}

function buildDailyQuestClaimGuard(raw: unknown) {
    if (raw == null || typeof raw !== "object") {
        return {};
    }

    const record = raw as Record<string, unknown>;
    if (record.date !== todayDateKey()) {
        return {};
    }

    return { dailyQuestsClaimed: { equals: raw } };
}

function buildWeeklyQuestClaimGuard(raw: unknown) {
    if (raw == null || typeof raw !== "object") {
        return {};
    }

    const record = raw as Record<string, unknown>;
    if (record.weekKey !== thisWeekKey()) {
        return {};
    }

    return { weeklyQuestsClaimed: { equals: raw } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveStudent(code: string): Promise<any | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db.student as any).findFirst({
        where: { OR: getStudentLoginCodeVariants(code).map((c: string) => ({ loginCode: c })) },
        select: {
            id: true,
            classId: true,
            name: true,
            loginCode: true,
            streak: true,
            lastCheckIn: true,
            gold: true,
            behaviorPoints: true,
            negamonSkills: true,
        inventory: true,
            dailyQuestsClaimed: true,
            weeklyQuestsClaimed: true,
            challengeQuestsClaimed: true,
            classroom: {
                select: {
                    gamifiedSettings: true,
                    levelConfig: true,
                }
            },
            submissions: {
                select: { id: true, submittedAt: true },
            },
        },
    });
}

async function resolveBattleProgress(studentId: string) {
    const [played, won] = await Promise.all([
        (db.battleSession as any).count({
            where: {
                interactivePending: false,
                OR: [{ challengerId: studentId }, { defenderId: studentId }],
            },
        }),
        (db.battleSession as any).count({
            where: {
                interactivePending: false,
                winnerId: studentId,
            },
        }),
    ]);
    return { battlesPlayed: played, battlesWon: won };
}

async function persistQuestClaim(params: {
    student: {
        id: string;
        classId: string | null;
        gold: number;
        dailyQuestsClaimed?: unknown;
        weeklyQuestsClaimed?: unknown;
        challengeQuestsClaimed?: unknown;
        name?: string | null;
        behaviorPoints?: number | null;
        negamonSkills?: unknown;
        inventory?: unknown;
        classroom?: {
            gamifiedSettings?: unknown;
            levelConfig?: unknown;
        } | null;
    };
    questType: QuestType;
    questId: string;
    field: ClaimField;
    nextClaimed: unknown;
    goldEarned: number;
    rewardRule?: Parameters<typeof createQuestClaimRewardPlan>[0]["rewardRule"];
    idempotencyKey: string;
    metadata: Record<string, unknown>;
}): Promise<
    | { ok: false; reason: "ALREADY_CLAIMED" }
    | {
          ok: true;
          newGold: number;
          reward: GameRewardResult;
          progression: NegamonProgressionPersistencePlan | null;
          historyEvents: GameHistoryEvent[];
      }
> {
    const { student, field, nextClaimed, goldEarned } = params;
    const itemRewardIds = normalizeRewardItemIds(params.rewardRule?.itemIds ?? []);
    const skillRewardIds = params.rewardRule?.skillIds ?? [];
    const currentInventory = normalizeStudentInventoryItemIds(student.inventory);
    const currentSkillIds = Array.isArray(student.negamonSkills) ? (student.negamonSkills as string[]) : [];
    const updateData: Record<string, unknown> = {
        gold: { increment: goldEarned },
        [field]: nextClaimed,
    };
    if (itemRewardIds.length > 0) {
        updateData.inventory = [...currentInventory, ...itemRewardIds];
    }
    if (skillRewardIds.length > 0) {
        updateData.negamonSkills = [...new Set([...currentSkillIds, ...skillRewardIds])];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any).$transaction(async (tx: any) => {
        const claimGuard =
            field === "dailyQuestsClaimed"
                ? buildDailyQuestClaimGuard(student.dailyQuestsClaimed)
                : field === "weeklyQuestsClaimed"
                  ? buildWeeklyQuestClaimGuard(student.weeklyQuestsClaimed)
                  : buildClaimFieldGuard(field, student[field]);

        const updatedCount = await tx.student.updateMany({
            where: {
                id: student.id,
                ...claimGuard,
            },
            data: updateData,
        });

        if (updatedCount.count !== 1) {
            return { ok: false as const, reason: "ALREADY_CLAIMED" as const };
        }

        const updated = await tx.student.findUniqueOrThrow({
            where: { id: student.id },
            select: { gold: true, behaviorPoints: true, negamonSkills: true },
        });
        const negamon = getNegamonSettings(student.classroom?.gamifiedSettings);
        const currentPoints = Math.max(0, Math.floor(updated.behaviorPoints ?? student.behaviorPoints ?? 0));
        const currentSkills = Array.isArray(updated.negamonSkills)
            ? (updated.negamonSkills as string[])
            : Array.isArray(student.negamonSkills)
              ? (student.negamonSkills as string[])
              : [];
        const expReward =
            negamon?.enabled && goldEarned > 0
                ? calculateNegamonQuestExpReward({ goldReward: goldEarned })
                : 0;
        const pointDelta =
            expReward <= 0 || !negamon
                ? 0
                : Math.ceil(expReward / Math.max(1, Math.floor(negamon.expPerPoint ?? 6)));
        const sourceId = `${params.questType}:${params.questId}:${params.idempotencyKey}`;
        const monsterBefore =
            negamon && expReward > 0
                ? createNegamonMonsterSnapshot({
                      studentId: student.id,
                      studentName: student.name,
                      points: currentPoints,
                      levelConfig: student.classroom?.levelConfig as LevelConfigInput,
                      negamonSettings: negamon,
                      equippedSkillIds: currentSkills,
                  })
                : null;
        const monsterAfter =
            negamon && expReward > 0
                ? createNegamonMonsterSnapshot({
                      studentId: student.id,
                      studentName: student.name,
                      points: currentPoints + pointDelta,
                      levelConfig: student.classroom?.levelConfig as LevelConfigInput,
                      negamonSettings: negamon,
                      equippedSkillIds: currentSkills,
                  })
                : null;
        const rewardPlan =
            monsterBefore && monsterAfter
                ? createNegamonLearningRewardFinalizationPlan({
                      source: "quest",
                      sourceId,
                      studentId: student.id,
                      classId: student.classId,
                      monsterBefore,
                      goldReward: goldEarned,
                      expReward,
                      rankIndexAfter: monsterAfter.rankIndex,
                      unlockedSkillIdsAfter: monsterAfter.unlockedSkillIds,
                      createdAt: new Date(),
                  })
                : null;
        const progressionResult =
            rewardPlan?.ok
                ? await applyNegamonProgressionReward({
                      studentId: student.id,
                      student: {
                          behaviorPoints: currentPoints,
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
                      source: "quest",
                      sourceId,
                      behaviorPointDelta: progressionResult.plan.behaviorPointDelta,
                      historyEvents: rewardPlan.historyEvents,
                  })
                : [];
        if (historyRows.length > 0) {
            await tx.pointHistory.createMany({ data: historyRows });
        }

        try {
            const questPlan = createQuestClaimRewardPlan({
                studentId: student.id,
                classId: student.classId,
                questType: params.questType,
                questId: params.questId,
                baseReward: goldEarned,
                rewardRule: params.rewardRule,
                balanceBefore: updated.gold - goldEarned,
                periodKey: params.idempotencyKey,
            });
            if (!questPlan.ok) throw new Error("DUPLICATE_QUEST_PLAN");
            await recordEconomyTransaction(tx, {
                studentId: student.id,
                classId: student.classId,
                type: questPlan.economyMutation.type,
                source: questPlan.economyMutation.source,
                amount: questPlan.economyMutation.amount,
                balanceBefore: questPlan.economyMutation.balanceBefore,
                balanceAfter: updated.gold,
                sourceRefId: questPlan.economyMutation.sourceRefId,
                idempotencyKey: params.idempotencyKey,
                metadata: {
                    questType: params.questType,
                    questId: params.questId,
                    rewardIdempotencyKey: rewardPlan?.idempotencyKey,
                    expReward,
                    rewardRule: params.rewardRule,
                    ...params.metadata,
                },
            });
        } catch (error) {
            console.error("[daily-quests] failed to record quest ledger", error);
        }

        return {
            ok: true as const,
            newGold: updated.gold,
            reward:
                rewardPlan?.reward ??
                createGameRewardResult({
                    gold: goldEarned,
                    exp: params.rewardRule?.exp,
                    grantedItemIds: itemRewardIds,
                    unlockedSkillIds: skillRewardIds,
                    idempotencyKey: params.idempotencyKey,
                }),
            progression: progressionResult?.plan ?? null,
            historyEvents: rewardPlan?.historyEvents ?? [],
        };
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

    const dailyClaimedIds = getClaimedToday(student.dailyQuestsClaimed);
    const checkInput = {
        streak: student.streak,
        lastCheckIn: student.lastCheckIn,
        hasSubmitToday: student.submissions.some(
            (s: { submittedAt: Date | null }) =>
                s.submittedAt && new Date(s.submittedAt) >= todayStart
        ),
    };

    const submissionsThisWeek = student.submissions.filter(
        (s: { submittedAt: Date | null }) =>
            s.submittedAt && new Date(s.submittedAt) >= weekStart
    ).length;
    const weeklyClaimedIds = getWeeklyClaimedThisWeek(student.weeklyQuestsClaimed);
    const challengeClaimedIds = getChallengeClaimedAll(student.challengeQuestsClaimed);
    const battleProgress = await resolveBattleProgress(student.id);

    const snapshot = createQuestProgressSnapshot({
        daily: {
            ...checkInput,
            claimedRaw: student.dailyQuestsClaimed,
        },
        weekly: {
            streak: student.streak,
            submissionsThisWeek,
            allDailyClaimedToday: dailyClaimedIds.length >= DAILY_QUESTS.length,
            claimedRaw: student.weeklyQuestsClaimed,
        },
        challenge: {
            streak: student.streak,
            totalSubmissions: student.submissions.length,
            hasItem: student.inventory.length > 0,
            claimedRaw: student.challengeQuestsClaimed,
        },
        chain: {
            dailyClaimedIds,
            weeklyClaimedIds,
            challengeClaimedIds,
            chainClaimedRaw: student.challengeQuestsClaimed,
            streak: student.streak,
            submissionsThisWeek,
            totalSubmissions: student.submissions.length,
            inventoryCount: student.inventory.length,
            battlesPlayed: battleProgress.battlesPlayed,
            battlesWon: battleProgress.battlesWon,
        },
    });
    const { daily, weekly, challenge, chain } = snapshot;

    return NextResponse.json({ daily, weekly, challenge, chain, gold: student.gold });
}

/** POST — claim รางวัล quest (ทุกประเภท) */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
    const { code } = await params;
    const body = (await req.json()) as { questId: string; questType: QuestType };
    const { questId, questType = "daily" } = body;

    const student = await resolveStudent(code);
    if (!student) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0) - 7 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    
    // Multiplier from Active Events
    const multiplier = getActiveGoldMultiplier(student.classroom?.gamifiedSettings);

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

        const rewardRule = resolveGameQuestRewardRule({
            questType,
            questId,
            baseGold: questDef.goldReward,
            multiplier,
        });
        const goldEarned = rewardRule.gold ?? Math.floor(questDef.goldReward * multiplier);
        const todayKey = todayDateKey();
        const claimResult = await persistQuestClaim({
            student,
            questType,
            questId,
            field: "dailyQuestsClaimed",
            nextClaimed: {
                date: todayKey,
                claimed: [...claimedIds, questId],
            },
            goldEarned,
            rewardRule,
            idempotencyKey: `quest:${student.id}:daily:${todayKey}:${questId}`,
            metadata: {
                baseReward: questDef.goldReward,
                eventMultiplier: multiplier,
                date: todayKey,
            },
        });
        if (!claimResult.ok) return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });
        return NextResponse.json({
            ok: true,
            newGold: claimResult.newGold,
            goldEarned,
            reward: claimResult.reward,
            progression: claimResult.progression,
            historyEvents: claimResult.historyEvents,
            gameState: createGameStatePatch({ gold: claimResult.newGold }),
        });
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

        const rewardRule = resolveGameQuestRewardRule({
            questType,
            questId,
            baseGold: questDef.goldReward,
            multiplier,
        });
        const goldEarned = rewardRule.gold ?? Math.floor(questDef.goldReward * multiplier);
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
            rewardRule,
            idempotencyKey: `quest:${student.id}:weekly:${weekKey}:${questId}`,
            metadata: {
                baseReward: questDef.goldReward,
                eventMultiplier: multiplier,
                weekKey,
            },
        });
        if (!claimResult.ok) return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });
        return NextResponse.json({
            ok: true,
            newGold: claimResult.newGold,
            goldEarned,
            reward: claimResult.reward,
            progression: claimResult.progression,
            historyEvents: claimResult.historyEvents,
            gameState: createGameStatePatch({ gold: claimResult.newGold }),
        });
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

        const rewardRule = resolveGameQuestRewardRule({
            questType,
            questId,
            baseGold: questDef.goldReward,
            multiplier,
        });
        const goldEarned = rewardRule.gold ?? Math.floor(questDef.goldReward * multiplier);
        const claimResult = await persistQuestClaim({
            student,
            questType,
            questId,
            field: "challengeQuestsClaimed",
            nextClaimed: [...claimedIds, questId],
            goldEarned,
            rewardRule,
            idempotencyKey: `quest:${student.id}:challenge:${questId}`,
            metadata: {
                baseReward: questDef.goldReward,
                eventMultiplier: multiplier,
            },
        });
        if (!claimResult.ok) return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });
        return NextResponse.json({
            ok: true,
            newGold: claimResult.newGold,
            goldEarned,
            reward: claimResult.reward,
            progression: claimResult.progression,
            historyEvents: claimResult.historyEvents,
            gameState: createGameStatePatch({ gold: claimResult.newGold }),
        });
    }

    if (questType === "chain") {
        const [prefix, chainId, stepId] = questId.split(":");
        if (prefix !== "chain" || !chainId || !stepId) {
            return NextResponse.json({ error: "INVALID_QUEST" }, { status: 400 });
        }
        const chainStep = findQuestChainStep({ chainId, stepId });
        if (!chainStep) return NextResponse.json({ error: "INVALID_QUEST" }, { status: 400 });

        const claimedIds = getChainClaimedAll(student.challengeQuestsClaimed);
        const claimId = createQuestChainClaimId(chainId, stepId);
        if (claimedIds.includes(claimId)) {
            return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });
        }

        const dailyClaimedIds = getClaimedToday(student.dailyQuestsClaimed);
        const weeklyClaimedIds = getWeeklyClaimedThisWeek(student.weeklyQuestsClaimed);
        const challengeClaimedIds = getChallengeClaimedAll(student.challengeQuestsClaimed);
        const battleProgress = await resolveBattleProgress(student.id);
        const submissionsThisWeek = student.submissions.filter(
            (s: { submittedAt: Date | null }) =>
                s.submittedAt && new Date(s.submittedAt) >= weekStart
        ).length;
        const chainSnapshot = createQuestProgressSnapshot({
            daily: {
                streak: student.streak,
                lastCheckIn: student.lastCheckIn,
                hasSubmitToday: student.submissions.some(
                    (s: { submittedAt: Date | null }) =>
                        s.submittedAt && new Date(s.submittedAt) >= todayStart
                ),
                claimedRaw: student.dailyQuestsClaimed,
            },
            weekly: {
                streak: student.streak,
                submissionsThisWeek,
                allDailyClaimedToday: dailyClaimedIds.length >= DAILY_QUESTS.length,
                claimedRaw: student.weeklyQuestsClaimed,
            },
            challenge: {
                streak: student.streak,
                totalSubmissions: student.submissions.length,
                hasItem: student.inventory.length > 0,
                claimedRaw: student.challengeQuestsClaimed,
            },
            chain: {
                dailyClaimedIds,
                weeklyClaimedIds,
                challengeClaimedIds,
                chainClaimedRaw: student.challengeQuestsClaimed,
                streak: student.streak,
                submissionsThisWeek,
                totalSubmissions: student.submissions.length,
                inventoryCount: student.inventory.length,
                battlesPlayed: battleProgress.battlesPlayed,
                battlesWon: battleProgress.battlesWon,
            },
        }).chain;
        const status = chainSnapshot.find((quest) => quest.id === claimId);
        if (!status?.completed) return NextResponse.json({ error: "NOT_COMPLETED" }, { status: 400 });

        const allChallengeClaims = Array.isArray(student.challengeQuestsClaimed)
            ? (student.challengeQuestsClaimed as string[])
            : [];
        const goldEarned = Math.floor((chainStep.step.reward.gold ?? 0) * multiplier);
        const claimResult = await persistQuestClaim({
            student,
            questType,
            questId: claimId,
            field: "challengeQuestsClaimed",
            nextClaimed: [...allChallengeClaims, claimId],
            goldEarned,
            rewardRule: {
                ...chainStep.step.reward,
                gold: goldEarned,
            },
            idempotencyKey: `quest:${student.id}:chain:${chainId}:${stepId}`,
            metadata: {
                chainId,
                stepId,
                stepIndex: chainStep.index + 1,
                baseReward: chainStep.step.reward.gold ?? 0,
                eventMultiplier: multiplier,
            },
        });
        if (!claimResult.ok) return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 400 });
        return NextResponse.json({
            ok: true,
            newGold: claimResult.newGold,
            goldEarned,
            reward: claimResult.reward,
            progression: claimResult.progression,
            historyEvents: claimResult.historyEvents,
            gameState: createGameStatePatch({ gold: claimResult.newGold }),
        });
    }

    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
    } catch (error) {
        console.error("[daily-quests] claim failed", error);
        return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
}
