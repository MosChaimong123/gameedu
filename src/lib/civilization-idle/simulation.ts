import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_JOBS,
  CIVILIZATION_MASTERY_THRESHOLDS_SECONDS,
  CIVILIZATION_POLICIES,
  CIVILIZATION_TECHS,
} from "./content";
import { assertCivilizationInvariants } from "./invariants";
import {
  CIVILIZATION_ACTION_IDS,
  CIVILIZATION_CONVERTER_IDS,
  CIVILIZATION_JOB_IDS,
  CIVILIZATION_RESOURCE_IDS,
  cloneCivilizationState,
} from "./state";
import type {
  CivilizationActionId,
  CivilizationConverterId,
  CivilizationEngineEvent,
  CivilizationJobId,
  CivilizationResourceId,
  CivilizationState,
} from "./types";

export const CIVILIZATION_MAX_ONLINE_ELAPSED_MS = 30_000;
export const CIVILIZATION_MAX_OFFLINE_ELAPSED_MS = 72 * 60 * 60 * 1_000;
export const CIVILIZATION_MAX_SIMULATION_STEP_MS = 1_000;
export const CIVILIZATION_MAX_STABLE_SIMULATION_STEP_MS = 60_000;
const POPULATION_GROWTH_INTERVAL_MS = 8_000;
const STARVATION_WORKER_MULTIPLIER = 0.25;
const FOOD_CONSUMPTION_PER_PERSON_PER_SECOND = 0.5;
const EPSILON = 1e-9;

export interface CivilizationSimulationResult {
  state: CivilizationState;
  events: CivilizationEngineEvent[];
  remainingMs: number;
}

export interface CivilizationResourceFlow {
  productionPerSecond: number;
  consumptionPerSecond: number;
  netPerSecond: number;
}

export type CivilizationBottleneck =
  | { type: "STARVING" }
  | { type: "RESOURCE_FULL"; resource: CivilizationResourceId }
  | { type: "CONVERTER_INPUT"; converterId: CivilizationConverterId; resource: CivilizationResourceId }
  | { type: "CONVERTER_OUTPUT"; converterId: CivilizationConverterId; resource: CivilizationResourceId }
  | { type: "POWER_SHORTAGE"; converterId: CivilizationConverterId }
  | { type: "COMPUTE_SHORTAGE"; converterId: CivilizationConverterId }
  | { type: "AUTOMATION_PAUSED"; converterId: CivilizationConverterId };

export interface CivilizationPowerStatus {
  supply: number;
  demand: number;
  used: number;
  available: number;
  poweredConverters: CivilizationConverterId[];
  unpoweredConverters: CivilizationConverterId[];
}

export interface CivilizationComputeStatus {
  supply: number;
  demand: number;
  used: number;
  available: number;
  poweredConverters: CivilizationConverterId[];
  unpoweredConverters: CivilizationConverterId[];
}

function addResource(
  state: CivilizationState,
  resourceId: CivilizationResourceId,
  amount: number
): void {
  const resource = state.resources[resourceId];
  resource.amount = Math.min(resource.cap, Math.max(0, resource.amount + amount));
}

export function getCivilizationProductionBonus(
  state: CivilizationState,
  resourceId: CivilizationResourceId
): number {
  let bonus = 0;
  for (const techId of state.researchedTechs) {
    for (const effect of CIVILIZATION_TECHS[techId].effects) {
      if (effect.type === "production_bonus" && effect.resource === resourceId) {
        bonus += effect.value;
      }
    }
  }
  if (resourceId === "science") {
    bonus += state.permanentRewards.research_archive * 0.05;
  }
  return bonus;
}

export function getCivilizationPopulationGrowthBonus(state: CivilizationState): number {
  let bonus = 0;
  for (const techId of state.researchedTechs) {
    for (const effect of CIVILIZATION_TECHS[techId].effects) {
      if (effect.type === "population_growth_bonus") {
        bonus += effect.value;
      }
    }
  }
  return bonus;
}

