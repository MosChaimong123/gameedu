export const CIVILIZATION_SCHEMA_VERSION = 1 as const;
export const CIVILIZATION_CONTENT_VERSION = 1 as const;

export type CivilizationEraId = "stone" | "bronze";
export type CivilizationResourceId =
  | "food"
  | "population"
  | "wood"
  | "stone"
  | "science"
  | "copper"
  | "bronze"
  | "iron";

export type CivilizationActionId =
  | "gather_fruit"
  | "chop_wood"
  | "mine_stone"
  | "pan_copper"
  | "forge_iron";

export type CivilizationJobId =
  | "forager"
  | "woodcutter"
  | "hunter"
  | "miner"
  | "scientist";

export type CivilizationBuildingId =
  | "shelter"
  | "granary"
  | "stockpile"
  | "hunting_ground"
  | "stone_mine"
  | "storytelling_circle"
  | "clay_brick_house"
  | "metal_warehouse";

export type CivilizationTechId =
  | "basic_tools"
  | "foraging"
  | "logging"
  | "masonry"
  | "animal_husbandry"
  | "agriculture"
  | "smelting"
  | "bronze_working"
  | "iron_working"
  | "writing"
  | "steam_power";

export type CivilizationConverterId =
  | "copper_smelter"
  | "bronze_foundry"
  | "iron_forge";

export interface CivilizationResourceState {
  amount: number;
  cap: number;
}

export interface CivilizationActiveAction {
  readyAt: number;
}

export interface CivilizationConverterState {
  count: number;
  enabled: boolean;
}

export interface CivilizationState {
  schemaVersion: typeof CIVILIZATION_SCHEMA_VERSION;
  contentVersion: typeof CIVILIZATION_CONTENT_VERSION;
  era: CivilizationEraId;
  unlockedEras: CivilizationEraId[];
  resources: Record<CivilizationResourceId, CivilizationResourceState>;
  workers: Record<CivilizationJobId, number>;
  idleWorkers: number;
  buildings: Record<CivilizationBuildingId, number>;
  converters: Record<CivilizationConverterId, CivilizationConverterState>;
  unlockedConverters: CivilizationConverterId[];
  researchedTechs: CivilizationTechId[];
  actionLevels: Record<CivilizationActionId, number>;
  activeActions: Record<CivilizationActionId, CivilizationActiveAction | null>;
  populationGrowthProgressMs: number;
  bronzeCompleted: boolean;
  lastSimulatedAt: number;
}

export type CivilizationCommand =
  | { type: "SYNC" }
  | { type: "START_ACTION"; actionId: CivilizationActionId }
  | { type: "UPGRADE_ACTION"; actionId: CivilizationActionId }
  | { type: "BUY_BUILDING"; buildingId: CivilizationBuildingId }
  | { type: "ASSIGN_WORKER"; jobId: CivilizationJobId; delta: number }
  | { type: "BUY_RESEARCH"; techId: CivilizationTechId }
  | { type: "ADVANCE_ERA"; eraId: CivilizationEraId }
  | { type: "BUY_CONVERTER"; converterId: CivilizationConverterId }
  | { type: "TOGGLE_CONVERTER"; converterId: CivilizationConverterId };

export type CivilizationEngineErrorCode =
  | "ACTION_ALREADY_RUNNING"
  | "ACTION_LEVEL_MAX"
  | "CONTENT_LOCKED"
  | "INSUFFICIENT_RESOURCES"
  | "INVALID_DELTA"
  | "NO_IDLE_WORKERS"
  | "NOT_BUILT"
  | "PREREQUISITE_MISSING"
  | "TECH_ALREADY_RESEARCHED";

export interface CivilizationEngineEvent {
  type:
    | "ACTION_COMPLETED"
    | "ACTION_STARTED"
    | "ACTION_UPGRADED"
    | "BUILDING_BOUGHT"
    | "CONVERTER_BOUGHT"
    | "CONVERTER_TOGGLED"
    | "ERA_ADVANCED"
    | "ERA_UNLOCKED"
    | "POPULATION_GREW"
    | "RESEARCH_BOUGHT"
    | "WORKER_ASSIGNED";
  id?: string;
  amount?: number;
}

export type CivilizationEngineResult =
  | {
      ok: true;
      state: CivilizationState;
      events: CivilizationEngineEvent[];
    }
  | {
      ok: false;
      state: CivilizationState;
      events: CivilizationEngineEvent[];
      error: CivilizationEngineErrorCode;
    };
