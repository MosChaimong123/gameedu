"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEGAMON_STAT_GROWTH_MULTIPLIERS = exports.NEGAMON_STAT_GROWTH_LEVELS = exports.NEGAMON_FORM_LEVEL_BANDS = exports.NEGAMON_LEGACY_RANK_LEVEL_FLOORS = exports.NEGAMON_BASE_ENERGY_REGEN = exports.NEGAMON_BASE_ENERGY = exports.NEGAMON_MAX_LEVEL = exports.NEGAMON_MIN_LEVEL = exports.NEGAMON_MAX_RANK_INDEX = exports.NEGAMON_MIN_RANK_INDEX = void 0;
exports.normalizeNegamonRankIndex = normalizeNegamonRankIndex;
exports.normalizeNegamonLevel = normalizeNegamonLevel;
exports.getNegamonLevelFromRank = getNegamonLevelFromRank;
exports.getNegamonEvolutionThresholds = getNegamonEvolutionThresholds;
exports.getNegamonFormIndexFromLevel = getNegamonFormIndexFromLevel;
exports.getNegamonFormLevelBand = getNegamonFormLevelBand;
exports.getNegamonCumulativeExpForLevel = getNegamonCumulativeExpForLevel;
exports.getNegamonLevelFromExp = getNegamonLevelFromExp;
exports.getNegamonRankIndexFromLevel = getNegamonRankIndexFromLevel;
exports.getNegamonStatMultipliersForLevel = getNegamonStatMultipliersForLevel;
exports.calculateNegamonStatsForLevel = calculateNegamonStatsForLevel;
exports.calculateNegamonStats = calculateNegamonStats;
exports.calculateNegamonExpProgress = calculateNegamonExpProgress;
exports.NEGAMON_MIN_RANK_INDEX = 0;
exports.NEGAMON_MAX_RANK_INDEX = 5;
exports.NEGAMON_MIN_LEVEL = 1;
exports.NEGAMON_MAX_LEVEL = 60;
exports.NEGAMON_BASE_ENERGY = 40;
exports.NEGAMON_BASE_ENERGY_REGEN = 10;
exports.NEGAMON_LEGACY_RANK_LEVEL_FLOORS = [1, 8, 16, 26, 38, 50];
exports.NEGAMON_FORM_LEVEL_BANDS = [
    { formIndex: 0, levelMin: 1, levelMax: 7 },
    { formIndex: 1, levelMin: 8, levelMax: 15 },
    { formIndex: 2, levelMin: 16, levelMax: 25 },
    { formIndex: 3, levelMin: 26, levelMax: 37 },
    { formIndex: 4, levelMin: 38, levelMax: 49 },
    { formIndex: 5, levelMin: 50, levelMax: 60 },
];
exports.NEGAMON_STAT_GROWTH_LEVELS = [1, 8, 16, 26, 38, 50, 60];
exports.NEGAMON_STAT_GROWTH_MULTIPLIERS = {
    hp: [1.3, 1.6, 1.9, 2.2, 2.5, 2.8, 3.0],
    atk: [1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.65],
    def: [1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.65],
    spd: [1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.3],
};
const NEGAMON_ROLE_GROWTH_OFFSETS = {
    burst: { hp: -0.04, atk: 0.08, def: -0.04, spd: 0.02 },
    tempo: { hp: -0.05, atk: 0.03, def: -0.03, spd: 0.1 },
    wall: { hp: 0.12, atk: -0.04, def: 0.14, spd: -0.08 },
    support: { hp: 0.08, atk: -0.08, def: 0.08, spd: 0.01 },
    control: { hp: -0.01, atk: 0.01, def: 0.02, spd: 0.07 },
    bruiser: { hp: 0.08, atk: 0.05, def: 0.06, spd: -0.03 },
};
function normalizeNegamonRankIndex(rankIndex) {
    if (!Number.isFinite(rankIndex))
        return exports.NEGAMON_MIN_RANK_INDEX;
    return Math.max(exports.NEGAMON_MIN_RANK_INDEX, Math.min(exports.NEGAMON_MAX_RANK_INDEX, Math.floor(rankIndex)));
}
function normalizeNegamonLevel(level) {
    if (!Number.isFinite(level))
        return exports.NEGAMON_MIN_LEVEL;
    return Math.max(exports.NEGAMON_MIN_LEVEL, Math.min(exports.NEGAMON_MAX_LEVEL, Math.floor(level)));
}
function getNegamonLevelFromRank(rankIndex) {
    return exports.NEGAMON_LEGACY_RANK_LEVEL_FLOORS[normalizeNegamonRankIndex(rankIndex)];
}
function getNegamonEvolutionThresholds() {
    return exports.NEGAMON_FORM_LEVEL_BANDS.slice(1).map((band) => band.levelMin);
}
function getNegamonFormIndexFromLevel(level) {
    var _a;
    const normalizedLevel = normalizeNegamonLevel(level);
    const band = [...exports.NEGAMON_FORM_LEVEL_BANDS]
        .reverse()
        .find((entry) => normalizedLevel >= entry.levelMin);
    return (_a = band === null || band === void 0 ? void 0 : band.formIndex) !== null && _a !== void 0 ? _a : exports.NEGAMON_MIN_RANK_INDEX;
}
function getNegamonFormLevelBand(formIndex) {
    return exports.NEGAMON_FORM_LEVEL_BANDS[normalizeNegamonRankIndex(formIndex)];
}
function getNegamonCumulativeExpForLevel(level) {
    const normalizedLevel = normalizeNegamonLevel(level);
    if (normalizedLevel <= 1)
        return 0;
    let total = 0;
    for (let current = 2; current <= normalizedLevel; current += 1) {
        if (current <= 10) {
            total += 120 + (current - 2) * 20;
            continue;
        }
        if (current <= 25) {
            total += 300 + (current - 11) * 35;
            continue;
        }
        if (current <= 40) {
            total += 850 + (current - 26) * 55;
            continue;
        }
        total += 1700 + (current - 41) * 90;
    }
    return total;
}
function getNegamonLevelFromExp(exp) {
    const normalizedExp = Math.max(0, Math.floor(exp));
    let resolvedLevel = exports.NEGAMON_MIN_LEVEL;
    for (let level = exports.NEGAMON_MIN_LEVEL + 1; level <= exports.NEGAMON_MAX_LEVEL; level += 1) {
        if (normalizedExp < getNegamonCumulativeExpForLevel(level))
            break;
        resolvedLevel = level;
    }
    return resolvedLevel;
}
function getNegamonRankIndexFromLevel(level) {
    return getNegamonFormIndexFromLevel(level);
}
function interpolateNegamonGrowthMultiplier(level, multipliers) {
    const normalizedLevel = normalizeNegamonLevel(level);
    if (normalizedLevel <= exports.NEGAMON_STAT_GROWTH_LEVELS[0])
        return multipliers[0];
    for (let i = 1; i < exports.NEGAMON_STAT_GROWTH_LEVELS.length; i += 1) {
        const previousLevel = exports.NEGAMON_STAT_GROWTH_LEVELS[i - 1];
        const currentLevel = exports.NEGAMON_STAT_GROWTH_LEVELS[i];
        const previousMultiplier = multipliers[i - 1];
        const currentMultiplier = multipliers[i];
        if (normalizedLevel <= currentLevel) {
            const progress = (normalizedLevel - previousLevel) / Math.max(1, currentLevel - previousLevel);
            return previousMultiplier + (currentMultiplier - previousMultiplier) * progress;
        }
    }
    return multipliers[multipliers.length - 1];
}
function getRoleGrowthProgress(level) {
    const normalizedLevel = normalizeNegamonLevel(level);
    return (normalizedLevel - exports.NEGAMON_MIN_LEVEL) / Math.max(1, exports.NEGAMON_MAX_LEVEL - exports.NEGAMON_MIN_LEVEL);
}
function applyRoleGrowthOffset(base, level, battleRole) {
    if (!battleRole)
        return base;
    const progress = getRoleGrowthProgress(level);
    const offsets = NEGAMON_ROLE_GROWTH_OFFSETS[battleRole];
    return {
        hp: Math.max(1, base.hp + offsets.hp * progress),
        atk: Math.max(1, base.atk + offsets.atk * progress),
        def: Math.max(1, base.def + offsets.def * progress),
        spd: Math.max(1, base.spd + offsets.spd * progress),
    };
}
function getNegamonStatMultipliersForLevel(level, battleRole) {
    const base = {
        hp: interpolateNegamonGrowthMultiplier(level, exports.NEGAMON_STAT_GROWTH_MULTIPLIERS.hp),
        atk: interpolateNegamonGrowthMultiplier(level, exports.NEGAMON_STAT_GROWTH_MULTIPLIERS.atk),
        def: interpolateNegamonGrowthMultiplier(level, exports.NEGAMON_STAT_GROWTH_MULTIPLIERS.def),
        spd: interpolateNegamonGrowthMultiplier(level, exports.NEGAMON_STAT_GROWTH_MULTIPLIERS.spd),
    };
    return applyRoleGrowthOffset(base, level, battleRole);
}
function calculateNegamonStatsForLevel(baseStats, level, battleRole) {
    const multipliers = getNegamonStatMultipliersForLevel(level, battleRole);
    return {
        hp: Math.floor(baseStats.hp * multipliers.hp),
        atk: Math.floor(baseStats.atk * multipliers.atk),
        def: Math.floor(baseStats.def * multipliers.def),
        spd: Math.floor(baseStats.spd * multipliers.spd),
    };
}
function calculateNegamonStats(baseStats, rankIndex, battleRole) {
    return calculateNegamonStatsForLevel(baseStats, getNegamonLevelFromRank(rankIndex), battleRole);
}
function calculateNegamonExpProgress(input) {
    var _a;
    const rankIndex = normalizeNegamonRankIndex(input.rankIndex);
    const floorLevel = getNegamonLevelFromRank(rankIndex);
    const expPerPoint = Math.max(1, Math.floor((_a = input.expPerPoint) !== null && _a !== void 0 ? _a : 6));
    const exp = Math.max(getNegamonCumulativeExpForLevel(floorLevel), Math.max(0, Math.floor(input.points * expPerPoint)));
    const level = Math.max(floorLevel, getNegamonLevelFromExp(exp));
    const nextLevel = Math.min(exports.NEGAMON_MAX_LEVEL, level + 1);
    const expToNextLevel = level >= exports.NEGAMON_MAX_LEVEL
        ? 0
        : Math.max(0, getNegamonCumulativeExpForLevel(nextLevel) - exp);
    const formIndex = getNegamonFormIndexFromLevel(level);
    return {
        level,
        exp,
        expToNextLevel,
        formIndex,
        rankIndex,
        evolutionStage: formIndex,
    };
}
