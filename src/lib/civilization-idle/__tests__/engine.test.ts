import { describe, expect, it } from "vitest";
import {
  CivilizationInvariantError,
  applyCivilizationCommand,
  assertCivilizationInvariants,
  cloneCivilizationState,
  createInitialCivilizationState,
  getCivilizationActionCooldownMs,
  getCivilizationActionReward,
  getCivilizationBuildingCost,
  getCivilizationConverterCost,
  getCivilizationConverterRates,
  getCivilizationBottlenecks,
  getCivilizationJobMasteryLevel,
  getCivilizationMilestones,
  getCivilizationPowerStatus,
  getCivilizationPopulationGrowthStatus,
  getCivilizationComputeStatus,
  getCivilizationAutomationSlots,
  getCivilizationRepeatableResearchCost,
  getCivilizationInvariantViolations,
  getCivilizationResourceFlows,
  getCivilizationSpaceProjectStageRequirements,
  getCivilizationWorkerProductionRate,
  simulateCivilization,
  type CivilizationEngineResult,
  type CivilizationState,
  type CivilizationTechId,
} from "@/lib/civilization-idle";

function expectSuccess(result: CivilizationEngineResult): CivilizationState {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error}`);
  return result.state;
}

function giveResources(
  state: CivilizationState,
  amounts: Partial<Record<keyof CivilizationState["resources"], number>>
): CivilizationState {
  const next = cloneCivilizationState(state);
  for (const [id, amount] of Object.entries(amounts)) {
    const resource = next.resources[id as keyof typeof next.resources];
    resource.cap = Math.max(resource.cap, amount ?? 0);
    resource.amount = amount ?? 0;
  }
  return next;
}

function enterBronze(state: CivilizationState): CivilizationState {
  const next = cloneCivilizationState(state);
  next.era = "bronze";
  next.unlockedEras = ["stone", "bronze"];
  next.researchedTechs = [
    "basic_tools",
    "foraging",
    "logging",
    "masonry",
    "animal_husbandry",
    "agriculture",
  ];
  return next;
}

function enterIndustrial(state: CivilizationState): CivilizationState {
  const next = enterBronze(state);
  next.era = "industrial";
  next.unlockedEras = ["stone", "bronze", "industrial"];
  next.researchedTechs.push(
    "smelting", "bronze_working", "iron_working", "writing", "steam_power",
    "coal_geology", "steel_furnace", "steam_engine", "electrification"
  );
  next.bronzeCompleted = true;
  next.unlockedConverters = [
    "copper_smelter", "bronze_foundry", "iron_forge", "steel_mill", "steam_generator", "machine_factory",
  ];
  return next;
}

function enterInformation(state: CivilizationState): CivilizationState {
  const next = enterIndustrial(state);
  next.era = "information";
  next.unlockedEras.push("information");
  next.industrialCompleted = true;
  next.researchedTechs.push(
    "conveyor_belts", "factory_priority", "efficient_generator", "factory_automation",
    "circuitry", "computing", "networking"
  );
  next.unlockedConverters.push("circuit_assembler", "data_center", "digital_lab");
  return next;
}

function enterSpace(state: CivilizationState): CivilizationState {
  const next = enterInformation(state);
  next.era = "space";
  next.unlockedEras.push("space");
  next.informationCompleted = true;
  next.researchedTechs.push(
    "databases", "job_scheduling", "computational_simulation", "telecommunications", "space_science",
    "lightweight_materials", "propulsion_systems", "navigation_systems", "life_support", "spacecraft_testing", "evacuation"
  );
  next.unlockedConverters.push("space_material_plant", "rocket_fuel_refinery", "orbital_shipyard");
  return next;
}

describe("Civilization Idle initial state", () => {
  it("creates a valid isolated Stone state", () => {
    const state = createInitialCivilizationState(1_000);

    expect(state.era).toBe("stone");
    expect(state.resources).toMatchObject({
      food: { amount: 50, cap: 200 },
      population: { amount: 2, cap: 10 },
      science: { amount: 0, cap: 2_000 },
    });
    expect(state.idleWorkers).toBe(2);
    expect(getCivilizationInvariantViolations(state)).toEqual([]);
  });

  it("rejects an invalid timestamp", () => {
    expect(() => createInitialCivilizationState(Number.NaN)).toThrow(RangeError);
  });
});

describe("Civilization Idle manual actions", () => {
  it("settles an action once after its cooldown without mutating prior state", () => {
    const initial = createInitialCivilizationState(0);
    const started = expectSuccess(
      applyCivilizationCommand(initial, { type: "START_ACTION", actionId: "chop_wood" }, 0)
    );

    expect(initial.activeActions.chop_wood).toBeNull();
    expect(started.activeActions.chop_wood?.readyAt).toBe(4_000);

    const early = expectSuccess(applyCivilizationCommand(started, { type: "SYNC" }, 3_999));
    expect(early.resources.wood.amount).toBe(20);

    const completed = applyCivilizationCommand(early, { type: "SYNC" }, 4_000);
    const completedState = expectSuccess(completed);
    expect(completedState.resources.wood.amount).toBe(23);
    expect(completed.events).toContainEqual({
      type: "ACTION_COMPLETED",
      id: "chop_wood",
      amount: 3,
    });

    const repeated = applyCivilizationCommand(completedState, { type: "SYNC" }, 4_000);
    expect(expectSuccess(repeated).resources.wood.amount).toBe(23);
    expect(repeated.events).not.toContainEqual(expect.objectContaining({ type: "ACTION_COMPLETED" }));
  });

  it("prevents starting a running action twice", () => {
    const initial = createInitialCivilizationState(0);
    const started = expectSuccess(
      applyCivilizationCommand(initial, { type: "START_ACTION", actionId: "mine_stone" }, 0)
    );
    const duplicate = applyCivilizationCommand(
      started,
      { type: "START_ACTION", actionId: "mine_stone" },
      0
    );

    expect(duplicate).toMatchObject({ ok: false, error: "ACTION_ALREADY_RUNNING" });
  });

  it("uses upgrade cost, yield and cooldown formulas", () => {
    const initial = giveResources(createInitialCivilizationState(0), { food: 100 });
    const upgraded = expectSuccess(
      applyCivilizationCommand(
        initial,
        { type: "UPGRADE_ACTION", actionId: "gather_fruit" },
        0
      )
    );

    expect(upgraded.resources.food.amount).toBe(85);
    expect(upgraded.actionLevels.gather_fruit).toBe(2);
    expect(getCivilizationActionReward(upgraded, "gather_fruit")).toBe(5);
    expect(getCivilizationActionCooldownMs(upgraded, "gather_fruit")).toBe(2_790);
  });

  it("applies flat Tech cooldown reductions and enforces max level", () => {
    const initial = createInitialCivilizationState(0);
    initial.researchedTechs = ["basic_tools", "foraging"];
    initial.actionLevels.gather_fruit = 10;

    expect(getCivilizationActionCooldownMs(initial, "gather_fruit")).toBeCloseTo(
      3_000 * Math.pow(0.93, 9) - 800
    );
    expect(
      applyCivilizationCommand(
        initial,
        { type: "UPGRADE_ACTION", actionId: "gather_fruit" },
        0
      )
    ).toMatchObject({ ok: false, error: "ACTION_LEVEL_MAX" });
  });

  it("keeps Bronze actions locked during Stone", () => {
    const result = applyCivilizationCommand(
      createInitialCivilizationState(0),
      { type: "START_ACTION", actionId: "pan_copper" },
      0
    );
    expect(result).toMatchObject({ ok: false, error: "CONTENT_LOCKED" });
  });

  it("lets a manual food action recover a starving settlement", () => {
    const initial = createInitialCivilizationState(0);
    initial.resources.food.amount = 0;
    const started = expectSuccess(
      applyCivilizationCommand(
        initial,
        { type: "START_ACTION", actionId: "gather_fruit" },
        0
      )
    );

    const recovered = expectSuccess(
      applyCivilizationCommand(started, { type: "SYNC" }, 3_000)
    );
    expect(recovered.resources.food.amount).toBe(3);
    expect(recovered.activeActions.gather_fruit).toBeNull();
  });
});

describe("Civilization Idle buildings and workers", () => {
  it("scales building costs and applies capacity effects", () => {
    const initial = createInitialCivilizationState(0);
    expect(getCivilizationBuildingCost(initial, "shelter")).toEqual([
      { resource: "wood", amount: 10 },
      { resource: "stone", amount: 5 },
    ]);

    const first = expectSuccess(
      applyCivilizationCommand(initial, { type: "BUY_BUILDING", buildingId: "shelter" }, 0)
    );
    expect(first.resources.population.cap).toBe(12);
    expect(getCivilizationBuildingCost(first, "shelter")).toEqual([
      { resource: "wood", amount: 12 },
      { resource: "stone", amount: 6 },
    ]);
  });

  it("requires the unlock building before assigning a gated job", () => {
    const initial = createInitialCivilizationState(0);
    expect(
      applyCivilizationCommand(
        initial,
        { type: "ASSIGN_WORKER", jobId: "hunter", delta: 1 },
        0
      )
    ).toMatchObject({ ok: false, error: "CONTENT_LOCKED" });

    const built = expectSuccess(
      applyCivilizationCommand(
        initial,
        { type: "BUY_BUILDING", buildingId: "hunting_ground" },
        0
      )
    );
    const assigned = expectSuccess(
      applyCivilizationCommand(
        built,
        { type: "ASSIGN_WORKER", jobId: "hunter", delta: 1 },
        0
      )
    );
    expect(assigned.workers.hunter).toBe(1);
    expect(assigned.idleWorkers).toBe(1);
  });

  it("does not allow assigning more workers than are idle", () => {
    const result = applyCivilizationCommand(
      createInitialCivilizationState(0),
      { type: "ASSIGN_WORKER", jobId: "forager", delta: 3 },
      0
    );
    expect(result).toMatchObject({ ok: false, error: "NO_IDLE_WORKERS" });
  });
});

describe("Civilization Idle simulation", () => {
  it("reports net resource flow after food use and converter inputs", () => {
    const state = createInitialCivilizationState(0);
    state.resources.population.amount = 2;
    state.workers.forager = 1;
    state.workers.woodcutter = 1;
    state.idleWorkers = 0;

    const flows = getCivilizationResourceFlows(state);
    expect(flows.food.productionPerSecond).toBeCloseTo(0.8);
    expect(flows.food.consumptionPerSecond).toBeCloseTo(1);
    expect(flows.food.netPerSecond).toBeCloseTo(-0.2);
    expect(flows.wood).toEqual({ productionPerSecond: 0.5, consumptionPerSecond: 0, netPerSecond: 0.5 });
  });

  it("identifies starvation, full storage, and blocked converter inputs", () => {
    const state = enterBronze(createInitialCivilizationState(0));
    state.resources.food.amount = 0;
    state.resources.wood.amount = state.resources.wood.cap;
    state.researchedTechs.push("smelting");
    state.unlockedConverters = ["copper_smelter"];
    state.converters.copper_smelter = { count: 1, enabled: true };
    state.resources.wood.amount = 0;

    expect(getCivilizationBottlenecks(state)).toEqual(
      expect.arrayContaining([
        { type: "STARVING" },
        { type: "CONVERTER_INPUT", converterId: "copper_smelter", resource: "wood" },
      ])
    );
    state.resources.wood.amount = state.resources.wood.cap;
    expect(getCivilizationBottlenecks(state)).toContainEqual({ type: "RESOURCE_FULL", resource: "wood" });
  });

  it("reports effective worker production for the assigned worker count", () => {
    const initial = createInitialCivilizationState(0);
    initial.workers.forager = 3;
    initial.idleWorkers = 0;

    expect(getCivilizationWorkerProductionRate(initial, "forager", 1)).toBeCloseTo(0.8);
    expect(getCivilizationWorkerProductionRate(initial, "forager")).toBeCloseTo(2.4);

    initial.researchedTechs = ["basic_tools"];
    expect(getCivilizationWorkerProductionRate(initial, "forager")).toBeCloseTo(2.76);

    initial.resources.food.amount = 0;
    expect(getCivilizationWorkerProductionRate(initial, "forager")).toBeCloseTo(2.76);
  });

  it("produces resources and consumes food deterministically", () => {
    const initial = createInitialCivilizationState(0);
    const assigned = expectSuccess(
      applyCivilizationCommand(
        initial,
        { type: "ASSIGN_WORKER", jobId: "forager", delta: 1 },
        0
      )
    );

    const left = simulateCivilization(assigned, 1_000).state;
    const right = simulateCivilization(assigned, 1_000).state;
    expect(left).toEqual(right);
    expect(left.resources.food.amount).toBeCloseTo(49.8);
  });

  it("reduces passive worker output to 25 percent while starving", () => {
    const initial = createInitialCivilizationState(0);
    initial.resources.food.amount = 0;
    initial.workers.woodcutter = 1;
    initial.idleWorkers = 1;

    const simulated = simulateCivilization(initial, 1_000).state;
    expect(simulated.resources.wood.amount).toBeCloseTo(20.125);
    expect(simulated.populationGrowthProgressMs).toBe(0);
  });

  it("lets assigned food workers recover a starving settlement", () => {
    const initial = createInitialCivilizationState(0);
    initial.resources.food.amount = 0;
    initial.buildings.hunting_ground = 1;
    initial.workers.forager = 1;
    initial.workers.hunter = 1;
    initial.idleWorkers = 0;

    const simulated = simulateCivilization(initial, 1_000).state;

    expect(simulated.resources.food.amount).toBeGreaterThan(0);
    expect(simulated.resources.food.amount).toBeCloseTo(1.3);
  });

  it("grows population when food production can support the next person", () => {
    const initial = createInitialCivilizationState(0);
    initial.buildings.hunting_ground = 1;
    initial.workers.forager = 1;
    initial.workers.hunter = 1;
    initial.idleWorkers = 0;
    const simulated = simulateCivilization(initial, 8_000).state;
    expect(simulated.resources.population.amount).toBe(3);
    expect(simulated.idleWorkers).toBe(1);
    expect(simulated.populationGrowthProgressMs).toBe(0);
  });

  it("pauses population growth instead of creating unsupported offline consumers", () => {
    const initial = createInitialCivilizationState(0);
    initial.workers.forager = 1;
    initial.idleWorkers = 1;

    const simulated = simulateCivilization(initial, 8_000).state;

    expect(simulated.resources.population.amount).toBe(2);
    expect(simulated.idleWorkers).toBe(1);
    expect(simulated.populationGrowthProgressMs).toBe(8_000);
  });

  it("explains the food threshold and progress for the next population", () => {
    const state = createInitialCivilizationState(0);
    state.workers.forager = 1;
    state.idleWorkers = 1;
    state.populationGrowthProgressMs = 4_000;

    expect(getCivilizationPopulationGrowthStatus(state)).toMatchObject({
      atCap: false,
      foodReady: false,
      foodProductionPerSecond: 0.8,
      requiredFoodProductionPerSecond: 1.5,
      progressRatio: 0.5,
      growthIntervalMs: 8_000,
    });

    state.buildings.hunting_ground = 1;
    state.workers.hunter = 1;
    state.idleWorkers = 0;
    expect(getCivilizationPopulationGrowthStatus(state).foodReady).toBe(true);

    state.resources.population.amount = state.resources.population.cap;
    expect(getCivilizationPopulationGrowthStatus(state).atCap).toBe(true);
  });

  it("applies population and production Tech bonuses", () => {
    const initial = createInitialCivilizationState(0);
    initial.researchedTechs = ["basic_tools", "foraging", "animal_husbandry"];
    initial.workers.forager = 1;
    initial.idleWorkers = 1;

    const oneSecond = simulateCivilization(initial, 1_000).state;
    expect(oneSecond.resources.food.amount).toBeCloseTo(49.92);

    initial.workers.hunter = 1;
    initial.buildings.hunting_ground = 1;
    initial.idleWorkers = 0;
    const growth = simulateCivilization(initial, 5_334).state;
    expect(growth.resources.population.amount).toBe(3);
  });

  it("caps one online simulation call at thirty seconds", () => {
    const result = simulateCivilization(createInitialCivilizationState(0), 60_000);
    expect(result.state.lastSimulatedAt).toBe(30_000);
    expect(result.remainingMs).toBe(30_000);
  });

  it("simulates a stable 72-hour offline window without discarding time", () => {
    const state = createInitialCivilizationState(0);
    state.resources.population.amount = state.resources.population.cap;
    state.workers.forager = state.resources.population.amount;
    state.idleWorkers = 0;

    const elapsedMs = 72 * 60 * 60 * 1_000;
    const result = simulateCivilization(state, elapsedMs, elapsedMs);

    expect(result.remainingMs).toBe(0);
    expect(result.state.lastSimulatedAt).toBe(elapsedMs);
    expect(result.state.resources.food.amount).toBeCloseTo(195);
  });

  it("keeps stable fast-forward equivalent to one-second steps", () => {
    const state = createInitialCivilizationState(0);
    state.resources.food.amount = 0;
    state.workers.woodcutter = 1;
    state.idleWorkers = 1;
    const elapsedMs = 10 * 60 * 1_000;

    const fast = simulateCivilization(state, elapsedMs, elapsedMs).state;
    let reference = state;
    for (let nowMs = 1_000; nowMs <= elapsedMs; nowMs += 1_000) {
      reference = simulateCivilization(reference, nowMs, 1_000).state;
    }

    expect(fast).toEqual(reference);
  });

  it("accrues job mastery time and applies a bonus every two levels", () => {
    const state = createInitialCivilizationState(0);
    state.workers.woodcutter = 1;
    state.idleWorkers = 1;
    state.jobMasterySeconds.woodcutter = 7_200;

    expect(getCivilizationJobMasteryLevel(state, "woodcutter")).toBe(3);
    expect(getCivilizationWorkerProductionRate(state, "woodcutter", 1)).toBeCloseTo(0.52);

    const simulated = simulateCivilization(state, 1_000).state;
    expect(simulated.jobMasterySeconds.woodcutter).toBe(7_201);
  });
});

describe("Civilization Idle research and eras", () => {
  it("purchases the Stone tree and advances only after Agriculture", () => {
    let state = giveResources(createInitialCivilizationState(0), { science: 300 });
    const order: CivilizationTechId[] = [
      "basic_tools",
      "foraging",
      "logging",
      "masonry",
      "animal_husbandry",
      "agriculture",
    ];
    for (const techId of order) {
      state = expectSuccess(
        applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId }, 0)
      );
    }

    expect(state.resources.science.amount).toBe(0);
    expect(state.unlockedEras).toContain("bronze");
    expect(state.era).toBe("stone");

    state = expectSuccess(
      applyCivilizationCommand(state, { type: "ADVANCE_ERA", eraId: "bronze" }, 0)
    );
    expect(state.era).toBe("bronze");
  });

  it("marks Bronze complete after both research branches reach Steam Power", () => {
    let state = giveResources(enterBronze(createInitialCivilizationState(0)), { science: 1_000 });
    for (const techId of ["smelting", "bronze_working", "iron_working"] as const) {
      state = expectSuccess(
        applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId }, 0)
      );
    }
    state.resources.science.amount = 1_000;
    state = expectSuccess(
      applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "writing" }, 0)
    );
    state.resources.science.amount = 800;
    state.unlockedConverters = ["copper_smelter", "bronze_foundry", "iron_forge"];
    state.converters.copper_smelter.count = 1;
    state.converters.bronze_foundry.count = 1;
    state.converters.iron_forge.count = 1;
    state.resources.copper.amount = 20;
    state.resources.bronze.amount = 20;
    state.resources.iron.amount = 20;
    state = expectSuccess(
      applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "steam_power" }, 0)
    );
    expect(state.bronzeCompleted).toBe(true);
    expect(state.resources.science.amount).toBe(0);
    expect(state.resources.science.cap).toBe(2_000);
  });

  it("rejects research with missing prerequisites", () => {
    const initial = giveResources(createInitialCivilizationState(0), { science: 100 });
    expect(
      applyCivilizationCommand(initial, { type: "BUY_RESEARCH", techId: "masonry" }, 0)
    ).toMatchObject({ ok: false, error: "PREREQUISITE_MISSING" });
  });

  it("supports capped repeatable research with deterministic costs and effects", () => {
    let state = giveResources(createInitialCivilizationState(0), { science: 1_000 });
    state.researchedTechs = ["basic_tools", "foraging", "logging", "masonry", "animal_husbandry", "agriculture"];
    state.unlockedEras = ["stone", "bronze"];

    expect(getCivilizationRepeatableResearchCost(state, "food_storage")).toBe(80);
    state = expectSuccess(applyCivilizationCommand(state, { type: "BUY_REPEATABLE_RESEARCH", researchId: "food_storage" }, 0));
    expect(state.researchLevels.food_storage).toBe(1);
    expect(state.resources.food.cap).toBe(210);
    expect(getCivilizationRepeatableResearchCost(state, "food_storage")).toBe(160);

    state = expectSuccess(applyCivilizationCommand(state, { type: "BUY_REPEATABLE_RESEARCH", researchId: "food_storage" }, 0));
    state = expectSuccess(applyCivilizationCommand(state, { type: "BUY_REPEATABLE_RESEARCH", researchId: "food_storage" }, 0));
    expect(applyCivilizationCommand(state, { type: "BUY_REPEATABLE_RESEARCH", researchId: "food_storage" }, 0)).toMatchObject({ ok: false, error: "RESEARCH_LEVEL_MAX" });
  });

  it("requires the full metal chain and reserves before Steam Power", () => {
    const state = giveResources(enterBronze(createInitialCivilizationState(0)), { science: 1_000 });
    state.researchedTechs.push("smelting", "bronze_working", "iron_working", "writing");

    expect(applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "steam_power" }, 0)).toMatchObject({ ok: false, error: "COMPLETION_REQUIREMENTS_MISSING" });
  });
});

describe("Civilization Idle policies and milestones", () => {
  it("applies policy modifiers and enforces cooldown after the free first choice", () => {
    let state = createInitialCivilizationState(0);
    state = expectSuccess(applyCivilizationCommand(state, { type: "SET_POLICY", policyId: "sustenance" }, 0));
    expect(getCivilizationWorkerProductionRate(state, "forager", 1)).toBeCloseTo(0.92);
    expect(applyCivilizationCommand(state, { type: "SET_POLICY", policyId: "balanced" }, 0)).toMatchObject({ ok: false, error: "POLICY_COOLDOWN" });

    state.lastSimulatedAt = 3_600_000;
    state = expectSuccess(applyCivilizationCommand(state, { type: "SET_POLICY", policyId: "balanced" }, 3_600_000));
    expect(applyCivilizationCommand(state, { type: "SET_POLICY", policyId: "industry" }, 3_600_000)).toMatchObject({ ok: false, error: "POLICY_COOLDOWN" });
  });

  it("derives guided milestones from canonical state", () => {
    const state = createInitialCivilizationState(0);
    state.workers.forager = 1;
    state.idleWorkers = 1;
    const milestones = getCivilizationMilestones(state);
    expect(milestones.find((item) => item.id === "assign_food")?.completed).toBe(true);
    expect(milestones.find((item) => item.id === "steam_power")?.completed).toBe(false);
  });
});

describe("Civilization Idle converters", () => {
  it("upgrades a converter with scaling costs and output", () => {
    let state = enterBronze(createInitialCivilizationState(0));
    state.researchedTechs.push("smelting");
    state.unlockedConverters = ["copper_smelter"];
    state = giveResources(state, { stone: 200, wood: 200, copper: 0 });

    expect(getCivilizationConverterCost(state, "copper_smelter")).toEqual([
      { resource: "stone", amount: 40 },
      { resource: "wood", amount: 25 },
    ]);
    state = expectSuccess(
      applyCivilizationCommand(state, { type: "BUY_CONVERTER", converterId: "copper_smelter" }, 0)
    );
    expect(getCivilizationConverterCost(state, "copper_smelter")).toEqual([
      { resource: "stone", amount: 54 },
      { resource: "wood", amount: 33 },
    ]);
    state = expectSuccess(
      applyCivilizationCommand(state, { type: "BUY_CONVERTER", converterId: "copper_smelter" }, 0)
    );

    expect(state.converters.copper_smelter.count).toBe(2);
    expect(getCivilizationConverterRates(state, "copper_smelter")).toEqual({
      inputs: [{ resource: "wood", amount: 1 }],
      outputs: [{ resource: "copper", amount: 0.8 }],
    });
  });

  it("does not consume inputs when an output lacks capacity", () => {
    const initial = enterBronze(createInitialCivilizationState(0));
    initial.researchedTechs.push("smelting");
    initial.unlockedConverters = ["copper_smelter"];
    initial.converters.copper_smelter.count = 1;
    initial.resources.wood.amount = 50;
    initial.resources.copper.amount = 199.8;

    const state = simulateCivilization(initial, 1_000).state;
    expect(state.resources.wood.amount).toBe(50);
    expect(state.resources.copper.amount).toBe(199.8);
  });

  it("consumes and produces atomically when capacity and inputs are available", () => {
    const initial = enterBronze(createInitialCivilizationState(0));
    initial.researchedTechs.push("smelting");
    initial.unlockedConverters = ["copper_smelter"];
    initial.converters.copper_smelter.count = 1;
    initial.resources.wood.amount = 50;
    initial.resources.copper.amount = 199.5;

    const state = simulateCivilization(initial, 1_000).state;
    expect(state.resources.wood.amount).toBeCloseTo(49.5);
    expect(state.resources.copper.amount).toBeCloseTo(199.9);
  });
});

describe("Civilization Idle Industrial Age", () => {
  it("unlocks and advances into the Industrial Age through Steam Power", () => {
    let state = enterBronze(createInitialCivilizationState(0));
    state.researchedTechs.push("smelting", "bronze_working", "iron_working", "writing");
    state.unlockedConverters = ["copper_smelter", "bronze_foundry", "iron_forge"];
    state.converters.copper_smelter.count = 1;
    state.converters.bronze_foundry.count = 1;
    state.converters.iron_forge.count = 1;
    state = giveResources(state, { science: 800, copper: 20, bronze: 20, iron: 20 });

    state = expectSuccess(applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "steam_power" }, 0));
    expect(state.unlockedEras).toContain("industrial");
    state = expectSuccess(applyCivilizationCommand(state, { type: "ADVANCE_ERA", eraId: "industrial" }, 0));
    expect(state.era).toBe("industrial");
  });

  it("converts iron and coal into steel atomically", () => {
    const initial = enterIndustrial(createInitialCivilizationState(0));
    initial.converters.steel_mill.count = 1;
    initial.resources.iron.amount = 10;
    initial.resources.coal.amount = 10;

    const state = simulateCivilization(initial, 1_000).state;
    expect(state.resources.iron.amount).toBeCloseTo(9.6);
    expect(state.resources.coal.amount).toBeCloseTo(9.8);
    expect(state.resources.steel.amount).toBeCloseTo(0.25);
  });

  it("generates power and runs the machine factory without storing power between ticks", () => {
    const initial = enterIndustrial(createInitialCivilizationState(0));
    initial.converters.steam_generator.count = 1;
    initial.converters.machine_factory.count = 1;
    initial.resources.coal.amount = 10;
    initial.resources.steel.amount = 10;

    const state = simulateCivilization(initial, 1_000).state;
    expect(state.resources.coal.amount).toBeCloseTo(9.7);
    expect(state.resources.steel.amount).toBeCloseTo(9.75);
    expect(state.resources.machinery.amount).toBeCloseTo(0.15);
    expect(state.resources.electricity).toEqual({ amount: 1, cap: 2 });
  });

  it("powers higher-priority factories first and never gives partial power", () => {
    const state = enterIndustrial(createInitialCivilizationState(0));
    state.researchedTechs.push("conveyor_belts", "factory_priority");
    state.converters.steam_generator.count = 1;
    state.converters.machine_factory = { count: 1, enabled: true, priority: 1 };
    state.converters.copper_smelter = { count: 1, enabled: true, priority: 2 };
    state.converters.bronze_foundry = { count: 1, enabled: true, priority: 2 };
    state.converters.iron_forge = { count: 1, enabled: true, priority: 3 };
    state.resources.coal.amount = 20;
    state.resources.steel.amount = 20;
    state.resources.wood.amount = 20;
    state.resources.copper.amount = 20;
    state.resources.stone.amount = 20;

    const power = getCivilizationPowerStatus(state);
    expect(power.supply).toBe(2);
    expect(power.poweredConverters).toEqual(["machine_factory", "bronze_foundry", "copper_smelter"]);
    expect(power.unpoweredConverters).toEqual(["iron_forge"]);
  });

  it("changes factory priority only after the priority research", () => {
    let state = enterIndustrial(createInitialCivilizationState(0));
    state.converters.machine_factory.count = 1;
    expect(applyCivilizationCommand(state, { type: "SET_CONVERTER_PRIORITY", converterId: "machine_factory", priority: 1 }, 0)).toMatchObject({ ok: false, error: "CONTENT_LOCKED" });

    state.researchedTechs.push("conveyor_belts", "factory_priority");
    state = expectSuccess(applyCivilizationCommand(state, { type: "SET_CONVERTER_PRIORITY", converterId: "machine_factory", priority: 1 }, 0));
    expect(state.converters.machine_factory.priority).toBe(1);
  });

  it("requires the full industrial chain and reserves before Factory Automation", () => {
    let state = enterIndustrial(createInitialCivilizationState(0));
    state.researchedTechs.push("conveyor_belts", "factory_priority", "efficient_generator");
    state = giveResources(state, { science: 8_000, steel: 100, machinery: 100 });
    expect(applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "factory_automation" }, 0)).toMatchObject({ ok: false, error: "COMPLETION_REQUIREMENTS_MISSING" });

    state.converters.steel_mill.count = 1;
    state.converters.steam_generator.count = 1;
    state.converters.machine_factory.count = 1;
    state = expectSuccess(applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "factory_automation" }, 0));
    expect(state.industrialCompleted).toBe(true);
  });
});

describe("Civilization Idle Information Age", () => {
  it("unlocks and advances through Factory Automation", () => {
    let state = enterIndustrial(createInitialCivilizationState(0));
    state.researchedTechs.push("conveyor_belts", "factory_priority", "efficient_generator");
    state.converters.steel_mill.count = 1;
    state.converters.steam_generator.count = 1;
    state.converters.machine_factory.count = 1;
    state = giveResources(state, { science: 8_000, steel: 100, machinery: 100 });

    state = expectSuccess(applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "factory_automation" }, 0));
    expect(state.unlockedEras).toContain("information");
    state = expectSuccess(applyCivilizationCommand(state, { type: "ADVANCE_ERA", eraId: "information" }, 0));
    expect(state.era).toBe("information");
  });

  it("runs circuits, data, compute, and digital science as one deterministic chain", () => {
    const initial = enterInformation(createInitialCivilizationState(0));
    initial.converters.steam_generator.count = 3;
    initial.converters.circuit_assembler.count = 1;
    initial.converters.data_center.count = 1;
    initial.converters.digital_lab.count = 1;
    initial.resources.coal.amount = 20;
    initial.resources.copper.amount = 20;
    initial.resources.steel.amount = 20;
    initial.resources.circuits.amount = 20;
    initial.resources.data.amount = 20;

    const compute = getCivilizationComputeStatus(initial);
    expect(compute).toMatchObject({ supply: 2, demand: 1, used: 1, available: 1 });
    const state = simulateCivilization(initial, 1_000).state;
    expect(state.resources.circuits.amount).toBeCloseTo(20.07);
    expect(state.resources.data.amount).toBeCloseTo(20.05);
    expect(state.resources.science.amount).toBeCloseTo(0.3);
    expect(state.resources.compute).toEqual({ amount: 1, cap: 2 });
  });

  it("keeps data-center compute online when data storage is full", () => {
    const state = enterInformation(createInitialCivilizationState(0));
    state.converters.steam_generator.count = 3;
    state.converters.data_center.count = 1;
    state.resources.coal.amount = 20;
    state.resources.circuits.amount = 20;
    state.resources.data.amount = state.resources.data.cap;

    expect(getCivilizationComputeStatus(state)).toMatchObject({ supply: 2 });
    expect(getCivilizationPowerStatus(state).poweredConverters).toContain("data_center");
  });

  it("uses scheduler capacity and pauses factories at configured reserves", () => {
    let state = enterInformation(createInitialCivilizationState(0));
    state.researchedTechs.push("databases", "job_scheduling");
    state.buildings.scheduler_center = 1;
    state.converters.circuit_assembler.count = 1;
    state.converters.steam_generator.count = 1;
    state.resources.coal.amount = 20;
    state.resources.copper.amount = 40.1;
    state.resources.steel.amount = 100;
    expect(getCivilizationAutomationSlots(state)).toBe(2);

    state = expectSuccess(applyCivilizationCommand(state, { type: "TOGGLE_AUTOMATION_RULE", ruleId: "protect_copper" }, 0));
    state = expectSuccess(applyCivilizationCommand(state, { type: "TOGGLE_AUTOMATION_RULE", ruleId: "protect_steel" }, 0));
    expect(applyCivilizationCommand(state, { type: "TOGGLE_AUTOMATION_RULE", ruleId: "prioritize_data_center" }, 0)).toMatchObject({ ok: false, error: "CONTENT_LOCKED" });

    const simulated = simulateCivilization(state, 1_000).state;
    expect(simulated.resources.circuits.amount).toBe(0);
    expect(simulated.resources.copper.amount).toBe(40.1);
  });

  it("applies repeatable data output and power efficiency bonuses", () => {
    const state = enterInformation(createInitialCivilizationState(0));
    state.researchLevels.data_compression = 2;
    state.researchLevels.computer_efficiency = 3;
    state.converters.data_center.count = 1;
    state.converters.steam_generator.count = 2;
    state.resources.coal.amount = 10;
    state.resources.circuits.amount = 10;
    expect(getCivilizationConverterRates(state, "data_center").outputs[0].amount).toBeCloseTo(0.159);
    expect(getCivilizationPowerStatus(state).demand).toBeCloseTo(1.88);
  });

  it("requires the digital chain, reserves, and compute before Space Science", () => {
    let state = enterInformation(createInitialCivilizationState(0));
    state.researchedTechs.push("databases", "job_scheduling", "computational_simulation", "telecommunications");
    state = giveResources(state, { science: 40_000, circuits: 100, data: 200, coal: 20 });
    expect(applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "space_science" }, 0)).toMatchObject({ ok: false, error: "COMPLETION_REQUIREMENTS_MISSING" });

    state.converters.circuit_assembler.count = 1;
    state.converters.data_center.count = 1;
    state.converters.digital_lab.count = 1;
    state.converters.steam_generator.count = 3;
    state = expectSuccess(applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "space_science" }, 0));
    expect(state.informationCompleted).toBe(true);
  });
});

describe("Civilization Idle Space Age", () => {
  it("runs the three Space factories as a deterministic powered chain", () => {
    const initial = enterSpace(createInitialCivilizationState(0));
    initial.converters.steam_generator.count = 4;
    initial.converters.space_material_plant.count = 1;
    initial.converters.rocket_fuel_refinery.count = 1;
    initial.converters.orbital_shipyard.count = 1;
    initial.resources.coal.amount = 20;
    initial.resources.steel.amount = 20;
    initial.resources.bronze.amount = 20;
    initial.resources.circuits.amount = 20;
    initial.resources.advanced_alloy.amount = 20;

    const state = simulateCivilization(initial, 1_000).state;
    expect(state.resources.advanced_alloy.amount).toBeCloseTo(20);
    expect(state.resources.rocket_fuel.amount).toBeCloseTo(0.1);
    expect(state.resources.ship_parts.amount).toBeCloseTo(0.06);
    expect(state.resources.steel.amount).toBeCloseTo(19.8);
    expect(state.resources.bronze.amount).toBeCloseTo(19.9);
  });

  it("prevents skipping project stages and spends each stage cost once", () => {
    let state = enterSpace(createInitialCivilizationState(0));
    state = giveResources(state, { advanced_alloy: 600, ship_parts: 700, rocket_fuel: 1_500 });
    state.buildings.test_center = 1;

    expect(applyCivilizationCommand(state, { type: "COMPLETE_SPACE_PROJECT_STAGE", stage: 2 }, 0))
      .toMatchObject({ ok: false, error: "COMPLETION_REQUIREMENTS_MISSING" });

    state = expectSuccess(applyCivilizationCommand(state, { type: "COMPLETE_SPACE_PROJECT_STAGE", stage: 1 }, 0));
    expect(state.spaceProjectStage).toBe(1);
    expect(state.resources.advanced_alloy.amount).toBe(100);
    expect(state.resources.ship_parts.amount).toBe(450);
    expect(applyCivilizationCommand(state, { type: "COMPLETE_SPACE_PROJECT_STAGE", stage: 1 }, 0))
      .toMatchObject({ ok: false, error: "COMPLETION_REQUIREMENTS_MISSING" });

    state = expectSuccess(applyCivilizationCommand(state, { type: "COMPLETE_SPACE_PROJECT_STAGE", stage: 2 }, 0));
    expect(state.spaceProjectStage).toBe(2);
    expect(state.resources.ship_parts.amount).toBe(100);
    expect(state.resources.rocket_fuel.amount).toBe(900);
  });

  it("requires the final infrastructure and applies propulsion research to the fuel cost", () => {
    let state = enterSpace(createInitialCivilizationState(0));
    state.spaceProjectStage = 3;
    state.researchLevels.propulsion_efficiency = 5;
    state = giveResources(state, { rocket_fuel: 800, coal: 20, circuits: 20 });

    expect(applyCivilizationCommand(state, { type: "COMPLETE_SPACE_PROJECT_STAGE", stage: 4 }, 0))
      .toMatchObject({ ok: false, error: "COMPLETION_REQUIREMENTS_MISSING" });

    state.buildings.evacuation_port = 1;
    state.buildings.test_center = 1;
    state.converters.steam_generator.count = 5;
    state.converters.data_center.count = 2;
    expect(getCivilizationSpaceProjectStageRequirements(state, 4)).toMatchObject({
      isNextStage: true,
      techReady: true,
      evacuationPortReady: true,
      powerReady: true,
      computeReady: true,
      costs: [{ resource: "rocket_fuel", amount: 720 }],
    });
    state = expectSuccess(applyCivilizationCommand(state, { type: "COMPLETE_SPACE_PROJECT_STAGE", stage: 4 }, 0));
    expect(state.spaceProjectStage).toBe(4);
    expect(state.spaceCompleted).toBe(true);
    expect(state.resources.rocket_fuel.amount).toBe(80);
  });
});

describe("Civilization Idle prestige", () => {
  function completedRun(): CivilizationState {
    const state = enterSpace(createInitialCivilizationState(0));
    state.spaceProjectStage = 4;
    state.spaceCompleted = true;
    return state;
  }

  it("requires a completed run and the current run confirmation", () => {
    const initial = createInitialCivilizationState(0);
    expect(applyCivilizationCommand(initial, { type: "PRESTIGE_RESET", rewardId: "abundant_harvest", confirmRunNumber: 1 }, 0))
      .toMatchObject({ ok: false, error: "PRESTIGE_NOT_READY" });
    expect(applyCivilizationCommand(completedRun(), { type: "PRESTIGE_RESET", rewardId: "abundant_harvest", confirmRunNumber: 2 }, 0))
      .toMatchObject({ ok: false, error: "PRESTIGE_CONFIRMATION_MISMATCH" });
  });

  it("resets progression while preserving exactly one permanent reward", () => {
    const state = completedRun();
    state.resources.wood.amount = 90;
    state.buildings.shelter = 2;
    const result = applyCivilizationCommand(
      state,
      { type: "PRESTIGE_RESET", rewardId: "founder_stockpile", confirmRunNumber: 1 },
      10_000
    );
    const reset = expectSuccess(result);

    expect(reset).toMatchObject({ era: "stone", runNumber: 2, runStartedAt: 10_000, spaceCompleted: false });
    expect(reset.unlockedEras).toEqual(["stone"]);
    expect(reset.researchedTechs).toEqual([]);
    expect(reset.buildings.shelter).toBe(0);
    expect(reset.permanentRewards).toEqual({ abundant_harvest: 0, research_archive: 0, founder_stockpile: 1, efficient_industry: 0 });
    expect(reset.resources.wood).toEqual({ amount: 30, cap: 120 });
    expect(reset.resources.stone).toEqual({ amount: 15, cap: 120 });
    expect(result.events).toContainEqual({ type: "PRESTIGE_COMPLETED", id: "founder_stockpile", amount: 2 });
  });

  it("applies sidegrade bonuses and enforces the reward level cap", () => {
    const state = createInitialCivilizationState(0);
    state.workers.forager = 1;
    state.idleWorkers = 1;
    state.permanentRewards.abundant_harvest = 2;
    state.permanentRewards.research_archive = 1;
    state.permanentRewards.efficient_industry = 3;
    state.unlockedConverters = ["copper_smelter"];
    state.researchedTechs = ["basic_tools", "smelting"];
    state.unlockedEras = ["stone", "bronze"];
    state.era = "bronze";
    state.converters.copper_smelter.count = 1;

    expect(getCivilizationWorkerProductionRate(state, "forager")).toBeCloseTo(1);
    expect(getCivilizationConverterRates(state, "copper_smelter").inputs[0].amount).toBeCloseTo(0.47);

    const complete = completedRun();
    complete.permanentRewards.abundant_harvest = 5;
    expect(applyCivilizationCommand(complete, { type: "PRESTIGE_RESET", rewardId: "abundant_harvest", confirmRunNumber: 1 }, 0))
      .toMatchObject({ ok: false, error: "PRESTIGE_REWARD_MAXED" });
  });
});

describe("Civilization Idle invariants", () => {
  it("detects worker totals and resource cap corruption", () => {
    const invalid = createInitialCivilizationState(0);
    invalid.idleWorkers = 1;
    invalid.resources.wood.amount = 101;

    expect(getCivilizationInvariantViolations(invalid)).toEqual(
      expect.arrayContaining([
        "wood amount must not exceed cap",
        "assigned workers plus idle workers must equal population",
      ])
    );
    expect(() => assertCivilizationInvariants(invalid)).toThrow(CivilizationInvariantError);
  });

  it("preserves every invariant after a mixed command sequence", () => {
    let state = createInitialCivilizationState(0);
    state = expectSuccess(
      applyCivilizationCommand(
        state,
        { type: "ASSIGN_WORKER", jobId: "forager", delta: 1 },
        0
      )
    );
    state = expectSuccess(
      applyCivilizationCommand(state, { type: "START_ACTION", actionId: "chop_wood" }, 0)
    );
    state = expectSuccess(applyCivilizationCommand(state, { type: "SYNC" }, 4_000));
    state = expectSuccess(
      applyCivilizationCommand(state, { type: "BUY_BUILDING", buildingId: "shelter" }, 4_000)
    );

    expect(getCivilizationInvariantViolations(state)).toEqual([]);
  });
});
