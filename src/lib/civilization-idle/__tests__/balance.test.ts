import { describe, expect, it } from "vitest";
import {
  runCivilizationBalanceMatrix,
  runCivilizationBalanceStrategy,
} from "../balance";

describe("Civilization Idle balance simulation", () => {
  it("is deterministic for the same strategy and options", () => {
    const first = runCivilizationBalanceStrategy("balanced", { maxHours: 24 });
    const second = runCivilizationBalanceStrategy("balanced", { maxHours: 24 });
    expect(second).toEqual(first);
  });

  it("runs four distinct strategies through the canonical engine", () => {
    const results = runCivilizationBalanceMatrix();
    console.log("CIVILIZATION_BALANCE_MATRIX");
    console.log(JSON.stringify(results, null, 2));

    expect(results.map((result) => result.strategy)).toEqual([
      "balanced",
      "population",
      "science",
      "industry",
    ]);
    const completionHours = results.map((result) => result.completedAtHours ?? 0);
    for (const result of results) {
      expect(result.completed).toBe(true);
      expect(result.finalSpaceProjectStage).toBe(4);
      expect(result.completedAtHours).toBeGreaterThanOrEqual(250);
      expect(result.completedAtHours).toBeLessThanOrEqual(800);
      expect(result.commandsApplied).toBeGreaterThan(0);
      expect(result.completedMilestones).toBeGreaterThanOrEqual(30);
      expect(result.longestMilestoneGapHours).toBeLessThanOrEqual(650);
    }
    const averageHours = completionHours.reduce((sum, hours) => sum + hours, 0) /
      completionHours.length;
    expect(averageHours).toBeGreaterThanOrEqual(400);
    expect(averageHours).toBeLessThanOrEqual(650);
  }, 120_000);
});
