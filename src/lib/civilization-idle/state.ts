import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_BUILDINGS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_JOBS,
} from "./content";
import {
  CIVILIZATION_CONTENT_VERSION,
  CIVILIZATION_SCHEMA_VERSION,
  type CivilizationActionId,
  type CivilizationBuildingId,
  type CivilizationConverterId,
  type CivilizationJobId,
  type CivilizationResourceId,
  type CivilizationPermanentRewardId,
  type CivilizationState,
} from "./types";

export const CIVILIZATION_RESOURCE_IDS: readonly CivilizationResourceId[] = [
  "food",
  "population",
  "wood",
  "stone",
  "science",
  "copper",
  "bronze",
  "iron",
  "coal",
  "steel",
  "electricity",
  "machinery",
  "circuits",
  "data",
  "compute",
  "advanced_alloy",
  "rocket_fuel",
  "ship_parts",
];

export const CIVILIZATION_ACTION_IDS = Object.keys(
  CIVILIZATION_ACTIONS
) as CivilizationActionId[];
export const CIVILIZATION_JOB_IDS = Object.keys(CIVILIZATION_JOBS) as CivilizationJobId[];
export const CIVILIZATION_BUILDING_IDS = Object.keys(
  CIVILIZATION_BUILDINGS
) as CivilizationBuildingId[];
export const CIVILIZATION_CONVERTER_IDS = Object.keys(
  CIVILIZATION_CONVERTERS
) as CivilizationConverterId[];

export function createInitialCivilizationState(nowMs: number): CivilizationState {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new RangeError("nowMs must be a finite non-negative timestamp");
  }

  return {
    schemaVersion: CIVILIZATION_SCHEMA_VERSION,
    contentVersion: CIVILIZATION_CONTENT_VERSION,
    era: "stone",
    unlockedEras: ["stone"],
    resources: {
      food: { amount: 50, cap: 200 },
      population: { amount: 2, cap: 10 },
      wood: { amount: 20, cap: 100 },
      stone: { amount: 10, cap: 100 },
      science: { amount: 0, cap: 1_000 },
      copper: { amount: 0, cap: 200 },
      bronze: { amount: 0, cap: 200 },
      iron: { amount: 0, cap: 200 },
      coal: { amount: 0, cap: 400 },
      steel: { amount: 0, cap: 300 },
      electricity: { amount: 0, cap: 0 },
      machinery: { amount: 0, cap: 200 },
      circuits: { amount: 0, cap: 300 },
      data: { amount: 0, cap: 400 },
      compute: { amount: 0, cap: 0 },
      advanced_alloy: { amount: 0, cap: 300 },
      rocket_fuel: { amount: 0, cap: 400 },
      ship_parts: { amount: 0, cap: 300 },
    },
    workers: {
      forager: 0,
      woodcutter: 0,
      hunter: 0,
      miner: 0,
      scientist: 0,
      coal_miner: 0,
    },
    idleWorkers: 2,
    buildings: {
      shelter: 0,
      granary: 0,
      stockpile: 0,
      hunting_ground: 0,
      stone_mine: 0,
      storytelling_circle: 0,
      clay_brick_house: 0,
      metal_warehouse: 0,
      coal_mine: 0,
      worker_housing: 0,
      industrial_warehouse: 0,
      power_station: 0,
      industrial_institute: 0,
      electronics_warehouse: 0,
      network_station: 0,
      scheduler_center: 0,
      space_warehouse: 0,
      test_center: 0,
      evacuation_port: 0,
    },
    converters: {
      copper_smelter: { count: 0, enabled: true, priority: 2 },
      bronze_foundry: { count: 0, enabled: true, priority: 2 },
      iron_forge: { count: 0, enabled: true, priority: 2 },
      steel_mill: { count: 0, enabled: true, priority: 2 },
      steam_generator: { count: 0, enabled: true, priority: 1 },
      machine_factory: { count: 0, enabled: true, priority: 2 },
      circuit_assembler: { count: 0, enabled: true, priority: 2 },
      data_center: { count: 0, enabled: true, priority: 1 },
      digital_lab: { count: 0, enabled: true, priority: 2 },
      space_material_plant: { count: 0, enabled: true, priority: 2 },
      rocket_fuel_refinery: { count: 0, enabled: true, priority: 2 },
      orbital_shipyard: { count: 0, enabled: true, priority: 1 },
    },
    unlockedConverters: [],
    researchedTechs: [],
    actionLevels: {
      gather_fruit: 1,
      chop_wood: 1,
      mine_stone: 1,
      pan_copper: 1,
      forge_iron: 1,
      mine_coal: 1,
      audit_system: 1,
    },
    activeActions: {
      gather_fruit: null,
      chop_wood: null,
      mine_stone: null,
      pan_copper: null,
      forge_iron: null,
      mine_coal: null,
      audit_system: null,
    },
    populationGrowthProgressMs: 0,
    bronzeCompleted: false,
    industrialCompleted: false,
    informationCompleted: false,
    spaceProjectStage: 0,
    spaceCompleted: false,
    runNumber: 1,
    runStartedAt: nowMs,
    permanentRewards: {
      abundant_harvest: 0,
      research_archive: 0,
      founder_stockpile: 0,
      efficient_industry: 0,
    },
    automationRules: [],
    jobMasterySeconds: {
      forager: 0,
      woodcutter: 0,
      hunter: 0,
      miner: 0,
      scientist: 0,
      coal_miner: 0,
    },
    researchLevels: {
      food_storage: 0,
      labor_organization: 0,
      precision_casting: 0,
      metal_reserves: 0,
      fuel_efficiency: 0,
      machine_efficiency: 0,
      data_compression: 0,
      computer_efficiency: 0,
      material_efficiency: 0,
      propulsion_efficiency: 0,
    },
    policy: { id: "balanced", changedAt: 0 },
    lastSimulatedAt: nowMs,
  };
}

