import { describe, it, expect } from "vitest";
import {
  getMergedClassDef,
  getSkillsForLevel,
  getNewlyUnlockedSkills,
  getStatMultipliers,
  getPvpMatchupBaseClass,
  resolveEffectiveJobKey,
  normalizeJobName,
} from "../job-system";

describe("Job extensions (Advance/Master)", () => {
  it("getSkillsForLevel(KNIGHT, 20) includes advance-only skills", () => {
    const skills = getSkillsForLevel("KNIGHT", 20);
    expect(skills.some((s) => s.id === "knight_shield_bash")).toBe(true);
  });

  it("getMergedClassDef chains PALADIN to include WARRIOR + KNIGHT + PALADIN skills", () => {
    const def = getMergedClassDef("PALADIN");
    const ids = new Set(def.skills.map((s) => s.id));
    expect(ids.has("warrior_slash")).toBe(true);
    expect(ids.has("knight_shield_bash")).toBe(true);
    expect(ids.has("paladin_smite")).toBe(true);
  });

  it("getNewlyUnlockedSkills uses merged list for effective key", () => {
    const at19 = getNewlyUnlockedSkills("KNIGHT", 19, 20, []);
    expect(at19).toContain("knight_shield_bash");
  });

  it("getStatMultipliers differs for KNIGHT vs WARRIOR at BASE tier", () => {
    const w = getStatMultipliers("WARRIOR", "BASE");
    const k = getStatMultipliers("KNIGHT", "BASE");
    expect(k.def).toBeGreaterThan(w.def);
  });

  it("normalizeJobName preserves spaced master names", () => {
    expect(normalizeJobName("death knight")).toBe("DEATH KNIGHT");
  });

  it("getPvpMatchupBaseClass maps KNIGHT to WARRIOR", () => {
    expect(getPvpMatchupBaseClass("KNIGHT")).toBe("WARRIOR");
  });

  it("resolveEffectiveJobKey uses advanceClass when tier is ADVANCE", () => {
    expect(
      resolveEffectiveJobKey({
        jobClass: "WARRIOR",
        jobTier: "ADVANCE",
        advanceClass: "KNIGHT",
      })
    ).toBe("KNIGHT");
  });
});
