import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_JOBS,
  CIVILIZATION_TECHS,
} from "./content";
import { assertCivilizationInvariants } from "./invariants";
import {
  CIVILIZATION_ACTION_IDS,
  CIVILIZATION_CONVERTER_IDS,
  CIVILIZATION_JOB_IDS,
  cloneCivilizationState,
} from "./state";
import type {
  CivilizationActionId,
  CivilizationEngineEvent,
  CivilizationResourceId,
  CivilizationState,
} from "./types";

export const CIVILIZATION_MAX_ONLINE_ELAPSED_MS = 30_000;
export const CIVILIZATION_MAX_OFFLINE_ELAPSED_MS = 8 * 60 * 60 * 1_000;
export const CIVILIZATION_MAX_SIMULATION_STEP_MS = 1_000;
const POPULATION_GROWTH_INTERVAL_MS = 8_000;
const STARVATION_WORKER_MULTIPLIER = 0.25;
const FOOD_CONSUMPTION_PER_PERSON_PER_SECOND = 0.5;
const EPSILON = 1e-9;

export interface CivilizationSimulationResult {
  state: CivilizationState;
  events: CivilizationEngineEvent[];
  remainingMs: number;
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

function simulateStep(
  state: CivilizationState,
  elapsedMs: number,
  events: CivilizationEngineEvent[]
): void {
  if (elapsedMs <= 0) return;
  const elapsedSeconds = elapsedMs / 1_000;
  const starvingAtStart = state.resources.food.amount <= EPSILON;
  const workerMultiplier = starvingAtStart ? STARVATION_WORKER_MULTIPLIER : 1;

  for (const jobId of CIVILIZATION_JOB_IDS) {
    const count = state.workers[jobId];
    if (count <= 0) continue;
    const job = CIVILIZATION_JOBS[jobId];
    const bonus = getCivilizationProductionBonus(state, job.produces);
    addResource(
      state,
      job.produces,
      count * job.baseRate * workerMultiplier * (1 + bonus) * elapsedSeconds
    );
  }

  for (const converterId of CIVILIZATION_CONVERTER_IDS) {
    const converterState = state.converters[converterId];
    if (
      converterState.count <= 0 ||
      !converterState.enabled ||
      !state.unlockedConverters.includes(converterId)
    ) {
      continue;
    }

    const definition = CIVILIZATION_CONVERTERS[converterId];
    const inputAmounts = definition.inputs.map((input) => ({
      resource: input.resource,
      amount: input.amount * converterState.count * elapsedSeconds,
    }));
    const outputAmounts = definition.outputs.map((output) => ({
      resource: output.resource,
      amount:
        output.amount *
        converterState.count *
        (1 + getCivilizationProductionBonus(state, output.resource)) *
        elapsedSeconds,
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

  while (
    state.populationGrowthProgressMs + EPSILON >= POPULATION_GROWTH_INTERVAL_MS &&
    state.resources.population.amount < state.resources.population.cap
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
  maxElapsedMs: number = CIVILIZATION_MAX_ONLINE_ELAPSED_MS
): CivilizationSimulationResult {
  assertCivilizationInvariants(input);
  if (!Number.isFinite(requestedNowMs) || requestedNowMs < input.lastSimulatedAt) {
    throw new RangeError("requestedNowMs must be finite and not precede lastSimulatedAt");
  }
  if (!Number.isFinite(maxElapsedMs) || maxElapsedMs < 0) {
    throw new RangeError("maxElapsedMs must be finite and non-negative");
  }

  const state = cloneCivilizationState(input);
  const events: CivilizationEngineEvent[] = [];
  const targetMs = Math.min(requestedNowMs, state.lastSimulatedAt + maxElapsedMs);
  let cursorMs = state.lastSimulatedAt;

  settleCompletedActions(state, cursorMs, events);
  while (cursorMs < targetMs) {
    const actionBoundary = getNextActionBoundary(state, cursorMs);
    let nextMs = Math.min(targetMs, cursorMs + CIVILIZATION_MAX_SIMULATION_STEP_MS);
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
