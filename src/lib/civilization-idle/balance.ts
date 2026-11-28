import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_BUILDINGS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_ERA_ORDER,
  CIVILIZATION_JOBS,
  CIVILIZATION_REPEATABLE_RESEARCH,
  CIVILIZATION_TECHS,
} from "./content";
import { applyCivilizationCommand } from "./engine";
import { getCivilizationMilestones } from "./progression";
import {
  CIVILIZATION_CONVERTER_IDS,
  CIVILIZATION_JOB_IDS,
  createInitialCivilizationState,
} from "./state";
import {
  CIVILIZATION_MAX_OFFLINE_ELAPSED_MS,
  getCivilizationBottlenecks,
  getCivilizationResourceFlows,
  simulateCivilization,
} from "./simulation";
import type {
  CivilizationBuildingId,
  CivilizationCommand,
  CivilizationConverterId,
  CivilizationEraId,
  CivilizationJobId,
  CivilizationPolicyId,
  CivilizationRepeatableResearchId,
  CivilizationState,
  CivilizationTechId,
} from "./types";

export type CivilizationBalanceStrategyId =
  | "balanced"
  | "population"
  | "science"
  | "industry";

interface CivilizationBalanceStrategy {
  id: CivilizationBalanceStrategyId;
  policy: CivilizationPolicyId;
  workerWeights: Record<CivilizationJobId, number>;
  repeatableResearch: CivilizationRepeatableResearchId[];
}

export interface CivilizationBalanceCheckpoint {
  era: CivilizationEraId;
  reachedAtHours: number | null;
}

export interface CivilizationBalanceResult {
  strategy: CivilizationBalanceStrategyId;
  completed: boolean;
  completedAtHours: number | null;
  checkpoints: CivilizationBalanceCheckpoint[];
  completedMilestones: number;
  totalMilestones: number;
  longestMilestoneGapHours: number;
  commandsApplied: number;
  commandsRejected: number;
  dominantBottlenecks: Array<{ id: string; observations: number }>;
  finalEra: CivilizationEraId;
  finalSpaceProjectStage: number;
  nextResearch: CivilizationTechId | null;
  finalResources: Partial<Record<
    | "food"
    | "science"
    | "coal"
    | "steel"
    | "machinery"
    | "circuits"
    | "data"
    | "advanced_alloy"
    | "rocket_fuel"
    | "ship_parts",
    number
  >>;
  finalConverters: Partial<Record<CivilizationConverterId, number>>;
}

export interface CivilizationBalanceOptions {
  maxHours?: number;
  stepMinutes?: number;
}

function bottleneckKey(item: ReturnType<typeof getCivilizationBottlenecks>[number]): string {
  if (item.type === "STARVING") return item.type;
  if (item.type === "RESOURCE_FULL") return `${item.type}:${item.resource}`;
  if (item.type === "CONVERTER_INPUT" || item.type === "CONVERTER_OUTPUT") {
    return `${item.type}:${item.converterId}:${item.resource}`;
  }
  return `${item.type}:${item.converterId}`;
}

const STRATEGIES: Record<CivilizationBalanceStrategyId, CivilizationBalanceStrategy> = {
  balanced: {
    id: "balanced",
    policy: "balanced",
    workerWeights: {
      forager: 0.2,
      woodcutter: 0.18,
      hunter: 0.12,
      miner: 0.18,
      scientist: 0.24,
      coal_miner: 0.08,
    },
    repeatableResearch: [
      "labor_organization",
      "precision_casting",
      "fuel_efficiency",
      "machine_efficiency",
      "data_compression",
      "computer_efficiency",
      "material_efficiency",
      "propulsion_efficiency",
    ],
  },
  population: {
    id: "population",
    policy: "sustenance",
    workerWeights: {
      forager: 0.25,
      woodcutter: 0.15,
      hunter: 0.22,
      miner: 0.12,
      scientist: 0.2,
      coal_miner: 0.06,
    },
    repeatableResearch: [
      "food_storage",
      "labor_organization",
      "metal_reserves",
      "precision_casting",
      "fuel_efficiency",
      "data_compression",
      "material_efficiency",
    ],
  },
  science: {
    id: "science",
    policy: "scholarship",
    workerWeights: {
      forager: 0.2,
      woodcutter: 0.12,
      hunter: 0.16,
      miner: 0.1,
      scientist: 0.36,
      coal_miner: 0.06,
    },
    repeatableResearch: [
      "labor_organization",
      "data_compression",
      "computer_efficiency",
      "precision_casting",
      "machine_efficiency",
      "material_efficiency",
      "propulsion_efficiency",
    ],
  },
  industry: {
    id: "industry",
    policy: "industry",
    workerWeights: {
      forager: 0.18,
      woodcutter: 0.18,
      hunter: 0.16,
      miner: 0.17,
      scientist: 0.17,
      coal_miner: 0.14,
    },
    repeatableResearch: [
      "precision_casting",
      "metal_reserves",
      "fuel_efficiency",
      "machine_efficiency",
      "material_efficiency",
      "propulsion_efficiency",
      "labor_organization",
    ],
  },
};

