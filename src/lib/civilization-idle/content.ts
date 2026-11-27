import type {
  CivilizationActionId,
  CivilizationBuildingId,
  CivilizationConverterId,
  CivilizationEraId,
  CivilizationJobId,
  CivilizationResourceId,
  CivilizationRepeatableResearchId,
  CivilizationPolicyId,
  CivilizationTechId,
} from "./types";

export const CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL = 5;

export interface CivilizationCost {
  resource: CivilizationResourceId;
  amount: number;
}

export interface CivilizationActionDefinition {
  id: CivilizationActionId;
  era: CivilizationEraId;
  baseCooldownMs: number;
  reward: CivilizationCost;
  upgradeCost: CivilizationCost;
  costScaling: number;
}

export interface CivilizationJobDefinition {
  id: CivilizationJobId;
  produces: CivilizationResourceId;
  baseRate: number;
  buildingRequired?: CivilizationBuildingId;
}

export type CivilizationBuildingEffect =
  | { type: "population_cap"; amount: number }
  | { type: "storage_cap"; resource: CivilizationResourceId; amount: number };

export interface CivilizationBuildingDefinition {
  id: CivilizationBuildingId;
  era: CivilizationEraId;
  baseCost: CivilizationCost[];
  costScaling: number;
  effects: CivilizationBuildingEffect[];
  maxCount?: number;
}

export type CivilizationTechEffect =
  | { type: "production_bonus"; resource: CivilizationResourceId; value: number }
  | { type: "action_cooldown_reduction"; actionId: CivilizationActionId; valueMs: number }
  | { type: "population_growth_bonus"; value: number }
  | { type: "unlock_era"; eraId: CivilizationEraId }
  | { type: "unlock_converter"; converterId: CivilizationConverterId }
  | { type: "complete_bronze" }
  | { type: "complete_industrial" }
  | { type: "complete_information" };

export interface CivilizationTechDefinition {
  id: CivilizationTechId;
  era: CivilizationEraId;
  scienceCost: number;
  prerequisites: CivilizationTechId[];
  effects: CivilizationTechEffect[];
}

export interface CivilizationConverterDefinition {
  id: CivilizationConverterId;
  era: CivilizationEraId;
  unlockedByTech: CivilizationTechId;
  baseCost: CivilizationCost[];
  costScaling: number;
  inputs: CivilizationCost[];
  outputs: CivilizationCost[];
  powerDemand?: number;
  powerSupply?: number;
  computeDemand?: number;
  computeSupply?: number;
}

export interface CivilizationRepeatableResearchDefinition {
  id: CivilizationRepeatableResearchId;
  era: CivilizationEraId;
  baseScienceCost: number;
  costScaling: number;
  maxLevel: number;
  prerequisite: CivilizationTechId;
}

export const CIVILIZATION_SPACE_PROJECT_STAGES = {
  1: {
    tech: "lightweight_materials",
    costs: [
      { resource: "advanced_alloy", amount: 500 },
      { resource: "ship_parts", amount: 250 },
    ],
  },
  2: {
    tech: "propulsion_systems",
    costs: [
      { resource: "ship_parts", amount: 350 },
      { resource: "rocket_fuel", amount: 600 },
    ],
  },
  3: {
    tech: "life_support",
    costs: [
      { resource: "circuits", amount: 200 },
      { resource: "data", amount: 400 },
      { resource: "food", amount: 300 },
    ],
  },
  4: {
    tech: "evacuation",
    costs: [{ resource: "rocket_fuel", amount: 800 }],
  },
} as const satisfies Record<1 | 2 | 3 | 4, {
  tech: CivilizationTechId;
  costs: readonly CivilizationCost[];
}>;

export interface CivilizationPolicyDefinition {
  id: CivilizationPolicyId;
  workerBonuses: Partial<Record<CivilizationResourceId, number>>;
  converterInputMultiplier: number;
  converterOutputMultiplier: number;
}

export const CIVILIZATION_MAX_ACTION_LEVEL = 10;
export const CIVILIZATION_MAX_CONVERTER_LEVEL = 15;
export const CIVILIZATION_POLICY_COOLDOWN_MS = 60 * 60 * 1_000;
export const CIVILIZATION_MASTERY_THRESHOLDS_SECONDS = [0, 1_800, 7_200, 21_600, 43_200, 72_000, 115_200, 172_800, 244_800, 331_200] as const;

