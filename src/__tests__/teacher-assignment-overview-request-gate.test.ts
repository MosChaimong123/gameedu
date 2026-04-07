import { describe, expect, it } from "vitest";
import { createLatestRequestGate } from "@/components/dashboard/use-teacher-assignment-overview";

describe("createLatestRequestGate", () => {
  it("marks only the newest request as latest", () => {
    const gate = createLatestRequestGate();
    const first = gate.begin();
    const second = gate.begin();

    expect(gate.isLatest(first)).toBe(false);
    expect(gate.isLatest(second)).toBe(true);
  });

  it("invalidates older requests after multiple begins", () => {
    const gate = createLatestRequestGate();
    const ids = [gate.begin(), gate.begin(), gate.begin(), gate.begin()];

    expect(gate.isLatest(ids[0])).toBe(false);
    expect(gate.isLatest(ids[1])).toBe(false);
    expect(gate.isLatest(ids[2])).toBe(false);
    expect(gate.isLatest(ids[3])).toBe(true);
  });
});
