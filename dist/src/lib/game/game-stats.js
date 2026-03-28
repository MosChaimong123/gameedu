"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultGameStats = getDefaultGameStats;
exports.parseGameStats = parseGameStats;
exports.toPrismaJson = toPrismaJson;
const skill_tree_1 = require("./skill-tree");
function getDefaultGameStats() {
    return {
        gold: 0,
        level: 1,
        xp: 0,
        inventory: [],
        equipment: {},
        multipliers: {
            gold: 1,
            xp: 1,
        },
        skillPointsAvailable: 0,
        skillPointsSpent: 0,
        skillTreeProgress: {},
    };
}
function parseGameStats(gameStats) {
    var _a, _b;
    const defaults = getDefaultGameStats();
    if (!gameStats)
        return defaults;
    if (typeof gameStats === "string") {
        try {
            const parsed = JSON.parse(gameStats);
            const merged = { ...defaults, ...parsed };
            return {
                ...merged,
                ...(0, skill_tree_1.normalizeSkillTreeState)({
                    skillPointsAvailable: merged.skillPointsAvailable,
                    skillPointsSpent: merged.skillPointsSpent,
                    skillTreeProgress: merged.skillTreeProgress,
                    lastRespecAt: merged.lastRespecAt,
                }, (_a = merged.level) !== null && _a !== void 0 ? _a : 1),
            };
        }
        catch {
            return defaults;
        }
    }
    if (typeof gameStats === "object") {
        const merged = { ...defaults, ...gameStats };
        return {
            ...merged,
            ...(0, skill_tree_1.normalizeSkillTreeState)({
                skillPointsAvailable: merged.skillPointsAvailable,
                skillPointsSpent: merged.skillPointsSpent,
                skillTreeProgress: merged.skillTreeProgress,
                lastRespecAt: merged.lastRespecAt,
            }, (_b = merged.level) !== null && _b !== void 0 ? _b : 1),
        };
    }
    return defaults;
}
function toPrismaJson(value) {
    return value;
}
