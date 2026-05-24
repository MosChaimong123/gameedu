import { clampStatStage, getStatStageMultiplier } from "./stat-stages";

export function getAccuracyStageMultiplier(accuracyStage: number, evasionStage: number): number {
    const netStage = clampStatStage(accuracyStage) - clampStatStage(evasionStage);
    return getStatStageMultiplier(netStage);
}

export function getEffectiveAccuracy(input: {
    baseAccuracy: number;
    accuracyStage: number;
    evasionStage: number;
    bonusMultiplier?: number;
}): number {
    const stageMultiplier = getAccuracyStageMultiplier(input.accuracyStage, input.evasionStage);
    const rawAccuracy = input.baseAccuracy * stageMultiplier * (input.bonusMultiplier ?? 1);
    return Math.max(0, Math.min(100, Math.floor(rawAccuracy)));
}

export function getCriticalChancePercent(critRateStage = 0): number {
    switch (Math.max(0, Math.trunc(critRateStage))) {
        case 0:
            return 6.25;
        case 1:
            return 12.5;
        case 2:
            return 25;
        case 3:
            return 33.33;
        default:
            return 50;
    }
}
