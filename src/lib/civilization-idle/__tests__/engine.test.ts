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
  getCivilizationInvariantViolations,
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

describe("Civilization Idle initial state", () => {
  it("creates a valid isolated Stone state", () => {
    const state = createInitialCivilizationState(1_000);

    expect(state.era).toBe("stone");
    expect(state.resources).toMatchObject({
      food: { amount: 50, cap: 200 },
      population: { amount: 2, cap: 10 },
      science: { amount: 0, cap: 1_000 },
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
    initial.actionLevels.gather_fruit = 5;

    expect(getCivilizationActionCooldownMs(initial, "gather_fruit")).toBeCloseTo(
      3_000 * Math.pow(0.93, 4) - 800
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

  it("grows population every eight seconds and grants an idle worker", () => {
    const simulated = simulateCivilization(createInitialCivilizationState(0), 8_000).state;
    expect(simulated.resources.population.amount).toBe(3);
    expect(simulated.idleWorkers).toBe(3);
    expect(simulated.populationGrowthProgressMs).toBe(0);
  });

  it("applies population and production Tech bonuses", () => {
    const initial = createInitialCivilizationState(0);
    initial.researchedTechs = ["basic_tools", "foraging", "animal_husbandry"];
    initial.workers.forager = 1;
    initial.idleWorkers = 1;

    const oneSecond = simulateCivilization(initial, 1_000).state;
    expect(oneSecond.resources.food.amount).toBeCloseTo(49.92);

    const growth = simulateCivilization(initial, 5_334).state;
    expect(growth.resources.population.amount).toBe(3);
  });

  it("caps one online simulation call at thirty seconds", () => {
    const result = simulateCivilization(createInitialCivilizationState(0), 60_000);
    expect(result.state.lastSimulatedAt).toBe(30_000);
    expect(result.remainingMs).toBe(30_000);
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
    state = expectSuccess(
      applyCivilizationCommand(state, { type: "BUY_RESEARCH", techId: "steam_power" }, 0)
    );
    expect(state.bronzeCompleted).toBe(true);
    expect(state.resources.science.amount).toBe(0);
    expect(state.resources.science.cap).toBe(1_000);
  });

  it("rejects research with missing prerequisites", () => {
    const initial = giveResources(createInitialCivilizationState(0), { science: 100 });
    expect(
      applyCivilizationCommand(initial, { type: "BUY_RESEARCH", techId: "masonry" }, 0)
    ).toMatchObject({ ok: false, error: "PREREQUISITE_MISSING" });
  });
});

describe("Civilization Idle converters", () => {
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
