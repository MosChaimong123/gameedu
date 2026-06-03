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

  it("keeps the student V4 battle surface free of retired battle wording and shows resources", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/negamon/NegamonBattleArenaV4.tsx"),
      "utf8"
    );

    expect(source).toContain("NegamonBattleStateV4");
    expect(source).toContain("statusIds");
    expect(source).toContain("stat_stage_changed");
    expect(source).toContain("PP {resource.pp}/{resource.maxPp}");
    expect(source).toContain("CD {resource.cooldown}");
    expect(source).not.toMatch(/Pokemon-Lite|Pokemon Lite|\\bLite\\b|\\bLegacy\\b/);
  });
});
