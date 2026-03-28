"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const student_item_stats_1 = require("../student-item-stats");
(0, vitest_1.describe)("student-item-stats helpers", () => {
    (0, vitest_1.it)("returns linear enhancement multipliers", () => {
        (0, vitest_1.expect)((0, student_item_stats_1.getEnhancementMultiplier)(0)).toBe(1);
        (0, vitest_1.expect)((0, student_item_stats_1.getEnhancementMultiplier)(3)).toBe(1.3);
        (0, vitest_1.expect)((0, student_item_stats_1.getEnhancementMultiplier)(10)).toBe(2);
    });
    (0, vitest_1.it)("builds a zero-safe snapshot for missing stats", () => {
        (0, vitest_1.expect)((0, student_item_stats_1.buildStudentItemStatSnapshot)({}, 0)).toEqual({
            hp: 0,
            atk: 0,
            def: 0,
            spd: 0,
            crit: 0,
            luck: 0,
            mag: 0,
            mp: 0,
        });
    });
    (0, vitest_1.it)("scales integer stats with floor rounding", () => {
        (0, vitest_1.expect)((0, student_item_stats_1.buildStudentItemStatSnapshot)({
            baseHp: 55,
            baseAtk: 11,
            baseDef: 9,
            baseSpd: 7,
            baseMag: 13,
            baseMp: 21,
        }, 2)).toEqual({
            hp: 66,
            atk: 13,
            def: 10,
            spd: 8,
            crit: 0,
            luck: 0,
            mag: 15,
            mp: 25,
        });
    });
    (0, vitest_1.it)("rounds decimal stats to 3 places", () => {
        (0, vitest_1.expect)((0, student_item_stats_1.buildStudentItemStatSnapshot)({
            baseCrit: 0.037,
            baseLuck: 0.028,
        }, 3)).toEqual({
            hp: 0,
            atk: 0,
            def: 0,
            spd: 0,
            crit: 0.048,
            luck: 0.036,
            mag: 0,
            mp: 0,
        });
    });
});
