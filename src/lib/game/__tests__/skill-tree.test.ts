import { describe, expect, it } from "vitest";
import {
  applySkillRespec,
  applySkillUpgrade,
  buildSkillTreeView,
  calculateRespecCost,
  getEffectiveSkillAtRank,
  normalizeSkillTreeState,
  validateSkillUpgrade,
} from "../skill-tree";

describe("skill-tree", () => {
  const skill = {
    id: "mage_fireball",
    name: "Fireball",
    description: "Deal damage",
    cost: 10,
    costType: "MP" as const,
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

  it("normalizes state from level when missing fields", () => {
    const state = normalizeSkillTreeState({}, 7);
    expect(state.skillPointsAvailable).toBe(6);
    expect(state.skillPointsSpent).toBe(0);
    expect(state.skillTreeProgress).toEqual({});
  });

  it("validates and upgrades skill ranks", () => {
    const state = normalizeSkillTreeState({}, 10);
    const validation = validateSkillUpgrade({ skill, state, level: 10 });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const upgraded = applySkillUpgrade(state, skill.id);
    expect(upgraded.skillTreeProgress[skill.id]).toBe(1);
    expect(upgraded.skillPointsSpent).toBe(1);
    expect(upgraded.skillPointsAvailable).toBe(state.skillPointsAvailable - 1);
  });

  it("scales skill stats by rank", () => {
    const ranked = getEffectiveSkillAtRank(skill, 2);
    expect(ranked.cost).toBe(12);
    expect(ranked.damageMultiplier).toBe(2.8);
  });

  it("builds lock reasons for tree view", () => {
    const lowState = normalizeSkillTreeState({}, 1);
    const nodes = buildSkillTreeView({
      skills: [skill],
      state: lowState,
      level: 1,
    });
    expect(nodes[0].canUpgrade).toBe(false);
    expect(nodes[0].lockReason).toBe("LEVEL_REQUIRED");
  });

  it("respec refunds points and resets progress", () => {
    const state = {
      skillPointsAvailable: 2,
      skillPointsSpent: 3,
      skillTreeProgress: { mage_fireball: 3 },
    };
    const reset = applySkillRespec(state);
    expect(reset.skillPointsAvailable).toBe(5);
    expect(reset.skillPointsSpent).toBe(0);
    expect(reset.skillTreeProgress).toEqual({});
    expect(typeof reset.lastRespecAt).toBe("string");
  });

  it("computes respec cost by level", () => {
    expect(calculateRespecCost(1)).toBe(575);
    expect(calculateRespecCost(10)).toBe(1250);
  });
});
