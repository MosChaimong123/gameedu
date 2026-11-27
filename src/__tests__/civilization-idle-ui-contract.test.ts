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

describe("Civilization Idle Phase 3-5 UI contract", () => {
  it("ships the Stone and Bronze Age workspaces with the core tabs", () => {
    const source = fs.readFileSync(gamePath, "utf8");

    expect(source).toContain("/civilization-idle/stone-village.webp");
    expect(source).toContain('type GameTab = "actions" | "buildings" | "workers" | "research"');
    expect(source).toContain("ResourceRail");
    expect(source).toContain("ActionsPanel");
    expect(source).toContain("BuildingsPanel");
    expect(source).toContain("WorkersPanel");
    expect(source).toContain("getCivilizationWorkerProductionRate");
    expect(source).toContain("getCivilizationResourceFlows");
    expect(source).toContain("getCivilizationBottlenecks");
    expect(source).toContain("text.netRate");
    expect(source).toContain("text.bottleneck");
    expect(source).toContain("text.perWorker");
    expect(source).toContain("text.total");
    expect(source).toContain("civilizationTechBenefits");
    expect(source).toContain("text.benefit");
    expect(source).toContain("ResearchPanel");
    expect(source).toContain("ConvertersPanel");
    expect(source).toContain("getCivilizationConverterRates");
    expect(source).toContain("converter-upgrade-");
    expect(source).toContain("text.nextUpgradeCost");
    expect(source).toContain("/civilization-idle/bronze-village.webp");
    expect(source).toContain('type GameTab = "actions" | "buildings" | "workers" | "research" | "converters"');
    expect(source).toContain('type: "ADVANCE_ERA"');
    expect(source).toContain("OfflineSummaryDialog");
    expect(source).toContain("MilestoneStrip");
    expect(source).toContain("getCivilizationJobMasteryLevel");
    expect(source).toContain('type: "SET_POLICY"');
    expect(source).toContain('type: "BUY_REPEATABLE_RESEARCH"');
    expect(source).toContain("canCompleteCivilizationBronze");
    expect(source).toContain("CIVILIZATION_MAX_CONVERTER_LEVEL");
  });

  it("ships the Information Age compute and automation workspace", () => {
    const source = fs.readFileSync(gamePath, "utf8");

    expect(source).toContain("/civilization-idle/information-city.png");
    expect(source).toContain("INFORMATION_RESOURCES");
    expect(source).toContain("getCivilizationComputeStatus");
    expect(source).toContain("getCivilizationAutomationSlots");
    expect(source).toContain('type: "TOGGLE_AUTOMATION_RULE"');
    expect(source).toContain("automation-${ruleId}");
    expect(source).toContain("canCompleteCivilizationInformation");
    expect(source).toContain("text.informationRequirements");
  });

  it("ships the Space Age industry and four-stage evacuation project", () => {
    const source = fs.readFileSync(gamePath, "utf8");

    expect(source).toContain("/civilization-idle/space-city.png");
    expect(source).toContain("SPACE_RESOURCES");
    expect(source).toContain("SPACE_BUILDINGS");
    expect(source).toContain("SPACE_TECHS");
    expect(source).toContain("SPACE_CONVERTERS");
    expect(source).toContain("SpaceProjectPanel");
    expect(source).toContain("getCivilizationSpaceProjectStageRequirements");
    expect(source).toContain("space-project-stage-${stage}");
    expect(source).toContain('type: "COMPLETE_SPACE_PROJECT_STAGE"');
    expect(source).toContain("text.currentSpaceComplete");
  });

  it("ships the two-step Phase 6 prestige reward flow", () => {
    const source = fs.readFileSync(gamePath, "utf8");

    expect(source).toContain("PrestigeDialog");
    expect(source).toContain("prestige-reward-${rewardId}");
    expect(source).toContain('type: "PRESTIGE_RESET"');
    expect(source).toContain("confirmRunNumber: state.runNumber");
    expect(source).toContain('data-testid="prestige-continue"');
    expect(source).toContain('data-testid="prestige-confirm"');
    expect(source).toContain("permanentRewards: state?.permanentRewards");
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
