import type { NegamonProgressionRewardSummary } from "@/lib/game-negamon/core/battle-rewards";

export type NegamonProgressionStudentRecord = {
    behaviorPoints: number;
    negamonSkills?: string[] | null;
};

export type NegamonProgressionPersistencePlan = {
    expDelta: number;
    behaviorPointDelta: number;
    behaviorPointsBefore: number;
    behaviorPointsAfter: number;
    levelBefore: number;
    levelAfter: number;
    rankIndexBefore: number;
    rankIndexAfter: number;
    unlockedSkillIdsBefore: string[];
    unlockedSkillIdsAfter: string[];
    newlyUnlockedSkillIds: string[];
    shouldPersist: boolean;
};

export type NegamonProgressionStudentDelegate = {
    update(args: {
        where: { id: string };
        data: {
            behaviorPoints?: { increment: number };
            negamonSkills?: string[];
        };
        select: {
            behaviorPoints: true;
            negamonSkills: true;
        };
    }): Promise<NegamonProgressionStudentRecord>;
};

function normalizeSkillIds(skillIds: readonly string[] | null | undefined): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const rawId of skillIds ?? []) {
        const id = String(rawId).trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        normalized.push(id);
    }
    return normalized;
}

export function createNegamonProgressionPersistencePlan(input: {
    student: NegamonProgressionStudentRecord;
    progression: NegamonProgressionRewardSummary;
    expPerPoint?: number;
    canonicalUnlockedSkillIdsBefore?: string[];
}): NegamonProgressionPersistencePlan {
    const expDelta = Math.max(
        0,
        Math.floor(input.progression.expAfter - input.progression.expBefore)
    );
    const expPerPoint = Math.max(1, Math.floor(input.expPerPoint ?? 6));
    const behaviorPointDelta = expDelta <= 0 ? 0 : Math.ceil(expDelta / expPerPoint);
    const beforeSkills = normalizeSkillIds([
        ...normalizeSkillIds(input.student.negamonSkills),
        ...normalizeSkillIds(input.canonicalUnlockedSkillIdsBefore),
    ]);
    const beforeSet = new Set(beforeSkills);
    const newlyUnlockedSkillIds = normalizeSkillIds(input.progression.unlockedSkillIds).filter(
        (id) => !beforeSet.has(id)
    );
    const unlockedSkillIdsAfter = [...beforeSkills, ...newlyUnlockedSkillIds];
    const behaviorPointsBefore = Math.max(0, Math.floor(input.student.behaviorPoints));
    const behaviorPointsAfter = behaviorPointsBefore + behaviorPointDelta;

    return {
        expDelta,
        behaviorPointDelta,
        behaviorPointsBefore,
        behaviorPointsAfter,
        levelBefore: input.progression.levelBefore,
        levelAfter: input.progression.levelAfter,
        rankIndexBefore: input.progression.rankIndexBefore,
        rankIndexAfter: input.progression.rankIndexAfter,
        unlockedSkillIdsBefore: beforeSkills,
        unlockedSkillIdsAfter,
        newlyUnlockedSkillIds,
        shouldPersist: behaviorPointDelta > 0 || newlyUnlockedSkillIds.length > 0,
    };
}

export async function applyNegamonProgressionReward(input: {
    studentId: string;
    student: NegamonProgressionStudentRecord;
    progression: NegamonProgressionRewardSummary;
    expPerPoint?: number;
    canonicalUnlockedSkillIdsBefore?: string[];
    studentDelegate: NegamonProgressionStudentDelegate;
}): Promise<{
    plan: NegamonProgressionPersistencePlan;
    student: NegamonProgressionStudentRecord;
}> {
    const plan = createNegamonProgressionPersistencePlan({
        student: input.student,
        progression: input.progression,
        expPerPoint: input.expPerPoint,
        canonicalUnlockedSkillIdsBefore: input.canonicalUnlockedSkillIdsBefore,
    });

    if (!plan.shouldPersist) {
        return { plan, student: input.student };
    }

    const data: {
        behaviorPoints?: { increment: number };
        negamonSkills?: string[];
    } = {};
    if (plan.behaviorPointDelta > 0) data.behaviorPoints = { increment: plan.behaviorPointDelta };
    if (plan.newlyUnlockedSkillIds.length > 0) data.negamonSkills = plan.unlockedSkillIdsAfter;

    const student = await input.studentDelegate.update({
        where: { id: input.studentId },
        data,
        select: { behaviorPoints: true, negamonSkills: true },
    });

    return { plan, student };
}
