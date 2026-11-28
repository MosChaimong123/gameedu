import { describe, expect, it } from "vitest";
import legacyStoneSave from "./fixtures/v1-stone-save.json";
import {
  createInitialCivilizationState,
  parseCivilizationState,
  simulateCivilization,
} from "../index";

describe("Civilization save compatibility", () => {
  it("migrates and continues a version 1 save with Phase 2 defaults", () => {
    const state = parseCivilizationState(legacyStoneSave);
    const result = simulateCivilization(state, state.lastSimulatedAt + 1_000);

    expect(result.state.schemaVersion).toBe(7);
    expect(result.state.contentVersion).toBe(7);
    expect(result.state.resources.science.cap).toBe(2_000);
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

  it("migrates version 6 science capacity without trapping advanced saves", () => {
    const version6 = {
      ...createInitialCivilizationState(0),
      schemaVersion: 6,
      contentVersion: 6,
      resources: {
        ...createInitialCivilizationState(0).resources,
        science: { amount: 1_000, cap: 1_000 },
      },
      buildings: {
        ...createInitialCivilizationState(0).buildings,
        network_station: 1,
        test_center: 1,
      },
    };

    const migrated = parseCivilizationState(version6);

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.contentVersion).toBe(7);
    expect(migrated.resources.science).toEqual({ amount: 1_000, cap: 51_000 });
  });
});
