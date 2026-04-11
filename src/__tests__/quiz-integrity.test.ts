import { describe, expect, it } from "vitest";
import {
  sanitizeIntegrityEvents,
  shouldFlagIntegrityForTeacher,
  summarizeIntegrityLogs,
} from "@/lib/quiz-integrity";

describe("sanitizeIntegrityEvents", () => {
  it("returns empty for invalid input", () => {
    expect(sanitizeIntegrityEvents(null)).toEqual([]);
    expect(sanitizeIntegrityEvents({})).toEqual([]);
    expect(sanitizeIntegrityEvents({ events: "x" })).toEqual([]);
  });

  it("keeps only allowed types and caps length", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      type: i % 2 === 0 ? "copy" : "evil",
      t: 1_700_000_000_000 + i,
    }));
    const out = sanitizeIntegrityEvents({ events: many });
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.every((e) => e.type === "copy")).toBe(true);
    expect(out[0]).toMatchObject({ type: "copy", clientT: expect.any(Number), at: expect.any(String) });
  });

  it("summarizes logs and flags for teacher thresholds", () => {
    expect(summarizeIntegrityLogs([{ type: "copy" }, { type: "document_hidden" }])).toEqual({
      total: 2,
      documentHidden: 1,
    });
    expect(shouldFlagIntegrityForTeacher([{ type: "document_hidden" }, { type: "document_hidden" }])).toBe(
      true
    );
    expect(shouldFlagIntegrityForTeacher([{ type: "copy" }])).toBe(false);
  });

  it("drops events with invalid t", () => {
    expect(
      sanitizeIntegrityEvents({
        events: [
          { type: "paste", t: NaN },
          { type: "paste", t: 100 },
        ],
      })
    ).toHaveLength(1);
  });
});
