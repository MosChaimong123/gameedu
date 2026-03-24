import { describe, expect, it } from "vitest";
import {
  buildStudentItemStatSnapshot,
  getEnhancementMultiplier,
} from "../student-item-stats";

describe("student-item-stats helpers", () => {
  it("returns linear enhancement multipliers", () => {
    expect(getEnhancementMultiplier(0)).toBe(1);
    expect(getEnhancementMultiplier(3)).toBe(1.3);
    expect(getEnhancementMultiplier(10)).toBe(2);
  });

  it("builds a zero-safe snapshot for missing stats", () => {
    expect(buildStudentItemStatSnapshot({}, 0)).toEqual({
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

  it("scales integer stats with floor rounding", () => {
    expect(
      buildStudentItemStatSnapshot(
        {
          baseHp: 55,
          baseAtk: 11,
          baseDef: 9,
          baseSpd: 7,
          baseMag: 13,
          baseMp: 21,
        },
        2
      )
    ).toEqual({
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

  it("rounds decimal stats to 3 places", () => {
    expect(
      buildStudentItemStatSnapshot(
        {
          baseCrit: 0.037,
          baseLuck: 0.028,
        },
        3
      )
    ).toEqual({
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