export const CIVILIZATION_ERA_ORDER: readonly CivilizationEraId[] = ["stone", "bronze", "industrial", "information", "space"];

export const CIVILIZATION_ACTIONS: Record<
  CivilizationActionId,
  CivilizationActionDefinition
> = {
  gather_fruit: {
    id: "gather_fruit",
    era: "stone",
    baseCooldownMs: 3_000,
    reward: { resource: "food", amount: 3 },
    upgradeCost: { resource: "food", amount: 15 },
    costScaling: 1.45,
  },
  chop_wood: {
    id: "chop_wood",
    era: "stone",
    baseCooldownMs: 4_000,
    reward: { resource: "wood", amount: 3 },
    upgradeCost: { resource: "wood", amount: 15 },
    costScaling: 1.45,
  },
  mine_stone: {
    id: "mine_stone",
    era: "stone",
    baseCooldownMs: 5_000,
    reward: { resource: "stone", amount: 2 },
    upgradeCost: { resource: "stone", amount: 12 },
    costScaling: 1.5,
  },
  pan_copper: {
    id: "pan_copper",
    era: "bronze",
    baseCooldownMs: 4_500,
    reward: { resource: "copper", amount: 2 },
    upgradeCost: { resource: "copper", amount: 20 },
    costScaling: 1.5,
  },
  forge_iron: {
    id: "forge_iron",
    era: "bronze",
    baseCooldownMs: 5_500,
    reward: { resource: "iron", amount: 2 },
    upgradeCost: { resource: "iron", amount: 25 },
    costScaling: 1.5,
  },
  mine_coal: {
    id: "mine_coal",
    era: "industrial",
    baseCooldownMs: 6_000,
    reward: { resource: "coal", amount: 2 },
    upgradeCost: { resource: "coal", amount: 30 },
    costScaling: 1.55,
  },
  audit_system: {
    id: "audit_system",
    era: "information",
    baseCooldownMs: 7_000,
    reward: { resource: "data", amount: 3 },
    upgradeCost: { resource: "data", amount: 40 },
    costScaling: 1.55,
  },
};

export const CIVILIZATION_JOBS: Record<CivilizationJobId, CivilizationJobDefinition> = {
  forager: { id: "forager", produces: "food", baseRate: 0.8 },
  woodcutter: { id: "woodcutter", produces: "wood", baseRate: 0.5 },
  hunter: {
    id: "hunter",
    produces: "food",
    baseRate: 1.5,
    buildingRequired: "hunting_ground",
  },
  miner: {
    id: "miner",
    produces: "stone",
    baseRate: 0.4,
    buildingRequired: "stone_mine",
  },
  scientist: {
    id: "scientist",
    produces: "science",
    baseRate: 0.4,
    buildingRequired: "storytelling_circle",
  },
  coal_miner: {
    id: "coal_miner",
    produces: "coal",
    baseRate: 0.25,
    buildingRequired: "coal_mine",
  },
};

export const CIVILIZATION_BUILDINGS: Record<
  CivilizationBuildingId,
  CivilizationBuildingDefinition
