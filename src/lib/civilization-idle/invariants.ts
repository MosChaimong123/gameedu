import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_BUILDINGS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_ERA_ORDER,
  CIVILIZATION_JOBS,
  CIVILIZATION_MASTERY_THRESHOLDS_SECONDS,
  CIVILIZATION_MAX_ACTION_LEVEL,
  CIVILIZATION_MAX_CONVERTER_LEVEL,
  CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL,
  CIVILIZATION_POLICIES,
  CIVILIZATION_REPEATABLE_RESEARCH,
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
  if (!Number.isInteger(state.runNumber) || state.runNumber < 1) {
    violations.push("runNumber must be a positive integer");
  }
  if (!Number.isFinite(state.runStartedAt) || state.runStartedAt < 0 || state.runStartedAt > state.lastSimulatedAt) {
    violations.push("runStartedAt must be finite, non-negative, and not after lastSimulatedAt");
  }
  for (const [rewardId, level] of Object.entries(state.permanentRewards)) {
    if (!Number.isInteger(level) || level < 0 || level > CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL) {
      violations.push(`${rewardId} permanent reward level must be from 0 to ${CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL}`);
    }
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
    // Repeated buildings were uncapped in v1. Preserve legacy cities above the new
    // Phase 2 cap, while singleton unlock buildings remain strict.
    if (maxCount === 1 && count > maxCount) {
      violations.push(`${id} building count must not exceed ${maxCount}`);
    }
  }
  for (const id of CIVILIZATION_CONVERTER_IDS) {
    const converter = state.converters[id];
    if (!converter || !Number.isInteger(converter.count) || converter.count < 0) {
      violations.push(`${id} converter count must be a non-negative integer`);
    } else if (converter.count > CIVILIZATION_MAX_CONVERTER_LEVEL) {
      violations.push(`${id} converter count must not exceed ${CIVILIZATION_MAX_CONVERTER_LEVEL}`);
    }
    if (![1, 2, 3].includes(converter?.priority)) {
      violations.push(`${id} converter priority must be 1, 2, or 3`);
    }
  }
  for (const id of CIVILIZATION_ACTION_IDS) {
    const level = state.actionLevels[id];
    if (!Number.isInteger(level) || level < 1 || level > CIVILIZATION_MAX_ACTION_LEVEL) {
      violations.push(`${id} action level must be an integer from 1 to ${CIVILIZATION_MAX_ACTION_LEVEL}`);
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
  if (state.researchedTechs.includes("steam_power") && !state.unlockedEras.includes("industrial")) {
    violations.push("Steam Power must unlock Industrial");
  }
  if (state.researchedTechs.includes("factory_automation") && !state.unlockedEras.includes("information")) {
    violations.push("Factory Automation must unlock Information");
  }
  if (state.researchedTechs.includes("space_science") && !state.unlockedEras.includes("space")) {
    violations.push("Space Science must unlock Space");
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
  if (state.industrialCompleted && !state.researchedTechs.includes("factory_automation")) {
    violations.push("Industrial completion requires Factory Automation");
  }
  if (state.informationCompleted && !state.researchedTechs.includes("space_science")) {
    violations.push("Information completion requires Space Science");
  }
  if (![0, 1, 2, 3, 4].includes(state.spaceProjectStage)) {
    violations.push("space project stage must be from 0 to 4");
  }
  if (state.spaceProjectStage > 0 && !state.unlockedEras.includes("space")) {
    violations.push("space project requires Space to be unlocked");
  }
  if (state.spaceCompleted && (state.spaceProjectStage !== 4 || !state.researchedTechs.includes("evacuation"))) {
    violations.push("Space completion requires project stage 4 and Evacuation research");
  }
  if (new Set(state.automationRules).size !== state.automationRules.length) {
    violations.push("automation rules must not contain duplicates");
  }
  const automationSlots = state.researchedTechs.includes("job_scheduling")
    ? Math.min(3, 1 + state.buildings.scheduler_center)
    : 0;
  if (state.automationRules.length > automationSlots) {
    violations.push("automation rules must not exceed available slots");
  }

  for (const id of CIVILIZATION_JOB_IDS) {
    const seconds = state.jobMasterySeconds[id];
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > CIVILIZATION_MASTERY_THRESHOLDS_SECONDS.at(-1)!) {
      violations.push(`${id} mastery seconds must be within the supported range`);
    }
  }
  for (const [id, definition] of Object.entries(CIVILIZATION_REPEATABLE_RESEARCH)) {
    const level = state.researchLevels[id as keyof typeof state.researchLevels];
    if (!Number.isInteger(level) || level < 0 || level > definition.maxLevel) {
      violations.push(`${id} research level must be from 0 to ${definition.maxLevel}`);
    }
  }
  if (!CIVILIZATION_POLICIES[state.policy.id]) violations.push("policy must be recognized");
  if (!Number.isFinite(state.policy.changedAt) || state.policy.changedAt < 0) {
    violations.push("policy changedAt must be finite and non-negative");
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
