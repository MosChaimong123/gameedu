import type {
  CivilizationActionId,
  CivilizationBuildingId,
  CivilizationConverterId,
  CivilizationEraId,
  CivilizationJobId,
  CivilizationResourceId,
  CivilizationTechId,
} from "./types";

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
  | { type: "complete_bronze" };

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
}

export const CIVILIZATION_ERA_ORDER: readonly CivilizationEraId[] = ["stone", "bronze"];

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
    effects: [{ type: "complete_bronze" }],
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
  },
};