> = {
  shelter: {
    id: "shelter",
    era: "stone",
    baseCost: [
      { resource: "wood", amount: 10 },
      { resource: "stone", amount: 5 },
    ],
    costScaling: 1.25,
    effects: [{ type: "population_cap", amount: 2 }],
    maxCount: 20,
  },
  granary: {
    id: "granary",
    era: "stone",
    baseCost: [
      { resource: "wood", amount: 20 },
      { resource: "stone", amount: 10 },
    ],
    costScaling: 1.35,
    effects: [{ type: "storage_cap", resource: "food", amount: 150 }],
    maxCount: 10,
  },
  stockpile: {
    id: "stockpile",
    era: "stone",
    baseCost: [
      { resource: "wood", amount: 25 },
      { resource: "stone", amount: 15 },
    ],
    costScaling: 1.35,
    effects: [
      { type: "storage_cap", resource: "wood", amount: 150 },
      { type: "storage_cap", resource: "stone", amount: 150 },
    ],
    maxCount: 10,
  },
  hunting_ground: {
    id: "hunting_ground",
    era: "stone",
    baseCost: [{ resource: "wood", amount: 15 }],
    costScaling: 1.4,
    effects: [],
    maxCount: 1,
  },
  stone_mine: {
    id: "stone_mine",
    era: "stone",
    baseCost: [
      { resource: "wood", amount: 20 },
      { resource: "stone", amount: 10 },
    ],
    costScaling: 1.35,
    effects: [],
    maxCount: 1,
  },
  storytelling_circle: {
    id: "storytelling_circle",
    era: "stone",
    baseCost: [
      { resource: "wood", amount: 30 },
      { resource: "stone", amount: 20 },
    ],
    costScaling: 1.5,
    effects: [],
    maxCount: 1,
  },
  clay_brick_house: {
    id: "clay_brick_house",
    era: "bronze",
    baseCost: [
      { resource: "wood", amount: 50 },
      { resource: "copper", amount: 30 },
    ],
    costScaling: 1.3,
    effects: [{ type: "population_cap", amount: 4 }],
    maxCount: 15,
  },
  metal_warehouse: {
    id: "metal_warehouse",
    era: "bronze",
    baseCost: [
      { resource: "stone", amount: 80 },
      { resource: "copper", amount: 40 },
    ],
    costScaling: 1.4,
    effects: [
      { type: "storage_cap", resource: "copper", amount: 300 },
      { type: "storage_cap", resource: "bronze", amount: 300 },
      { type: "storage_cap", resource: "iron", amount: 300 },
      { type: "storage_cap", resource: "wood", amount: 200 },
      { type: "storage_cap", resource: "stone", amount: 200 },
    ],
    maxCount: 10,
  },
  coal_mine: {
    id: "coal_mine",
    era: "industrial",
    baseCost: [
      { resource: "iron", amount: 120 },
      { resource: "wood", amount: 160 },
    ],
    costScaling: 1.4,
    effects: [],
    maxCount: 1,
  },
  worker_housing: {
    id: "worker_housing",
    era: "industrial",
    baseCost: [
      { resource: "steel", amount: 80 },
      { resource: "wood", amount: 180 },
    ],
    costScaling: 1.32,
    effects: [{ type: "population_cap", amount: 5 }],
    maxCount: 15,
  },
  industrial_warehouse: {
    id: "industrial_warehouse",
    era: "industrial",
    baseCost: [
      { resource: "steel", amount: 100 },
      { resource: "stone", amount: 220 },
    ],
    costScaling: 1.38,
    effects: [
      { type: "storage_cap", resource: "coal", amount: 400 },
      { type: "storage_cap", resource: "steel", amount: 300 },
      { type: "storage_cap", resource: "machinery", amount: 200 },
    ],
    maxCount: 10,
  },
  power_station: {
    id: "power_station",
    era: "industrial",
    baseCost: [
      { resource: "steel", amount: 140 },
      { resource: "copper", amount: 160 },
    ],
    costScaling: 1.42,
    effects: [],
    maxCount: 10,
  },
  industrial_institute: {
    id: "industrial_institute",
    era: "industrial",
    baseCost: [
      { resource: "steel", amount: 120 },
      { resource: "bronze", amount: 180 },
    ],
    costScaling: 1.5,
    effects: [{ type: "storage_cap", resource: "science", amount: 4_000 }],
    maxCount: 3,
  },
  electronics_warehouse: {
    id: "electronics_warehouse",
    era: "information",
    baseCost: [
      { resource: "machinery", amount: 120 },
      { resource: "steel", amount: 180 },
    ],
    costScaling: 1.4,
    effects: [
      { type: "storage_cap", resource: "circuits", amount: 400 },
      { type: "storage_cap", resource: "data", amount: 500 },
    ],
    maxCount: 10,
  },
  network_station: {
    id: "network_station",
    era: "information",
    baseCost: [
      { resource: "machinery", amount: 150 },
      { resource: "circuits", amount: 80 },
    ],
    costScaling: 1.45,
    effects: [{ type: "storage_cap", resource: "data", amount: 250 }],
    maxCount: 10,
  },
  scheduler_center: {
    id: "scheduler_center",
    era: "information",
    baseCost: [
      { resource: "machinery", amount: 200 },
      { resource: "circuits", amount: 120 },
    ],
    costScaling: 1.5,
    effects: [],
    maxCount: 5,
  },
  space_warehouse: {
    id: "space_warehouse", era: "space",
    baseCost: [{ resource: "machinery", amount: 300 }, { resource: "circuits", amount: 220 }],
    costScaling: 1.45,
    effects: [
      { type: "storage_cap", resource: "advanced_alloy", amount: 500 },
      { type: "storage_cap", resource: "rocket_fuel", amount: 600 },
      { type: "storage_cap", resource: "ship_parts", amount: 400 },
    ],
    maxCount: 10,
  },
  test_center: {
    id: "test_center", era: "space",
    baseCost: [{ resource: "advanced_alloy", amount: 180 }, { resource: "circuits", amount: 160 }],
    costScaling: 1.5, effects: [], maxCount: 5,
  },
  evacuation_port: {
    id: "evacuation_port", era: "space",
    baseCost: [{ resource: "advanced_alloy", amount: 500 }, { resource: "ship_parts", amount: 300 }],
    costScaling: 1, effects: [], maxCount: 1,
  },
};

