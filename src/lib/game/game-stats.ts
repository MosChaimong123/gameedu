import { Prisma } from "@prisma/client";
import type { GameStats } from "./idle-engine";

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
  };
}

export function parseGameStats(gameStats: unknown): GameStats {
  const defaults = getDefaultGameStats();

  if (!gameStats) return defaults;

  if (typeof gameStats === "string") {
    try {
      const parsed = JSON.parse(gameStats);
      return { ...defaults, ...parsed } as GameStats;
    } catch {
      return defaults;
    }
  }

  if (typeof gameStats === "object") {
    return { ...defaults, ...(gameStats as Record<string, unknown>) } as GameStats;
  }

  return defaults;
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
