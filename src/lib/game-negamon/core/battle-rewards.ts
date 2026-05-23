import {
    createGameEconomyMutation,
    createGameHistoryEvent,
    createGameHistoryId,
    createGameRewardIdempotencyKey,
    createGameRewardResult,
    createInventoryConsumeChange,
    createInventoryGrantChange,
    mergeInventoryChanges,
    type GameEconomyMutation,
    type GameHistoryEvent,
    type GameInventoryChange,
    type GameLevelUpSummary,
    type GameRewardResult,
} from "@/lib/game-core";
import type { NegamonMonsterSnapshot } from "./monster-snapshot";

export type NegamonRewardOutcome = "win" | "loss" | "draw";

export type NegamonProgressionRewardSummary = {
    expBefore: number;
    expAfter: number;
    levelBefore: number;
    levelAfter: number;
    rankIndexBefore: number;
    rankIndexAfter: number;
    levelUps: GameLevelUpSummary[];
    unlockedSkillIds: string[];
};

export type NegamonBattleRewardFinalizationPlan =
    | {
          ok: true;
          idempotencyKey: string;
          reward: GameRewardResult;
          progression: NegamonProgressionRewardSummary;
          inventoryChange: GameInventoryChange;
          economyMutation: GameEconomyMutation | null;
          auditEvent: GameHistoryEvent;
          historyEvents: GameHistoryEvent[];
      }
    | {
          ok: false;
          idempotencyKey: string;
          reward: GameRewardResult;
          inventoryChange: GameInventoryChange;
          economyMutation: null;
          auditEvent: GameHistoryEvent;
          historyEvents: GameHistoryEvent[];
      };

export function calculateNegamonBattleExpReward(input: {
    outcome: NegamonRewardOutcome;
    baseWinExp?: number;
    baseLossExp?: number;
    baseDrawExp?: number;
    turnCount?: number;
}): number {
    const base =
        input.outcome === "win"
            ? input.baseWinExp ?? 80
            : input.outcome === "draw"
              ? input.baseDrawExp ?? 40
              : input.baseLossExp ?? 25;
    const turnBonus = Math.min(20, Math.max(0, Math.floor(input.turnCount ?? 0)) * 2);
    return Math.max(0, Math.floor(base + turnBonus));
}

export function calculateNegamonProgressionReward(input: {
    monsterBefore: Pick<
        NegamonMonsterSnapshot,
        "exp" | "expToNextLevel" | "level" | "rankIndex" | "unlockedSkillIds"
    >;
    expReward: number;
    rankIndexAfter?: number;
    unlockedSkillIdsAfter?: string[];
}): NegamonProgressionRewardSummary {
    const expBefore = Math.max(0, Math.floor(input.monsterBefore.exp));
    const expReward = Math.max(0, Math.floor(input.expReward));
    const expAfter = expBefore + expReward;
    const rankIndexBefore = Math.max(0, Math.floor(input.monsterBefore.rankIndex));
    const crossedNextLevel =
        input.monsterBefore.expToNextLevel > 0 && expReward >= input.monsterBefore.expToNextLevel;
    const rankIndexAfter = Math.max(
        rankIndexBefore,
        Math.floor(input.rankIndexAfter ?? (crossedNextLevel ? rankIndexBefore + 1 : rankIndexBefore))
    );
    const levelBefore = Math.max(1, Math.floor(input.monsterBefore.level));
    const levelAfter = Math.max(levelBefore, levelBefore + (rankIndexAfter - rankIndexBefore));
    const levelUps =
        levelAfter > levelBefore
            ? [
                  {
                      fromLevel: levelBefore,
                      toLevel: levelAfter,
                      fromRankIndex: rankIndexBefore,
                      toRankIndex: rankIndexAfter,
                      expBefore,
                      expAfter,
                  },
              ]
            : [];
    const beforeSkills = new Set(input.monsterBefore.unlockedSkillIds);
    const unlockedSkillIds = (input.unlockedSkillIdsAfter ?? [])
        .map((id) => id.trim())
        .filter((id) => id && !beforeSkills.has(id));

    return {
        expBefore,
        expAfter,
        levelBefore,
        levelAfter,
        rankIndexBefore,
        rankIndexAfter,
        levelUps,
        unlockedSkillIds,
    };
}

