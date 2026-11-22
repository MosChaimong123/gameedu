import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_BUILDINGS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_ERA_ORDER,
  CIVILIZATION_JOBS,
  CIVILIZATION_TECHS,
  type CivilizationCost,
} from "./content";
import { assertCivilizationInvariants } from "./invariants";
import {
  getCivilizationActionCooldownMs,
  simulateCivilization,
} from "./simulation";
import type {
  CivilizationActionId,
  CivilizationBuildingId,
  CivilizationCommand,
  CivilizationConverterId,
  CivilizationEngineErrorCode,
  CivilizationEngineEvent,
  CivilizationEngineResult,
  CivilizationEraId,
  CivilizationState,
} from "./types";

function eraIndex(era: CivilizationEraId): number {
  return CIVILIZATION_ERA_ORDER.indexOf(era);
}

function isContentAvailable(currentEra: CivilizationEraId, contentEra: CivilizationEraId): boolean {
  return eraIndex(contentEra) <= eraIndex(currentEra);
}

function scaleCosts(costs: CivilizationCost[], scaling: number, count: number): CivilizationCost[] {
  return costs.map((cost) => ({
    resource: cost.resource,
    amount: Math.floor(cost.amount * Math.pow(scaling, count)),
  }));
}

export function getCivilizationBuildingCost(
  state: CivilizationState,
  buildingId: CivilizationBuildingId
): CivilizationCost[] {
  const definition = CIVILIZATION_BUILDINGS[buildingId];
  return scaleCosts(definition.baseCost, definition.costScaling, state.buildings[buildingId]);
}

export function getCivilizationConverterCost(
  state: CivilizationState,
  converterId: CivilizationConverterId
): CivilizationCost[] {
  const definition = CIVILIZATION_CONVERTERS[converterId];
  return scaleCosts(
    definition.baseCost,
    definition.costScaling,
    state.converters[converterId].count
  );
}

export function getCivilizationActionUpgradeCost(
  state: CivilizationState,
  actionId: CivilizationActionId
): CivilizationCost {
  const definition = CIVILIZATION_ACTIONS[actionId];
  return {
    resource: definition.upgradeCost.resource,
    amount: Math.floor(
      definition.upgradeCost.amount *
        Math.pow(definition.costScaling, state.actionLevels[actionId] - 1)
    ),
  };
}

function canAfford(state: CivilizationState, costs: CivilizationCost[]): boolean {
  return costs.every((cost) => state.resources[cost.resource].amount >= cost.amount);
}

function spend(state: CivilizationState, costs: CivilizationCost[]): void {
  for (const cost of costs) state.resources[cost.resource].amount -= cost.amount;
}

function failed(
  state: CivilizationState,
  events: CivilizationEngineEvent[],
  error: CivilizationEngineErrorCode
): CivilizationEngineResult {
  assertCivilizationInvariants(state);
  return { ok: false, state, events, error };
}

function succeeded(
  state: CivilizationState,
  events: CivilizationEngineEvent[]
): CivilizationEngineResult {
  assertCivilizationInvariants(state);
  return { ok: true, state, events };
}

function buyBuilding(
  state: CivilizationState,
  events: CivilizationEngineEvent[],
  buildingId: CivilizationBuildingId
): CivilizationEngineResult {
  const definition = CIVILIZATION_BUILDINGS[buildingId];
  if (!isContentAvailable(state.era, definition.era)) {
    return failed(state, events, "CONTENT_LOCKED");
  }
  const count = state.buildings[buildingId];
  if (definition.maxCount !== undefined && count >= definition.maxCount) {
    return failed(state, events, "CONTENT_LOCKED");
  }
  const costs = getCivilizationBuildingCost(state, buildingId);
  if (!canAfford(state, costs)) return failed(state, events, "INSUFFICIENT_RESOURCES");

  spend(state, costs);
  state.buildings[buildingId] += 1;
  for (const effect of definition.effects) {
    if (effect.type === "population_cap") {
      state.resources.population.cap += effect.amount;
    } else {
      state.resources[effect.resource].cap += effect.amount;
    }
  }
  events.push({ type: "BUILDING_BOUGHT", id: buildingId, amount: 1 });
  return succeeded(state, events);
}

