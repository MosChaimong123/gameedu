import { describe, expect, it } from "vitest";
import { probeCivilizationDailyReturn, runCivilizationBaseline, type CivilizationBaselineStrategy } from "../baseline";

const strategies: CivilizationBaselineStrategy[] = ["lean", "balanced", "science", "industry"];

describe("Civilization Phase 0 baseline", () => {
  it.each(strategies)("runs the %s policy deterministically", (strategy) => {
    const first = runCivilizationBaseline(strategy);
    expect(runCivilizationBaseline(strategy)).toEqual(first);
    expect(first.decisions).toBeGreaterThan(0);
    expect(first.milestonesSeconds.science_unlocked).toBeDefined();
    expect(first.milestonesSeconds.bronze).toBeDefined();
    expect(first.completed).toBe(true);
    expect(first.convertersBuilt).toBe(strategy === "industry" ? 9 : 3);
    expect(first.foodEmptySeconds).toBeGreaterThanOrEqual(0);
    console.log(JSON.stringify(first));
  });

  it("rejects invalid horizon", () => {
    expect(() => runCivilizationBaseline("lean", 1)).toThrow(RangeError);
  });

  it("supports three offline days and caps only later time", () => {
    expect(probeCivilizationDailyReturn(1)).toEqual({ requestedHours: 24, simulatedHours: 24, discardedHours: 0 });
    expect(probeCivilizationDailyReturn(3)).toEqual({ requestedHours: 72, simulatedHours: 72, discardedHours: 0 });
    expect(probeCivilizationDailyReturn(4)).toEqual({ requestedHours: 96, simulatedHours: 72, discardedHours: 24 });
  });
});