export const CIVILIZATION_TECHS: Record<CivilizationTechId, CivilizationTechDefinition> = {
  basic_tools: {
    id: "basic_tools",
    era: "stone",
    scienceCost: 10,
    prerequisites: [],
    effects: [{ type: "production_bonus", resource: "food", value: 0.15 }],
  },
  foraging: {
    id: "foraging",
    era: "stone",
    scienceCost: 25,
    prerequisites: ["basic_tools"],
    effects: [
      { type: "action_cooldown_reduction", actionId: "gather_fruit", valueMs: 800 },
    ],
  },
  logging: {
    id: "logging",
    era: "stone",
    scienceCost: 25,
    prerequisites: ["basic_tools"],
    effects: [
      { type: "action_cooldown_reduction", actionId: "chop_wood", valueMs: 800 },
    ],
  },
  masonry: {
    id: "masonry",
    era: "stone",
    scienceCost: 40,
    prerequisites: ["basic_tools"],
    effects: [{ type: "production_bonus", resource: "stone", value: 0.3 }],
  },
  animal_husbandry: {
    id: "animal_husbandry",
    era: "stone",
    scienceCost: 50,
    prerequisites: ["foraging"],
    effects: [{ type: "population_growth_bonus", value: 0.5 }],
  },
  agriculture: {
    id: "agriculture",
    era: "stone",
    scienceCost: 150,
    prerequisites: ["animal_husbandry", "logging", "masonry"],
    effects: [
      { type: "unlock_era", eraId: "bronze" },
      { type: "production_bonus", resource: "food", value: 0.5 },
    ],
  },
  smelting: {
    id: "smelting",
    era: "bronze",
    scienceCost: 200,
    prerequisites: ["agriculture"],
    effects: [{ type: "unlock_converter", converterId: "copper_smelter" }],
  },
  bronze_working: {
    id: "bronze_working",
    era: "bronze",
    scienceCost: 300,
    prerequisites: ["smelting"],
    effects: [{ type: "unlock_converter", converterId: "bronze_foundry" }],
  },
  iron_working: {
    id: "iron_working",
    era: "bronze",
    scienceCost: 400,
    prerequisites: ["bronze_working"],
    effects: [{ type: "unlock_converter", converterId: "iron_forge" }],
  },
  writing: {
    id: "writing",
    era: "bronze",
    scienceCost: 250,
    prerequisites: ["agriculture"],
    effects: [{ type: "production_bonus", resource: "science", value: 0.5 }],
  },
  steam_power: {
    id: "steam_power",
    era: "bronze",
    scienceCost: 800,
    prerequisites: ["iron_working", "writing"],
    effects: [
      { type: "complete_bronze" },
      { type: "unlock_era", eraId: "industrial" },
    ],
  },
  coal_geology: {
    id: "coal_geology",
    era: "industrial",
    scienceCost: 1_200,
    prerequisites: ["steam_power"],
    effects: [{ type: "action_cooldown_reduction", actionId: "mine_coal", valueMs: 1_000 }],
  },
  steel_furnace: {
    id: "steel_furnace",
    era: "industrial",
    scienceCost: 1_600,
    prerequisites: ["coal_geology"],
    effects: [{ type: "unlock_converter", converterId: "steel_mill" }],
  },
  steam_engine: {
    id: "steam_engine",
    era: "industrial",
    scienceCost: 2_200,
    prerequisites: ["steel_furnace"],
    effects: [{ type: "production_bonus", resource: "coal", value: 0.25 }],
  },
  electrification: {
    id: "electrification",
    era: "industrial",
    scienceCost: 2_800,
    prerequisites: ["steam_engine"],
    effects: [
      { type: "unlock_converter", converterId: "steam_generator" },
      { type: "unlock_converter", converterId: "machine_factory" },
    ],
  },
  conveyor_belts: {
    id: "conveyor_belts",
    era: "industrial",
    scienceCost: 3_600,
    prerequisites: ["electrification"],
    effects: [{ type: "production_bonus", resource: "machinery", value: 0.1 }],
  },
  factory_priority: {
    id: "factory_priority",
    era: "industrial",
    scienceCost: 4_500,
    prerequisites: ["conveyor_belts"],
    effects: [],
  },
  efficient_generator: {
    id: "efficient_generator",
    era: "industrial",
    scienceCost: 6_000,
    prerequisites: ["factory_priority"],
    effects: [],
  },
  factory_automation: {
    id: "factory_automation",
    era: "industrial",
    scienceCost: 8_000,
    prerequisites: ["efficient_generator"],
    effects: [{ type: "complete_industrial" }, { type: "unlock_era", eraId: "information" }],
  },
  circuitry: {
    id: "circuitry", era: "information", scienceCost: 10_000,
    prerequisites: ["factory_automation"],
    effects: [{ type: "unlock_converter", converterId: "circuit_assembler" }],
  },
  computing: {
    id: "computing", era: "information", scienceCost: 12_000,
    prerequisites: ["circuitry"],
    effects: [{ type: "unlock_converter", converterId: "data_center" }],
  },
  networking: {
    id: "networking", era: "information", scienceCost: 14_000,
    prerequisites: ["computing"],
    effects: [{ type: "unlock_converter", converterId: "digital_lab" }],
  },
  databases: {
    id: "databases", era: "information", scienceCost: 16_000,
    prerequisites: ["networking"],
    effects: [{ type: "production_bonus", resource: "data", value: 0.1 }],
  },
  job_scheduling: {
    id: "job_scheduling", era: "information", scienceCost: 19_000,
    prerequisites: ["databases"], effects: [],
  },
  computational_simulation: {
    id: "computational_simulation", era: "information", scienceCost: 22_000,
    prerequisites: ["job_scheduling"],
    effects: [{ type: "production_bonus", resource: "science", value: 0.15 }],
  },
  telecommunications: {
    id: "telecommunications", era: "information", scienceCost: 25_000,
    prerequisites: ["computational_simulation"],
    effects: [{ type: "production_bonus", resource: "data", value: 0.15 }],
  },
  space_science: {
    id: "space_science", era: "information", scienceCost: 30_000,
    prerequisites: ["telecommunications"],
    effects: [{ type: "complete_information" }, { type: "unlock_era", eraId: "space" }],
  },
  lightweight_materials: {
    id: "lightweight_materials", era: "space", scienceCost: 36_000,
    prerequisites: ["space_science"],
    effects: [{ type: "unlock_converter", converterId: "space_material_plant" }],
  },
  propulsion_systems: {
    id: "propulsion_systems", era: "space", scienceCost: 42_000,
    prerequisites: ["lightweight_materials"],
    effects: [{ type: "unlock_converter", converterId: "rocket_fuel_refinery" }],
  },
  navigation_systems: {
    id: "navigation_systems", era: "space", scienceCost: 48_000,
    prerequisites: ["propulsion_systems"],
    effects: [{ type: "unlock_converter", converterId: "orbital_shipyard" }],
  },
  life_support: {
    id: "life_support", era: "space", scienceCost: 55_000,
    prerequisites: ["navigation_systems"], effects: [],
  },
  spacecraft_testing: {
    id: "spacecraft_testing", era: "space", scienceCost: 64_000,
    prerequisites: ["life_support"], effects: [],
  },
  evacuation: {
    id: "evacuation", era: "space", scienceCost: 75_000,
    prerequisites: ["spacecraft_testing"], effects: [],
  },
};

