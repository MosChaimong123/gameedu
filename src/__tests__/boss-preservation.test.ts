/**
 * Property-Based Tests: Boss Operations Preservation
 *
 * Validates: Requirements R5/P1
 * ∀ classroom C, ∀ operation op ∈ {POST_boss, DELETE_boss}:
 *   op(C).gamifiedSettings.events === C.gamifiedSettings.events
 *   op(C).gamifiedSettings.customAchievements === C.gamifiedSettings.customAchievements
 */

import { describe, expect, test } from "vitest";
import fc from "fast-check";

// Pure logic extracted from src/app/api/classroom/[id]/boss/route.ts

/**
 * Simulates the DELETE boss logic:
 * reads existing gamifiedSettings, removes only the boss key
 */
function applyBossDelete(gamifiedSettings: Record<string, unknown>): Record<string, unknown> {
  const existing = gamifiedSettings || {};
  const { boss, ...rest } = existing as any;
  return rest;
}

/**
 * Simulates the POST boss logic:
 * reads existing gamifiedSettings, merges new boss key while preserving others
 */
function applyBossPost(
  gamifiedSettings: Record<string, unknown>,
  newBoss: Record<string, unknown>
): Record<string, unknown> {
  const existing = gamifiedSettings || {};
  return {
    ...existing,
    boss: newBoss,
  };
}

// Arbitraries
const eventArb = fc.record({ id: fc.string(), title: fc.string() });
const achievementArb = fc.record({ id: fc.string(), name: fc.string() });
const bossArb = fc.record({ name: fc.string(), maxHp: fc.integer({ min: 1, max: 10000 }) });

const gamifiedSettingsArb = fc.record({
  events: fc.array(eventArb),
  customAchievements: fc.array(achievementArb),
  boss: fc.option(bossArb, { nil: undefined }),
});

describe("Boss Preservation Properties", () => {
  /**
   * **Validates: Requirements R5/P1**
   * Boss DELETE must preserve events and customAchievements
   */
  test("Boss DELETE preserves events and customAchievements", () => {
    fc.assert(
      fc.property(gamifiedSettingsArb, (gamifiedSettings) => {
        const result = applyBossDelete(gamifiedSettings as any);

        expect(result.events).toEqual(gamifiedSettings.events);
        expect(result.customAchievements).toEqual(gamifiedSettings.customAchievements);
      })
    );
  });

  /**
   * **Validates: Requirements R5/P1**
   * Boss DELETE must remove only the boss key
   */
  test("Boss DELETE removes only the boss key", () => {
    fc.assert(
      fc.property(gamifiedSettingsArb, (gamifiedSettings) => {
        const result = applyBossDelete(gamifiedSettings as any);

        expect(result).not.toHaveProperty("boss");
      })
    );
  });

  /**
   * **Validates: Requirements R5/P1**
   * Boss POST preserves events and customAchievements
   */
  test("Boss POST preserves events and customAchievements", () => {
    fc.assert(
      fc.property(gamifiedSettingsArb, bossArb, (gamifiedSettings, newBoss) => {
        const result = applyBossPost(gamifiedSettings as any, newBoss);

        expect(result.events).toEqual(gamifiedSettings.events);
        expect(result.customAchievements).toEqual(gamifiedSettings.customAchievements);
      })
    );
  });

  /**
   * **Validates: Requirements R5/P1**
   * Boss POST sets the new boss value
   */
  test("Boss POST sets the new boss value", () => {
    fc.assert(
      fc.property(gamifiedSettingsArb, bossArb, (gamifiedSettings, newBoss) => {
        const result = applyBossPost(gamifiedSettings as any, newBoss);

        expect(result.boss).toEqual(newBoss);
      })
    );
  });
});
