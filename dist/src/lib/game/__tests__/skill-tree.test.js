"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const skill_tree_1 = require("../skill-tree");
(0, vitest_1.describe)("skill-tree", () => {
    const skill = {
        id: "mage_fireball",
        name: "Fireball",
        description: "Deal damage",
        cost: 10,
        costType: "MP",
        unlockLevel: 5,
        requiredLevel: 5,
        maxRank: 3,
        prerequisite: [],
        damageMultiplier: 2,
        rankScales: {
            damageMultiplierPerRank: 0.2,
            costPerRank: 1,
        },
    };
    (0, vitest_1.it)("normalizes state from level when missing fields", () => {
        const state = (0, skill_tree_1.normalizeSkillTreeState)({}, 7);
        (0, vitest_1.expect)(state.skillPointsAvailable).toBe(6);
        (0, vitest_1.expect)(state.skillPointsSpent).toBe(0);
        (0, vitest_1.expect)(state.skillTreeProgress).toEqual({});
    });
    (0, vitest_1.it)("validates and upgrades skill ranks", () => {
        const state = (0, skill_tree_1.normalizeSkillTreeState)({}, 10);
        const validation = (0, skill_tree_1.validateSkillUpgrade)({ skill, state, level: 10 });
        (0, vitest_1.expect)(validation.ok).toBe(true);
        if (!validation.ok)
            return;
        const upgraded = (0, skill_tree_1.applySkillUpgrade)(state, skill.id);
        (0, vitest_1.expect)(upgraded.skillTreeProgress[skill.id]).toBe(1);
        (0, vitest_1.expect)(upgraded.skillPointsSpent).toBe(1);
        (0, vitest_1.expect)(upgraded.skillPointsAvailable).toBe(state.skillPointsAvailable - 1);
    });
    (0, vitest_1.it)("scales skill stats by rank", () => {
        const ranked = (0, skill_tree_1.getEffectiveSkillAtRank)(skill, 2);
        (0, vitest_1.expect)(ranked.cost).toBe(12);
        (0, vitest_1.expect)(ranked.damageMultiplier).toBe(2.8);
    });
    (0, vitest_1.it)("builds lock reasons for tree view", () => {
        const lowState = (0, skill_tree_1.normalizeSkillTreeState)({}, 1);
        const nodes = (0, skill_tree_1.buildSkillTreeView)({
            skills: [skill],
            state: lowState,
            level: 1,
        });
        (0, vitest_1.expect)(nodes[0].canUpgrade).toBe(false);
        (0, vitest_1.expect)(nodes[0].lockReason).toBe("LEVEL_REQUIRED");
    });
    (0, vitest_1.it)("respec refunds points and resets progress", () => {
        const state = {
            skillPointsAvailable: 2,
            skillPointsSpent: 3,
            skillTreeProgress: { mage_fireball: 3 },
        };
        const reset = (0, skill_tree_1.applySkillRespec)(state);
        (0, vitest_1.expect)(reset.skillPointsAvailable).toBe(5);
        (0, vitest_1.expect)(reset.skillPointsSpent).toBe(0);
        (0, vitest_1.expect)(reset.skillTreeProgress).toEqual({});
        (0, vitest_1.expect)(typeof reset.lastRespecAt).toBe("string");
    });
    (0, vitest_1.it)("computes respec cost by level", () => {
        (0, vitest_1.expect)((0, skill_tree_1.calculateRespecCost)(1)).toBe(575);
        (0, vitest_1.expect)((0, skill_tree_1.calculateRespecCost)(10)).toBe(1250);
    });
});