export const CIVILIZATION_CONVERTERS: Record<
  CivilizationConverterId,
  CivilizationConverterDefinition
> = {
  copper_smelter: {
    id: "copper_smelter",
    era: "bronze",
    unlockedByTech: "smelting",
    baseCost: [
      { resource: "stone", amount: 40 },
      { resource: "wood", amount: 25 },
    ],
    costScaling: 1.35,
    inputs: [{ resource: "wood", amount: 0.5 }],
    outputs: [{ resource: "copper", amount: 0.4 }],
    powerDemand: 0.5,
  },
  bronze_foundry: {
    id: "bronze_foundry",
    era: "bronze",
    unlockedByTech: "bronze_working",
    baseCost: [
      { resource: "stone", amount: 70 },
      { resource: "copper", amount: 40 },
    ],
    costScaling: 1.4,
    inputs: [
      { resource: "copper", amount: 0.5 },
      { resource: "wood", amount: 0.3 },
    ],
    outputs: [{ resource: "bronze", amount: 0.3 }],
    powerDemand: 0.5,
  },
  iron_forge: {
    id: "iron_forge",
    era: "bronze",
    unlockedByTech: "iron_working",
    baseCost: [
      { resource: "stone", amount: 90 },
      { resource: "bronze", amount: 40 },
    ],
    costScaling: 1.4,
    inputs: [
      { resource: "wood", amount: 0.8 },
      { resource: "stone", amount: 0.2 },
    ],
    outputs: [{ resource: "iron", amount: 0.3 }],
    powerDemand: 0.5,
  },
  steel_mill: {
    id: "steel_mill",
    era: "industrial",
    unlockedByTech: "steel_furnace",
    baseCost: [
      { resource: "iron", amount: 100 },
      { resource: "coal", amount: 80 },
    ],
    costScaling: 1.42,
    inputs: [
      { resource: "iron", amount: 0.4 },
      { resource: "coal", amount: 0.2 },
    ],
    outputs: [{ resource: "steel", amount: 0.25 }],
  },
  steam_generator: {
    id: "steam_generator",
    era: "industrial",
    unlockedByTech: "electrification",
    baseCost: [
      { resource: "steel", amount: 120 },
      { resource: "copper", amount: 100 },
    ],
    costScaling: 1.45,
    inputs: [{ resource: "coal", amount: 0.3 }],
    outputs: [],
    powerSupply: 2,
  },
  machine_factory: {
    id: "machine_factory",
    era: "industrial",
    unlockedByTech: "electrification",
    baseCost: [
      { resource: "steel", amount: 160 },
      { resource: "copper", amount: 120 },
    ],
    costScaling: 1.48,
    inputs: [{ resource: "steel", amount: 0.25 }],
    outputs: [{ resource: "machinery", amount: 0.15 }],
    powerDemand: 1,
  },
  circuit_assembler: {
    id: "circuit_assembler", era: "information", unlockedByTech: "circuitry",
    baseCost: [{ resource: "machinery", amount: 120 }, { resource: "steel", amount: 160 }],
    costScaling: 1.48,
    inputs: [{ resource: "copper", amount: 0.2 }, { resource: "steel", amount: 0.1 }],
    outputs: [{ resource: "circuits", amount: 0.12 }],
    powerDemand: 1,
  },
  data_center: {
    id: "data_center", era: "information", unlockedByTech: "computing",
    baseCost: [{ resource: "machinery", amount: 160 }, { resource: "circuits", amount: 100 }],
    costScaling: 1.5,
    inputs: [{ resource: "circuits", amount: 0.05 }],
    outputs: [{ resource: "data", amount: 0.15 }],
    powerDemand: 2,
    computeSupply: 2,
  },
  digital_lab: {
    id: "digital_lab", era: "information", unlockedByTech: "networking",
    baseCost: [{ resource: "machinery", amount: 180 }, { resource: "circuits", amount: 140 }],
    costScaling: 1.52,
    inputs: [{ resource: "data", amount: 0.1 }],
    outputs: [{ resource: "science", amount: 0.2 }],
    computeDemand: 1,
  },
  space_material_plant: {
    id: "space_material_plant", era: "space", unlockedByTech: "lightweight_materials",
    baseCost: [{ resource: "machinery", amount: 260 }, { resource: "circuits", amount: 180 }],
    costScaling: 1.5,
    inputs: [{ resource: "steel", amount: 0.2 }, { resource: "bronze", amount: 0.1 }],
    outputs: [{ resource: "advanced_alloy", amount: 0.1 }], powerDemand: 2,
  },
  rocket_fuel_refinery: {
    id: "rocket_fuel_refinery", era: "space", unlockedByTech: "propulsion_systems",
    baseCost: [{ resource: "machinery", amount: 300 }, { resource: "advanced_alloy", amount: 120 }],
    costScaling: 1.52,
    inputs: [{ resource: "coal", amount: 0.2 }],
    outputs: [{ resource: "rocket_fuel", amount: 0.1 }], powerDemand: 2,
  },
  orbital_shipyard: {
    id: "orbital_shipyard", era: "space", unlockedByTech: "navigation_systems",
    baseCost: [{ resource: "advanced_alloy", amount: 220 }, { resource: "circuits", amount: 200 }],
    costScaling: 1.55,
    inputs: [{ resource: "advanced_alloy", amount: 0.1 }, { resource: "circuits", amount: 0.05 }],
    outputs: [{ resource: "ship_parts", amount: 0.06 }], powerDemand: 3,
  },
};