export function getCivilizationWorkerProductionRate(
  state: CivilizationState,
  jobId: CivilizationJobId,
  workerCount: number = state.workers[jobId]
): number {
  const job = CIVILIZATION_JOBS[jobId];
  // Food workers must retain a recovery path when storage reaches zero.
  // Starvation still reduces every other job so ignoring food has a real cost.
  const workerMultiplier = state.resources.food.amount <= EPSILON && job.produces !== "food"
    ? STARVATION_WORKER_MULTIPLIER
    : 1;
  const bonus = getCivilizationProductionBonus(state, job.produces);
  const masteryBonus = Math.floor(getCivilizationJobMasteryLevel(state, jobId) / 2) * 0.04;
  const organizationBonus = state.researchLevels.labor_organization * 0.03;
  const policyBonus = CIVILIZATION_POLICIES[state.policy.id].workerBonuses[job.produces] ?? 0;
  const harvestBonus = job.produces === "food"
    ? state.permanentRewards.abundant_harvest * 0.05
    : 0;
  return workerCount * job.baseRate * workerMultiplier * (1 + bonus + masteryBonus + organizationBonus + policyBonus + harvestBonus);
}

export function getCivilizationJobMasteryLevel(
  state: CivilizationState,
  jobId: CivilizationJobId
): number {
  const seconds = state.jobMasterySeconds[jobId];
  let level = 1;
  for (let index = 1; index < CIVILIZATION_MASTERY_THRESHOLDS_SECONDS.length; index += 1) {
    if (seconds + EPSILON < CIVILIZATION_MASTERY_THRESHOLDS_SECONDS[index]) break;
    level = index + 1;
  }
  return level;
}

export function getCivilizationConverterRates(
  state: CivilizationState,
  converterId: CivilizationConverterId,
  converterCount: number = state.converters[converterId].count
) {
  const definition = CIVILIZATION_CONVERTERS[converterId];
  const policy = CIVILIZATION_POLICIES[state.policy.id];
  const precisionMultiplier = converterId === "bronze_foundry"
    ? 1 - state.researchLevels.precision_casting * 0.02
    : 1;
  const fuelMultiplier = converterId === "steam_generator"
    ? 1 - state.researchLevels.fuel_efficiency * 0.02
    : 1;
  const machineMultiplier = converterId === "machine_factory"
    ? 1 + state.researchLevels.machine_efficiency * 0.03
    : 1;
  const dataMultiplier = converterId === "data_center"
    ? 1 + state.researchLevels.data_compression * 0.03
    : 1;
  const materialInputMultiplier = converterId === "space_material_plant"
    ? 1 - state.researchLevels.material_efficiency * 0.02
    : 1;
  const permanentInputMultiplier = 1 - state.permanentRewards.efficient_industry * 0.02;
  return {
    inputs: definition.inputs.map((input) => ({
      resource: input.resource,
      amount: input.amount * converterCount * precisionMultiplier * fuelMultiplier * materialInputMultiplier * permanentInputMultiplier * policy.converterInputMultiplier,
    })),
    outputs: definition.outputs.map((output) => ({
      resource: output.resource,
      amount:
        output.amount *
        converterCount *
        policy.converterOutputMultiplier *
        machineMultiplier *
        dataMultiplier *
        (1 + getCivilizationProductionBonus(state, output.resource)),
    })),
  };
}

function converterHasInputsAndCapacity(
  state: CivilizationState,
  converterId: CivilizationConverterId
): boolean {
  const rates = getCivilizationConverterRates(state, converterId);
  return rates.inputs.every((input) => state.resources[input.resource].amount + EPSILON >= input.amount) &&
    rates.outputs.every((output) => state.resources[output.resource].amount + output.amount <= state.resources[output.resource].cap + EPSILON);
}

function converterHasInputs(
  state: CivilizationState,
  converterId: CivilizationConverterId
): boolean {
  return getCivilizationConverterRates(state, converterId).inputs.every(
    (input) => state.resources[input.resource].amount + EPSILON >= input.amount
  );
}

