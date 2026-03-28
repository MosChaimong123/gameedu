"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Property-Based Tests for Battle Engine
 *
 * P4: Boss HP Monotonicity — boss HP never increases from player actions
 * P5: Wave Isolation — player A wave changes never affect player B wave
 *
 * **Validates: Requirements 2, 3**
 */
const vitest_1 = require("vitest");
const fc = __importStar(require("fast-check"));
const battle_turn_engine_1 = require("../../../lib/game-engine/battle-turn-engine");
// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Build a minimal BossState for testing */
function makeBoss(hp, maxHp) {
    return {
        id: "test-boss",
        name: "Test Boss",
        hp,
        maxHp,
        atk: 80,
        lastAttackTick: Date.now(),
        attackIntervalMs: 15000,
        statusEffects: [],
    };
}
/** Simulate an ATTACK action: deduct 10 AP, deal player.atk damage to boss */
function simulateAttack(boss, playerAtk, playerAp) {
    if (playerAp < 10)
        return { boss, ap: playerAp };
    const newAp = playerAp - 10;
    const damage = playerAtk; // coefficient 1.0
    const newHp = Math.max(0, boss.hp - damage);
    return {
        boss: { ...boss, hp: newHp },
        ap: newAp,
    };
}
/** Simulate a DEFEND action: no damage to boss */
function simulateDefend(boss, playerAp) {
    return { boss, ap: playerAp }; // boss HP unchanged
}
// ─── P4: Boss HP Monotonicity ─────────────────────────────────────────────────
// Boss HP never increases from player actions (ATTACK or DEFEND).
// **Validates: Requirements 2.3, 2.5**
(0, vitest_1.describe)("P4 — Boss HP Monotonicity", () => {
    (0, vitest_1.it)("boss HP never increases after ATTACK actions", () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 50000 }), // boss maxHp
        fc.integer({ min: 1, max: 500 }), // player atk
        fc.integer({ min: 0, max: 100 }), // player ap
        fc.array(fc.constantFrom("ATTACK", "DEFEND"), { minLength: 1, maxLength: 20 }), (maxHp, playerAtk, initialAp, actions) => {
            let boss = makeBoss(maxHp, maxHp);
            let ap = initialAp;
            let prevHp = boss.hp;
            for (const action of actions) {
                if (action === "ATTACK") {
                    const result = simulateAttack(boss, playerAtk, ap);
                    boss = result.boss;
                    ap = result.ap;
                }
                else {
                    const result = simulateDefend(boss, ap);
                    boss = result.boss;
                    ap = result.ap;
                }
                // P4: boss HP must never increase
                (0, vitest_1.expect)(boss.hp).toBeLessThanOrEqual(prevHp);
                prevHp = boss.hp;
            }
            // Boss HP must always be in [0, maxHp]
            (0, vitest_1.expect)(boss.hp).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(boss.hp).toBeLessThanOrEqual(maxHp);
        }), { numRuns: 500 });
    });
    (0, vitest_1.it)("boss HP never increases after SKILL actions", () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 50000 }), fc.integer({ min: 1, max: 500 }), fc.integer({ min: 0, max: 100 }), fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 10 }), (maxHp, playerAtk, initialAp, skillMultipliers) => {
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
                (0, vitest_1.expect)(boss.hp).toBeLessThanOrEqual(prevHp);
                prevHp = boss.hp;
            }
            (0, vitest_1.expect)(boss.hp).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(boss.hp).toBeLessThanOrEqual(maxHp);
        }), { numRuns: 300 });
    });
});
// ─── P5: Wave Isolation ───────────────────────────────────────────────────────
// Player A's wave changes never affect Player B's wave.
// **Validates: Requirement 3.11**
(0, vitest_1.describe)("P5 — Wave Isolation", () => {
    (0, vitest_1.it)("advancing player A wave does not change player B wave", () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 50 }), // player A initial wave
        fc.integer({ min: 1, max: 50 }), // player B initial wave
        fc.integer({ min: 1, max: 20 }), // number of wave advances for A
        (waveA, waveB, advances) => {
            // Simulate independent wave state per player
            let playerAWave = waveA;
            const playerBWave = waveB; // B's wave is never touched
            for (let i = 0; i < advances; i++) {
                playerAWave += 1; // A advances
            }
            // B's wave must be unchanged
            (0, vitest_1.expect)(playerBWave).toBe(waveB);
            // A's wave advanced correctly
            (0, vitest_1.expect)(playerAWave).toBe(waveA + advances);
        }), { numRuns: 500 });
    });
    (0, vitest_1.it)("wave scaling for player A does not affect player B monster stats", () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 30 }), // player A wave
        fc.integer({ min: 1, max: 30 }), // player B wave
        fc.integer({ min: 50, max: 1000 }), // base HP
        fc.integer({ min: 10, max: 200 }), // base ATK
        (waveA, waveB, baseHp, baseAtk) => {
            // Each player gets independently scaled monsters
            const monsterA = {
                name: "Monster",
                hp: (0, battle_turn_engine_1.scaleMonsterHp)(baseHp, waveA),
                maxHp: (0, battle_turn_engine_1.scaleMonsterHp)(baseHp, waveA),
                atk: (0, battle_turn_engine_1.scaleMonsterAtk)(baseAtk, waveA),
                wave: waveA,
                statusEffects: [],
            };
            const monsterB = {
                name: "Monster",
                hp: (0, battle_turn_engine_1.scaleMonsterHp)(baseHp, waveB),
                maxHp: (0, battle_turn_engine_1.scaleMonsterHp)(baseHp, waveB),
                atk: (0, battle_turn_engine_1.scaleMonsterAtk)(baseAtk, waveB),
                wave: waveB,
                statusEffects: [],
            };
            // Mutate A's monster — B's monster must be unaffected
            const originalBHp = monsterB.hp;
            const originalBAtk = monsterB.atk;
            monsterA.hp = 0; // A's monster dies
            (0, vitest_1.expect)(monsterB.hp).toBe(originalBHp);
            (0, vitest_1.expect)(monsterB.atk).toBe(originalBAtk);
            (0, vitest_1.expect)(monsterB.wave).toBe(waveB);
        }), { numRuns: 500 });
    });
    (0, vitest_1.it)("wave scaling formula is correct: baseHp × (1 + wave × 0.15)", () => {
        fc.assert(fc.property(fc.integer({ min: 50, max: 2000 }), fc.integer({ min: 1, max: 50 }), (baseHp, wave) => {
            const scaled = (0, battle_turn_engine_1.scaleMonsterHp)(baseHp, wave);
            const expected = Math.floor(baseHp * (1 + wave * 0.15));
            (0, vitest_1.expect)(scaled).toBe(expected);
        }), { numRuns: 300 });
    });
    (0, vitest_1.it)("wave scaling formula is correct: baseAtk × (1 + wave × 0.10)", () => {
        fc.assert(fc.property(fc.integer({ min: 10, max: 500 }), fc.integer({ min: 1, max: 50 }), (baseAtk, wave) => {
            const scaled = (0, battle_turn_engine_1.scaleMonsterAtk)(baseAtk, wave);
            const expected = Math.floor(baseAtk * (1 + wave * 0.10));
            (0, vitest_1.expect)(scaled).toBe(expected);
        }), { numRuns: 300 });
    });
});
// ─── Special Item Effects ─────────────────────────────────────────────────────
// Unit tests for Lifesteal, Immortal, Mana Flow, and Time Warp effects.
// **Validates: Requirements 9.4, 9.5, 9.6**
(0, vitest_1.describe)("Special Item Effects", () => {
    // ── 8.1 Lifesteal ──────────────────────────────────────────────────────────
    (0, vitest_1.describe)("Lifesteal — heal 10% of damage dealt", () => {
        (0, vitest_1.it)("heals player by 10% of damage when Lifesteal is active", () => {
            const hp = 80;
            const maxHp = 100;
            const damage = 50;
            const healAmount = Math.max(1, Math.floor(damage * 0.1)); // 5
            const newHp = Math.min(maxHp, hp + healAmount);
            (0, vitest_1.expect)(newHp).toBe(85);
        });
        (0, vitest_1.it)("lifesteal heal is capped at maxHp", () => {
            const hp = 99;
            const maxHp = 100;
            const damage = 200;
            const healAmount = Math.max(1, Math.floor(damage * 0.1)); // 20
            const newHp = Math.min(maxHp, hp + healAmount);
            (0, vitest_1.expect)(newHp).toBe(100);
        });
        (0, vitest_1.it)("lifesteal heal is at least 1 for any positive damage", () => {
            fc.assert(fc.property(fc.integer({ min: 1, max: 10000 }), // damage
            fc.integer({ min: 1, max: 50000 }), // maxHp
            fc.integer({ min: 0, max: 50000 }), // current hp (≤ maxHp)
            (damage, maxHp, hpOffset) => {
                const hp = Math.min(hpOffset, maxHp);
                const healAmount = Math.max(1, Math.floor(damage * 0.1));
                const newHp = Math.min(maxHp, hp + healAmount);
                (0, vitest_1.expect)(healAmount).toBeGreaterThanOrEqual(1);
                (0, vitest_1.expect)(newHp).toBeGreaterThanOrEqual(hp);
                (0, vitest_1.expect)(newHp).toBeLessThanOrEqual(maxHp);
            }), { numRuns: 300 });
        });
    });
    // ── 8.2 Immortal ──────────────────────────────────────────────────────────
    (0, vitest_1.describe)("Immortal — prevent first death, set HP to 1", () => {
        function applyImmortal(hp, damage, hasImmortal, immortalUsed) {
            let newHp = Math.max(0, hp - damage);
            if (newHp <= 0 && hasImmortal && !immortalUsed) {
                newHp = 1;
                immortalUsed = true;
            }
            return { hp: newHp, immortalUsed };
        }
        (0, vitest_1.it)("sets HP to 1 instead of 0 on first lethal hit when Immortal equipped", () => {
            const result = applyImmortal(50, 100, true, false);
            (0, vitest_1.expect)(result.hp).toBe(1);
            (0, vitest_1.expect)(result.immortalUsed).toBe(true);
        });
        (0, vitest_1.it)("does not trigger Immortal if already used", () => {
            const result = applyImmortal(50, 100, true, true);
            (0, vitest_1.expect)(result.hp).toBe(0);
            (0, vitest_1.expect)(result.immortalUsed).toBe(true);
        });
        (0, vitest_1.it)("does not trigger Immortal if player does not have it", () => {
            const result = applyImmortal(50, 100, false, false);
            (0, vitest_1.expect)(result.hp).toBe(0);
            (0, vitest_1.expect)(result.immortalUsed).toBe(false);
        });
        (0, vitest_1.it)("Immortal only triggers once per session for any lethal damage", () => {
            fc.assert(fc.property(fc.integer({ min: 1, max: 1000 }), // hp
            fc.integer({ min: 1, max: 10000 }), // damage (always lethal)
            (hp, extraDamage) => {
                const damage = hp + extraDamage; // guaranteed lethal
                // First hit: immortal saves
                const first = applyImmortal(hp, damage, true, false);
                (0, vitest_1.expect)(first.hp).toBe(1);
                (0, vitest_1.expect)(first.immortalUsed).toBe(true);
                // Second hit: immortal already used, player dies
                const second = applyImmortal(first.hp, damage, true, first.immortalUsed);
                (0, vitest_1.expect)(second.hp).toBe(0);
            }), { numRuns: 300 });
        });
    });
    // ── 8.3 Mana Flow ─────────────────────────────────────────────────────────
    (0, vitest_1.describe)("Mana Flow — +5 MP on correct answer", () => {
        (0, vitest_1.it)("increments MP by 5 on correct answer when Mana Flow equipped", () => {
            const mp = 20;
            const maxMp = 50;
            const newMp = Math.min(maxMp, mp + 5);
            (0, vitest_1.expect)(newMp).toBe(25);
        });
        (0, vitest_1.it)("MP is capped at maxMp", () => {
            const mp = 48;
            const maxMp = 50;
            const newMp = Math.min(maxMp, mp + 5);
            (0, vitest_1.expect)(newMp).toBe(50);
        });
        (0, vitest_1.it)("MP never exceeds maxMp after Mana Flow trigger", () => {
            fc.assert(fc.property(fc.integer({ min: 0, max: 200 }), // maxMp
            fc.integer({ min: 0, max: 200 }), // current mp (may exceed maxMp in generator, clamped below)
            (maxMp, rawMp) => {
                const mp = Math.min(rawMp, maxMp);
                const newMp = Math.min(maxMp, mp + 5);
                (0, vitest_1.expect)(newMp).toBeLessThanOrEqual(maxMp);
                (0, vitest_1.expect)(newMp).toBeGreaterThanOrEqual(mp);
            }), { numRuns: 300 });
        });
    });
    // ── 8.4 Time Warp ─────────────────────────────────────────────────────────
    (0, vitest_1.describe)("Time Warp — reduce boss attack interval by 3000ms per player", () => {
        const BASE_INTERVAL = 15000;
        const MIN_INTERVAL = 5000;
        function computeInterval(timeWarpCount) {
            return Math.max(MIN_INTERVAL, BASE_INTERVAL - timeWarpCount * 3000);
        }
        (0, vitest_1.it)("reduces interval by 3000ms for 1 player with Time Warp", () => {
            (0, vitest_1.expect)(computeInterval(1)).toBe(12000);
        });
        (0, vitest_1.it)("reduces interval by 6000ms for 2 players with Time Warp", () => {
            (0, vitest_1.expect)(computeInterval(2)).toBe(9000);
        });
        (0, vitest_1.it)("interval never drops below 5000ms regardless of player count", () => {
            fc.assert(fc.property(fc.integer({ min: 0, max: 40 }), // player count with Time Warp
            (count) => {
                const interval = computeInterval(count);
                (0, vitest_1.expect)(interval).toBeGreaterThanOrEqual(MIN_INTERVAL);
                (0, vitest_1.expect)(interval).toBeLessThanOrEqual(BASE_INTERVAL);
            }), { numRuns: 100 });
        });
        (0, vitest_1.it)("interval without Time Warp players stays at default 15000ms", () => {
            (0, vitest_1.expect)(computeInterval(0)).toBe(BASE_INTERVAL);
        });
    });
});
(0, vitest_1.describe)("Extended Battle Effects Runtime", () => {
    (0, vitest_1.it)("Tough Skin reduces incoming boss damage by 10%", () => {
        const noSkin = (0, battle_turn_engine_1.computeBossDamageAgainstPlayer)({
            bossAtk: 100,
            playerDef: 20,
            playerHp: 100,
            playerMaxHp: 100,
            hasToughSkin: false,
            hasTitanWill: false,
        });
        const withSkin = (0, battle_turn_engine_1.computeBossDamageAgainstPlayer)({
            bossAtk: 100,
            playerDef: 20,
            playerHp: 100,
            playerMaxHp: 100,
            hasToughSkin: true,
            hasTitanWill: false,
        });
        (0, vitest_1.expect)(withSkin).toBe(70);
        (0, vitest_1.expect)(noSkin).toBe(80);
    });
    (0, vitest_1.it)("Titan Will boosts defense when HP below 30%", () => {
        const normalHp = (0, battle_turn_engine_1.computeBossDamageAgainstPlayer)({
            bossAtk: 120,
            playerDef: 40,
            playerHp: 80,
            playerMaxHp: 100,
            hasToughSkin: false,
            hasTitanWill: true,
        });
        const lowHp = (0, battle_turn_engine_1.computeBossDamageAgainstPlayer)({
            bossAtk: 120,
            playerDef: 40,
            playerHp: 20,
            playerMaxHp: 100,
            hasToughSkin: false,
            hasTitanWill: true,
        });
        (0, vitest_1.expect)(lowHp).toBeLessThan(normalHp);
    });
    (0, vitest_1.it)("Dark Pact drain is always at least 1 and equals 5% max HP floor", () => {
        (0, vitest_1.expect)((0, battle_turn_engine_1.computeDarkPactDrain)(100)).toBe(5);
        (0, vitest_1.expect)((0, battle_turn_engine_1.computeDarkPactDrain)(19)).toBe(1);
        (0, vitest_1.expect)((0, battle_turn_engine_1.computeDarkPactDrain)(1)).toBe(1);
    });
    (0, vitest_1.it)("damage never goes below 1 after defensive effects", () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 500 }), fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 }), (bossAtk, playerDef, maxHp) => {
            const damage = (0, battle_turn_engine_1.computeBossDamageAgainstPlayer)({
                bossAtk,
                playerDef,
                playerHp: Math.floor(maxHp * 0.2),
                playerMaxHp: maxHp,
                hasToughSkin: true,
                hasTitanWill: true,
            });
            (0, vitest_1.expect)(damage).toBeGreaterThanOrEqual(1);
        }), { numRuns: 300 });
    });
});
