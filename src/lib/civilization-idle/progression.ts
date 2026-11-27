import { getCivilizationResourceFlows } from "./simulation";
import type { CivilizationState } from "./types";

export type CivilizationMilestoneId =
  | "assign_food"
  | "food_surplus"
  | "stone_worksites"
  | "science_started"
  | "agriculture"
  | "enter_bronze"
  | "copper_chain"
  | "bronze_chain"
  | "iron_chain"
  | "factory_level_three"
  | "metal_reserve"
  | "steam_power"
  | "enter_industrial"
  | "coal_supply"
  | "steel_chain"
  | "electric_grid"
  | "machine_chain"
  | "industrial_automation"
  | "enter_information"
  | "circuit_chain"
  | "data_grid"
  | "digital_research"
  | "automation_rule"
  | "space_science"
  | "enter_space"
  | "advanced_materials"
  | "space_fuel"
  | "ship_parts"
  | "space_project_midpoint"
  | "evacuation_ready"
  | "space_complete";

export interface CivilizationMilestoneStatus {
  id: CivilizationMilestoneId;
  era: "stone" | "bronze" | "industrial" | "information" | "space";
  completed: boolean;
}

export function getCivilizationMilestones(state: CivilizationState): CivilizationMilestoneStatus[] {
  const foodWorkers = state.workers.forager + state.workers.hunter;
  const flows = getCivilizationResourceFlows(state);
  return [
    { id: "assign_food", era: "stone", completed: foodWorkers > 0 },
    { id: "food_surplus", era: "stone", completed: foodWorkers > 0 && flows.food.netPerSecond >= 0 },
    { id: "stone_worksites", era: "stone", completed: state.buildings.hunting_ground > 0 && state.buildings.stone_mine > 0 },
    { id: "science_started", era: "stone", completed: state.buildings.storytelling_circle > 0 && state.workers.scientist > 0 },
    { id: "agriculture", era: "stone", completed: state.researchedTechs.includes("agriculture") },
    { id: "enter_bronze", era: "stone", completed: ["bronze", "industrial", "information", "space"].includes(state.era) },
    { id: "copper_chain", era: "bronze", completed: state.converters.copper_smelter.count > 0 },
    { id: "bronze_chain", era: "bronze", completed: state.converters.bronze_foundry.count > 0 },
    { id: "iron_chain", era: "bronze", completed: state.converters.iron_forge.count > 0 },
    { id: "factory_level_three", era: "bronze", completed: Object.values(state.converters).some((converter) => converter.count >= 3) },
    {
      id: "metal_reserve",
      era: "bronze",
      completed: state.resources.copper.amount >= 20 && state.resources.bronze.amount >= 20 && state.resources.iron.amount >= 20,
    },
    { id: "steam_power", era: "bronze", completed: state.bronzeCompleted },
    { id: "enter_industrial", era: "industrial", completed: ["industrial", "information", "space"].includes(state.era) },
    { id: "coal_supply", era: "industrial", completed: state.workers.coal_miner > 0 || state.resources.coal.amount > 0 },
    { id: "steel_chain", era: "industrial", completed: state.converters.steel_mill.count > 0 },
    { id: "electric_grid", era: "industrial", completed: state.converters.steam_generator.count > 0 },
    { id: "machine_chain", era: "industrial", completed: state.converters.machine_factory.count > 0 },
    { id: "industrial_automation", era: "industrial", completed: state.industrialCompleted },
    { id: "enter_information", era: "information", completed: ["information", "space"].includes(state.era) },
    { id: "circuit_chain", era: "information", completed: state.converters.circuit_assembler.count > 0 },
    { id: "data_grid", era: "information", completed: state.converters.data_center.count > 0 },
    { id: "digital_research", era: "information", completed: state.converters.digital_lab.count > 0 },
    { id: "automation_rule", era: "information", completed: state.automationRules.length > 0 },
    { id: "space_science", era: "information", completed: state.informationCompleted },
    { id: "enter_space", era: "space", completed: state.era === "space" },
    { id: "advanced_materials", era: "space", completed: state.converters.space_material_plant.count > 0 },
    { id: "space_fuel", era: "space", completed: state.converters.rocket_fuel_refinery.count > 0 },
    { id: "ship_parts", era: "space", completed: state.converters.orbital_shipyard.count > 0 },
    { id: "space_project_midpoint", era: "space", completed: state.spaceProjectStage >= 2 },
    { id: "evacuation_ready", era: "space", completed: state.spaceProjectStage >= 3 },
    { id: "space_complete", era: "space", completed: state.spaceCompleted },
  ];
}

export function getNextCivilizationMilestone(state: CivilizationState): CivilizationMilestoneStatus | null {
  return getCivilizationMilestones(state).find((milestone) => !milestone.completed) ?? null;
}
