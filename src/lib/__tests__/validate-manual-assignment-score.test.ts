import { describe, expect, it } from "vitest";

import { parseAndValidateManualScore } from "../validate-manual-assignment-score";

describe("parseAndValidateManualScore", () => {
  it("accepts score assignments in 0..maxScore", () => {
    expect(parseAndValidateManualScore("score", 10, [], 0)).toEqual({
      ok: true,
      score: 0,
    });
    expect(parseAndValidateManualScore("standard", 10, [], 10)).toEqual({
      ok: true,
      score: 10,
    });
    expect(parseAndValidateManualScore("score", 10, [], 7.25)).toEqual({
      ok: true,
      score: 7.25,
    });
    expect(parseAndValidateManualScore("score", 10, [], "8.5")).toEqual({
      ok: true,
      score: 8.5,
    });
    expect(parseAndValidateManualScore("score", 10, [], 11).ok).toBe(false);
    expect(parseAndValidateManualScore("score", 10, [], -1).ok).toBe(false);
    expect(parseAndValidateManualScore("score", 10, [], 5.125).ok).toBe(false);
  });

  it("accepts quiz like numeric score", () => {
    expect(parseAndValidateManualScore("quiz", 100, null, 50).ok).toBe(true);
  });

  it("accepts checklist bitmask", () => {
    const checklists = [{ text: "a", points: 1 }, { text: "b", points: 1 }];
    expect(parseAndValidateManualScore("checklist", 2, checklists, 0).ok).toBe(true);
    expect(parseAndValidateManualScore("checklist", 2, checklists, 3).ok).toBe(true);
    expect(parseAndValidateManualScore("checklist", 2, checklists, 4).ok).toBe(false);
  });

  it("keeps checklist scores as integer bitmasks", () => {
    expect(parseAndValidateManualScore("checklist", 10, [{ text: "a" }], 0.5).ok).toBe(false);
  });
});
