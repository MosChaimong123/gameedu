import {
    createGameHistoryEvent,
    createGameHistoryId,
    createGameRewardIdempotencyKey,
    createGameRewardResult,
    type GameHistoryEvent,
    type GameRewardResult,
} from "@/lib/game-core";
import {
    calculateNegamonProgressionReward,
    type NegamonProgressionRewardSummary,
} from "./battle-rewards";
import type { NegamonMonsterSnapshot } from "./monster-snapshot";

export type NegamonLearningRewardSource = "quest" | "attendance";

export type NegamonLearningRewardFinalizationPlan = {
    ok: true;
    idempotencyKey: string;
    reward: GameRewardResult;
    progression: NegamonProgressionRewardSummary;
    auditEvent: GameHistoryEvent;
    historyEvents: GameHistoryEvent[];
};

export function calculateNegamonQuestExpReward(input: { goldReward: number }): number {
    return Math.max(0, Math.floor(input.goldReward * 1.2));
}

function learningTitleKey(source: NegamonLearningRewardSource): string {
    return source === "attendance"
        ? "negamonAttendanceRewardGrantedHistoryTitle"
        : "negamonQuestRewardGrantedHistoryTitle";
}

export function createNegamonLearningRewardFinalizationPlan(input: {
    source: NegamonLearningRewardSource;
    sourceId: string;
    studentId: string;
    classId?: string | null;
    monsterBefore: Pick<
        NegamonMonsterSnapshot,
        "exp" | "expToNextLevel" | "level" | "rankIndex" | "unlockedSkillIds"
    >;
    goldReward?: number;
    expReward: number;
    rankIndexAfter?: number;
    unlockedSkillIdsAfter?: string[];
    createdAt?: string | Date;
}): NegamonLearningRewardFinalizationPlan {
    const idempotencyKey = createGameRewardIdempotencyKey({
        kind: "negamon",
        sessionId: input.sourceId,
        studentId: input.studentId,
        reason: `${input.source}-progression`,
    });
    const progression = calculateNegamonProgressionReward({
        monsterBefore: input.monsterBefore,
        expReward: input.expReward,
        rankIndexAfter: input.rankIndexAfter,
        unlockedSkillIdsAfter: input.unlockedSkillIdsAfter,
    });
    const reward = createGameRewardResult({
        gold: input.goldReward,
        exp: input.expReward,
        levelUps: progression.levelUps,
        unlockedSkillIds: progression.unlockedSkillIds,
        idempotencyKey,
    });
    const auditEvent = createGameHistoryEvent({
        id: createGameHistoryId({
            gameKind: "negamon",
            kind: "reward_granted",
            studentId: input.studentId,
            refId: input.sourceId,
        }),
        kind: "reward_granted",
        gameKind: "negamon",
        studentId: input.studentId,
        classId: input.classId ?? undefined,
        sessionId: input.sourceId,
        titleKey: learningTitleKey(input.source),
        reward,
        createdAt: input.createdAt ?? new Date(0),
    });
    const levelEvents = progression.levelUps.map((levelUp) =>
        createGameHistoryEvent({
            id: createGameHistoryId({
                gameKind: "negamon",
                kind: "level_up",
                studentId: input.studentId,
                refId: `${input.sourceId}:${levelUp.toLevel}`,
            }),
            kind: "level_up",
            gameKind: "negamon",
            studentId: input.studentId,
            classId: input.classId ?? undefined,
            sessionId: input.sourceId,
            titleKey: "negamonLevelUpHistoryTitle",
            reward: createGameRewardResult({
                exp: input.expReward,
                levelUps: [levelUp],
                idempotencyKey,
            }),
            createdAt: input.createdAt ?? new Date(0),
        })
    );
    const skillEvents = progression.unlockedSkillIds.map((skillId) =>
        createGameHistoryEvent({
            id: createGameHistoryId({
                gameKind: "negamon",
                kind: "skill_unlocked",
                studentId: input.studentId,
                refId: `${input.sourceId}:${skillId}`,
            }),
            kind: "skill_unlocked",
            gameKind: "negamon",
            studentId: input.studentId,
            classId: input.classId ?? undefined,
            sessionId: input.sourceId,
            titleKey: "negamonSkillUnlockedHistoryTitle",
            reward: createGameRewardResult({
                exp: input.expReward,
                unlockedSkillIds: [skillId],
                idempotencyKey,
            }),
            createdAt: input.createdAt ?? new Date(0),
        })
    );
    const evolutionEvents = progression.evolutionUnlocks.map((unlock) =>
        createGameHistoryEvent({
            id: createGameHistoryId({
                gameKind: "negamon",
                kind: "evolution_unlocked",
                studentId: input.studentId,
                refId: `${input.sourceId}:${unlock.formRank}`,
            }),
            kind: "evolution_unlocked",
            gameKind: "negamon",
            studentId: input.studentId,
            classId: input.classId ?? undefined,
            sessionId: input.sourceId,
            titleKey: "negamonEvolutionUnlockedHistoryTitle",
            descriptionKey: unlock.formName ?? `rank:${unlock.formRank}`,
            reward: createGameRewardResult({
                exp: input.expReward,
                idempotencyKey,
            }),
            createdAt: input.createdAt ?? new Date(0),
        })
    );

    return {
        ok: true,
        idempotencyKey,
        reward,
        progression,
        auditEvent,
        historyEvents: [auditEvent, ...levelEvents, ...skillEvents, ...evolutionEvents],
    };
}
