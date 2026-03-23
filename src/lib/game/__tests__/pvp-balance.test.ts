/**
 * Unit Tests for PvP Balance System
 *
 * Covers:
 * - getPvpMatchupMultiplier: all 5 matchups + non-matchups
 * - applyPvpSkill: Shield Wall, Meteor, Backstab+Execution combo
 * - applyPvpDamage: Shield Wall reduction, counter decrement
 * - applyRangerCritBonus: RANGER crit=1.0 always triggers, non-RANGER never
 * - applyMpDrain: MP clamps to 0, mpDrained flag
 * - canUseSkill: blocked when mpDrained
 *
 * **Validates: Requirements 13**
 */
import { describe, it, expect } from "vitest";
import {
  getPvpMatchupMultiplier,
  applyPvpSkill,
  applyPvpDamage,
  applyRangerCritBonus,
  applyMpDrain,
  canUseSkill,
  PvpBattleState,
} from "../battle-engine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<PvpBattleState> = {}): PvpBattleState {
  return {
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    atk: 100,
    mag: 80,
    crit: 0,
    jobClass: null,
    skills: [],
    shieldWallTurnsRemaining: 0,
    lastSkillUsed: null,
    mpDrained: false,
    ...overrides,
  };
}

// ─── getPvpMatchupMultiplier ──────────────────────────────────────────────────

describe("getPvpMatchupMultiplier", () => {
  it("WARRIOR vs HEALER returns 1.2", () => {
    expect(getPvpMatchupMultiplier("WARRIOR", "HEALER")).toBe(1.2);
  });

  it("MAGE vs WARRIOR returns 1.2", () => {
    expect(getPvpMatchupMultiplier("MAGE", "WARRIOR")).toBe(1.2);
  });

  it("ROGUE vs MAGE returns 1.2", () => {
    expect(getPvpMatchupMultiplier("ROGUE", "MAGE")).toBe(1.2);
  });

  it("RANGER vs HEALER returns 1.2", () => {
    expect(getPvpMatchupMultiplier("RANGER", "HEALER")).toBe(1.2);
  });

  it("HEALER vs ROGUE returns 1.2", () => {
    expect(getPvpMatchupMultiplier("HEALER", "ROGUE")).toBe(1.2);
  });

  it("WARRIOR vs MAGE (no matchup) returns 1.0", () => {
    expect(getPvpMatchupMultiplier("WARRIOR", "MAGE")).toBe(1.0);
  });

  it("MAGE vs ROGUE (no matchup) returns 1.0", () => {
    expect(getPvpMatchupMultiplier("MAGE", "ROGUE")).toBe(1.0);
  });

  it("HEALER vs WARRIOR (no matchup) returns 1.0", () => {
    expect(getPvpMatchupMultiplier("HEALER", "WARRIOR")).toBe(1.0);
  });

  it("null attacker returns 1.0", () => {
    expect(getPvpMatchupMultiplier(null, "WARRIOR")).toBe(1.0);
  });

  it("null defender returns 1.0", () => {
    expect(getPvpMatchupMultiplier("WARRIOR", null)).toBe(1.0);
  });

  it("both null returns 1.0", () => {
    expect(getPvpMatchupMultiplier(null, null)).toBe(1.0);
  });
});

// ─── applyPvpSkill ────────────────────────────────────────────────────────────

