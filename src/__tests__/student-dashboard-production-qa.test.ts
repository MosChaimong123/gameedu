import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("student dashboard production QA guardrails", () => {
  it("keeps the student battle tab on the V4 battle route", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/negamon/BattleArena.tsx"),
      "utf8"
    );

    expect(source).toContain("/battle/v4/start");
    expect(source).toContain("BattleV2Arena");
    expect(source).not.toContain("LegacyInteractiveBattle");
  });
});
