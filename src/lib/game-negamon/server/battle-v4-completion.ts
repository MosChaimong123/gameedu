import type { Prisma, PrismaClient } from "@prisma/client";
import {
    calculateNegamonBattleExpReward,
    calculateNegamonBattleGoldReward,
    createNegamonBattleRewardFinalizationPlan,
    type NegamonRewardOutcome,
} from "@/lib/game-negamon/core/battle-rewards";
import { applyNegamonBattleItemRuntimeEffects } from "@/lib/game-negamon/core/item-effects";
import { createNegamonMonsterSnapshot } from "@/lib/game-negamon/core/monster-snapshot";
import type { NegamonBattleStateV4 } from "@/lib/game-negamon/engine-showdown";
import type {
    NegamonBattleParticipantResultV4,
    NegamonBattleProgressionViewV4,
    NegamonBattleSessionResultV4,
} from "@/lib/game-negamon/core/session-v4";
import { getNegamonSettings, type LevelConfigInput } from "@/lib/classroom-utils";
import { applyNegamonProgressionReward } from "@/lib/game-negamon/server/progression";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";
import { resolveBattleRewardPayout } from "@/lib/services/student-economy/battle-reward-policy";
import { normalizeStudentBattleKit } from "@/lib/shop-item-migration";

type BattleV4CompletionDb =
    | (Pick<PrismaClient, "student" | "pointHistory" | "economyTransaction" | "battleSession"> & {
          $transaction?: PrismaClient["$transaction"];
      })
    | Prisma.TransactionClient;

type BattleV4CompletionClassroom = {
    id: string;
    gamifiedSettings: unknown;
    levelConfig: LevelConfigInput;
};

type BattleV4CompletionStudent = {
    id: string;
    name: string;
    nickname?: string | null;
    behaviorPoints: number;
    gold: number;
    inventory: string[] | null;
    battleLoadout: string[] | null;
    negamonSkills: string[] | null;
    negamonSkillLoadout: string[] | null;
};

type BattleV4CompletionSession = {
    id: string;
    classId: string;
    challengerId: string;
    defenderId: string;
    createdAt: Date;
};

type BattleV4CompletionReason = "battle_end" | "early_exit" | "timeout";

function resolvePreferredStudentDisplayName(input: {
    nickname?: string | null;
    name?: string | null;
}): string | undefined {
    const nickname = input.nickname?.trim();
    if (nickname) return nickname;
    const name = input.name?.trim();
    if (name) return name;
    return undefined;
}

function createPointHistoryRowsFromBattleRewardEvents(input: {
    studentId: string;
    sessionId: string;
    behaviorPointDelta: number;
    historyEvents: Array<{ kind: string; reward?: { levelUps?: Array<{ toLevel?: number }>; unlockedSkillIds?: string[] } | null }>;
}) {
    return input.historyEvents.map((event) => {
        if (event.kind === "reward_granted") {
            return {
                studentId: input.studentId,
                value: input.behaviorPointDelta,
                reason: `negamon_battle_reward:${input.sessionId}`,
            };
        }
        if (event.kind === "level_up") {
            const level = event.reward?.levelUps?.[0]?.toLevel;
            return {
                studentId: input.studentId,
                value: 0,
                reason: level ? `negamon_level_up:${level}` : "negamon_level_up",
            };
        }
        if (event.kind === "skill_unlocked") {
            const skillId = event.reward?.unlockedSkillIds?.[0];
            return {
                studentId: input.studentId,
                value: 0,
                reason: skillId ? `negamon_skill_unlocked:${skillId}` : "negamon_skill_unlocked",
            };
        }
        return {
            studentId: input.studentId,
            value: 0,
            reason: `negamon_${event.kind}`,
        };
    });
}

function toProgressionView(input: {
    behaviorPointsAfter: number;
    unlockedSkillIdsAfter: string[];
    shouldPersist: boolean;
    expDelta: number;
    behaviorPointDelta: number;
}): NegamonBattleProgressionViewV4 {
    return {
        expDelta: input.expDelta,
        behaviorPointDelta: input.behaviorPointDelta,
        nextBehaviorPoints: input.behaviorPointsAfter,
        nextNegamonSkills: input.unlockedSkillIdsAfter,
        shouldPersist: input.shouldPersist,
    };
}

function getOutcomeForStudent(input: {
    studentId: string;
    winnerId: string | null;
    finishReason: BattleV4CompletionReason;
}): NegamonRewardOutcome {
    if (!input.winnerId) return "draw";
    if (input.finishReason === "early_exit") {
        return input.studentId === input.winnerId ? "win" : "loss";
    }
    return input.studentId === input.winnerId ? "win" : "loss";
}