export function cloneCivilizationState(state: CivilizationState): CivilizationState {
  return {
    ...state,
    unlockedEras: [...state.unlockedEras],
    resources: Object.fromEntries(
      CIVILIZATION_RESOURCE_IDS.map((id) => [id, { ...state.resources[id] }])
    ) as CivilizationState["resources"],
    workers: { ...state.workers },
    buildings: { ...state.buildings },
    converters: Object.fromEntries(
      CIVILIZATION_CONVERTER_IDS.map((id) => [id, { ...state.converters[id] }])
    ) as CivilizationState["converters"],
    unlockedConverters: [...state.unlockedConverters],
    researchedTechs: [...state.researchedTechs],
    automationRules: [...state.automationRules],
    actionLevels: { ...state.actionLevels },
    activeActions: Object.fromEntries(
      CIVILIZATION_ACTION_IDS.map((id) => [
        id,
        state.activeActions[id] ? { ...state.activeActions[id] } : null,
      ])
    ) as CivilizationState["activeActions"],
    jobMasterySeconds: { ...state.jobMasterySeconds },
    researchLevels: { ...state.researchLevels },
    permanentRewards: { ...state.permanentRewards },
    policy: { ...state.policy },
  };
}

export function createCivilizationPrestigeState(
  previous: CivilizationState,
  rewardId: CivilizationPermanentRewardId,
  nowMs: number
): CivilizationState {
  const next = createInitialCivilizationState(nowMs);
  next.runNumber = previous.runNumber + 1;
  next.runStartedAt = nowMs;
  next.permanentRewards = { ...previous.permanentRewards };
  next.permanentRewards[rewardId] += 1;

  const founderLevel = next.permanentRewards.founder_stockpile;
  next.resources.wood.amount += founderLevel * 10;
  next.resources.wood.cap += founderLevel * 20;
  next.resources.stone.amount += founderLevel * 5;
  next.resources.stone.cap += founderLevel * 20;
  return next;
}
