"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const vitest_1 = require("vitest");
const battle_engine_1 = require("../battle-engine");
// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeState(overrides = {}) {
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
(0, vitest_1.describe)("getPvpMatchupMultiplier", () => {
    (0, vitest_1.it)("WARRIOR vs HEALER returns 1.2", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("WARRIOR", "HEALER")).toBe(1.2);
    });
    (0, vitest_1.it)("MAGE vs WARRIOR returns 1.2", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("MAGE", "WARRIOR")).toBe(1.2);
    });
    (0, vitest_1.it)("ROGUE vs MAGE returns 1.2", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("ROGUE", "MAGE")).toBe(1.2);
    });
    (0, vitest_1.it)("RANGER vs HEALER returns 1.2", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("RANGER", "HEALER")).toBe(1.2);
    });
    (0, vitest_1.it)("HEALER vs ROGUE returns 1.2", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("HEALER", "ROGUE")).toBe(1.2);
    });
    (0, vitest_1.it)("WARRIOR vs MAGE (no matchup) returns 1.0", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("WARRIOR", "MAGE")).toBe(1.0);
    });
    (0, vitest_1.it)("MAGE vs ROGUE (no matchup) returns 1.0", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("MAGE", "ROGUE")).toBe(1.0);
    });
    (0, vitest_1.it)("HEALER vs WARRIOR (no matchup) returns 1.0", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("HEALER", "WARRIOR")).toBe(1.0);
    });
    (0, vitest_1.it)("null attacker returns 1.0", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)(null, "WARRIOR")).toBe(1.0);
    });
    (0, vitest_1.it)("null defender returns 1.0", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)("WARRIOR", null)).toBe(1.0);
    });
    (0, vitest_1.it)("both null returns 1.0", () => {
        (0, vitest_1.expect)((0, battle_engine_1.getPvpMatchupMultiplier)(null, null)).toBe(1.0);
    });
});
// ─── applyPvpSkill ────────────────────────────────────────────────────────────
(0, vitest_1.describe)("applyPvpSkill", () => {
    (0, vitest_1.describe)("warrior_shield_wall", () => {
        (0, vitest_1.it)("sets shieldWallTurnsRemaining to 2 on attacker", () => {
            const attacker = makeState();
            const defender = makeState();
            const result = (0, battle_engine_1.applyPvpSkill)(attacker, defender, "warrior_shield_wall");
            (0, vitest_1.expect)(attacker.shieldWallTurnsRemaining).toBe(2);
            (0, vitest_1.expect)(result.damage).toBe(0);
            (0, vitest_1.expect)(result.effect).toBe("SHIELD_WALL");
        });
    });
    (0, vitest_1.describe)("mage_meteor", () => {
        (0, vitest_1.it)("deals MAG × 3.0 damage", () => {
            const attacker = makeState({ mag: 80 });
            const defender = makeState();
            const result = (0, battle_engine_1.applyPvpSkill)(attacker, defender, "mage_meteor");
            (0, vitest_1.expect)(result.damage).toBe(240); // 80 * 3.0
            (0, vitest_1.expect)(result.effect).toBe("METEOR");
        });
        (0, vitest_1.it)("scales with attacker MAG stat", () => {
            const attacker = makeState({ mag: 150 });
            const defender = makeState();
            const result = (0, battle_engine_1.applyPvpSkill)(attacker, defender, "mage_meteor");
            (0, vitest_1.expect)(result.damage).toBe(450); // 150 * 3.0
        });
    });
    (0, vitest_1.describe)("rogue_backstab", () => {
        (0, vitest_1.it)("deals ATK × 2.0 damage and sets lastSkillUsed", () => {
            const attacker = makeState({ atk: 100 });
            const defender = makeState();
            const result = (0, battle_engine_1.applyPvpSkill)(attacker, defender, "rogue_backstab");
            (0, vitest_1.expect)(result.damage).toBe(200); // 100 * 2.0
            (0, vitest_1.expect)(result.effect).toBe("BACKSTAB");
            (0, vitest_1.expect)(attacker.lastSkillUsed).toBe("rogue_backstab");
        });
    });
    (0, vitest_1.describe)("rogue_execution", () => {
        (0, vitest_1.it)("applies ×2.5 multiplier when preceded by Backstab and target < 30% HP", () => {
            const attacker = makeState({ atk: 100, lastSkillUsed: "rogue_backstab" });
            const defender = makeState({ hp: 20, maxHp: 100 }); // 20% HP
            const result = (0, battle_engine_1.applyPvpSkill)(attacker, defender, "rogue_execution");
            (0, vitest_1.expect)(result.damage).toBe(750); // 100 * 3.0 * 2.5
            (0, vitest_1.expect)(result.effect).toBe("EXECUTION");
        });
        (0, vitest_1.it)("does NOT apply ×2.5 when target is at 30% HP (boundary)", () => {
            const attacker = makeState({ atk: 100, lastSkillUsed: "rogue_backstab" });
            const defender = makeState({ hp: 30, maxHp: 100 }); // exactly 30%
            const result = (0, battle_engine_1.applyPvpSkill)(attacker, defender, "rogue_execution");
            (0, vitest_1.expect)(result.damage).toBe(300); // 100 * 3.0 (no combo)
        });
        (0, vitest_1.it)("does NOT apply ×2.5 without prior Backstab even if target < 30% HP", () => {
            const attacker = makeState({ atk: 100, lastSkillUsed: null });
            const defender = makeState({ hp: 10, maxHp: 100 }); // 10% HP
            const result = (0, battle_engine_1.applyPvpSkill)(attacker, defender, "rogue_execution");
            (0, vitest_1.expect)(result.damage).toBe(300); // 100 * 3.0 (no combo)
        });
        (0, vitest_1.it)("does NOT apply ×2.5 when lastSkillUsed is something else", () => {
            const attacker = makeState({ atk: 100, lastSkillUsed: "rogue_dodge" });
            const defender = makeState({ hp: 10, maxHp: 100 });
            const result = (0, battle_engine_1.applyPvpSkill)(attacker, defender, "rogue_execution");
            (0, vitest_1.expect)(result.damage).toBe(300);
        });
    });
});
// ─── applyPvpDamage ───────────────────────────────────────────────────────────
(0, vitest_1.describe)("applyPvpDamage", () => {
    (0, vitest_1.it)("reduces damage by 50% when Shield Wall is active", () => {
        const defender = makeState({ hp: 100, shieldWallTurnsRemaining: 2 });
        const actualDamage = (0, battle_engine_1.applyPvpDamage)(defender, 100);
        (0, vitest_1.expect)(actualDamage).toBe(50);
        (0, vitest_1.expect)(defender.hp).toBe(50);
    });
    (0, vitest_1.it)("decrements shieldWallTurnsRemaining after blocking", () => {
        const defender = makeState({ hp: 100, shieldWallTurnsRemaining: 2 });
        (0, battle_engine_1.applyPvpDamage)(defender, 100);
        (0, vitest_1.expect)(defender.shieldWallTurnsRemaining).toBe(1);
    });
    (0, vitest_1.it)("Shield Wall expires after 2 uses", () => {
        const defender = makeState({ hp: 200, shieldWallTurnsRemaining: 2 });
        (0, battle_engine_1.applyPvpDamage)(defender, 100); // turn 1: 50 damage, counter → 1
        (0, battle_engine_1.applyPvpDamage)(defender, 100); // turn 2: 50 damage, counter → 0
        (0, battle_engine_1.applyPvpDamage)(defender, 100); // turn 3: full 100 damage
        (0, vitest_1.expect)(defender.shieldWallTurnsRemaining).toBe(0);
        (0, vitest_1.expect)(defender.hp).toBe(200 - 50 - 50 - 100); // 0
    });
    (0, vitest_1.it)("applies full damage when Shield Wall counter is 0", () => {
        const defender = makeState({ hp: 100, shieldWallTurnsRemaining: 0 });
        const actualDamage = (0, battle_engine_1.applyPvpDamage)(defender, 60);
        (0, vitest_1.expect)(actualDamage).toBe(60);
        (0, vitest_1.expect)(defender.hp).toBe(40);
    });
    (0, vitest_1.it)("HP does not go below 0", () => {
        const defender = makeState({ hp: 10, shieldWallTurnsRemaining: 0 });
        (0, battle_engine_1.applyPvpDamage)(defender, 1000);
        (0, vitest_1.expect)(defender.hp).toBe(0);
    });
});
// ─── applyRangerCritBonus ─────────────────────────────────────────────────────
(0, vitest_1.describe)("applyRangerCritBonus", () => {
    (0, vitest_1.it)("RANGER with crit=1.0 always gets 150% bonus (total 250%)", () => {
        const attacker = makeState({ jobClass: "RANGER", crit: 1.0 });
        const result = (0, battle_engine_1.applyRangerCritBonus)(attacker, 100);
        (0, vitest_1.expect)(result).toBe(250); // 100 + floor(100 * 1.5)
    });
    (0, vitest_1.it)("RANGER with crit=0.0 never gets bonus", () => {
        const attacker = makeState({ jobClass: "RANGER", crit: 0.0 });
        const result = (0, battle_engine_1.applyRangerCritBonus)(attacker, 100);
        (0, vitest_1.expect)(result).toBe(100);
    });
    (0, vitest_1.it)("non-RANGER with crit=1.0 never gets bonus", () => {
        const attacker = makeState({ jobClass: "WARRIOR", crit: 1.0 });
        const result = (0, battle_engine_1.applyRangerCritBonus)(attacker, 100);
        (0, vitest_1.expect)(result).toBe(100);
    });
    (0, vitest_1.it)("null jobClass with crit=1.0 never gets bonus", () => {
        const attacker = makeState({ jobClass: null, crit: 1.0 });
        const result = (0, battle_engine_1.applyRangerCritBonus)(attacker, 100);
        (0, vitest_1.expect)(result).toBe(100);
    });
    (0, vitest_1.it)("RANGER crit bonus uses floor for fractional base damage", () => {
        const attacker = makeState({ jobClass: "RANGER", crit: 1.0 });
        const result = (0, battle_engine_1.applyRangerCritBonus)(attacker, 50);
        (0, vitest_1.expect)(result).toBe(125); // 50 + floor(50 * 1.5) = 50 + 75
    });
});
// ─── applyMpDrain ─────────────────────────────────────────────────────────────
(0, vitest_1.describe)("applyMpDrain", () => {
    (0, vitest_1.it)("reduces MP by the given amount", () => {
        const target = makeState({ mp: 50 });
        (0, battle_engine_1.applyMpDrain)(target, 20);
        (0, vitest_1.expect)(target.mp).toBe(30);
        (0, vitest_1.expect)(target.mpDrained).toBe(false);
    });
    (0, vitest_1.it)("clamps MP to 0 when drain exceeds current MP", () => {
        const target = makeState({ mp: 10 });
        (0, battle_engine_1.applyMpDrain)(target, 100);
        (0, vitest_1.expect)(target.mp).toBe(0);
    });
    (0, vitest_1.it)("sets mpDrained to true when MP reaches 0", () => {
        const target = makeState({ mp: 20 });
        (0, battle_engine_1.applyMpDrain)(target, 20);
        (0, vitest_1.expect)(target.mp).toBe(0);
        (0, vitest_1.expect)(target.mpDrained).toBe(true);
    });
    (0, vitest_1.it)("sets mpDrained to true when drain exceeds MP", () => {
        const target = makeState({ mp: 5 });
        (0, battle_engine_1.applyMpDrain)(target, 50);
        (0, vitest_1.expect)(target.mp).toBe(0);
        (0, vitest_1.expect)(target.mpDrained).toBe(true);
    });
    (0, vitest_1.it)("does not set mpDrained when MP remains above 0", () => {
        const target = makeState({ mp: 50 });
        (0, battle_engine_1.applyMpDrain)(target, 1);
        (0, vitest_1.expect)(target.mpDrained).toBe(false);
    });
});
// ─── canUseSkill ──────────────────────────────────────────────────────────────
(0, vitest_1.describe)("canUseSkill", () => {
    (0, vitest_1.it)("returns true when mpDrained is false", () => {
        const player = makeState({ mpDrained: false });
        (0, vitest_1.expect)((0, battle_engine_1.canUseSkill)(player)).toBe(true);
    });
    (0, vitest_1.it)("returns false when mpDrained is true", () => {
        const player = makeState({ mpDrained: true });
        (0, vitest_1.expect)((0, battle_engine_1.canUseSkill)(player)).toBe(false);
    });
    (0, vitest_1.it)("returns false after MP is fully drained via applyMpDrain", () => {
        const player = makeState({ mp: 10 });
        (0, battle_engine_1.applyMpDrain)(player, 10);
        (0, vitest_1.expect)((0, battle_engine_1.canUseSkill)(player)).toBe(false);
    });
});
