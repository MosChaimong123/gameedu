import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const gamePath = path.resolve(
  process.cwd(),
  "src/components/civilization-idle/civilization-game.tsx"
);
const hookPath = path.resolve(
  process.cwd(),
  "src/components/civilization-idle/use-civilization-game.ts"
);

describe("Civilization Idle Phase 3-4 UI contract", () => {
  it("ships the Stone and Bronze Age workspaces with the core tabs", () => {
    const source = fs.readFileSync(gamePath, "utf8");

    expect(source).toContain("/civilization-idle/stone-village.webp");
    expect(source).toContain('type GameTab = "actions" | "buildings" | "workers" | "research"');
    expect(source).toContain("ResourceRail");
    expect(source).toContain("ActionsPanel");
    expect(source).toContain("BuildingsPanel");
    expect(source).toContain("WorkersPanel");
    expect(source).toContain("ResearchPanel");
    expect(source).toContain("ConvertersPanel");
    expect(source).toContain("/civilization-idle/bronze-village.webp");
    expect(source).toContain('type GameTab = "actions" | "buildings" | "workers" | "research" | "converters"');
    expect(source).toContain('type: "ADVANCE_ERA"');
    expect(source).toContain("OfflineSummaryDialog");
  });

  it("exposes deterministic game inspection hooks for browser QA", () => {
    const source = fs.readFileSync(gamePath, "utf8");

    expect(source).toContain("render_game_to_text");
    expect(source).toContain("advanceTime");
    expect(source).toContain("coordinateSystem");
  });

  it("queues commands with stable ids and resolves stale revisions from canonical state", () => {
    const source = fs.readFileSync(hookPath, "utf8");

    expect(source).toContain("queueRef.current.push");
    expect(source).toContain("pending.expectedRevision ??= revisionRef.current");
    expect(source).toContain("response.status === 409");
    expect(source).toContain("await loadState()");
    expect(source).toContain("credentials: \"same-origin\"");
    expect(source).toContain('enqueue({ type: "SYNC" })');
    expect(source).toContain("setOfflineSummary(body.simulation)");
  });
});