export const CIVILIZATION_REPEATABLE_RESEARCH: Record<
  CivilizationRepeatableResearchId,
  CivilizationRepeatableResearchDefinition
> = {
  food_storage: { id: "food_storage", era: "stone", baseScienceCost: 80, costScaling: 2, maxLevel: 3, prerequisite: "foraging" },
  labor_organization: { id: "labor_organization", era: "stone", baseScienceCost: 100, costScaling: 2, maxLevel: 3, prerequisite: "basic_tools" },
  precision_casting: { id: "precision_casting", era: "bronze", baseScienceCost: 350, costScaling: 2, maxLevel: 3, prerequisite: "bronze_working" },
  metal_reserves: { id: "metal_reserves", era: "bronze", baseScienceCost: 300, costScaling: 2, maxLevel: 3, prerequisite: "smelting" },
  fuel_efficiency: { id: "fuel_efficiency", era: "industrial", baseScienceCost: 2_000, costScaling: 2, maxLevel: 5, prerequisite: "steam_engine" },
  machine_efficiency: { id: "machine_efficiency", era: "industrial", baseScienceCost: 2_500, costScaling: 2, maxLevel: 5, prerequisite: "conveyor_belts" },
  data_compression: { id: "data_compression", era: "information", baseScienceCost: 8_000, costScaling: 2, maxLevel: 5, prerequisite: "databases" },
  computer_efficiency: { id: "computer_efficiency", era: "information", baseScienceCost: 9_000, costScaling: 2, maxLevel: 5, prerequisite: "computing" },
  material_efficiency: { id: "material_efficiency", era: "space", baseScienceCost: 18_000, costScaling: 2, maxLevel: 5, prerequisite: "lightweight_materials" },
  propulsion_efficiency: { id: "propulsion_efficiency", era: "space", baseScienceCost: 20_000, costScaling: 2, maxLevel: 5, prerequisite: "propulsion_systems" },
};

export const CIVILIZATION_POLICIES: Record<CivilizationPolicyId, CivilizationPolicyDefinition> = {
  balanced: { id: "balanced", workerBonuses: {}, converterInputMultiplier: 1, converterOutputMultiplier: 1 },
  sustenance: { id: "sustenance", workerBonuses: { food: 0.15, science: -0.1 }, converterInputMultiplier: 1, converterOutputMultiplier: 1 },
  scholarship: { id: "scholarship", workerBonuses: { food: -0.1, science: 0.15 }, converterInputMultiplier: 1, converterOutputMultiplier: 1 },
  industry: { id: "industry", workerBonuses: { science: -0.1 }, converterInputMultiplier: 1.05, converterOutputMultiplier: 1.1 },
};
