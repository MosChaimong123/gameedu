import { CIVILIZATION_TECHS, type CivilizationCost } from "./content";
import { applyCivilizationCommand, canCompleteCivilizationBronze, getCivilizationBuildingCost, getCivilizationConverterCost } from "./engine";
import { CIVILIZATION_MAX_OFFLINE_ELAPSED_MS, simulateCivilization } from "./simulation";
import { createInitialCivilizationState } from "./state";
import type {
  CivilizationActionId,
  CivilizationBuildingId,
  CivilizationCommand,
  CivilizationConverterId,
  CivilizationJobId,
  CivilizationState,
  CivilizationTechId,
} from "./types";

export type CivilizationBaselineStrategy = "lean" | "balanced" | "science" | "industry";

export interface CivilizationBaselineResult {
  strategy: CivilizationBaselineStrategy;
  elapsedSeconds: number;
  completed: boolean;
  milestonesSeconds: Partial<Record<"science_unlocked" | "bronze" | "smelting" | "writing" | "steam_power", number>>;
  decisions: number;
  foodEmptySeconds: number;
  scienceCappedSeconds: number;
  materialCappedSeconds: number;
  convertersBuilt: number;
  resources: Record<"food" | "wood" | "stone" | "science", number>;
}

const TICK_MS = 30_000;
const ACTIONS: CivilizationActionId[] = ["gather_fruit", "chop_wood", "mine_stone", "pan_copper", "forge_iron", "mine_coal"];
const TECH_ORDER: CivilizationTechId[] = [
  "basic_tools", "foraging", "logging", "masonry", "animal_husbandry", "agriculture",
  "writing", "smelting", "bronze_working", "iron_working", "steam_power",
];
const JOB_ORDER: CivilizationJobId[] = ["forager", "hunter", "woodcutter", "miner", "scientist", "coal_miner"];

function affordable(state: CivilizationState, costs: CivilizationCost[]): boolean {
  return costs.every(({ resource, amount }) => state.resources[resource].amount >= amount);
}

function buildingTargets(strategy: CivilizationBaselineStrategy): [CivilizationBuildingId, number][] {
  const shelters = { lean: 0, balanced: 2, science: 1, industry: 4 }[strategy];
  return [
    ["hunting_ground", 1], ["stone_mine", 1], ["storytelling_circle", 1],
    ["shelter", shelters], ["stockpile", strategy === "industry" ? 1 : 0],
  ];
}

function desiredWorkers(state: CivilizationState, strategy: CivilizationBaselineStrategy): Record<CivilizationJobId, number> {
  const population = state.resources.population.amount;
  const hasHunter = state.buildings.hunting_ground > 0;
  const foodWorkers = Math.min(population, Math.ceil((population * 0.5 + 0.4) / (hasHunter ? 1.5 : 0.8)));
  const desired: Record<CivilizationJobId, number> = {
    forager: hasHunter ? 0 : foodWorkers,
    hunter: hasHunter ? foodWorkers : 0,
    woodcutter: 0,
    miner: 0,
    scientist: 0,
    coal_miner: 0,
  };
  let free = population - foodWorkers;
  const materialWorkers = strategy === "industry" ? 2 : 1;
  desired.woodcutter = Math.min(free, materialWorkers);
  free -= desired.woodcutter;
  if (state.buildings.stone_mine > 0) {
    desired.miner = Math.min(free, materialWorkers);
    free -= desired.miner;
  }
  if (state.buildings.storytelling_circle > 0) {
    desired.scientist = free;
  }
  return desired;
}

