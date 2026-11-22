import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_BUILDINGS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_ERA_ORDER,
  CIVILIZATION_JOBS,
  CIVILIZATION_TECHS,
} from "./content";
import {
  CIVILIZATION_ACTION_IDS,
  CIVILIZATION_BUILDING_IDS,
  CIVILIZATION_CONVERTER_IDS,
  CIVILIZATION_JOB_IDS,
  CIVILIZATION_RESOURCE_IDS,
} from "./state";
import type { CivilizationState } from "./types";

const EPSILON = 1e-9;

export function getCivilizationInvariantViolations(state: CivilizationState): string[] {
  const violations: string[] = [];

  if (!Number.isFinite(state.lastSimulatedAt) || state.lastSimulatedAt < 0) {
    violations.push("lastSimulatedAt must be finite and non-negative");
  }
  if (!Number.isFinite(state.populationGrowthProgressMs) || state.populationGrowthProgressMs < 0) {
    violations.push("populationGrowthProgressMs must be finite and non-negative");
  }
  if (!state.unlockedEras.includes(state.era)) {
    violations.push("current era must be unlocked");
  }
  if (new Set(state.unlockedEras).size !== state.unlockedEras.length) {
    violations.push("unlocked eras must not contain duplicates");
  }
  if (new Set(state.researchedTechs).size !== state.researchedTechs.length) {
    violations.push("researched Techs must not contain duplicates");
  }
  if (new Set(state.unlockedConverters).size !== state.unlockedConverters.length) {
    violations.push("unlocked converters must not contain duplicates");
  }

  for (const id of CIVILIZATION_RESOURCE_IDS) {
    const resource = state.resources[id];
    if (!resource || !Number.isFinite(resource.amount) || !Number.isFinite(resource.cap)) {
      violations.push(`${id} must have finite amount and cap`);
      continue;
    }
    if (resource.amount < -EPSILON || resource.cap < 0) {
      violations.push(`${id} amount and cap must be non-negative`);
    }
    if (resource.amount - resource.cap > EPSILON) {
      violations.push(`${id} amount must not exceed cap`);
    }
  }

  const population = state.resources.population.amount;
  if (!Number.isInteger(population)) {
    violations.push("population must be an integer");
  }
  if (!Number.isInteger(state.idleWorkers) || state.idleWorkers < 0) {
    violations.push("idleWorkers must be a non-negative integer");
  }

  let assignedWorkers = 0;
  for (const id of CIVILIZATION_JOB_IDS) {
    const count = state.workers[id];
    if (!Number.isInteger(count) || count < 0) {
      violations.push(`${id} workers must be a non-negative integer`);
    } else {
      assignedWorkers += count;
    }
    const requiredBuilding = CIVILIZATION_JOBS[id].buildingRequired;
    if (count > 0 && requiredBuilding && state.buildings[requiredBuilding] <= 0) {
      violations.push(`${id} workers require ${requiredBuilding}`);
    }
  }
  if (assignedWorkers + state.idleWorkers !== population) {
    violations.push("assigned workers plus idle workers must equal population");
  }

  for (const id of CIVILIZATION_BUILDING_IDS) {
    const count = state.buildings[id];
    if (!Number.isInteger(count) || count < 0) {
      violations.push(`${id} building count must be a non-negative integer`);
    }
    const maxCount = CIVILIZATION_BUILDINGS[id].maxCount;
    if (maxCount !== undefined && count > maxCount) {
      violations.push(`${id} building count must not exceed ${maxCount}`);
    }
  }
  for (const id of CIVILIZATION_CONVERTER_IDS) {
    const converter = state.converters[id];
    if (!converter || !Number.isInteger(converter.count) || converter.count < 0) {
      violations.push(`${id} converter count must be a non-negative integer`);
    }
  }
  for (const id of CIVILIZATION_ACTION_IDS) {
    const level = state.actionLevels[id];
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      violations.push(`${id} action level must be an integer from 1 to 5`);
    }
    const action = state.activeActions[id];
    if (action && (!Number.isFinite(action.readyAt) || action.readyAt < 0)) {
      violations.push(`${id} readyAt must be finite and non-negative`);
    }
    if (
      action &&
      CIVILIZATION_ERA_ORDER.indexOf(CIVILIZATION_ACTIONS[id].era) >
        CIVILIZATION_ERA_ORDER.indexOf(state.era)
    ) {
      violations.push(`${id} active action is locked in the current era`);
    }
  }

  for (const techId of state.researchedTechs) {
    const missingPrerequisite = CIVILIZATION_TECHS[techId].prerequisites.find(
      (prerequisite) => !state.researchedTechs.includes(prerequisite)
    );
    if (missingPrerequisite) {
      violations.push(`${techId} requires researched Tech ${missingPrerequisite}`);
    }
  }
  if (state.researchedTechs.includes("agriculture") && !state.unlockedEras.includes("bronze")) {
    violations.push("Agriculture must unlock Bronze");
  }
  for (const converterId of state.unlockedConverters) {
    const requiredTech = CIVILIZATION_CONVERTERS[converterId].unlockedByTech;
    if (!state.researchedTechs.includes(requiredTech)) {
      violations.push(`${converterId} requires researched Tech ${requiredTech}`);
    }
  }
  if (state.bronzeCompleted && !state.researchedTechs.includes("steam_power")) {
    violations.push("Bronze completion requires Steam Power");
  }

  return violations;
}

export class CivilizationInvariantError extends Error {
  readonly violations: string[];

  constructor(violations: string[]) {
    super(`Civilization state invariant failed: ${violations.join("; ")}`);
    this.name = "CivilizationInvariantError";
    this.violations = violations;
  }
}

export function assertCivilizationInvariants(state: CivilizationState): void {
  const violations = getCivilizationInvariantViolations(state);
  if (violations.length > 0) {
    throw new CivilizationInvariantError(violations);
  }
}