export function getCivilizationConverterPowerDemand(
  state: CivilizationState,
  converterId: CivilizationConverterId
): number {
  if (!state.researchedTechs.includes("electrification")) return 0;
  const informationEfficiency = ["circuit_assembler", "data_center", "digital_lab"].includes(converterId)
    ? 1 - state.researchLevels.computer_efficiency * 0.02
    : 1;
  return (CIVILIZATION_CONVERTERS[converterId].powerDemand ?? 0) *
    state.converters[converterId].count * informationEfficiency;
}

export function getCivilizationAutomationSlots(state: CivilizationState): number {
  if (!state.researchedTechs.includes("job_scheduling")) return 0;
  return Math.min(3, 1 + state.buildings.scheduler_center);
}

function getCivilizationEffectivePriority(
  state: CivilizationState,
  converterId: CivilizationConverterId
): number {
  if (converterId === "data_center" && state.automationRules.includes("prioritize_data_center")) return 0;
  return state.converters[converterId].priority;
}

function automationAllowsConverter(
  state: CivilizationState,
  converterId: CivilizationConverterId
): boolean {
  const rates = getCivilizationConverterRates(state, converterId);
  if (converterId === "circuit_assembler" && state.automationRules.includes("protect_copper")) {
    const copper = rates.inputs.find((input) => input.resource === "copper")?.amount ?? 0;
    if (state.resources.copper.amount - copper < 40 - EPSILON) return false;
  }
  if (["circuit_assembler", "machine_factory"].includes(converterId) && state.automationRules.includes("protect_steel")) {
    const steel = rates.inputs.find((input) => input.resource === "steel")?.amount ?? 0;
    if (state.resources.steel.amount - steel < 50 - EPSILON) return false;
  }
  return true;
}

export function getCivilizationPowerStatus(state: CivilizationState): CivilizationPowerStatus {
  const generator = state.converters.steam_generator;
  const generatorAvailable = generator.count > 0 && generator.enabled &&
    state.unlockedConverters.includes("steam_generator") &&
    converterHasInputsAndCapacity(state, "steam_generator");
  const generatorBonus = state.researchedTechs.includes("efficient_generator") ? 1.25 : 1;
  const stationBonus = 1 + state.buildings.power_station * 0.05;
  const supply = generatorAvailable
    ? generator.count * (CIVILIZATION_CONVERTERS.steam_generator.powerSupply ?? 0) * generatorBonus * stationBonus
    : 0;
  const candidates = CIVILIZATION_CONVERTER_IDS
    .filter((id) => {
      const converter = state.converters[id];
      return getCivilizationConverterPowerDemand(state, id) > 0 && converter.count > 0 && converter.enabled &&
        state.unlockedConverters.includes(id) &&
        (id === "data_center"
          ? converterHasInputs(state, id)
          : converterHasInputsAndCapacity(state, id)) &&
        automationAllowsConverter(state, id);
    })
    .sort((left, right) => getCivilizationEffectivePriority(state, left) - getCivilizationEffectivePriority(state, right) || left.localeCompare(right));
  const demand = candidates.reduce((total, id) => total + getCivilizationConverterPowerDemand(state, id), 0);
  let remaining = supply;
  const poweredConverters: CivilizationConverterId[] = [];
  const unpoweredConverters: CivilizationConverterId[] = [];
  for (const id of candidates) {
    const required = getCivilizationConverterPowerDemand(state, id);
    if (remaining + EPSILON >= required) {
      poweredConverters.push(id);
      remaining -= required;
    } else {
      unpoweredConverters.push(id);
    }
  }
  return { supply, demand, used: supply - remaining, available: remaining, poweredConverters, unpoweredConverters };
}

