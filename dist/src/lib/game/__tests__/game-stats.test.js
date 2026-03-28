"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const game_stats_1 = require("../game-stats");
(0, vitest_1.describe)("game-stats helpers", () => {
    (0, vitest_1.it)("returns default stats when value is nullish", () => {
        (0, vitest_1.expect)((0, game_stats_1.parseGameStats)(null)).toEqual((0, game_stats_1.getDefaultGameStats)());
        (0, vitest_1.expect)((0, game_stats_1.parseGameStats)(undefined)).toEqual((0, game_stats_1.getDefaultGameStats)());
    });
    (0, vitest_1.it)("merges object values on top of defaults", () => {
        (0, vitest_1.expect)((0, game_stats_1.parseGameStats)({
            gold: 250,
            level: 4,
            multipliers: { gold: 2, xp: 3 },
        })).toEqual({
            gold: 250,
            level: 4,
            xp: 0,
            inventory: [],
            equipment: {},
            multipliers: { gold: 2, xp: 3 },
            skillPointsAvailable: 3,
            skillPointsSpent: 0,
            skillTreeProgress: {},
        });
    });
    (0, vitest_1.it)("parses valid JSON strings", () => {
        (0, vitest_1.expect)((0, game_stats_1.parseGameStats)('{"gold":500,"xp":25,"level":3}')).toEqual({
            gold: 500,
            level: 3,
            xp: 25,
            inventory: [],
            equipment: {},
            multipliers: { gold: 1, xp: 1 },
            skillPointsAvailable: 2,
            skillPointsSpent: 0,
            skillTreeProgress: {},
        });
    });
    (0, vitest_1.it)("falls back to defaults for invalid JSON strings", () => {
        (0, vitest_1.expect)((0, game_stats_1.parseGameStats)("{invalid-json")).toEqual((0, game_stats_1.getDefaultGameStats)());
    });
    (0, vitest_1.it)("falls back to defaults for unsupported primitive types", () => {
        (0, vitest_1.expect)((0, game_stats_1.parseGameStats)(123)).toEqual((0, game_stats_1.getDefaultGameStats)());
        (0, vitest_1.expect)((0, game_stats_1.parseGameStats)(true)).toEqual((0, game_stats_1.getDefaultGameStats)());
    });
});