export async function finalizeNegamonBattleV4Completion(input: {
    db: BattleV4CompletionDb;
    session: BattleV4CompletionSession;
    classroom: BattleV4CompletionClassroom;
    challenger: BattleV4CompletionStudent;
    defender: BattleV4CompletionStudent;
    state: NegamonBattleStateV4;
    finishReason?: BattleV4CompletionReason;
}): Promise<{
    result: Pick<
        NegamonBattleSessionResultV4,
        | "winnerId"
        | "loserId"
        | "finishReason"
        | "requestedGoldReward"
        | "goldReward"
        | "rewardBlockedReason"
        | "rewardIdempotencyKey"
        | "reward"
        | "progression"
        | "participantResults"
    >;
}> {
    const finishReason = input.finishReason ?? "battle_end";
    const negamon = getNegamonSettings(input.classroom.gamifiedSettings as Record<string, unknown>);
    if (!negamon?.enabled) {
        throw new Error("NEGAMON_DISABLED");
    }

    const studentsById = new Map<string, BattleV4CompletionStudent>([
        [input.challenger.id, input.challenger],
        [input.defender.id, input.defender],
    ]);
    const orderedStudents = [input.challenger, input.defender];

    const winnerId =
        input.state.winner === "player"
            ? input.session.challengerId
            : input.state.winner === "opponent"
              ? input.session.defenderId
              : null;
    const loserId =
        winnerId === input.session.challengerId
            ? input.session.defenderId
            : winnerId === input.session.defenderId
              ? input.session.challengerId
              : null;

    const snapshots = orderedStudents.map((student) => {
        const battleKit = normalizeStudentBattleKit({
            inventory: student.inventory,
            battleLoadout: student.battleLoadout,
        });
        const snapshot = createNegamonMonsterSnapshot({
            studentId: student.id,
            studentName: resolvePreferredStudentDisplayName(student),
            points: Math.max(0, Math.floor(student.behaviorPoints ?? 0)),
            levelConfig: input.classroom.levelConfig,
            negamonSettings: negamon,
            equippedSkillIds:
                Array.isArray(student.negamonSkillLoadout) && student.negamonSkillLoadout.length > 0
                    ? student.negamonSkillLoadout
                    : undefined,
            equippedItemIds: battleKit.battleLoadout,
        });
        if (!snapshot) {
            throw new Error(`NEGAMON_SNAPSHOT_MISSING:${student.id}`);
        }
        return { student, snapshot };
    });

    const winnerSnapshot = winnerId
        ? snapshots.find((entry) => entry.student.id === winnerId)?.snapshot ?? null
        : null;
    const winnerRuntime = winnerSnapshot
        ? applyNegamonBattleItemRuntimeEffects({ monster: winnerSnapshot })
        : null;
    const requestedGoldReward =
        winnerSnapshot && finishReason === "battle_end"
            ? calculateNegamonBattleGoldReward({
                  goldBonus: winnerRuntime?.plan.rewardModifiers.goldBonus ?? 0,
                  goldMultiplier: winnerRuntime?.plan.rewardModifiers.goldMultiplier ?? 1,
              })
            : 0;
    const payout =
        winnerId && finishReason === "battle_end"
            ? await resolveBattleRewardPayout(input.db as never, {
                  classId: input.session.classId,
                  winnerId,
                  challengerId: input.session.challengerId,
                  defenderId: input.session.defenderId,
                  requestedGold: requestedGoldReward,
                  now: input.session.createdAt,
              })
            : {
                  goldReward: 0,
                  rewardBlockedReason: null,
                  dailyRewardCount: 0,
                  dailyRewardCap: 0,
                  pairCooldownHours: 0,
                  pairCooldownUntil: null,
              };

    const participantResults = {} as {
        challenger: NegamonBattleParticipantResultV4;
        defender: NegamonBattleParticipantResultV4;
    };

    for (const { student, snapshot } of snapshots) {
        const outcome = getOutcomeForStudent({
            studentId: student.id,
            winnerId,
            finishReason,
        });
        const expReward = calculateNegamonBattleExpReward({
            outcome,
            turnCount: input.state.turn,
        });
        const projectedPointDelta =
            expReward <= 0
                ? 0
                : Math.ceil(expReward / Math.max(1, Math.floor(negamon.expPerPoint ?? 6)));
        const projectedAfter = createNegamonMonsterSnapshot({
            studentId: student.id,
            studentName: resolvePreferredStudentDisplayName(student),
            points: Math.max(0, Math.floor(student.behaviorPoints ?? 0)) + projectedPointDelta,
            levelConfig: input.classroom.levelConfig,
            negamonSettings: negamon,
            equippedSkillIds:
                Array.isArray(student.negamonSkillLoadout) && student.negamonSkillLoadout.length > 0
                    ? student.negamonSkillLoadout
                    : undefined,
            equippedItemIds: snapshot.equippedItemIds,
        });
        if (!projectedAfter) {
            throw new Error(`NEGAMON_PROJECTED_SNAPSHOT_MISSING:${student.id}`);
        }

        const rewardPlan = createNegamonBattleRewardFinalizationPlan({
            sessionId: input.session.id,
            studentId: student.id,
            classId: input.session.classId,
            outcome,
            monsterBefore: snapshot,
            balanceBefore: Math.max(0, Math.floor(student.gold ?? 0)),
            goldReward: student.id === winnerId ? payout.goldReward : 0,
            expReward,
            rankIndexAfter: projectedAfter.rankIndex,
            unlockedSkillIdsAfter: projectedAfter.unlockedSkillIds,
            createdAt: input.session.createdAt,
        });

        const progressionResult =
            rewardPlan.ok
                ? await applyNegamonProgressionReward({
                      studentId: student.id,
                      student: {
                          behaviorPoints: Math.max(0, Math.floor(student.behaviorPoints ?? 0)),
                          negamonSkills: student.negamonSkills,
                      },
                      progression: rewardPlan.progression,
                      expPerPoint: negamon.expPerPoint,
                      canonicalUnlockedSkillIdsBefore: snapshot.unlockedSkillIds,
                      studentDelegate: input.db.student,
                  })
                : null;

        const historyRows =
            rewardPlan.ok && progressionResult?.plan
                ? createPointHistoryRowsFromBattleRewardEvents({
                      studentId: student.id,
                      sessionId: input.session.id,
                      behaviorPointDelta: progressionResult.plan.behaviorPointDelta,
                      historyEvents: rewardPlan.historyEvents,
                  })
                : [];
        if (historyRows.length > 0) {
            await input.db.pointHistory.createMany({ data: historyRows });
        }

        let behaviorPointsAfter = Math.max(0, Math.floor(student.behaviorPoints ?? 0));
        let nextNegamonSkills = Array.isArray(student.negamonSkills) ? student.negamonSkills : [];
        if (progressionResult) {
            behaviorPointsAfter = progressionResult.plan.behaviorPointsAfter;
            nextNegamonSkills = progressionResult.plan.unlockedSkillIdsAfter;
        }

        if (rewardPlan.ok && rewardPlan.reward.gold > 0) {
            const updated = await input.db.student.update({
                where: { id: student.id },
                data: { gold: { increment: rewardPlan.reward.gold } },
                select: { gold: true, behaviorPoints: true, negamonSkills: true },
            });
            await recordEconomyTransaction(input.db as never, {
                studentId: student.id,
                classId: input.session.classId,
                type: "earn",
                source: "battle",
                amount: rewardPlan.reward.gold,
                balanceBefore: student.gold,
                balanceAfter: updated.gold,
                sourceRefId: input.session.id,
                idempotencyKey: rewardPlan.idempotencyKey,
                metadata: {
                    sessionId: input.session.id,
                    finishReason,
                    winnerId,
                    loserId,
                    outcome,
                    requestedGoldReward: student.id === winnerId ? requestedGoldReward : 0,
                    rewardBlockedReason: student.id === winnerId ? payout.rewardBlockedReason : null,
                    reward: rewardPlan.reward,
                    progression: progressionResult?.plan ?? null,
                },
            });
        }

        const participantResult: NegamonBattleParticipantResultV4 = {
            studentId: student.id,
            outcome,
            requestedGoldReward: student.id === winnerId ? requestedGoldReward : 0,
            goldReward: rewardPlan.reward.gold,
            rewardBlockedReason: student.id === winnerId ? payout.rewardBlockedReason : null,
            rewardIdempotencyKey: rewardPlan.idempotencyKey,
            reward: rewardPlan.reward,
            progression:
                progressionResult?.plan
                    ? toProgressionView({
                          expDelta: progressionResult.plan.expDelta,
                          behaviorPointDelta: progressionResult.plan.behaviorPointDelta,
                          behaviorPointsAfter,
                          unlockedSkillIdsAfter: nextNegamonSkills,
                          shouldPersist: progressionResult.plan.shouldPersist,
                      })
                    : null,
        };

        if (student.id === input.session.challengerId) {
            participantResults.challenger = participantResult;
        } else {
            participantResults.defender = participantResult;
        }
    }

    const winnerResult =
        winnerId === input.session.challengerId
            ? participantResults.challenger
            : winnerId === input.session.defenderId
              ? participantResults.defender
              : null;

    return {
        result: {
            winnerId: winnerId ?? undefined,
            loserId: loserId ?? undefined,
            finishReason,
            requestedGoldReward,
            goldReward: winnerResult?.goldReward ?? 0,
            rewardBlockedReason: winnerResult?.rewardBlockedReason ?? null,
            rewardIdempotencyKey: winnerResult?.rewardIdempotencyKey,
            reward: winnerResult?.reward,
            progression: winnerResult?.progression ?? null,
            participantResults,
        },
    };
}
