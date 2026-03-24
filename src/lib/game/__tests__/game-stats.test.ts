import { describe, expect, it } from "vitest";
import { getDefaultGameStats, parseGameStats } from "../game-stats";

describe("game-stats helpers", () => {
  it("returns default stats when value is nullish", () => {
    expect(parseGameStats(null)).toEqual(getDefaultGameStats());
    expect(parseGameStats(undefined)).toEqual(getDefaultGameStats());
  });

  it("merges object values on top of defaults", () => {
    expect(
      parseGameStats({
        gold: 250,
        level: 4,
        multipliers: { gold: 2, xp: 3 },
      })
    ).toEqual({
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

  it("parses valid JSON strings", () => {
    expect(parseGameStats('{"gold":500,"xp":25,"level":3}')).toEqual({
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

  it("falls back to defaults for invalid JSON strings", () => {
    expect(parseGameStats("{invalid-json")).toEqual(getDefaultGameStats());
  });

  it("falls back to defaults for unsupported primitive types", () => {
    expect(parseGameStats(123)).toEqual(getDefaultGameStats());
    expect(parseGameStats(true)).toEqual(getDefaultGameStats());
  });
});