export function getCivilizationComputeStatus(state: CivilizationState): CivilizationComputeStatus {
  const power = getCivilizationPowerStatus(state);
  const center = state.converters.data_center;
  const centerAvailable = center.count > 0 && center.enabled &&
    state.unlockedConverters.includes("data_center") && converterHasInputs(state, "data_center") &&
    automationAllowsConverter(state, "data_center") &&
    (getCivilizationConverterPowerDemand(state, "data_center") <= 0 || power.poweredConverters.includes("data_center"));
  const networkBonus = 1 + state.buildings.network_station * 0.05;
  const supply = centerAvailable
    ? center.count * (CIVILIZATION_CONVERTERS.data_center.computeSupply ?? 0) * networkBonus
    : 0;
  const candidates = CIVILIZATION_CONVERTER_IDS
    .filter((id) => {
      const converter = state.converters[id];
      return (CIVILIZATION_CONVERTERS[id].computeDemand ?? 0) > 0 && converter.count > 0 &&
        converter.enabled && state.unlockedConverters.includes(id) &&
        converterHasInputsAndCapacity(state, id) && automationAllowsConverter(state, id);
    })
    .sort((left, right) => getCivilizationEffectivePriority(state, left) - getCivilizationEffectivePriority(state, right) || left.localeCompare(right));
  const demand = candidates.reduce(
    (total, id) => total + (CIVILIZATION_CONVERTERS[id].computeDemand ?? 0) * state.converters[id].count,
    0
  );
  let remaining = supply;
  const poweredConverters: CivilizationConverterId[] = [];
  const unpoweredConverters: CivilizationConverterId[] = [];
  for (const id of candidates) {
    const required = (CIVILIZATION_CONVERTERS[id].computeDemand ?? 0) * state.converters[id].count;
    if (remaining + EPSILON >= required) {
      poweredConverters.push(id);
      remaining -= required;
    } else {
      unpoweredConverters.push(id);
    }
  }
  return { supply, demand, used: supply - remaining, available: remaining, poweredConverters, unpoweredConverters };
}

function converterBlocker(
  state: CivilizationState,
  converterId: CivilizationConverterId
): CivilizationBottleneck | null {
  const rates = getCivilizationConverterRates(state, converterId);
  const missingInput = rates.inputs.find(
    (input) => state.resources[input.resource].amount + EPSILON < input.amount
  );
  if (missingInput) {
    return { type: "CONVERTER_INPUT", converterId, resource: missingInput.resource };
  }
  if (!automationAllowsConverter(state, converterId)) {
    return { type: "AUTOMATION_PAUSED", converterId };
  }
  const powerDemand = getCivilizationConverterPowerDemand(state, converterId);
  if (powerDemand > 0 && !getCivilizationPowerStatus(state).poweredConverters.includes(converterId)) {
    return { type: "POWER_SHORTAGE", converterId };
  }
  const computeDemand = (CIVILIZATION_CONVERTERS[converterId].computeDemand ?? 0) * state.converters[converterId].count;
  if (computeDemand > 0 && !getCivilizationComputeStatus(state).poweredConverters.includes(converterId)) {
    return { type: "COMPUTE_SHORTAGE", converterId };
  }
  const fullOutput = rates.outputs.find(
    (output) => state.resources[output.resource].amount + output.amount > state.resources[output.resource].cap + EPSILON
  );
  return fullOutput
    ? { type: "CONVERTER_OUTPUT", converterId, resource: fullOutput.resource }
    : null;
}

