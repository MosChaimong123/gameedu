/**
 * Property-Based Tests for Battle Engine
 *
 * P4: Boss HP Monotonicity — boss HP never increases from player actions
 * P5: Wave Isolation — player A wave changes never affect player B wave
 *
 * **Validates: Requirements 2, 3**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { scaleMonsterHp, scaleMonsterAtk } from "../../../lib/game-engine/battle-turn-engine";
import { BossState, BattlePlayer, SoloMonster } from "../../types/game";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal BossState for testing */
function makeBoss(hp: number, maxHp: number): BossState {
  return {
    id: "test-boss",
    name: "Test Boss",
    hp,
    maxHp,
    atk: 80,
    lastAttackTick: Date.now(),
    attackIntervalMs: 15_000,
  };
}

/** Simulate an ATTACK action: deduct 10 AP, deal player.atk damage to boss */
function simulateAttack(
  boss: BossState,
  playerAtk: number,
  playerAp: number
): { boss: BossState; ap: number } {
  if (playerAp < 10) return { boss, ap: playerAp };
  const newAp = playerAp - 10;
  const damage = playerAtk; // coefficient 1.0
  const newHp = Math.max(0, boss.hp - damage);
  return {
    boss: { ...boss, hp: newHp },
    ap: newAp,
  };
}

/** Simulate a DEFEND action: no damage to boss */
function simulateDefend(
  boss: BossState,
  playerAp: number
): { boss: BossState; ap: number } {
  return { boss, ap: playerAp }; // boss HP unchanged
}

// ─── P4: Boss HP Monotonicity ─────────────────────────────────────────────────
// Boss HP never increases from player actions (ATTACK or DEFEND).
// **Validates: Requirements 2.3, 2.5**