describe("applyPvpSkill", () => {
  describe("warrior_shield_wall", () => {
    it("sets shieldWallTurnsRemaining to 2 on attacker", () => {
      const attacker = makeState();
      const defender = makeState();
      const result = applyPvpSkill(attacker, defender, "warrior_shield_wall");
      expect(attacker.shieldWallTurnsRemaining).toBe(2);
      expect(result.damage).toBe(0);
      expect(result.effect).toBe("SHIELD_WALL");
    });
  });

  describe("mage_meteor", () => {
    it("deals MAG × 3.0 damage", () => {
      const attacker = makeState({ mag: 80 });
      const defender = makeState();
      const result = applyPvpSkill(attacker, defender, "mage_meteor");
      expect(result.damage).toBe(240); // 80 * 3.0
      expect(result.effect).toBe("METEOR");
    });

    it("scales with attacker MAG stat", () => {
      const attacker = makeState({ mag: 150 });
      const defender = makeState();
      const result = applyPvpSkill(attacker, defender, "mage_meteor");
      expect(result.damage).toBe(450); // 150 * 3.0
    });
  });

  describe("rogue_backstab", () => {
    it("deals ATK × 2.0 damage and sets lastSkillUsed", () => {
      const attacker = makeState({ atk: 100 });
      const defender = makeState();
      const result = applyPvpSkill(attacker, defender, "rogue_backstab");
      expect(result.damage).toBe(200); // 100 * 2.0
      expect(result.effect).toBe("BACKSTAB");
      expect(attacker.lastSkillUsed).toBe("rogue_backstab");
    });
  });

  describe("rogue_execution", () => {
    it("applies ×2.5 multiplier when preceded by Backstab and target < 30% HP", () => {
      const attacker = makeState({ atk: 100, lastSkillUsed: "rogue_backstab" });
      const defender = makeState({ hp: 20, maxHp: 100 }); // 20% HP
      const result = applyPvpSkill(attacker, defender, "rogue_execution");
      expect(result.damage).toBe(750); // 100 * 3.0 * 2.5
      expect(result.effect).toBe("EXECUTION");
    });

    it("does NOT apply ×2.5 when target is at 30% HP (boundary)", () => {
      const attacker = makeState({ atk: 100, lastSkillUsed: "rogue_backstab" });
      const defender = makeState({ hp: 30, maxHp: 100 }); // exactly 30%
      const result = applyPvpSkill(attacker, defender, "rogue_execution");
      expect(result.damage).toBe(300); // 100 * 3.0 (no combo)
    });

    it("does NOT apply ×2.5 without prior Backstab even if target < 30% HP", () => {
      const attacker = makeState({ atk: 100, lastSkillUsed: null });
      const defender = makeState({ hp: 10, maxHp: 100 }); // 10% HP
      const result = applyPvpSkill(attacker, defender, "rogue_execution");
      expect(result.damage).toBe(300); // 100 * 3.0 (no combo)
    });

    it("does NOT apply ×2.5 when lastSkillUsed is something else", () => {
      const attacker = makeState({ atk: 100, lastSkillUsed: "rogue_dodge" });
      const defender = makeState({ hp: 10, maxHp: 100 });
      const result = applyPvpSkill(attacker, defender, "rogue_execution");
      expect(result.damage).toBe(300);
    });
  });
});

// ─── applyPvpDamage ───────────────────────────────────────────────────────────

describe("applyPvpDamage", () => {
  it("reduces damage by 50% when Shield Wall is active", () => {
    const defender = makeState({ hp: 100, shieldWallTurnsRemaining: 2 });
    const actualDamage = applyPvpDamage(defender, 100);
    expect(actualDamage).toBe(50);
    expect(defender.hp).toBe(50);
  });

  it("decrements shieldWallTurnsRemaining after blocking", () => {
    const defender = makeState({ hp: 100, shieldWallTurnsRemaining: 2 });
    applyPvpDamage(defender, 100);
    expect(defender.shieldWallTurnsRemaining).toBe(1);
  });

  it("Shield Wall expires after 2 uses", () => {
    const defender = makeState({ hp: 200, shieldWallTurnsRemaining: 2 });
    applyPvpDamage(defender, 100); // turn 1: 50 damage, counter → 1
    applyPvpDamage(defender, 100); // turn 2: 50 damage, counter → 0
    applyPvpDamage(defender, 100); // turn 3: full 100 damage
    expect(defender.shieldWallTurnsRemaining).toBe(0);
    expect(defender.hp).toBe(200 - 50 - 50 - 100); // 0
  });

  it("applies full damage when Shield Wall counter is 0", () => {
    const defender = makeState({ hp: 100, shieldWallTurnsRemaining: 0 });
    const actualDamage = applyPvpDamage(defender, 60);
    expect(actualDamage).toBe(60);
    expect(defender.hp).toBe(40);
  });

  it("HP does not go below 0", () => {
    const defender = makeState({ hp: 10, shieldWallTurnsRemaining: 0 });
    applyPvpDamage(defender, 1000);
    expect(defender.hp).toBe(0);
  });
});