export function getCivilizationResourceFlows(
  state: CivilizationState
): Record<CivilizationResourceId, CivilizationResourceFlow> {
  const flows = Object.fromEntries(
    CIVILIZATION_RESOURCE_IDS.map((id) => [id, { productionPerSecond: 0, consumptionPerSecond: 0, netPerSecond: 0 }])
  ) as Record<CivilizationResourceId, CivilizationResourceFlow>;

  for (const jobId of CIVILIZATION_JOB_IDS) {
    const job = CIVILIZATION_JOBS[jobId];
    flows[job.produces].productionPerSecond += getCivilizationWorkerProductionRate(state, jobId);
  }
  flows.food.consumptionPerSecond += state.resources.population.amount * FOOD_CONSUMPTION_PER_PERSON_PER_SECOND;

  for (const converterId of CIVILIZATION_CONVERTER_IDS) {
    const converter = state.converters[converterId];
    if (converter.count <= 0 || !converter.enabled || !state.unlockedConverters.includes(converterId) || converterBlocker(state, converterId)) {
      continue;
    }
    const rates = getCivilizationConverterRates(state, converterId);
    for (const input of rates.inputs) flows[input.resource].consumptionPerSecond += input.amount;
    for (const output of rates.outputs) flows[output.resource].productionPerSecond += output.amount;
  }
  const power = getCivilizationPowerStatus(state);
  flows.electricity.productionPerSecond = power.supply;
  flows.electricity.consumptionPerSecond = power.used;
  const compute = getCivilizationComputeStatus(state);
  flows.compute.productionPerSecond = compute.supply;
  flows.compute.consumptionPerSecond = compute.used;

  for (const flow of Object.values(flows)) {
    flow.netPerSecond = flow.productionPerSecond - flow.consumptionPerSecond;
  }
  return flows;
}

export function getCivilizationBottlenecks(state: CivilizationState): CivilizationBottleneck[] {
  const bottlenecks: CivilizationBottleneck[] = [];
  if (state.resources.food.amount <= EPSILON) bottlenecks.push({ type: "STARVING" });
  for (const resourceId of CIVILIZATION_RESOURCE_IDS) {
    if (resourceId !== "population" && state.resources[resourceId].cap > 0 && state.resources[resourceId].amount >= state.resources[resourceId].cap - EPSILON) {
      bottlenecks.push({ type: "RESOURCE_FULL", resource: resourceId });
    }
  }
  for (const converterId of CIVILIZATION_CONVERTER_IDS) {
    const converter = state.converters[converterId];
    if (converter.count > 0 && converter.enabled && state.unlockedConverters.includes(converterId)) {
      const blocker = converterBlocker(state, converterId);
      if (blocker) bottlenecks.push(blocker);
    }
  }
  return bottlenecks;
}

export function getCivilizationActionCooldownMs(
  state: CivilizationState,
  actionId: CivilizationActionId
): number {
  const action = CIVILIZATION_ACTIONS[actionId];
  const level = state.actionLevels[actionId];
  let cooldown = action.baseCooldownMs * Math.pow(0.93, level - 1);

  for (const techId of state.researchedTechs) {
    for (const effect of CIVILIZATION_TECHS[techId].effects) {
      if (effect.type === "action_cooldown_reduction" && effect.actionId === actionId) {
        cooldown -= effect.valueMs;
      }
    }
  }

  return Math.max(600, cooldown);
}

export function getCivilizationActionReward(
  state: CivilizationState,
  actionId: CivilizationActionId
): number {
  const action = CIVILIZATION_ACTIONS[actionId];
  return Math.round(action.reward.amount * Math.pow(1.5, state.actionLevels[actionId] - 1));
}

function settleCompletedActions(
  state: CivilizationState,
  atMs: number,
  events: CivilizationEngineEvent[]
): void {
  for (const actionId of CIVILIZATION_ACTION_IDS) {
    const active = state.activeActions[actionId];
    if (!active || active.readyAt > atMs) continue;

    const action = CIVILIZATION_ACTIONS[actionId];
    const reward = getCivilizationActionReward(state, actionId);
    addResource(state, action.reward.resource, reward);
    state.activeActions[actionId] = null;
    events.push({ type: "ACTION_COMPLETED", id: actionId, amount: reward });
  }
}

function getNextActionBoundary(state: CivilizationState, cursorMs: number): number | null {
  let next: number | null = null;
  for (const actionId of CIVILIZATION_ACTION_IDS) {
    const readyAt = state.activeActions[actionId]?.readyAt;
    if (readyAt === undefined || readyAt <= cursorMs) continue;
    next = next === null ? readyAt : Math.min(next, readyAt);
  }
  return next;
}