const BUILDING_TARGETS: Partial<Record<CivilizationBuildingId, number>> = {
  hunting_ground: 1,
  stone_mine: 1,
  storytelling_circle: 1,
  shelter: 12,
  granary: 5,
  stockpile: 6,
  clay_brick_house: 8,
  metal_warehouse: 5,
  coal_mine: 1,
  worker_housing: 6,
  industrial_warehouse: 5,
  power_station: 8,
  industrial_institute: 3,
  electronics_warehouse: 4,
  network_station: 3,
  scheduler_center: 2,
  space_warehouse: 4,
  test_center: 1,
  evacuation_port: 1,
};

const BUILDING_ORDER: CivilizationBuildingId[] = [
  "hunting_ground",
  "stone_mine",
  "storytelling_circle",
  "stockpile",
  "granary",
  "shelter",
  "clay_brick_house",
  "metal_warehouse",
  "coal_mine",
  "industrial_warehouse",
  "industrial_institute",
  "worker_housing",
  "power_station",
  "electronics_warehouse",
  "network_station",
  "scheduler_center",
  "space_warehouse",
  "test_center",
  "evacuation_port",
];

const CONVERTER_TARGETS: Partial<Record<CivilizationConverterId, number>> = {
  copper_smelter: 3,
  bronze_foundry: 3,
  iron_forge: 3,
  steel_mill: 3,
  steam_generator: 8,
  machine_factory: 3,
  circuit_assembler: 3,
  data_center: 3,
  digital_lab: 2,
  space_material_plant: 4,
  rocket_fuel_refinery: 4,
  orbital_shipyard: 4,
};

const TECH_ORDER = Object.keys(CIVILIZATION_TECHS) as CivilizationTechId[];

function eraRank(era: CivilizationEraId): number {
  return CIVILIZATION_ERA_ORDER.indexOf(era);
}

function command(
  state: CivilizationState,
  input: CivilizationCommand,
  nowMs: number
): { state: CivilizationState; applied: boolean } {
  const result = applyCivilizationCommand(state, input, nowMs);
  return { state: result.state, applied: result.ok };
}

function availableJobs(state: CivilizationState): CivilizationJobId[] {
  return CIVILIZATION_JOB_IDS.filter((jobId) => {
    const required = CIVILIZATION_JOBS[jobId].buildingRequired;
    return !required || state.buildings[required] > 0;
  });
}

function rebalanceWorkers(
  state: CivilizationState,
  strategy: CivilizationBalanceStrategy,
  nowMs: number
): { state: CivilizationState; applied: number; rejected: number } {
  let applied = 0;
  let rejected = 0;
  for (const jobId of CIVILIZATION_JOB_IDS) {
    const assigned = state.workers[jobId];
    if (assigned <= 0) continue;
    const result = command(state, { type: "ASSIGN_WORKER", jobId, delta: -assigned }, nowMs);
    state = result.state;
    if (result.applied) applied++;
    else rejected++;
  }

  const jobs = availableJobs(state);
  const population = Math.floor(state.resources.population.amount);
  const weightTotal = jobs.reduce((sum, jobId) => sum + strategy.workerWeights[jobId], 0);
  const targets = Object.fromEntries(
    jobs.map((jobId) => [jobId, Math.floor(population * strategy.workerWeights[jobId] / weightTotal)])
  ) as Partial<Record<CivilizationJobId, number>>;
  let assigned = Object.values(targets).reduce((sum, value) => sum + (value ?? 0), 0);
  const priority = [...jobs].sort(
    (left, right) => strategy.workerWeights[right] - strategy.workerWeights[left]
  );
  for (let index = 0; assigned < population; index++, assigned++) {
    const jobId = priority[index % priority.length];
    targets[jobId] = (targets[jobId] ?? 0) + 1;
  }

  for (const jobId of jobs) {
    const delta = targets[jobId] ?? 0;
    if (delta <= 0) continue;
    const result = command(state, { type: "ASSIGN_WORKER", jobId, delta }, nowMs);
    state = result.state;
    if (result.applied) applied++;
    else rejected++;
  }

  const foodJob: CivilizationJobId = state.buildings.hunting_ground > 0
    ? "hunter"
    : "forager";
  const donors = jobs
    .filter((jobId) => jobId !== "forager" && jobId !== "hunter")
    .sort((left, right) => strategy.workerWeights[left] - strategy.workerWeights[right]);
  let guard = population;
  while (getCivilizationResourceFlows(state).food.netPerSecond < 0 && guard-- > 0) {
    const donor = donors.find((jobId) => state.workers[jobId] > 0);
    if (!donor) break;
    const removed = command(state, { type: "ASSIGN_WORKER", jobId: donor, delta: -1 }, nowMs);
    state = removed.state;
    if (removed.applied) applied++;
    else rejected++;
    const added = command(state, { type: "ASSIGN_WORKER", jobId: foodJob, delta: 1 }, nowMs);
    state = added.state;
    if (added.applied) applied++;
    else rejected++;
  }
  return { state, applied, rejected };
}

