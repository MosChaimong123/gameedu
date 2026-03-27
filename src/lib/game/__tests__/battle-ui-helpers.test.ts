import { describe, expect, it } from "vitest";
import {
  getVisibleSkillIds,
  resolveBattleMaxStamina,
  resolveBattleStamina,
  resolveSoloFarmingResources,
} from "../battle-ui-helpers";

describe("battle-ui-helpers", () => {
  it("prefers stamina aliases over legacy ap fields in battle view", () => {
    expect(resolveBattleStamina({ stamina: 80, ap: 50 })).toBe(80);
    expect(resolveBattleMaxStamina({ maxStamina: 120, maxAp: 100 })).toBe(120);
  });

  it("falls back to legacy ap fields when stamina aliases are missing", () => {
    expect(resolveBattleStamina({ ap: 45, stamina: undefined })).toBe(45);
    expect(resolveBattleMaxStamina({ maxAp: 90, maxStamina: undefined })).toBe(90);
  });

  it("resolves solo farming resources from farming state first", () => {
    expect(
      resolveSoloFarmingResources(
        {
          wave: 2,
          monster: { name: "Slime", hp: 10, maxHp: 20, atk: 3, wave: 2, statusEffects: [] },
          ap: 10,
          stamina: 30,
          maxStamina: 80,
          mp: 12,
        },
        {
          ap: 5,
          stamina: 6,
          maxAp: 50,
          maxStamina: 60,
          mp: 7,
          maxMp: 40,
        }
      )
    ).toEqual({
      stamina: 30,
      maxStamina: 80,
      mp: 12,
      maxMp: 40,
    });
  });

  it("falls back to player values when solo farming state aliases are absent", () => {
    expect(
      resolveSoloFarmingResources(
        null,
        {
          ap: 14,
          stamina: undefined,
          maxAp: 100,
          maxStamina: undefined,
          mp: 9,
          maxMp: 25,
        }
      )
    ).toEqual({
      stamina: 14,
      maxStamina: 100,
      mp: 9,
      maxMp: 25,
    });
  });

  it("limits visible skills to the requested amount", () => {
    expect(getVisibleSkillIds(["a", "b", "c", "d"], 3)).toEqual(["a", "b", "c"]);
    expect(getVisibleSkillIds(["a", "b"], 4)).toEqual(["a", "b"]);
  });
});