// ─── applyRangerCritBonus ─────────────────────────────────────────────────────

describe("applyRangerCritBonus", () => {
  it("RANGER with crit=1.0 always gets 150% bonus (total 250%)", () => {
    const attacker = makeState({ jobClass: "RANGER", crit: 1.0 });
    const result = applyRangerCritBonus(attacker, 100);
    expect(result).toBe(250); // 100 + floor(100 * 1.5)
  });

  it("RANGER with crit=0.0 never gets bonus", () => {
    const attacker = makeState({ jobClass: "RANGER", crit: 0.0 });
    const result = applyRangerCritBonus(attacker, 100);
    expect(result).toBe(100);
  });

  it("non-RANGER with crit=1.0 never gets bonus", () => {
    const attacker = makeState({ jobClass: "WARRIOR", crit: 1.0 });
    const result = applyRangerCritBonus(attacker, 100);
    expect(result).toBe(100);
  });

  it("null jobClass with crit=1.0 never gets bonus", () => {
    const attacker = makeState({ jobClass: null, crit: 1.0 });
    const result = applyRangerCritBonus(attacker, 100);
    expect(result).toBe(100);
  });

  it("RANGER crit bonus uses floor for fractional base damage", () => {
    const attacker = makeState({ jobClass: "RANGER", crit: 1.0 });
    const result = applyRangerCritBonus(attacker, 50);
    expect(result).toBe(125); // 50 + floor(50 * 1.5) = 50 + 75
  });
});

// ─── applyMpDrain ─────────────────────────────────────────────────────────────

describe("applyMpDrain", () => {
  it("reduces MP by the given amount", () => {
    const target = makeState({ mp: 50 });
    applyMpDrain(target, 20);
    expect(target.mp).toBe(30);
    expect(target.mpDrained).toBe(false);
  });

  it("clamps MP to 0 when drain exceeds current MP", () => {
    const target = makeState({ mp: 10 });
    applyMpDrain(target, 100);
    expect(target.mp).toBe(0);
  });

  it("sets mpDrained to true when MP reaches 0", () => {
    const target = makeState({ mp: 20 });
    applyMpDrain(target, 20);
    expect(target.mp).toBe(0);
    expect(target.mpDrained).toBe(true);
  });

  it("sets mpDrained to true when drain exceeds MP", () => {
    const target = makeState({ mp: 5 });
    applyMpDrain(target, 50);
    expect(target.mp).toBe(0);
    expect(target.mpDrained).toBe(true);
  });

  it("does not set mpDrained when MP remains above 0", () => {
    const target = makeState({ mp: 50 });
    applyMpDrain(target, 1);
    expect(target.mpDrained).toBe(false);
  });
});

// ─── canUseSkill ──────────────────────────────────────────────────────────────

describe("canUseSkill", () => {
  it("returns true when mpDrained is false", () => {
    const player = makeState({ mpDrained: false });
    expect(canUseSkill(player)).toBe(true);
  });

  it("returns false when mpDrained is true", () => {
    const player = makeState({ mpDrained: true });
    expect(canUseSkill(player)).toBe(false);
  });

  it("returns false after MP is fully drained via applyMpDrain", () => {
    const player = makeState({ mp: 10 });
    applyMpDrain(player, 10);
    expect(canUseSkill(player)).toBe(false);
  });
});
