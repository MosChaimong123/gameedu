/**
 * Property-Based Tests: Boss raid template preservation
 *
 * Validates: classroom boss POST/DELETE preserve unrelated gamifiedSettings keys.
 */

import { describe, expect, test } from "vitest";
import fc from "fast-check";
import {
  persistGamifiedSettingsWithBossTemplate,
  type BossRaidTemplate,
} from "@/lib/game/personal-classroom-boss";

function applyBossDelete(gamifiedSettings: Record<string, unknown>): Record<string, unknown> {
  return persistGamifiedSettingsWithBossTemplate(gamifiedSettings || {}, null);
}

function applyBossPost(
  gamifiedSettings: Record<string, unknown>,
  template: BossRaidTemplate
): Record<string, unknown> {
  return persistGamifiedSettingsWithBossTemplate(gamifiedSettings || {}, template);
}

const templateArb = fc.record({
  templateId: fc.string(),
  bossId: fc.string(),
  difficulty: fc.string(),
  name: fc.string(),
  image: fc.string(),
  element: fc.string(),
  elementIcon: fc.string(),
  elementKey: fc.string(),
  maxHp: fc.integer({ min: 1, max: 10000 }),
  rewardGold: fc.integer({ min: 0, max: 10000 }),
  rewardXp: fc.integer({ min: 0, max: 10000 }),
  rewardMaterials: fc.constant([] as { type: string; quantity: number }[]),
  passiveDamageMultiplier: fc.double({ min: 0.1, max: 2, noNaN: true }),
  createdAt: fc.string(),
}) as fc.Arbitrary<BossRaidTemplate>;

const eventArb = fc.record({ id: fc.string(), title: fc.string() });
const achievementArb = fc.record({ id: fc.string(), name: fc.string() });

const gamifiedSettingsArb = fc.record({
  events: fc.array(eventArb),
  customAchievements: fc.array(achievementArb),
  bosses: fc.array(fc.json()),
});

describe("Boss raid template preservation", () => {
  test("Boss DELETE preserves events and customAchievements", () => {
    fc.assert(
      fc.property(gamifiedSettingsArb, (gamifiedSettings) => {
        const result = applyBossDelete(gamifiedSettings as Record<string, unknown>);

        expect(result.events).toEqual(gamifiedSettings.events);
        expect(result.customAchievements).toEqual(gamifiedSettings.customAchievements);
      })
    );
  });

  test("Boss DELETE clears bossRaidTemplate", () => {
    fc.assert(
      fc.property(gamifiedSettingsArb, templateArb, (gamifiedSettings, template) => {
        const withTemplate = { ...gamifiedSettings, bossRaidTemplate: template };
        const result = applyBossDelete(withTemplate as Record<string, unknown>);

        expect(result).not.toHaveProperty("bossRaidTemplate");
      })
    );
  });

  test("Boss POST preserves events and customAchievements", () => {
    fc.assert(
      fc.property(gamifiedSettingsArb, templateArb, (gamifiedSettings, template) => {
        const result = applyBossPost(gamifiedSettings as Record<string, unknown>, template);

        expect(result.events).toEqual(gamifiedSettings.events);
        expect(result.customAchievements).toEqual(gamifiedSettings.customAchievements);
      })
    );
  });

  test("Boss POST sets bossRaidTemplate", () => {
    fc.assert(
      fc.property(gamifiedSettingsArb, templateArb, (gamifiedSettings, template) => {
        const result = applyBossPost(gamifiedSettings as Record<string, unknown>, template);

        expect((result as { bossRaidTemplate: BossRaidTemplate }).bossRaidTemplate).toEqual(template);
      })
    );
  });
});
