export const CIVILIZATION_SCHEMA_VERSION = 7 as const;
export const CIVILIZATION_CONTENT_VERSION = 7 as const;

export type CivilizationEraId = "stone" | "bronze" | "industrial" | "information" | "space";
export type CivilizationResourceId =
  | "food"
  | "population"
  | "wood"
  | "stone"
  | "science"
  | "copper"
  | "bronze"
  | "iron"
  | "coal"
  | "steel"
  | "electricity"
  | "machinery"
  | "circuits"
  | "data"
  | "compute"
  | "advanced_alloy"
  | "rocket_fuel"
  | "ship_parts";

export type CivilizationActionId =
  | "gather_fruit"
  | "chop_wood"
  | "mine_stone"
  | "pan_copper"
  | "forge_iron"
  | "mine_coal"
  | "audit_system";

export type CivilizationJobId =
  | "forager"
  | "woodcutter"
  | "hunter"
  | "miner"
  | "scientist"
  | "coal_miner";

export type CivilizationBuildingId =
  | "shelter"
  | "granary"
  | "stockpile"
  | "hunting_ground"
  | "stone_mine"
  | "storytelling_circle"
  | "clay_brick_house"
  | "metal_warehouse"
  | "coal_mine"
  | "worker_housing"
  | "industrial_warehouse"
  | "power_station"
  | "industrial_institute"
  | "electronics_warehouse"
  | "network_station"
  | "scheduler_center"
  | "space_warehouse"
  | "test_center"
  | "evacuation_port";

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
  | "steam_power"
  | "coal_geology"
  | "steel_furnace"
  | "steam_engine"
  | "electrification"
  | "conveyor_belts"
  | "factory_priority"
  | "efficient_generator"
  | "factory_automation"
  | "circuitry"
  | "computing"
  | "networking"
  | "databases"
  | "job_scheduling"
  | "computational_simulation"
  | "telecommunications"
  | "space_science"
  | "lightweight_materials"
  | "propulsion_systems"
  | "navigation_systems"
  | "life_support"
  | "spacecraft_testing"
  | "evacuation";

export type CivilizationConverterId =
  | "copper_smelter"
  | "bronze_foundry"
  | "iron_forge"
  | "steel_mill"
  | "steam_generator"
  | "machine_factory"
  | "circuit_assembler"
  | "data_center"
  | "digital_lab"
  | "space_material_plant"
  | "rocket_fuel_refinery"
  | "orbital_shipyard";

export type CivilizationRepeatableResearchId =
  | "food_storage"
  | "labor_organization"
  | "precision_casting"
  | "metal_reserves"
  | "fuel_efficiency"
  | "machine_efficiency"
  | "data_compression"
  | "computer_efficiency"
  | "material_efficiency"
  | "propulsion_efficiency";

export type CivilizationAutomationRuleId =
  | "protect_copper"
  | "protect_steel"
  | "prioritize_data_center";

export type CivilizationPolicyId = "balanced" | "sustenance" | "scholarship" | "industry";

export type CivilizationPermanentRewardId =
  | "abundant_harvest"
  | "research_archive"
  | "founder_stockpile"
  | "efficient_industry";

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
  priority: 1 | 2 | 3;
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
  industrialCompleted: boolean;
  informationCompleted: boolean;
  spaceProjectStage: 0 | 1 | 2 | 3 | 4;
  spaceCompleted: boolean;
  runNumber: number;
  runStartedAt: number;
  permanentRewards: Record<CivilizationPermanentRewardId, number>;
  automationRules: CivilizationAutomationRuleId[];
  jobMasterySeconds: Record<CivilizationJobId, number>;
  researchLevels: Record<CivilizationRepeatableResearchId, number>;
  policy: { id: CivilizationPolicyId; changedAt: number };
  lastSimulatedAt: number;
}

export type CivilizationCommand =
  | { type: "SYNC" }
  | { type: "START_ACTION"; actionId: CivilizationActionId }
  | { type: "UPGRADE_ACTION"; actionId: CivilizationActionId }
  | { type: "BUY_BUILDING"; buildingId: CivilizationBuildingId }
  | { type: "ASSIGN_WORKER"; jobId: CivilizationJobId; delta: number }
  | { type: "BUY_RESEARCH"; techId: CivilizationTechId }
  | { type: "BUY_REPEATABLE_RESEARCH"; researchId: CivilizationRepeatableResearchId }
  | { type: "SET_POLICY"; policyId: CivilizationPolicyId }
  | { type: "ADVANCE_ERA"; eraId: CivilizationEraId }
  | { type: "BUY_CONVERTER"; converterId: CivilizationConverterId }
  | { type: "TOGGLE_CONVERTER"; converterId: CivilizationConverterId }
  | { type: "SET_CONVERTER_PRIORITY"; converterId: CivilizationConverterId; priority: 1 | 2 | 3 }
  | { type: "TOGGLE_AUTOMATION_RULE"; ruleId: CivilizationAutomationRuleId }
  | { type: "COMPLETE_SPACE_PROJECT_STAGE"; stage: 1 | 2 | 3 | 4 }
  | { type: "PRESTIGE_RESET"; rewardId: CivilizationPermanentRewardId; confirmRunNumber: number };

export type CivilizationEngineErrorCode =
  | "ACTION_ALREADY_RUNNING"
  | "ACTION_LEVEL_MAX"
  | "CONTENT_LOCKED"
  | "INSUFFICIENT_RESOURCES"
  | "INVALID_DELTA"
  | "NO_IDLE_WORKERS"
  | "NOT_BUILT"
  | "PREREQUISITE_MISSING"
  | "TECH_ALREADY_RESEARCHED"
  | "RESEARCH_LEVEL_MAX"
  | "POLICY_COOLDOWN"
  | "COMPLETION_REQUIREMENTS_MISSING"
  | "PRESTIGE_NOT_READY"
  | "PRESTIGE_REWARD_MAXED"
  | "PRESTIGE_CONFIRMATION_MISMATCH";

export interface CivilizationEngineEvent {
  type:
    | "ACTION_COMPLETED"
    | "ACTION_STARTED"
    | "ACTION_UPGRADED"
    | "BUILDING_BOUGHT"
    | "CONVERTER_BOUGHT"
    | "CONVERTER_TOGGLED"
    | "CONVERTER_PRIORITY_CHANGED"
    | "AUTOMATION_RULE_CHANGED"
    | "SPACE_PROJECT_STAGE_COMPLETED"
    | "SPACE_COMPLETED"
    | "PRESTIGE_COMPLETED"
    | "ERA_ADVANCED"
    | "ERA_UNLOCKED"
    | "POPULATION_GREW"
    | "RESEARCH_BOUGHT"
    | "REPEATABLE_RESEARCH_BOUGHT"
    | "POLICY_CHANGED"
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