export function applyCivilizationCommand(
  input: CivilizationState,
  command: CivilizationCommand,
  requestedNowMs: number
): CivilizationEngineResult {
  const simulation = simulateCivilization(input, requestedNowMs);
  const state = simulation.state;
  const events = [...simulation.events];

  switch (command.type) {
    case "SYNC":
      return succeeded(state, events);

    case "START_ACTION": {
      const definition = CIVILIZATION_ACTIONS[command.actionId];
      if (!isContentAvailable(state.era, definition.era)) {
        return failed(state, events, "CONTENT_LOCKED");
      }
      if (state.activeActions[command.actionId]) {
        return failed(state, events, "ACTION_ALREADY_RUNNING");
      }
      state.activeActions[command.actionId] = {
        readyAt: state.lastSimulatedAt + getCivilizationActionCooldownMs(state, command.actionId),
      };
      events.push({ type: "ACTION_STARTED", id: command.actionId });
      return succeeded(state, events);
    }

    case "UPGRADE_ACTION": {
      const definition = CIVILIZATION_ACTIONS[command.actionId];
      if (!isContentAvailable(state.era, definition.era)) {
        return failed(state, events, "CONTENT_LOCKED");
      }
      if (state.actionLevels[command.actionId] >= 5) {
        return failed(state, events, "ACTION_LEVEL_MAX");
      }
      const cost = getCivilizationActionUpgradeCost(state, command.actionId);
      if (!canAfford(state, [cost])) return failed(state, events, "INSUFFICIENT_RESOURCES");
      spend(state, [cost]);
      state.actionLevels[command.actionId] += 1;
      events.push({
        type: "ACTION_UPGRADED",
        id: command.actionId,
        amount: state.actionLevels[command.actionId],
      });
      return succeeded(state, events);
    }

    case "BUY_BUILDING":
      return buyBuilding(state, events, command.buildingId);

    case "ASSIGN_WORKER": {
      if (!Number.isInteger(command.delta) || command.delta === 0) {
        return failed(state, events, "INVALID_DELTA");
      }
      const job = CIVILIZATION_JOBS[command.jobId];
      if (
        job.buildingRequired &&
        state.buildings[job.buildingRequired] <= 0
      ) {
        return failed(state, events, "CONTENT_LOCKED");
      }
      if (command.delta > 0 && state.idleWorkers < command.delta) {
        return failed(state, events, "NO_IDLE_WORKERS");
      }
      if (command.delta < 0 && state.workers[command.jobId] < -command.delta) {
        return failed(state, events, "INVALID_DELTA");
      }
      state.workers[command.jobId] += command.delta;
      state.idleWorkers -= command.delta;
      events.push({ type: "WORKER_ASSIGNED", id: command.jobId, amount: command.delta });
      return succeeded(state, events);
    }

    case "BUY_RESEARCH": {
      const tech = CIVILIZATION_TECHS[command.techId];
      if (!isContentAvailable(state.era, tech.era)) {
        return failed(state, events, "CONTENT_LOCKED");
      }
      if (state.researchedTechs.includes(command.techId)) {
        return failed(state, events, "TECH_ALREADY_RESEARCHED");
      }
      if (!tech.prerequisites.every((id) => state.researchedTechs.includes(id))) {
        return failed(state, events, "PREREQUISITE_MISSING");
      }
      if (state.resources.science.amount < tech.scienceCost) {
        return failed(state, events, "INSUFFICIENT_RESOURCES");
      }

      state.resources.science.amount -= tech.scienceCost;
      state.researchedTechs.push(command.techId);
      for (const effect of tech.effects) {
        if (effect.type === "unlock_era" && !state.unlockedEras.includes(effect.eraId)) {
          state.unlockedEras.push(effect.eraId);
          events.push({ type: "ERA_UNLOCKED", id: effect.eraId });
        } else if (
          effect.type === "unlock_converter" &&
          !state.unlockedConverters.includes(effect.converterId)
        ) {
          state.unlockedConverters.push(effect.converterId);
        } else if (effect.type === "complete_bronze") {
          state.bronzeCompleted = true;
        }
      }
      events.push({ type: "RESEARCH_BOUGHT", id: command.techId });
      return succeeded(state, events);
    }

    case "ADVANCE_ERA": {
      if (
        !state.unlockedEras.includes(command.eraId) ||
        eraIndex(command.eraId) <= eraIndex(state.era)
      ) {
        return failed(state, events, "CONTENT_LOCKED");
      }
      state.era = command.eraId;
      events.push({ type: "ERA_ADVANCED", id: command.eraId });
      return succeeded(state, events);
    }

    case "BUY_CONVERTER": {
      const definition = CIVILIZATION_CONVERTERS[command.converterId];
      if (
        !isContentAvailable(state.era, definition.era) ||
        !state.unlockedConverters.includes(command.converterId)
      ) {
        return failed(state, events, "CONTENT_LOCKED");
      }
      const costs = getCivilizationConverterCost(state, command.converterId);
      if (!canAfford(state, costs)) return failed(state, events, "INSUFFICIENT_RESOURCES");
      spend(state, costs);
      state.converters[command.converterId].count += 1;
      state.converters[command.converterId].enabled = true;
      events.push({ type: "CONVERTER_BOUGHT", id: command.converterId, amount: 1 });
      return succeeded(state, events);
    }

    case "TOGGLE_CONVERTER": {
      const converter = state.converters[command.converterId];
      if (converter.count <= 0) return failed(state, events, "NOT_BUILT");
      converter.enabled = !converter.enabled;
      events.push({
        type: "CONVERTER_TOGGLED",
        id: command.converterId,
        amount: converter.enabled ? 1 : 0,
      });
      return succeeded(state, events);
    }
  }
}