export function createNegamonBattleRewardFinalizationPlan(input: {
    sessionId: string;
    studentId: string;
    classId?: string | null;
    outcome: NegamonRewardOutcome;
    monsterBefore: Pick<
        NegamonMonsterSnapshot,
        "exp" | "expToNextLevel" | "level" | "rankIndex" | "unlockedSkillIds"
    >;
    balanceBefore: number;
    goldReward?: number;
    expReward?: number;
    itemRewardIds?: string[];
    consumedItemIds?: string[];
    rankIndexAfter?: number;
    unlockedSkillIdsAfter?: string[];
    finalizedRewardKeys?: Iterable<string>;
    createdAt?: string | Date;
}): NegamonBattleRewardFinalizationPlan {
    const idempotencyKey = createGameRewardIdempotencyKey({
        kind: "negamon",
        sessionId: input.sessionId,
        studentId: input.studentId,
        reason: "battle-finalize",
    });
    const duplicate = new Set(input.finalizedRewardKeys ?? []).has(idempotencyKey);
    const inventoryChange = mergeInventoryChanges([
        createInventoryConsumeChange(input.consumedItemIds ?? []),
        createInventoryGrantChange(input.itemRewardIds ?? []),
    ]);

    if (duplicate) {
        const reward = createGameRewardResult({
            blockedReason: "duplicate_finalize",
            idempotencyKey,
        });
        const auditEvent = createGameHistoryEvent({
            id: createGameHistoryId({
                gameKind: "negamon",
                kind: "reward_granted",
                studentId: input.studentId,
                refId: `${input.sessionId}:duplicate`,
            }),
            kind: "reward_granted",
            gameKind: "negamon",
            studentId: input.studentId,
            classId: input.classId ?? undefined,
            sessionId: input.sessionId,
            titleKey: "battleRewardDuplicateHistoryTitle",
            reward,
            inventoryChange: mergeInventoryChanges([]),
            createdAt: input.createdAt ?? new Date(0),
        });
        return {
            ok: false,
            idempotencyKey,
            reward,
            inventoryChange: mergeInventoryChanges([]),
            economyMutation: null,
            auditEvent,
            historyEvents: [auditEvent],
        };
    }

    const expReward =
        input.expReward ??
        calculateNegamonBattleExpReward({ outcome: input.outcome });
    const progression = calculateNegamonProgressionReward({
        monsterBefore: input.monsterBefore,
        expReward,
        rankIndexAfter: input.rankIndexAfter,
        unlockedSkillIdsAfter: input.unlockedSkillIdsAfter,
    });
    const reward = createGameRewardResult({
        gold: input.goldReward,
        exp: expReward,
        grantedItemIds: input.itemRewardIds,
        levelUps: progression.levelUps,
        unlockedSkillIds: progression.unlockedSkillIds,
        idempotencyKey,
    });
    const economyMutation =
        reward.gold > 0
            ? createGameEconomyMutation({
                  studentId: input.studentId,
                  classId: input.classId,
                  type: "earn",
                  source: "battle",
                  amount: reward.gold,
                  balanceBefore: input.balanceBefore,
                  sourceRefId: input.sessionId,
                  idempotencyKey,
              })
            : null;
    const auditEvent = createGameHistoryEvent({
        id: createGameHistoryId({
            gameKind: "negamon",
            kind: "reward_granted",
            studentId: input.studentId,
            refId: input.sessionId,
        }),
        kind: "reward_granted",
        gameKind: "negamon",
        studentId: input.studentId,
        classId: input.classId ?? undefined,
        sessionId: input.sessionId,
        titleKey: "battleRewardGrantedHistoryTitle",
        reward,
        inventoryChange,
        createdAt: input.createdAt ?? new Date(0),
    });
    const levelEvents = progression.levelUps.map((levelUp) =>
        createGameHistoryEvent({
            id: createGameHistoryId({
                gameKind: "negamon",
                kind: "level_up",
                studentId: input.studentId,
                refId: `${input.sessionId}:${levelUp.toLevel}`,
            }),
            kind: "level_up",
            gameKind: "negamon",
            studentId: input.studentId,
            classId: input.classId ?? undefined,
            sessionId: input.sessionId,
            titleKey: "negamonLevelUpHistoryTitle",
            reward: createGameRewardResult({ exp: expReward, levelUps: [levelUp], idempotencyKey }),
            createdAt: input.createdAt ?? new Date(0),
        })
    );
    const skillEvents = progression.unlockedSkillIds.map((skillId) =>
        createGameHistoryEvent({
            id: createGameHistoryId({
                gameKind: "negamon",
                kind: "skill_unlocked",
                studentId: input.studentId,
                refId: `${input.sessionId}:${skillId}`,
            }),
            kind: "skill_unlocked",
            gameKind: "negamon",
            studentId: input.studentId,
            classId: input.classId ?? undefined,
            sessionId: input.sessionId,
            titleKey: "negamonSkillUnlockedHistoryTitle",
            reward: createGameRewardResult({ exp: expReward, unlockedSkillIds: [skillId], idempotencyKey }),
            createdAt: input.createdAt ?? new Date(0),
        })
    );

    return {
        ok: true,
        idempotencyKey,
        reward,
        progression,
        inventoryChange,
        economyMutation,
        auditEvent,
        historyEvents: [auditEvent, ...levelEvents, ...skillEvents],
    };
}
