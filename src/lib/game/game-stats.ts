import { Prisma } from "@prisma/client";
import type { GameStats } from "./idle-engine";
import { normalizeSkillTreeState } from "./skill-tree";

export function getDefaultGameStats(): GameStats {
  return {
    gold: 0,
    level: 1,
    xp: 0,
    inventory: [],
    equipment: {},
    multipliers: {
      gold: 1,
      xp: 1,
    },
    skillPointsAvailable: 0,
    skillPointsSpent: 0,
    skillTreeProgress: {},
  };
}

export function parseGameStats(gameStats: unknown): GameStats {
  const defaults = getDefaultGameStats();

  if (!gameStats) return defaults;

  if (typeof gameStats === "string") {
    try {
      const parsed = JSON.parse(gameStats);
      const merged = { ...defaults, ...parsed } as GameStats;
      return {
        ...merged,
        ...normalizeSkillTreeState(
          {
            skillPointsAvailable: merged.skillPointsAvailable,
            skillPointsSpent: merged.skillPointsSpent,
            skillTreeProgress: merged.skillTreeProgress,
            lastRespecAt: merged.lastRespecAt,
          },
          merged.level ?? 1
        ),
      };
    } catch {
      return defaults;
    }
  }

  if (typeof gameStats === "object") {
    const merged = { ...defaults, ...(gameStats as Record<string, unknown>) } as GameStats;
    return {
      ...merged,
      ...normalizeSkillTreeState(
        {
          skillPointsAvailable: merged.skillPointsAvailable,
          skillPointsSpent: merged.skillPointsSpent,
          skillTreeProgress: merged.skillTreeProgress,
          lastRespecAt: merged.lastRespecAt,
        },
        merged.level ?? 1
      ),
    };
  }

  return defaults;
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
