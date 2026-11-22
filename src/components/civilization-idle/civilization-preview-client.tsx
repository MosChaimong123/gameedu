"use client";

import { useState } from "react";
import { createInitialCivilizationState } from "@/lib/civilization-idle";
import { CivilizationGame } from "./civilization-game";

export function CivilizationPreviewClient({ mode = "stone" }: { mode?: "stone" | "transition" | "bronze" | "offline" }) {
  const [initialState] = useState(() => {
    const state = createInitialCivilizationState(Date.now());
    state.resources.wood.amount = 90;
    state.resources.stone.amount = 60;
    state.resources.science.amount = 80;
    if (mode === "transition" || mode === "bronze") {
      state.researchedTechs = ["basic_tools", "foraging", "logging", "masonry", "animal_husbandry", "agriculture"];
      state.unlockedEras = ["stone", "bronze"];
      state.resources.wood.amount = 90;
      state.resources.stone.amount = 90;
      state.resources.science.amount = 240;
    }
    if (mode === "bronze") {
      state.era = "bronze";
      state.researchedTechs.push("smelting");
      state.unlockedConverters = ["copper_smelter"];
    }
    return state;
  });
  const offlineSummary = mode === "offline" ? {
    requestedElapsedMs: 9 * 60 * 60 * 1_000,
    simulatedElapsedMs: 8 * 60 * 60 * 1_000,
    discardedElapsedMs: 60 * 60 * 1_000,
    clockAdjusted: false,
    resourceDeltas: { food: 36, population: 0, wood: 72, stone: 18, science: 12, copper: 0, bronze: 0, iron: 0 },
  } : undefined;
  return <CivilizationGame previewState={initialState} previewOfflineSummary={offlineSummary} />;
}
