import { describe, expect, it } from "vitest";
import legacyStoneSave from "./fixtures/v1-stone-save.json";
import { parseCivilizationState, simulateCivilization } from "../index";

describe("Civilization save compatibility", () => {
  it("migrates and continues a version 1 save with Phase 2 defaults", () => {
    const state = parseCivilizationState(legacyStoneSave);
    const result = simulateCivilization(state, state.lastSimulatedAt + 1_000);

    expect(result.state.schemaVersion).toBe(6);
    expect(result.state.contentVersion).toBe(6);
    expect(result.state.resources.population.cap).toBe(12);
    expect(result.state.actionLevels.chop_wood).toBe(2);
    expect(result.state.jobMasterySeconds).toEqual({
      forager: 1,
      woodcutter: 1,
      hunter: 0,
      miner: 0,
      scientist: 0,
      coal_miner: 0,
    });
    expect(result.state.researchLevels).toEqual({
      food_storage: 0,
      labor_organization: 0,
      precision_casting: 0,
      metal_reserves: 0,
      fuel_efficiency: 0,
      machine_efficiency: 0,
      data_compression: 0,
      computer_efficiency: 0,
      material_efficiency: 0,
      propulsion_efficiency: 0,
    });
    expect(result.state.spaceProjectStage).toBe(0);
    expect(result.state.spaceCompleted).toBe(false);
    expect(result.state.runNumber).toBe(1);
    expect(result.state.runStartedAt).toBe(state.lastSimulatedAt);
    expect(result.state.permanentRewards).toEqual({
      abundant_harvest: 0,
      research_archive: 0,
      founder_stockpile: 0,
      efficient_industry: 0,
    });
    expect(result.state.policy).toEqual({ id: "balanced", changedAt: 0 });
    expect(result.state.resources.wood.amount).toBeGreaterThan(state.resources.wood.amount);
  });
});
