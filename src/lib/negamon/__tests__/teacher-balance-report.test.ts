import { describe, expect, it } from "vitest";
import { buildNegamonContentCatalog } from "@/lib/game-negamon";
import {
  buildNegamonTeacherBalanceReport,
  readNegamonBalanceSettings,
} from "@/lib/negamon/teacher-balance-report";

describe("Negamon teacher balance report", () => {
  it("summarizes progression, battle outcomes, item usage, and catalog preview", () => {
    const report = buildNegamonTeacherBalanceReport({
      students: [
        { id: "student-1", name: "Ada", nickname: "A", behaviorPoints: 12, gold: 30 },
        { id: "student-2", name: "Ben", behaviorPoints: 4, gold: 5 },
      ],
      pointHistoryRows: [
        { studentId: "student-1", value: 3, reason: "negamon_level_up:2" },
        { studentId: "student-1", value: 1, reason: "negamon_skill_unlocked:naga-aqua-jet" },
        { studentId: "student-2", value: 2, reason: "negamon_quest_reward:daily" },
      ],
      economyRows: [
        {
          studentId: "student-1",
          source: "quest",
          amount: 10,
          metadata: { reward: { grantedItemIds: ["item_minor_potion"] } },
        },
      ],
      battleRows: [
        { challengerId: "student-1", defenderId: "student-2", winnerId: "student-1" },
        { challengerId: "student-2", defenderId: "student-1", result: { status: "finished" } },
      ],
      catalog: buildNegamonContentCatalog(),
    });

    expect(report.summary).toMatchObject({
      studentCount: 2,
      levelUpCount: 1,
      skillUnlockCount: 1,
      itemUsage: { item_minor_potion: 1 },
      battleOutcomes: { total: 2, wins: 1, draws: 1, unresolved: 0 },
    });
    expect(report.topProgression[0]).toMatchObject({
      studentId: "student-1",
      studentName: "Ada (A)",
      progressionPoints: 4,
    });
    expect(report.catalogPreview.monsterCount).toBeGreaterThan(0);
    expect(report.catalogPreview.skillCount).toBeGreaterThan(0);
    expect(report.catalogPreview.itemCount).toBeGreaterThan(0);
  });

  it("reads classroom Negamon balance settings safely", () => {
    expect(readNegamonBalanceSettings({
      negamon: {
        balance: {
          expMultiplier: 1.25,
          battleGoldCap: 120,
        },
      },
    })).toEqual({
      expMultiplier: 1.25,
      battleGoldCap: 120,
    });
    expect(readNegamonBalanceSettings(null)).toEqual({});
  });
});