export function runCivilizationBalanceStrategy(
  strategyId: CivilizationBalanceStrategyId,
  options: CivilizationBalanceOptions = {}
): CivilizationBalanceResult {
  const strategy = STRATEGIES[strategyId];
  const maxHours = options.maxHours ?? 1_200;
  const stepMinutes = options.stepMinutes ?? 8 * 60;
  const stepMs = stepMinutes * 60_000;
  const endMs = maxHours * 60 * 60_000;
  let state = createInitialCivilizationState(0);
  let commandsApplied = 0;
  let commandsRejected = 0;
  let completedMilestones = 0;
  let lastMilestoneAt = 0;
  let longestMilestoneGapMs = 0;
  let lastRebalanceAt = -60 * 60_000;
  const bottlenecks = new Map<string, number>();
  const checkpoints = new Map<CivilizationEraId, number | null>(
    CIVILIZATION_ERA_ORDER.map((era) => [era, era === "stone" ? 0 : null])
  );

  const apply = (input: CivilizationCommand, nowMs: number) => {
    const result = command(state, input, nowMs);
    state = result.state;
    if (result.applied) commandsApplied++;
    else commandsRejected++;
    return result.applied;
  };

  if (state.policy.id !== strategy.policy) {
    apply({ type: "SET_POLICY", policyId: strategy.policy }, 0);
  }
  for (const buildingId of BUILDING_ORDER) {
    const target = BUILDING_TARGETS[buildingId] ?? 0;
    if (state.buildings[buildingId] < target) {
      apply({ type: "BUY_BUILDING", buildingId }, 0);
    }
  }
  const initialWorkers = rebalanceWorkers(state, strategy, 0);
  state = initialWorkers.state;
  commandsApplied += initialWorkers.applied;
  commandsRejected += initialWorkers.rejected;
  lastRebalanceAt = 0;
  for (const actionId of Object.keys(CIVILIZATION_ACTIONS) as Array<keyof typeof CIVILIZATION_ACTIONS>) {
    apply({ type: "START_ACTION", actionId }, 0);
  }

  for (let nowMs = stepMs; nowMs <= endMs && !state.spaceCompleted; nowMs += stepMs) {
    const offline = simulateCivilization(
      state,
      nowMs,
      CIVILIZATION_MAX_OFFLINE_ELAPSED_MS,
      10_000
    );
    state = offline.state;
    if (offline.remainingMs > 0) state.lastSimulatedAt = nowMs;

    if (state.policy.id !== strategy.policy) {
      apply({ type: "SET_POLICY", policyId: strategy.policy }, nowMs);
    }

    for (const buildingId of BUILDING_ORDER) {
      const definition = CIVILIZATION_BUILDINGS[buildingId];
      const target = BUILDING_TARGETS[buildingId] ?? 0;
      if (eraRank(definition.era) <= eraRank(state.era) && state.buildings[buildingId] < target) {
        apply({ type: "BUY_BUILDING", buildingId }, nowMs);
      }
    }

    for (const techId of TECH_ORDER) {
      if (!state.researchedTechs.includes(techId)) {
        apply({ type: "BUY_RESEARCH", techId }, nowMs);
      }
    }

    for (const converterId of CIVILIZATION_CONVERTER_IDS) {
      const definition = CIVILIZATION_CONVERTERS[converterId];
      const target = CONVERTER_TARGETS[converterId] ?? 0;
      if (
        eraRank(definition.era) <= eraRank(state.era) &&
        state.converters[converterId].count < target
      ) {
        apply({ type: "BUY_CONVERTER", converterId }, nowMs);
      }
    }

    if (state.researchedTechs.includes("factory_priority")) {
      for (const converterId of CIVILIZATION_CONVERTER_IDS) {
        if (state.converters[converterId].count <= 0) continue;
        const priority = [
          "data_center",
          "space_material_plant",
          "rocket_fuel_refinery",
          "orbital_shipyard",
        ].includes(converterId)
          ? 1
          : ["copper_smelter", "bronze_foundry", "iron_forge"].includes(converterId)
            ? 3
            : 2;
        if (state.converters[converterId].priority !== priority) {
          apply({ type: "SET_CONVERTER_PRIORITY", converterId, priority }, nowMs);
        }
      }
    }

    for (const researchId of strategy.repeatableResearch) {
      const definition = CIVILIZATION_REPEATABLE_RESEARCH[researchId];
      if (state.researchLevels[researchId] < Math.min(3, definition.maxLevel)) {
        apply({ type: "BUY_REPEATABLE_RESEARCH", researchId }, nowMs);
      }
    }

    for (const nextEra of CIVILIZATION_ERA_ORDER.slice(1)) {
      if (state.unlockedEras.includes(nextEra) && eraRank(nextEra) > eraRank(state.era)) {
        if (apply({ type: "ADVANCE_ERA", eraId: nextEra }, nowMs)) {
          checkpoints.set(nextEra, nowMs);
        }
      }
    }

    for (const stage of [1, 2, 3, 4] as const) {
      if (state.spaceProjectStage + 1 === stage) {
        apply({ type: "COMPLETE_SPACE_PROJECT_STAGE", stage }, nowMs);
      }
    }

    if (nowMs - lastRebalanceAt >= 60 * 60_000 || state.idleWorkers >= 2) {
      const result = rebalanceWorkers(state, strategy, nowMs);
      state = result.state;
      commandsApplied += result.applied;
      commandsRejected += result.rejected;
      lastRebalanceAt = nowMs;
    }

    for (const actionId of Object.keys(CIVILIZATION_ACTIONS) as Array<keyof typeof CIVILIZATION_ACTIONS>) {
      if (!state.activeActions[actionId]) {
        apply({ type: "START_ACTION", actionId }, nowMs);
      }
    }

    const currentCompleted = getCivilizationMilestones(state).filter((item) => item.completed).length;
    if (currentCompleted > completedMilestones) {
      longestMilestoneGapMs = Math.max(longestMilestoneGapMs, nowMs - lastMilestoneAt);
      lastMilestoneAt = nowMs;
      completedMilestones = currentCompleted;
    }

    if (nowMs % (60 * 60_000) === 0) {
      for (const item of getCivilizationBottlenecks(state)) {
        const key = bottleneckKey(item);
        bottlenecks.set(key, (bottlenecks.get(key) ?? 0) + 1);
      }
    }
  }

  const finalHours = state.lastSimulatedAt / 3_600_000;
  const milestones = getCivilizationMilestones(state);
  longestMilestoneGapMs = Math.max(
    longestMilestoneGapMs,
    state.lastSimulatedAt - lastMilestoneAt
  );
  return {
    strategy: strategy.id,
    completed: state.spaceCompleted,
    completedAtHours: state.spaceCompleted ? Number(finalHours.toFixed(2)) : null,
    checkpoints: CIVILIZATION_ERA_ORDER.map((era) => ({
      era,
      reachedAtHours: checkpoints.get(era) === null
        ? null
        : Number(((checkpoints.get(era) ?? 0) / 3_600_000).toFixed(2)),
    })),
    completedMilestones: milestones.filter((item) => item.completed).length,
    totalMilestones: milestones.length,
    longestMilestoneGapHours: Number((longestMilestoneGapMs / 3_600_000).toFixed(2)),
    commandsApplied,
    commandsRejected,
    dominantBottlenecks: [...bottlenecks.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([id, observations]) => ({ id, observations })),
    finalEra: state.era,
    finalSpaceProjectStage: state.spaceProjectStage,
    nextResearch: TECH_ORDER.find((techId) => !state.researchedTechs.includes(techId)) ?? null,
    finalResources: Object.fromEntries(
      ([
        "food",
        "science",
        "coal",
        "steel",
        "machinery",
        "circuits",
        "data",
        "advanced_alloy",
        "rocket_fuel",
        "ship_parts",
      ] as const)
        .map((id) => [id, Number(state.resources[id].amount.toFixed(2))])
    ),
    finalConverters: Object.fromEntries(
      CIVILIZATION_CONVERTER_IDS
        .filter((id) => state.converters[id].count > 0)
        .map((id) => [id, state.converters[id].count])
    ),
  };
}

export function runCivilizationBalanceMatrix(
  options: CivilizationBalanceOptions = {}
): CivilizationBalanceResult[] {
  return (Object.keys(STRATEGIES) as CivilizationBalanceStrategyId[]).map((strategy) =>
    runCivilizationBalanceStrategy(strategy, options)
  );
}
