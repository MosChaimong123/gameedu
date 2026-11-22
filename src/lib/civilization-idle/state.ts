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
    },
    workers: {
      forager: 0,
      woodcutter: 0,
      hunter: 0,
      miner: 0,
      scientist: 0,
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
    },
    converters: {
      copper_smelter: { count: 0, enabled: true },
      bronze_foundry: { count: 0, enabled: true },
      iron_forge: { count: 0, enabled: true },
    },
    unlockedConverters: [],
    researchedTechs: [],
    actionLevels: {
      gather_fruit: 1,
      chop_wood: 1,
      mine_stone: 1,
      pan_copper: 1,
      forge_iron: 1,
    },
    activeActions: {
      gather_fruit: null,
      chop_wood: null,
      mine_stone: null,
      pan_copper: null,
      forge_iron: null,
    },
    populationGrowthProgressMs: 0,
    bronzeCompleted: false,
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
    actionLevels: { ...state.actionLevels },
    activeActions: Object.fromEntries(
      CIVILIZATION_ACTION_IDS.map((id) => [
        id,
        state.activeActions[id] ? { ...state.activeActions[id] } : null,
      ])
    ) as CivilizationState["activeActions"],
  };
}
