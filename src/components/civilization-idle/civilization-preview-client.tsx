"use client";

import { useState } from "react";
import { createInitialCivilizationState } from "@/lib/civilization-idle";
import { CivilizationGame } from "./civilization-game";

export function CivilizationPreviewClient({ mode = "stone" }: { mode?: "stone" | "transition" | "bronze" | "industrial" | "information" | "space" | "prestige" | "offline" }) {
  const [initialState] = useState(() => {
    const state = createInitialCivilizationState(Date.now());
    state.resources.wood.amount = 90;
    state.resources.stone.amount = 60;
    state.resources.science.amount = 80;
    if (mode === "transition" || mode === "bronze" || mode === "industrial" || mode === "information" || mode === "space" || mode === "prestige") {
      state.researchedTechs = ["basic_tools", "foraging", "logging", "masonry", "animal_husbandry", "agriculture"];
      state.unlockedEras = ["stone", "bronze"];
      state.resources.wood.amount = 90;
      state.resources.stone.amount = 90;
      state.resources.science.amount = 240;
    }
    if (mode === "bronze" || mode === "industrial" || mode === "information" || mode === "space" || mode === "prestige") {
      state.era = "bronze";
      state.researchedTechs.push("smelting");
      state.unlockedConverters = ["copper_smelter"];
    }
    if (mode === "industrial" || mode === "information" || mode === "space" || mode === "prestige") {
      state.era = "industrial";
      state.unlockedEras = ["stone", "bronze", "industrial"];
      state.researchedTechs.push(
        "bronze_working", "iron_working", "writing", "steam_power", "coal_geology",
        "steel_furnace", "steam_engine", "electrification", "conveyor_belts", "factory_priority"
      );
      state.unlockedConverters = [
        "copper_smelter", "bronze_foundry", "iron_forge", "steel_mill", "steam_generator", "machine_factory",
      ];
      state.resources.science.amount = 6_500;
      state.resources.science.cap = 8_000;
      state.resources.iron.amount = 180;
      state.resources.coal.amount = 240;
      state.resources.coal.cap = 400;
      state.resources.steel.amount = 120;
      state.resources.steel.cap = 300;
      state.resources.machinery.amount = 40;
      state.resources.copper.amount = 160;
      state.resources.wood.amount = 180;
      state.resources.wood.cap = 300;
      state.resources.stone.amount = 180;
      state.resources.stone.cap = 300;
      state.converters.copper_smelter = { count: 1, enabled: true, priority: 3 };
      state.converters.bronze_foundry = { count: 1, enabled: true, priority: 3 };
      state.converters.iron_forge = { count: 1, enabled: true, priority: 2 };
      state.converters.steel_mill = { count: 1, enabled: true, priority: 2 };
      state.converters.steam_generator = { count: 2, enabled: true, priority: 1 };
      state.converters.machine_factory = { count: 1, enabled: true, priority: 1 };
      state.buildings.coal_mine = 1;
      state.buildings.power_station = 1;
      state.buildings.industrial_institute = 1;
    }
    if (mode === "information" || mode === "space" || mode === "prestige") {
      state.era = "information";
      state.unlockedEras = ["stone", "bronze", "industrial", "information"];
      state.industrialCompleted = true;
      state.researchedTechs.push(
        "efficient_generator", "factory_automation", "circuitry", "computing", "networking", "databases", "job_scheduling"
      );
      state.unlockedConverters.push("circuit_assembler", "data_center", "digital_lab");
      state.resources.science.amount = 24_000;
      state.resources.science.cap = 40_000;
      state.resources.copper.amount = 260;
      state.resources.copper.cap = 400;
      state.resources.steel.amount = 260;
      state.resources.machinery.amount = 260;
      state.resources.machinery.cap = 400;
      state.resources.circuits.amount = 120;
      state.resources.data.amount = 180;
      state.resources.data.cap = 900;
      state.converters.circuit_assembler = { count: 2, enabled: true, priority: 2 };
      state.converters.data_center = { count: 2, enabled: true, priority: 1 };
      state.converters.digital_lab = { count: 1, enabled: true, priority: 2 };
      state.converters.steam_generator = { count: 5, enabled: true, priority: 1 };
      state.buildings.electronics_warehouse = 1;
      state.buildings.network_station = 1;
      state.buildings.scheduler_center = 1;
      state.automationRules = ["prioritize_data_center"];
    }
    if (mode === "space" || mode === "prestige") {
      state.era = "space";
      state.unlockedEras = ["stone", "bronze", "industrial", "information", "space"];
      state.informationCompleted = true;
      state.researchedTechs.push(
        "computational_simulation", "telecommunications", "space_science", "lightweight_materials",
        "propulsion_systems", "navigation_systems", "life_support"
      );
      state.unlockedConverters.push("space_material_plant", "rocket_fuel_refinery", "orbital_shipyard");
      state.resources.science.amount = 70_000;
      state.resources.science.cap = 100_000;
      state.resources.food.amount = 500;
      state.resources.food.cap = 700;
      state.resources.bronze.amount = 400;
      state.resources.bronze.cap = 500;
      state.resources.steel.amount = 600;
      state.resources.steel.cap = 800;
      state.resources.coal.amount = 600;
      state.resources.coal.cap = 800;
      state.resources.circuits.amount = 500;
      state.resources.circuits.cap = 800;
      state.resources.data.amount = 800;
      state.resources.data.cap = 1_200;
      state.resources.advanced_alloy.amount = 600;
      state.resources.advanced_alloy.cap = 800;
      state.resources.rocket_fuel.amount = 700;
      state.resources.rocket_fuel.cap = 1_000;
      state.resources.ship_parts.amount = 500;
      state.resources.ship_parts.cap = 700;
      state.converters.space_material_plant = { count: 2, enabled: true, priority: 2 };
      state.converters.rocket_fuel_refinery = { count: 2, enabled: true, priority: 2 };
      state.converters.orbital_shipyard = { count: 2, enabled: true, priority: 1 };
      state.buildings.space_warehouse = 1;
      state.buildings.test_center = 1;
      state.spaceProjectStage = 2;
    }
    if (mode === "prestige") {
      state.researchedTechs.push("spacecraft_testing", "evacuation");
      state.spaceProjectStage = 4;
      state.spaceCompleted = true;
      state.runStartedAt = Date.now() - 500 * 60 * 60 * 1_000;
      state.permanentRewards = { abundant_harvest: 1, research_archive: 2, founder_stockpile: 0, efficient_industry: 1 };
    }
    return state;
  });
  const offlineSummary = mode === "offline" ? {
    requestedElapsedMs: 80 * 60 * 60 * 1_000,
    simulatedElapsedMs: 72 * 60 * 60 * 1_000,
    discardedElapsedMs: 8 * 60 * 60 * 1_000,
    clockAdjusted: false,
    resourceDeltas: { food: 36, population: 0, wood: 72, stone: 18, science: 12, copper: 0, bronze: 0, iron: 0, coal: 0, steel: 0, electricity: 0, machinery: 0, circuits: 0, data: 0, compute: 0, advanced_alloy: 0, rocket_fuel: 0, ship_parts: 0 },
  } : undefined;
  return <CivilizationGame previewState={initialState} previewOfflineSummary={offlineSummary} />;
}
