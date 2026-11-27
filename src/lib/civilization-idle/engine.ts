import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_BUILDINGS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_ERA_ORDER,
  CIVILIZATION_JOBS,
  CIVILIZATION_MAX_ACTION_LEVEL,
  CIVILIZATION_MAX_CONVERTER_LEVEL,
  CIVILIZATION_POLICY_COOLDOWN_MS,
  CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL,
  CIVILIZATION_REPEATABLE_RESEARCH,
  CIVILIZATION_SPACE_PROJECT_STAGES,
  CIVILIZATION_TECHS,
  type CivilizationCost,
} from "./content";
import { assertCivilizationInvariants } from "./invariants";
import { createCivilizationPrestigeState } from "./state";
import {
  getCivilizationActionCooldownMs,
  getCivilizationAutomationSlots,
  getCivilizationComputeStatus,
  getCivilizationPowerStatus,
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
  CivilizationRepeatableResearchId,
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

export function getCivilizationRepeatableResearchCost(
  state: CivilizationState,
  researchId: CivilizationRepeatableResearchId
): number {
  const definition = CIVILIZATION_REPEATABLE_RESEARCH[researchId];
  return Math.floor(
    definition.baseScienceCost * Math.pow(definition.costScaling, state.researchLevels[researchId])
  );
}

export function getCivilizationBronzeCompletionRequirements(state: CivilizationState) {
  return {
    convertersBuilt: Object.fromEntries(
      (["copper_smelter", "bronze_foundry", "iron_forge"] as const).map((id) => [id, state.converters[id].count > 0])
    ),
    metalsStocked: Object.fromEntries(
      (["copper", "bronze", "iron"] as const).map((id) => [id, state.resources[id].amount >= 20])
    ),
  };
}

export function canCompleteCivilizationBronze(state: CivilizationState): boolean {
  const requirements = getCivilizationBronzeCompletionRequirements(state);
  return Object.values(requirements.convertersBuilt).every(Boolean) &&
    Object.values(requirements.metalsStocked).every(Boolean);
}

export function getCivilizationIndustrialCompletionRequirements(state: CivilizationState) {
  return {
    convertersBuilt: Object.fromEntries(
      (["steel_mill", "steam_generator", "machine_factory"] as const).map((id) => [id, state.converters[id].count > 0])
    ),
    steelStocked: state.resources.steel.amount >= 100,
    machineryStocked: state.resources.machinery.amount >= 100,
  };
}

export function canCompleteCivilizationIndustrial(state: CivilizationState): boolean {
  const requirements = getCivilizationIndustrialCompletionRequirements(state);
  return Object.values(requirements.convertersBuilt).every(Boolean) &&
    requirements.steelStocked && requirements.machineryStocked;
}

export function getCivilizationInformationCompletionRequirements(state: CivilizationState) {
  return {
    convertersBuilt: Object.fromEntries(
      (["circuit_assembler", "data_center", "digital_lab"] as const).map((id) => [id, state.converters[id].count > 0])
    ),
    circuitsStocked: state.resources.circuits.amount >= 100,
    dataStocked: state.resources.data.amount >= 200,
    computeOnline: getCivilizationComputeStatus(state).supply >= 2,
  };
}

export function canCompleteCivilizationInformation(state: CivilizationState): boolean {
  const requirements = getCivilizationInformationCompletionRequirements(state);
  return Object.values(requirements.convertersBuilt).every(Boolean) &&
    requirements.circuitsStocked && requirements.dataStocked && requirements.computeOnline;
}

export function getCivilizationSpaceProjectStageRequirements(
  state: CivilizationState,
  stage: 1 | 2 | 3 | 4
) {
  const definition = CIVILIZATION_SPACE_PROJECT_STAGES[stage];
  const propulsionDiscount = stage === 4
    ? 1 - state.researchLevels.propulsion_efficiency * 0.02
    : 1;
  const costs = definition.costs.map((cost) => ({
    resource: cost.resource,
    amount: Math.ceil(cost.amount * propulsionDiscount),
  }));
  return {
    isNextStage: state.spaceProjectStage + 1 === stage,
    techReady: state.researchedTechs.includes(definition.tech),
    testCenterReady: stage < 2 || state.buildings.test_center > 0,
    evacuationPortReady: stage < 4 || state.buildings.evacuation_port > 0,
    powerReady: stage < 4 || getCivilizationPowerStatus(state).supply >= 12,
    computeReady: stage < 4 || getCivilizationComputeStatus(state).supply >= 4,
    costs,
  };
}

export function canCompleteCivilizationSpaceProjectStage(
  state: CivilizationState,
  stage: 1 | 2 | 3 | 4
): boolean {
  const requirements = getCivilizationSpaceProjectStageRequirements(state, stage);
  return requirements.isNextStage && requirements.techReady && requirements.testCenterReady &&
    requirements.evacuationPortReady && requirements.powerReady && requirements.computeReady &&
    canAfford(state, requirements.costs);
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
      if (command.actionId === "audit_system" && state.buildings.network_station <= 0) {
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
      if (state.actionLevels[command.actionId] >= CIVILIZATION_MAX_ACTION_LEVEL) {
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
      if (command.techId === "steam_power" && !canCompleteCivilizationBronze(state)) {
        return failed(state, events, "COMPLETION_REQUIREMENTS_MISSING");
      }
      if (command.techId === "factory_automation" && !canCompleteCivilizationIndustrial(state)) {
        return failed(state, events, "COMPLETION_REQUIREMENTS_MISSING");
      }
      if (command.techId === "space_science" && !canCompleteCivilizationInformation(state)) {
        return failed(state, events, "COMPLETION_REQUIREMENTS_MISSING");
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
        } else if (effect.type === "complete_industrial") {
          state.industrialCompleted = true;
        } else if (effect.type === "complete_information") {
          state.informationCompleted = true;
        }
      }
      events.push({ type: "RESEARCH_BOUGHT", id: command.techId });
      return succeeded(state, events);
    }

    case "BUY_REPEATABLE_RESEARCH": {
      const definition = CIVILIZATION_REPEATABLE_RESEARCH[command.researchId];
      const level = state.researchLevels[command.researchId];
      if (!isContentAvailable(state.era, definition.era) || !state.researchedTechs.includes(definition.prerequisite)) {
        return failed(state, events, "PREREQUISITE_MISSING");
      }
      if (level >= definition.maxLevel) return failed(state, events, "RESEARCH_LEVEL_MAX");
      const cost = getCivilizationRepeatableResearchCost(state, command.researchId);
      if (state.resources.science.amount < cost) return failed(state, events, "INSUFFICIENT_RESOURCES");
      state.resources.science.amount -= cost;
      state.researchLevels[command.researchId] += 1;
      if (command.researchId === "food_storage") {
        state.resources.food.cap = Math.floor(state.resources.food.cap * 1.05);
      } else if (command.researchId === "metal_reserves") {
        for (const id of ["copper", "bronze", "iron"] as const) {
          state.resources[id].cap = Math.floor(state.resources[id].cap * 1.05);
        }
      }
      events.push({ type: "REPEATABLE_RESEARCH_BOUGHT", id: command.researchId, amount: state.researchLevels[command.researchId] });
      return succeeded(state, events);
    }

    case "SET_POLICY": {
      if (command.policyId === state.policy.id) return succeeded(state, events);
      const isFirstPolicyChoice = state.policy.id === "balanced" && state.policy.changedAt === 0;
      if (
        !isFirstPolicyChoice &&
        state.lastSimulatedAt - state.policy.changedAt < CIVILIZATION_POLICY_COOLDOWN_MS
      ) {
        return failed(state, events, "POLICY_COOLDOWN");
      }
      state.policy = { id: command.policyId, changedAt: state.lastSimulatedAt };
      events.push({ type: "POLICY_CHANGED", id: command.policyId });
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
      if (state.converters[command.converterId].count >= CIVILIZATION_MAX_CONVERTER_LEVEL) {
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

    case "SET_CONVERTER_PRIORITY": {
      const converter = state.converters[command.converterId];
      if (!state.researchedTechs.includes("factory_priority")) {
        return failed(state, events, "CONTENT_LOCKED");
      }
      if (converter.count <= 0) return failed(state, events, "NOT_BUILT");
      converter.priority = command.priority;
      events.push({ type: "CONVERTER_PRIORITY_CHANGED", id: command.converterId, amount: command.priority });
      return succeeded(state, events);
    }

    case "TOGGLE_AUTOMATION_RULE": {
      if (!state.researchedTechs.includes("job_scheduling")) {
        return failed(state, events, "CONTENT_LOCKED");
      }
      const existingIndex = state.automationRules.indexOf(command.ruleId);
      if (existingIndex >= 0) {
        state.automationRules.splice(existingIndex, 1);
      } else {
        if (state.automationRules.length >= getCivilizationAutomationSlots(state)) {
          return failed(state, events, "CONTENT_LOCKED");
        }
        state.automationRules.push(command.ruleId);
      }
      events.push({ type: "AUTOMATION_RULE_CHANGED", id: command.ruleId });
      return succeeded(state, events);
    }

    case "COMPLETE_SPACE_PROJECT_STAGE": {
      if (state.era !== "space" || !canCompleteCivilizationSpaceProjectStage(state, command.stage)) {
        return failed(state, events, "COMPLETION_REQUIREMENTS_MISSING");
      }
      const requirements = getCivilizationSpaceProjectStageRequirements(state, command.stage);
      spend(state, requirements.costs);
      state.spaceProjectStage = command.stage;
      events.push({ type: "SPACE_PROJECT_STAGE_COMPLETED", id: String(command.stage), amount: command.stage });
      if (command.stage === 4) {
        state.spaceCompleted = true;
        events.push({ type: "SPACE_COMPLETED", id: "evacuation" });
      }
      return succeeded(state, events);
    }

    case "PRESTIGE_RESET": {
      if (command.confirmRunNumber !== state.runNumber) {
        return failed(state, events, "PRESTIGE_CONFIRMATION_MISMATCH");
      }
      if (!state.spaceCompleted) {
        return failed(state, events, "PRESTIGE_NOT_READY");
      }
      if (state.permanentRewards[command.rewardId] >= CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL) {
        return failed(state, events, "PRESTIGE_REWARD_MAXED");
      }
      const reset = createCivilizationPrestigeState(state, command.rewardId, state.lastSimulatedAt);
      events.push({ type: "PRESTIGE_COMPLETED", id: command.rewardId, amount: reset.runNumber });
      return succeeded(reset, events);
    }
  }
}