function getSimulationStepMs(
  state: CivilizationState,
  converterStepMs: number
): number {
  const hasRunningConverter = CIVILIZATION_CONVERTER_IDS.some((id) => {
    const converter = state.converters[id];
    return converter.count > 0 && converter.enabled && state.unlockedConverters.includes(id);
  });
  if (hasRunningConverter) return converterStepMs;
  let stableStepMs = CIVILIZATION_MAX_STABLE_SIMULATION_STEP_MS;
  for (const jobId of CIVILIZATION_JOB_IDS) {
    const workers = state.workers[jobId];
    if (workers <= 0) continue;
    const current = state.jobMasterySeconds[jobId];
    const nextThreshold = CIVILIZATION_MASTERY_THRESHOLDS_SECONDS.find(
      (threshold) => threshold > current + EPSILON
    );
    if (nextThreshold !== undefined) {
      stableStepMs = Math.min(stableStepMs, ((nextThreshold - current) / workers) * 1_000);
    }
  }
  if (state.resources.food.amount <= EPSILON) {
    return Math.max(1, stableStepMs);
  }
  if (state.resources.population.amount < state.resources.population.cap) {
    return CIVILIZATION_MAX_SIMULATION_STEP_MS;
  }

  const food = getCivilizationResourceFlows(state).food;
  if (food.productionPerSecond > EPSILON && food.consumptionPerSecond > EPSILON) {
    return CIVILIZATION_MAX_SIMULATION_STEP_MS;
  }
  const foodFlow = food.netPerSecond;
  if (foodFlow >= 0 || state.resources.food.amount <= EPSILON) {
    return Math.max(1, stableStepMs);
  }
  const untilFoodEmptyMs = (state.resources.food.amount / -foodFlow) * 1_000;
  return Math.max(1, Math.min(stableStepMs, untilFoodEmptyMs));
}

function simulateStep(
  state: CivilizationState,
  elapsedMs: number,
  events: CivilizationEngineEvent[]
): void {
  if (elapsedMs <= 0) return;
  const elapsedSeconds = elapsedMs / 1_000;

  for (const jobId of CIVILIZATION_JOB_IDS) {
    const count = state.workers[jobId];
    if (count <= 0) continue;
    const job = CIVILIZATION_JOBS[jobId];
    addResource(
      state,
      job.produces,
      getCivilizationWorkerProductionRate(state, jobId, count) * elapsedSeconds
    );
  }

  const masteryCap = CIVILIZATION_MASTERY_THRESHOLDS_SECONDS.at(-1)!;
  for (const jobId of CIVILIZATION_JOB_IDS) {
    if (state.workers[jobId] <= 0) continue;
    state.jobMasterySeconds[jobId] = Math.min(
      masteryCap,
      state.jobMasterySeconds[jobId] + state.workers[jobId] * elapsedSeconds
    );
  }

  const power = getCivilizationPowerStatus(state);
  const compute = getCivilizationComputeStatus(state);
  const converterOrder = ["steam_generator", ...CIVILIZATION_CONVERTER_IDS.filter((id) => id !== "steam_generator")] as CivilizationConverterId[];
  for (const converterId of converterOrder) {
    const converterState = state.converters[converterId];
    if (
      converterState.count <= 0 ||
      !converterState.enabled ||
      !state.unlockedConverters.includes(converterId)
    ) {
      continue;
    }
    if (getCivilizationConverterPowerDemand(state, converterId) > 0 && !power.poweredConverters.includes(converterId)) {
      continue;
    }
    if (!automationAllowsConverter(state, converterId)) continue;
    const computeDemand = (CIVILIZATION_CONVERTERS[converterId].computeDemand ?? 0) * converterState.count;
    if (computeDemand > 0 && !compute.poweredConverters.includes(converterId)) continue;

    const rates = getCivilizationConverterRates(state, converterId);
    const inputAmounts = rates.inputs.map((input) => ({
      resource: input.resource,
      amount: input.amount * elapsedSeconds,
    }));
    const outputAmounts = rates.outputs.map((output) => ({
      resource: output.resource,
      amount: output.amount * elapsedSeconds,
    }));
    const hasInputs = inputAmounts.every(
      (input) => state.resources[input.resource].amount + EPSILON >= input.amount
    );
    const hasOutputCapacity = outputAmounts.every(
      (output) =>
        state.resources[output.resource].amount + output.amount <=
        state.resources[output.resource].cap + EPSILON
    );

    if (!hasInputs || !hasOutputCapacity) continue;
    for (const input of inputAmounts) addResource(state, input.resource, -input.amount);
    for (const output of outputAmounts) addResource(state, output.resource, output.amount);
  }
  state.resources.electricity.cap = power.supply;
  state.resources.electricity.amount = power.available;
  state.resources.compute.cap = compute.supply;
  state.resources.compute.amount = compute.available;

  const population = state.resources.population.amount;
  addResource(
    state,
    "food",
    -population * FOOD_CONSUMPTION_PER_PERSON_PER_SECOND * elapsedSeconds
  );

  if (state.resources.food.amount <= EPSILON) {
    state.resources.food.amount = 0;
    state.populationGrowthProgressMs = 0;
    return;
  }

  if (population >= state.resources.population.cap) return;
  state.populationGrowthProgressMs +=
    elapsedMs * (1 + getCivilizationPopulationGrowthBonus(state));

  const foodProductionPerSecond = getCivilizationResourceFlows(state).food.productionPerSecond;

  while (
    state.populationGrowthProgressMs + EPSILON >= POPULATION_GROWTH_INTERVAL_MS &&
    state.resources.population.amount < state.resources.population.cap &&
    foodProductionPerSecond + EPSILON >=
      (state.resources.population.amount + 1) * FOOD_CONSUMPTION_PER_PERSON_PER_SECOND
  ) {
    state.populationGrowthProgressMs -= POPULATION_GROWTH_INTERVAL_MS;
    state.resources.population.amount += 1;
    state.idleWorkers += 1;
    events.push({ type: "POPULATION_GREW", amount: 1 });
  }

  if (state.resources.population.amount >= state.resources.population.cap) {
    state.populationGrowthProgressMs = 0;
  }
}