export function runCivilizationBaseline(
  strategy: CivilizationBaselineStrategy,
  maxElapsedMs = 4 * 60 * 60 * 1_000
): CivilizationBaselineResult {
  if (!Number.isInteger(maxElapsedMs) || maxElapsedMs < 0 || maxElapsedMs % TICK_MS !== 0) {
    throw new RangeError("maxElapsedMs must be a non-negative multiple of 30 seconds");
  }
  let state = createInitialCivilizationState(0);
  let decisions = 0;
  let foodEmptySeconds = 0;
  let scienceCappedSeconds = 0;
  let materialCappedSeconds = 0;
  const milestonesSeconds: CivilizationBaselineResult["milestonesSeconds"] = {};

  function command(input: CivilizationCommand): void {
    const result = applyCivilizationCommand(state, input, state.lastSimulatedAt);
    if (!result.ok) throw new Error(`Baseline policy issued ${input.type}: ${result.error}`);
    state = result.state;
    decisions += 1;
  }

  for (let nowMs = 0; nowMs <= maxElapsedMs; nowMs += TICK_MS) {
    if (nowMs > 0) {
      state = simulateCivilization(state, nowMs).state;
      if (state.resources.food.amount === 0) foodEmptySeconds += TICK_MS / 1_000;
      if (state.resources.science.amount >= state.resources.science.cap) scienceCappedSeconds += TICK_MS / 1_000;
      if (state.resources.wood.amount >= state.resources.wood.cap || state.resources.stone.amount >= state.resources.stone.cap) {
        materialCappedSeconds += TICK_MS / 1_000;
      }
    }

    for (const [buildingId, count] of buildingTargets(strategy)) {
      if (state.buildings[buildingId] < count && affordable(state, getCivilizationBuildingCost(state, buildingId))) {
        command({ type: "BUY_BUILDING", buildingId });
      }
    }
    if (state.buildings.storytelling_circle > 0 && milestonesSeconds.science_unlocked === undefined) {
      milestonesSeconds.science_unlocked = nowMs / 1_000;
    }

    const desired = desiredWorkers(state, strategy);
    for (const jobId of JOB_ORDER) {
      const excess = state.workers[jobId] - desired[jobId];
      if (excess > 0) command({ type: "ASSIGN_WORKER", jobId, delta: -excess });
    }
    for (const jobId of JOB_ORDER) {
      const missing = desired[jobId] - state.workers[jobId];
      if (missing > 0) command({ type: "ASSIGN_WORKER", jobId, delta: missing });
    }

    const techOrder = strategy === "industry"
      ? [...TECH_ORDER.filter((id) => id !== "writing"), "writing" as const]
      : TECH_ORDER;
    for (const techId of techOrder) {
      const tech = CIVILIZATION_TECHS[techId];
      if (tech.era !== state.era || state.researchedTechs.includes(techId)) continue;
      if (techId === "steam_power" && !canCompleteCivilizationBronze(state)) continue;
      if (tech.prerequisites.every((id) => state.researchedTechs.includes(id)) && state.resources.science.amount >= tech.scienceCost) {
        command({ type: "BUY_RESEARCH", techId });
        if (techId === "smelting" || techId === "writing" || techId === "steam_power") {
          milestonesSeconds[techId] = nowMs / 1_000;
        }
      }
    }
    if (state.unlockedEras.includes("bronze") && state.era === "stone") {
      command({ type: "ADVANCE_ERA", eraId: "bronze" });
      milestonesSeconds.bronze = nowMs / 1_000;
    }
    const converterIds: CivilizationConverterId[] = ["copper_smelter", "bronze_foundry", "iron_forge"];
    const converterTarget = strategy === "industry" ? 3 : 1;
    for (const converterId of converterIds) {
      if (state.unlockedConverters.includes(converterId) && state.converters[converterId].count < converterTarget && affordable(state, getCivilizationConverterCost(state, converterId))) {
        command({ type: "BUY_CONVERTER", converterId });
      }
    }
    if (state.bronzeCompleted || nowMs === maxElapsedMs) break;

    for (const actionId of ACTIONS) {
      if (actionId === "mine_coal") continue;
      if ((actionId === "pan_copper" || actionId === "forge_iron") && strategy !== "industry") continue;
      if ((actionId === "pan_copper" || actionId === "forge_iron") && state.era !== "bronze") continue;
      const resource = { gather_fruit: "food", chop_wood: "wood", mine_stone: "stone", pan_copper: "copper", forge_iron: "iron", mine_coal: "coal", audit_system: "data" }[actionId] as keyof CivilizationState["resources"];
      if (state.resources[resource].amount < state.resources[resource].cap * 0.8 && !state.activeActions[actionId]) {
        command({ type: "START_ACTION", actionId });
      }
    }
  }

  return {
    strategy,
    elapsedSeconds: state.lastSimulatedAt / 1_000,
    completed: state.bronzeCompleted,
    milestonesSeconds,
    decisions,
    foodEmptySeconds,
    scienceCappedSeconds,
    materialCappedSeconds,
    convertersBuilt: Object.values(state.converters).reduce((total, converter) => total + converter.count, 0),
    resources: Object.fromEntries((["food", "wood", "stone", "science"] as const).map((id) => [id, Math.round(state.resources[id].amount * 100) / 100])) as CivilizationBaselineResult["resources"],
  };
}

export function probeCivilizationDailyReturn(daysAway: number) {
  if (!Number.isInteger(daysAway) || daysAway < 1) throw new RangeError("daysAway must be a positive integer");
  const requestedElapsedMs = daysAway * 24 * 60 * 60 * 1_000;
  const result = simulateCivilization(
    createInitialCivilizationState(0),
    requestedElapsedMs,
    CIVILIZATION_MAX_OFFLINE_ELAPSED_MS
  );
  return {
    requestedHours: requestedElapsedMs / 3_600_000,
    simulatedHours: result.state.lastSimulatedAt / 3_600_000,
    discardedHours: result.remainingMs / 3_600_000,
  };
}
