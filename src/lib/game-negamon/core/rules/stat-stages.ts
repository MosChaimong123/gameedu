import type { NegamonFormulaStatStageKey, NegamonFormulaStatStages, NegamonFormulaStats } from "./types";

export const NEGAMON_MIN_STAT_STAGE = -6;
export const NEGAMON_MAX_STAT_STAGE = 6;

const POSITIVE_STAGE_MULTIPLIERS = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const;
const NEGATIVE_STAGE_MULTIPLIERS = [1, 2 / 3, 0.5, 0.4, 1 / 3, 2 / 7, 0.25] as const;

export function createNeutralStatStages(): NegamonFormulaStatStages {
    return {
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
        accuracy: 0,
        evasion: 0,
    };
}

export function clampStatStage(stage: number): number {
    if (!Number.isFinite(stage)) return 0;
    return Math.max(NEGAMON_MIN_STAT_STAGE, Math.min(NEGAMON_MAX_STAT_STAGE, Math.trunc(stage)));
}

export function getStatStageMultiplier(stage: number): number {
    const clamped = clampStatStage(stage);
    if (clamped >= 0) {
        return POSITIVE_STAGE_MULTIPLIERS[clamped];
    }
    return NEGATIVE_STAGE_MULTIPLIERS[Math.abs(clamped)];
}

export function applyStatStage(baseValue: number, stage: number): number {
    return Math.max(1, Math.floor(baseValue * getStatStageMultiplier(stage)));
}

export function applyCombatStatStages(input: {
    stats: NegamonFormulaStats;
    statStages: NegamonFormulaStatStages;
}): NegamonFormulaStats {
    return {
        maxHp: input.stats.maxHp,
        attack: applyStatStage(input.stats.attack, input.statStages.attack),
        defense: applyStatStage(input.stats.defense, input.statStages.defense),
        specialAttack: applyStatStage(input.stats.specialAttack, input.statStages.specialAttack),
        specialDefense: applyStatStage(input.stats.specialDefense, input.statStages.specialDefense),
        speed: applyStatStage(input.stats.speed, input.statStages.speed),
    };
}

export function mergeStatStageDelta(
    stages: NegamonFormulaStatStages,
    stat: NegamonFormulaStatStageKey,
    delta: number
): NegamonFormulaStatStages {
    return {
        ...stages,
        [stat]: clampStatStage((stages[stat] ?? 0) + delta),
    };
}