export function simulateCivilization(
  input: CivilizationState,
  requestedNowMs: number,
  maxElapsedMs: number = CIVILIZATION_MAX_ONLINE_ELAPSED_MS,
  converterStepMs: number = CIVILIZATION_MAX_SIMULATION_STEP_MS
): CivilizationSimulationResult {
  assertCivilizationInvariants(input);
  if (!Number.isFinite(requestedNowMs) || requestedNowMs < input.lastSimulatedAt) {
    throw new RangeError("requestedNowMs must be finite and not precede lastSimulatedAt");
  }
  if (!Number.isFinite(maxElapsedMs) || maxElapsedMs < 0) {
    throw new RangeError("maxElapsedMs must be finite and non-negative");
  }
  if (!Number.isFinite(converterStepMs) || converterStepMs <= 0) {
    throw new RangeError("converterStepMs must be finite and positive");
  }

  const state = cloneCivilizationState(input);
  const events: CivilizationEngineEvent[] = [];
  const targetMs = Math.min(requestedNowMs, state.lastSimulatedAt + maxElapsedMs);
  let cursorMs = state.lastSimulatedAt;

  settleCompletedActions(state, cursorMs, events);
  while (cursorMs < targetMs) {
    const actionBoundary = getNextActionBoundary(state, cursorMs);
    let nextMs = Math.min(
      targetMs,
      cursorMs + getSimulationStepMs(state, converterStepMs)
    );
    if (actionBoundary !== null) nextMs = Math.min(nextMs, actionBoundary);

    simulateStep(state, nextMs - cursorMs, events);
    cursorMs = nextMs;
    state.lastSimulatedAt = cursorMs;
    settleCompletedActions(state, cursorMs, events);
  }

  assertCivilizationInvariants(state);
  return {
    state,
    events,
    remainingMs: requestedNowMs - targetMs,
  };
}
