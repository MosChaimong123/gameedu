import { describe, expect, it } from "vitest";
import {
  checklistCheckedCount,
  checklistCheckedScore,
  sumAcademicTotal,
} from "@/lib/academic-score";

describe("academic-score", () => {
  it("checklistCheckedScore sums weights for checked bits", () => {
    const items = [{ text: "a", points: 2 }, { text: "b", points: 3 }];
    expect(checklistCheckedScore(0b01, items)).toBe(2);
    expect(checklistCheckedScore(0b11, items)).toBe(5);
    expect(checklistCheckedScore(0, items)).toBe(0);
  });

  it("checklistCheckedScore treats string items as weight 1", () => {
    expect(checklistCheckedScore(0b1, ["x", "y"])).toBe(1);
    expect(checklistCheckedScore(0b11, ["x", "y"])).toBe(2);
  });

  it("checklistCheckedCount ignores item shape", () => {
    expect(checklistCheckedCount(0b101, [{ points: 1 }, { points: 2 }, { points: 4 }])).toBe(2);
  });

  it("sumAcademicTotal decodes checklist submissions", () => {
    const assignments = [
      { id: "a1", type: "standard", checklists: null },
      { id: "a2", type: "checklist", checklists: [{ points: 5 }, { points: 5 }] },
    ];
    const submissions = [
      { assignmentId: "a1", score: 40 },
      { assignmentId: "a2", score: 0b01 },
    ];
    expect(sumAcademicTotal(assignments, submissions)).toBe(45);
  });

  it("sumAcademicTotal skips assignments without submission", () => {
    expect(
      sumAcademicTotal([{ id: "x", type: "standard" }], [])
    ).toBe(0);
  });
});
