import type { MonsterBaseStats, MonsterStats } from "@/lib/types/negamon";

export const NEGAMON_MIN_RANK_INDEX = 0;
export const NEGAMON_MAX_RANK_INDEX = 5;
export const NEGAMON_BASE_ENERGY = 40;
export const NEGAMON_BASE_ENERGY_REGEN = 10;

export type NegamonGrowthProgress = {
    level: number;
    exp: number;
    expToNextLevel: number;
    rankIndex: number;
    evolutionStage: number;
};

export function normalizeNegamonRankIndex(rankIndex: number): number {
    if (!Number.isFinite(rankIndex)) return NEGAMON_MIN_RANK_INDEX;
    return Math.max(NEGAMON_MIN_RANK_INDEX, Math.min(NEGAMON_MAX_RANK_INDEX, Math.floor(rankIndex)));
}

export function getNegamonLevelFromRank(rankIndex: number): number {
    return normalizeNegamonRankIndex(rankIndex) + 1;
}

export function calculateNegamonStats(baseStats: MonsterBaseStats, rankIndex: number): MonsterStats {
    const level = getNegamonLevelFromRank(rankIndex);
    return {
        hp: Math.floor(baseStats.hp * (1 + level * 0.30)),
        atk: Math.floor(baseStats.atk * (1 + level * 0.25)),
        def: Math.floor(baseStats.def * (1 + level * 0.25)),
        spd: Math.floor(baseStats.spd * (1 + level * 0.20)),
    };
}

export function calculateNegamonExpProgress(input: {
    points: number;
    rankIndex: number;
    expPerPoint?: number;
}): NegamonGrowthProgress {
    const rankIndex = normalizeNegamonRankIndex(input.rankIndex);
    const level = getNegamonLevelFromRank(rankIndex);
    const expPerPoint = Math.max(1, Math.floor(input.expPerPoint ?? 10));
    const exp = Math.max(0, Math.floor(input.points * expPerPoint));
    const nextLevel = level + 1;
    const expToNextLevel =
        rankIndex >= NEGAMON_MAX_RANK_INDEX
            ? 0
            : Math.max(0, nextLevel * nextLevel * 100 - exp);

    return {
        level,
        exp,
        expToNextLevel,
        rankIndex,
        evolutionStage: rankIndex,
    };
}