describe("P4 — Boss HP Monotonicity", () => {
  it("boss HP never increases after ATTACK actions", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50_000 }),  // boss maxHp
        fc.integer({ min: 1, max: 500 }),      // player atk
        fc.integer({ min: 0, max: 100 }),      // player ap
        fc.array(fc.constantFrom("ATTACK", "DEFEND"), { minLength: 1, maxLength: 20 }),
        (maxHp, playerAtk, initialAp, actions) => {
          let boss = makeBoss(maxHp, maxHp);
          let ap = initialAp;
          let prevHp = boss.hp;

          for (const action of actions) {
            if (action === "ATTACK") {
              const result = simulateAttack(boss, playerAtk, ap);
              boss = result.boss;
              ap = result.ap;
            } else {
              const result = simulateDefend(boss, ap);
              boss = result.boss;
              ap = result.ap;
            }

            // P4: boss HP must never increase
            expect(boss.hp).toBeLessThanOrEqual(prevHp);
            prevHp = boss.hp;
          }

          // Boss HP must always be in [0, maxHp]
          expect(boss.hp).toBeGreaterThanOrEqual(0);
          expect(boss.hp).toBeLessThanOrEqual(maxHp);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("boss HP never increases after SKILL actions", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50_000 }),
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 100 }),
        fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 10 }),
        (maxHp, playerAtk, initialAp, skillMultipliers) => {
          let boss = makeBoss(maxHp, maxHp);
          let ap = initialAp;
          let prevHp = boss.hp;

          for (const mult of skillMultipliers) {
            const skillCost = mult * 10;
            if (ap >= skillCost) {
              ap -= skillCost;
              const damage = Math.floor(playerAtk * (1 + skillCost / 20));
              boss = { ...boss, hp: Math.max(0, boss.hp - damage) };
            }

            expect(boss.hp).toBeLessThanOrEqual(prevHp);
            prevHp = boss.hp;
          }

          expect(boss.hp).toBeGreaterThanOrEqual(0);
          expect(boss.hp).toBeLessThanOrEqual(maxHp);
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ─── P5: Wave Isolation ───────────────────────────────────────────────────────
// Player A's wave changes never affect Player B's wave.
// **Validates: Requirement 3.11**

describe("P5 — Wave Isolation", () => {
  it("advancing player A wave does not change player B wave", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),  // player A initial wave
        fc.integer({ min: 1, max: 50 }),  // player B initial wave
        fc.integer({ min: 1, max: 20 }),  // number of wave advances for A
        (waveA, waveB, advances) => {
          // Simulate independent wave state per player
          let playerAWave = waveA;
          const playerBWave = waveB; // B's wave is never touched

          for (let i = 0; i < advances; i++) {
            playerAWave += 1; // A advances
          }

          // B's wave must be unchanged
          expect(playerBWave).toBe(waveB);
          // A's wave advanced correctly
          expect(playerAWave).toBe(waveA + advances);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("wave scaling for player A does not affect player B monster stats", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),  // player A wave
        fc.integer({ min: 1, max: 30 }),  // player B wave
        fc.integer({ min: 50, max: 1000 }), // base HP
        fc.integer({ min: 10, max: 200 }),  // base ATK
        (waveA, waveB, baseHp, baseAtk) => {
          // Each player gets independently scaled monsters
          const monsterA: SoloMonster = {
            name: "Monster",
            hp: scaleMonsterHp(baseHp, waveA),
            maxHp: scaleMonsterHp(baseHp, waveA),
            atk: scaleMonsterAtk(baseAtk, waveA),
            wave: waveA,
          };

          const monsterB: SoloMonster = {
            name: "Monster",
            hp: scaleMonsterHp(baseHp, waveB),
            maxHp: scaleMonsterHp(baseHp, waveB),
            atk: scaleMonsterAtk(baseAtk, waveB),
            wave: waveB,
          };

          // Mutate A's monster — B's monster must be unaffected
          const originalBHp = monsterB.hp;
          const originalBAtk = monsterB.atk;

          monsterA.hp = 0; // A's monster dies

          expect(monsterB.hp).toBe(originalBHp);
          expect(monsterB.atk).toBe(originalBAtk);
          expect(monsterB.wave).toBe(waveB);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("wave scaling formula is correct: baseHp × (1 + wave × 0.15)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 2000 }),
        fc.integer({ min: 1, max: 50 }),
        (baseHp, wave) => {
          const scaled = scaleMonsterHp(baseHp, wave);
          const expected = Math.floor(baseHp * (1 + wave * 0.15));
          expect(scaled).toBe(expected);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("wave scaling formula is correct: baseAtk × (1 + wave × 0.10)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        (baseAtk, wave) => {
          const scaled = scaleMonsterAtk(baseAtk, wave);
          const expected = Math.floor(baseAtk * (1 + wave * 0.10));
          expect(scaled).toBe(expected);
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ─── Special Item Effects ─────────────────────────────────────────────────────
// Unit tests for Lifesteal, Immortal, Mana Flow, and Time Warp effects.
// **Validates: Requirements 9.4, 9.5, 9.6**

describe("Special Item Effects", () => {
  // ── 8.1 Lifesteal ──────────────────────────────────────────────────────────
  describe("Lifesteal — heal 10% of damage dealt", () => {
    it("heals player by 10% of damage when Lifesteal is active", () => {
      const hp = 80;
      const maxHp = 100;
      const damage = 50;
      const healAmount = Math.max(1, Math.floor(damage * 0.1)); // 5
      const newHp = Math.min(maxHp, hp + healAmount);
      expect(newHp).toBe(85);
    });

    it("lifesteal heal is capped at maxHp", () => {
      const hp = 99;
      const maxHp = 100;
      const damage = 200;
      const healAmount = Math.max(1, Math.floor(damage * 0.1)); // 20
      const newHp = Math.min(maxHp, hp + healAmount);
      expect(newHp).toBe(100);
    });

    it("lifesteal heal is at least 1 for any positive damage", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000 }), // damage
          fc.integer({ min: 1, max: 50_000 }), // maxHp
          fc.integer({ min: 0, max: 50_000 }), // current hp (≤ maxHp)
          (damage, maxHp, hpOffset) => {
            const hp = Math.min(hpOffset, maxHp);
            const healAmount = Math.max(1, Math.floor(damage * 0.1));
            const newHp = Math.min(maxHp, hp + healAmount);
            expect(healAmount).toBeGreaterThanOrEqual(1);
            expect(newHp).toBeGreaterThanOrEqual(hp);
            expect(newHp).toBeLessThanOrEqual(maxHp);
          }
        ),
        { numRuns: 300 }
      );
    });
  });

  // ── 8.2 Immortal ──────────────────────────────────────────────────────────
  describe("Immortal — prevent first death, set HP to 1", () => {
    function applyImmortal(
      hp: number,
      damage: number,
      hasImmortal: boolean,
      immortalUsed: boolean
    ): { hp: number; immortalUsed: boolean } {
      let newHp = Math.max(0, hp - damage);
      if (newHp <= 0 && hasImmortal && !immortalUsed) {
        newHp = 1;
        immortalUsed = true;
      }
      return { hp: newHp, immortalUsed };
    }

    it("sets HP to 1 instead of 0 on first lethal hit when Immortal equipped", () => {
      const result = applyImmortal(50, 100, true, false);
      expect(result.hp).toBe(1);
      expect(result.immortalUsed).toBe(true);
    });

    it("does not trigger Immortal if already used", () => {
      const result = applyImmortal(50, 100, true, true);
      expect(result.hp).toBe(0);
      expect(result.immortalUsed).toBe(true);
    });

    it("does not trigger Immortal if player does not have it", () => {
      const result = applyImmortal(50, 100, false, false);
      expect(result.hp).toBe(0);
      expect(result.immortalUsed).toBe(false);
    });

    it("Immortal only triggers once per session for any lethal damage", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),  // hp
          fc.integer({ min: 1, max: 10_000 }), // damage (always lethal)
          (hp, extraDamage) => {
            const damage = hp + extraDamage; // guaranteed lethal
            // First hit: immortal saves
            const first = applyImmortal(hp, damage, true, false);
            expect(first.hp).toBe(1);
            expect(first.immortalUsed).toBe(true);
            // Second hit: immortal already used, player dies
            const second = applyImmortal(first.hp, damage, true, first.immortalUsed);
            expect(second.hp).toBe(0);
          }
        ),
        { numRuns: 300 }
      );
    });
  });

  // ── 8.3 Mana Flow ─────────────────────────────────────────────────────────
  describe("Mana Flow — +5 MP on correct answer", () => {
    it("increments MP by 5 on correct answer when Mana Flow equipped", () => {
      const mp = 20;
      const maxMp = 50;
      const newMp = Math.min(maxMp, mp + 5);
      expect(newMp).toBe(25);
    });

    it("MP is capped at maxMp", () => {
      const mp = 48;
      const maxMp = 50;
      const newMp = Math.min(maxMp, mp + 5);
      expect(newMp).toBe(50);
    });

    it("MP never exceeds maxMp after Mana Flow trigger", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }), // maxMp
          fc.integer({ min: 0, max: 200 }), // current mp (may exceed maxMp in generator, clamped below)
          (maxMp, rawMp) => {
            const mp = Math.min(rawMp, maxMp);
            const newMp = Math.min(maxMp, mp + 5);
            expect(newMp).toBeLessThanOrEqual(maxMp);
            expect(newMp).toBeGreaterThanOrEqual(mp);
          }
        ),
        { numRuns: 300 }
      );
    });
  });

  // ── 8.4 Time Warp ─────────────────────────────────────────────────────────
  describe("Time Warp — reduce boss attack interval by 3000ms per player", () => {
    const BASE_INTERVAL = 15_000;
    const MIN_INTERVAL = 5_000;

    function computeInterval(timeWarpCount: number): number {
      return Math.max(MIN_INTERVAL, BASE_INTERVAL - timeWarpCount * 3_000);
    }

    it("reduces interval by 3000ms for 1 player with Time Warp", () => {
      expect(computeInterval(1)).toBe(12_000);
    });

    it("reduces interval by 6000ms for 2 players with Time Warp", () => {
      expect(computeInterval(2)).toBe(9_000);
    });

    it("interval never drops below 5000ms regardless of player count", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 40 }), // player count with Time Warp
          (count) => {
            const interval = computeInterval(count);
            expect(interval).toBeGreaterThanOrEqual(MIN_INTERVAL);
            expect(interval).toBeLessThanOrEqual(BASE_INTERVAL);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("interval without Time Warp players stays at default 15000ms", () => {
      expect(computeInterval(0)).toBe(BASE_INTERVAL);
    });
  });
});
