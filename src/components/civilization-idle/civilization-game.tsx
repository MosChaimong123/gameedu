"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Apple,
  ArrowLeft,
  Axe,
  BookOpen,
  Brain,
  Cog,
  Check,
  Cherry,
  CircleDot,
  CircuitBoard,
  Clock3,
  Factory,
  Database,
  Flame,
  FlaskConical,
  Hammer,
  House,
  LoaderCircle,
  Network,
  Minus,
  Pickaxe,
  Plus,
  ScrollText,
  Server,
  Sparkles,
  Sprout,
  TentTree,
  Trees,
  Users,
  Warehouse,
  WifiOff,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/components/providers/language-provider";
import {
  CIVILIZATION_ACTIONS,
  CIVILIZATION_BUILDINGS,
  CIVILIZATION_CONVERTERS,
  CIVILIZATION_JOBS,
  CIVILIZATION_MAX_ACTION_LEVEL,
  CIVILIZATION_MAX_CONVERTER_LEVEL,
  CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL,
  CIVILIZATION_REPEATABLE_RESEARCH,
  CIVILIZATION_TECHS,
  canCompleteCivilizationBronze,
  canCompleteCivilizationIndustrial,
  canCompleteCivilizationInformation,
  getCivilizationActionCooldownMs,
  getCivilizationActionReward,
  getCivilizationActionUpgradeCost,
  getCivilizationBuildingCost,
  getCivilizationConverterCost,
  getCivilizationConverterPowerDemand,
  getCivilizationConverterRates,
  getCivilizationBottlenecks,
  getCivilizationJobMasteryLevel,
  getCivilizationMilestones,
  getNextCivilizationMilestone,
  getCivilizationPopulationGrowthStatus,
  getCivilizationRepeatableResearchCost,
  getCivilizationResourceFlows,
  getCivilizationPowerStatus,
  getCivilizationComputeStatus,
  getCivilizationAutomationSlots,
  getCivilizationSpaceProjectStageRequirements,
  getCivilizationWorkerProductionRate,
  type CivilizationActionId,
  type CivilizationAutomationRuleId,
  type CivilizationBuildingId,
  type CivilizationCommand,
  type CivilizationConverterId,
  type CivilizationEngineEvent,
  type CivilizationJobId,
  type CivilizationPolicyId,
  type CivilizationPermanentRewardId,
  type CivilizationRepeatableResearchId,
  type CivilizationResourceId,
  type CivilizationState,
  type CivilizationTechId,
} from "@/lib/civilization-idle";
import { cn } from "@/lib/utils";
import {
  civilizationActionNames,
  civilizationAutomationRuleNames,
  civilizationBuildingNames,
  civilizationConverterNames,
  civilizationErrorNames,
  civilizationJobNames,
  civilizationMilestoneNames,
  civilizationPermanentRewardBenefits,
  civilizationPermanentRewardNames,
  civilizationPolicyBenefits,
  civilizationPolicyNames,
  civilizationRepeatableResearchBenefits,
  civilizationRepeatableResearchNames,
  civilizationResourceNames,
  civilizationTechNames,
  civilizationTechBenefits,
  getCivilizationCopy,
} from "./civilization-copy";
import {
  useCivilizationGame,
  type CivilizationSimulationSummary,
} from "./use-civilization-game";

type GameTab = "actions" | "buildings" | "workers" | "research" | "converters";

const STONE_RESOURCES: CivilizationResourceId[] = [
  "food",
  "population",
  "wood",
  "stone",
  "science",
];
const STONE_ACTIONS: CivilizationActionId[] = ["gather_fruit", "chop_wood", "mine_stone"];
const STONE_BUILDINGS: CivilizationBuildingId[] = [
  "shelter",
  "granary",
  "stockpile",
  "hunting_ground",
  "stone_mine",
  "storytelling_circle",
];
const STONE_JOBS: CivilizationJobId[] = [
  "forager",
  "woodcutter",
  "hunter",
  "miner",
  "scientist",
];
const STONE_TECHS: CivilizationTechId[] = [
  "basic_tools",
  "foraging",
  "logging",
  "masonry",
  "animal_husbandry",
  "agriculture",
];
const BRONZE_RESOURCES: CivilizationResourceId[] = ["copper", "bronze", "iron"];
const BRONZE_ACTIONS: CivilizationActionId[] = ["pan_copper", "forge_iron"];
const BRONZE_BUILDINGS: CivilizationBuildingId[] = ["clay_brick_house", "metal_warehouse"];
const BRONZE_TECHS: CivilizationTechId[] = [
  "smelting",
  "bronze_working",
  "iron_working",
  "writing",
  "steam_power",
];
const BRONZE_CONVERTERS: CivilizationConverterId[] = [
  "copper_smelter",
  "bronze_foundry",
  "iron_forge",
];
const INDUSTRIAL_RESOURCES: CivilizationResourceId[] = ["coal", "steel", "electricity", "machinery"];
const INDUSTRIAL_ACTIONS: CivilizationActionId[] = ["mine_coal"];
const INDUSTRIAL_BUILDINGS: CivilizationBuildingId[] = [
  "coal_mine",
  "worker_housing",
  "industrial_warehouse",
  "power_station",
  "industrial_institute",
];
const INDUSTRIAL_JOBS: CivilizationJobId[] = ["coal_miner"];
const INDUSTRIAL_TECHS: CivilizationTechId[] = [
  "coal_geology",
  "steel_furnace",
  "steam_engine",
  "electrification",
  "conveyor_belts",
  "factory_priority",
  "efficient_generator",
  "factory_automation",
];
const INDUSTRIAL_CONVERTERS: CivilizationConverterId[] = ["steel_mill", "steam_generator", "machine_factory"];
const INFORMATION_RESOURCES: CivilizationResourceId[] = ["circuits", "data", "compute"];
const INFORMATION_ACTIONS: CivilizationActionId[] = ["audit_system"];
const INFORMATION_BUILDINGS: CivilizationBuildingId[] = ["electronics_warehouse", "network_station", "scheduler_center"];
const INFORMATION_TECHS: CivilizationTechId[] = ["circuitry", "computing", "networking", "databases", "job_scheduling", "computational_simulation", "telecommunications", "space_science"];
const INFORMATION_CONVERTERS: CivilizationConverterId[] = ["circuit_assembler", "data_center", "digital_lab"];
const SPACE_RESOURCES: CivilizationResourceId[] = ["advanced_alloy", "rocket_fuel", "ship_parts"];
const SPACE_BUILDINGS: CivilizationBuildingId[] = ["space_warehouse", "test_center", "evacuation_port"];
const SPACE_TECHS: CivilizationTechId[] = ["lightweight_materials", "propulsion_systems", "navigation_systems", "life_support", "spacecraft_testing", "evacuation"];
const SPACE_CONVERTERS: CivilizationConverterId[] = ["space_material_plant", "rocket_fuel_refinery", "orbital_shipyard"];
const AUTOMATION_RULES: CivilizationAutomationRuleId[] = ["protect_copper", "protect_steel", "prioritize_data_center"];
const POLICIES: CivilizationPolicyId[] = ["balanced", "sustenance", "scholarship", "industry"];
const REPEATABLE_RESEARCH: CivilizationRepeatableResearchId[] = [
  "food_storage",
  "labor_organization",
  "precision_casting",
  "metal_reserves",
  "fuel_efficiency",
  "machine_efficiency",
  "data_compression",
  "computer_efficiency",
  "material_efficiency",
  "propulsion_efficiency",
];

const resourceIcons: Record<CivilizationResourceId, LucideIcon> = {
  food: Apple,
  population: Users,
  wood: Trees,
  stone: CircleDot,
  science: FlaskConical,
  copper: CircleDot,
  bronze: CircleDot,
  iron: CircleDot,
  coal: Flame,
  steel: Hammer,
  electricity: Zap,
  machinery: Cog,
  circuits: CircuitBoard,
  data: Database,
  compute: Server,
  advanced_alloy: Hammer,
  rocket_fuel: Flame,
  ship_parts: Cog,
};
const actionIcons: Record<CivilizationActionId, LucideIcon> = {
  gather_fruit: Cherry,
  chop_wood: Axe,
  mine_stone: Pickaxe,
  pan_copper: CircleDot,
  forge_iron: Hammer,
  mine_coal: Pickaxe,
  audit_system: Network,
};
const buildingIcons: Record<CivilizationBuildingId, LucideIcon> = {
  shelter: TentTree,
  granary: Wheat,
  stockpile: Trees,
  hunting_ground: Sprout,
  stone_mine: Pickaxe,
  storytelling_circle: ScrollText,
  clay_brick_house: House,
  metal_warehouse: Hammer,
  coal_mine: Pickaxe,
  worker_housing: House,
  industrial_warehouse: Warehouse,
  power_station: Zap,
  industrial_institute: Factory,
  electronics_warehouse: CircuitBoard,
  network_station: Network,
  scheduler_center: Server,
  space_warehouse: Warehouse,
  test_center: FlaskConical,
  evacuation_port: Factory,
};

function formatAmount(value: number) {
  if (value >= 1_000) return new Intl.NumberFormat("en", { maximumFractionDigits: 1, notation: "compact" }).format(value);
  return new Intl.NumberFormat("en", { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value);
}

function canAfford(state: CivilizationState, costs: Array<{ resource: CivilizationResourceId; amount: number }>) {
  return costs.every((cost) => state.resources[cost.resource].amount >= cost.amount);
}

function CostLine({
  state,
  costs,
  language,
}: {
  state: CivilizationState;
  costs: Array<{ resource: CivilizationResourceId; amount: number }>;
  language: "th" | "en";
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
      {costs.map((cost) => (
        <span
          key={cost.resource}
          className={state.resources[cost.resource].amount >= cost.amount ? "text-emerald-700" : "text-rose-600"}
        >
          {civilizationResourceNames[language][cost.resource]} {formatAmount(cost.amount)}
        </span>
      ))}
    </div>
  );
}

function ResourceRail({ state, language }: { state: CivilizationState; language: "th" | "en" }) {
  const text = getCivilizationCopy(language);
  const resources = state.era === "space"
    ? [...STONE_RESOURCES, ...BRONZE_RESOURCES, ...INDUSTRIAL_RESOURCES, ...INFORMATION_RESOURCES, ...SPACE_RESOURCES]
    : state.era === "information"
    ? [...STONE_RESOURCES, ...BRONZE_RESOURCES, ...INDUSTRIAL_RESOURCES, ...INFORMATION_RESOURCES]
    : state.era === "industrial"
    ? [...STONE_RESOURCES, ...BRONZE_RESOURCES, ...INDUSTRIAL_RESOURCES]
    : state.era === "bronze"
      ? [...STONE_RESOURCES, ...BRONZE_RESOURCES]
      : STONE_RESOURCES;
  const flows = getCivilizationResourceFlows(state);
  const bottlenecks = getCivilizationBottlenecks(state).slice(0, 2);
  return (
    <aside className="min-w-0 max-w-full overflow-hidden border-b border-stone-200 bg-[#f7f4eb] lg:border-b-0 lg:border-r">
      {bottlenecks.length > 0 ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-900">
          <p className="mb-1 uppercase text-amber-700">{text.bottleneck}</p>
          {bottlenecks.map((item, index) => {
            const message = item.type === "STARVING"
              ? text.starving
              : item.type === "RESOURCE_FULL"
              ? `${civilizationResourceNames[language][item.resource]}: ${text.storageFull}`
              : item.type === "CONVERTER_INPUT"
                ? `${civilizationConverterNames[language][item.converterId]}: ${text.converterNeeds} ${civilizationResourceNames[language][item.resource]}`
                : item.type === "CONVERTER_OUTPUT"
                  ? `${civilizationConverterNames[language][item.converterId]}: ${text.converterOutputFull} ${civilizationResourceNames[language][item.resource]}`
                  : item.type === "POWER_SHORTAGE"
                    ? `${civilizationConverterNames[language][item.converterId]}: ${text.powerShortage}`
                    : item.type === "COMPUTE_SHORTAGE"
                      ? `${civilizationConverterNames[language][item.converterId]}: ${text.computeShortage}`
                      : `${civilizationConverterNames[language][item.converterId]}: ${text.automationPaused}`;
            return <p key={`${item.type}-${index}`} className="truncate">{message}</p>;
          })}
        </div>
      ) : null}
      <div className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:space-y-0 lg:px-4 lg:py-5">
        {resources.map((id) => {
          const resource = state.resources[id];
          const Icon = resourceIcons[id];
          const percent = Math.min(100, (resource.amount / Math.max(1, resource.cap)) * 100);
          const netRate = flows[id].netPerSecond;
          return (
            <div
              key={id}
              className="min-w-36 snap-start border-r border-stone-200 px-3 py-2 last:border-r-0 lg:min-w-0 lg:border-b lg:border-r-0 lg:px-1 lg:py-4"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-xs font-bold text-stone-600">
                  <Icon className="h-4 w-4 text-emerald-700" />
                  {civilizationResourceNames[language][id]}
                </span>
                <span className="font-mono text-sm font-black text-stone-900">
                  {formatAmount(resource.amount)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden bg-stone-200">
                <div className="h-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px]">
                <span className={netRate > 0.0001 ? "text-emerald-700" : netRate < -0.0001 ? "text-rose-700" : "text-stone-400"}>
                  {text.netRate} {netRate > 0.0001 ? "+" : ""}{formatAmount(netRate)}/s
                </span>
                <span className="text-stone-400">/ {formatAmount(resource.cap)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function MilestoneStrip({ state, language }: { state: CivilizationState; language: "th" | "en" }) {
  const text = getCivilizationCopy(language);
  const milestones = getCivilizationMilestones(state);
  const completed = milestones.filter((item) => item.completed).length;
  const next = getNextCivilizationMilestone(state);
  return (
    <section className="border-b border-stone-200 bg-emerald-50 px-4 py-3 sm:px-6" aria-label={text.milestones}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-emerald-950">{text.milestones} {completed}/{milestones.length}</p>
        <p className="text-xs font-bold text-emerald-800">
          {next ? `${text.nextGoal}: ${civilizationMilestoneNames[language][next.id]}` : state.era === "space" ? text.currentSpaceComplete : state.era === "information" ? text.currentInformationComplete : state.era === "industrial" ? text.currentIndustrialComplete : text.currentContentComplete}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden bg-emerald-100">
        <div className="h-full bg-emerald-700 transition-[width]" style={{ width: `${(completed / milestones.length) * 100}%` }} />
      </div>
    </section>
  );
}

function ActionsPanel({
  state,
  nowMs,
  busy,
  language,
  onCommand,
}: {
  state: CivilizationState;
  nowMs: number;
  busy: boolean;
  language: "th" | "en";
  onCommand: (command: CivilizationCommand) => void;
}) {
  const text = getCivilizationCopy(language);
  const actions = state.era === "space"
    ? [...STONE_ACTIONS, ...BRONZE_ACTIONS, ...INDUSTRIAL_ACTIONS, ...INFORMATION_ACTIONS]
    : state.era === "information"
    ? [...STONE_ACTIONS, ...BRONZE_ACTIONS, ...INDUSTRIAL_ACTIONS, ...INFORMATION_ACTIONS]
    : state.era === "industrial"
    ? [...STONE_ACTIONS, ...BRONZE_ACTIONS, ...INDUSTRIAL_ACTIONS]
    : state.era === "bronze" ? [...STONE_ACTIONS, ...BRONZE_ACTIONS] : STONE_ACTIONS;
  return (
    <section aria-labelledby="actions-title">
      <div className="mb-4">
        <h2 id="actions-title" className="text-lg font-black text-stone-900">{text.manualActions}</h2>
        <p className="text-xs font-medium text-stone-500">{text.manualActionsHint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((id) => {
          const Icon = actionIcons[id];
          const active = state.activeActions[id];
          const remaining = active ? Math.max(0, active.readyAt - nowMs) : 0;
          const level = state.actionLevels[id];
          const upgradeCost = getCivilizationActionUpgradeCost(state, id);
          return (
            <article key={id} className="relative overflow-hidden border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-stone-500">{text.level} {level}/{CIVILIZATION_MAX_ACTION_LEVEL}</span>
              </div>
              <h3 className="mt-3 text-sm font-black text-stone-900">{civilizationActionNames[language][id]}</h3>
              <p className="mt-1 text-xs text-stone-500">
                +{formatAmount(getCivilizationActionReward(state, id))} {civilizationResourceNames[language][CIVILIZATION_ACTIONS[id].reward.resource]}
              </p>
              <button
                type="button"
                data-testid={`action-start-${id}`}
                disabled={busy || Boolean(active) || (id === "audit_system" && state.buildings.network_station <= 0)}
                onClick={() => onCommand({ type: "START_ACTION", actionId: id })}
                className="mt-4 h-10 w-full bg-emerald-700 px-3 text-sm font-black text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {active ? `${text.working} ${Math.ceil(remaining / 1000)}s` : text.gather}
              </button>
              <button
                type="button"
                data-testid={`action-upgrade-${id}`}
                disabled={busy || level >= CIVILIZATION_MAX_ACTION_LEVEL || !canAfford(state, [upgradeCost])}
                onClick={() => onCommand({ type: "UPGRADE_ACTION", actionId: id })}
                className="mt-2 h-9 w-full border border-stone-300 bg-white px-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {level >= CIVILIZATION_MAX_ACTION_LEVEL ? text.max : `${text.upgrade} · ${civilizationResourceNames[language][upgradeCost.resource]} ${formatAmount(upgradeCost.amount)}`}
              </button>
              {active ? (
                <div className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-[width]" style={{ width: `${Math.max(0, 100 - (remaining / getCivilizationActionCooldownMs(state, id)) * 100)}%` }} />
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BuildingsPanel({ state, busy, language, onCommand }: { state: CivilizationState; busy: boolean; language: "th" | "en"; onCommand: (command: CivilizationCommand) => void }) {
  const text = getCivilizationCopy(language);
  const buildings = state.era === "space"
    ? [...STONE_BUILDINGS, ...BRONZE_BUILDINGS, ...INDUSTRIAL_BUILDINGS, ...INFORMATION_BUILDINGS, ...SPACE_BUILDINGS]
    : state.era === "information"
    ? [...STONE_BUILDINGS, ...BRONZE_BUILDINGS, ...INDUSTRIAL_BUILDINGS, ...INFORMATION_BUILDINGS]
    : state.era === "industrial"
    ? [...STONE_BUILDINGS, ...BRONZE_BUILDINGS, ...INDUSTRIAL_BUILDINGS]
    : state.era === "bronze" ? [...STONE_BUILDINGS, ...BRONZE_BUILDINGS] : STONE_BUILDINGS;
  return (
    <section aria-labelledby="buildings-title">
      <h2 id="buildings-title" className="mb-4 text-lg font-black text-stone-900">{text.buildTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {buildings.map((id) => {
          const Icon = buildingIcons[id];
          const count = state.buildings[id];
          const definition = CIVILIZATION_BUILDINGS[id];
          const costs = getCivilizationBuildingCost(state, id);
          const atMax = definition.maxCount != null && count >= definition.maxCount;
          return (
            <article key={id} className="flex min-h-40 flex-col border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-amber-50 text-amber-700"><Icon className="h-5 w-5" /></div>
                <span className="font-mono text-xs font-black text-stone-500">×{count}</span>
              </div>
              <h3 className="mt-3 text-sm font-black text-stone-900">{civilizationBuildingNames[language][id]}</h3>
              <div className="mt-1"><CostLine state={state} costs={costs} language={language} /></div>
              <button
                type="button"
                data-testid={`building-build-${id}`}
                disabled={busy || atMax || !canAfford(state, costs)}
                onClick={() => onCommand({ type: "BUY_BUILDING", buildingId: id })}
                className="mt-auto h-9 bg-stone-900 px-3 text-xs font-black text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {atMax ? text.max : text.build}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function WorkersPanel({ state, busy, language, onCommand }: { state: CivilizationState; busy: boolean; language: "th" | "en"; onCommand: (command: CivilizationCommand) => void }) {
  const text = getCivilizationCopy(language);
  const jobs = state.era === "industrial" || state.era === "information" || state.era === "space" ? [...STONE_JOBS, ...INDUSTRIAL_JOBS] : STONE_JOBS;
  const populationGrowth = getCivilizationPopulationGrowthStatus(state);
  const populationProgress = Math.round(populationGrowth.progressRatio * 100);
  return (
    <section aria-labelledby="workers-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id="workers-title" className="text-lg font-black text-stone-900">{text.workersTitle}</h2>
        <p className="text-sm font-black text-emerald-700">{text.idle} {state.idleWorkers}</p>
      </div>
      <div className={cn(
        "mb-5 border-y px-4 py-4",
        populationGrowth.atCap
          ? "border-amber-300 bg-amber-50"
          : populationGrowth.foodReady
            ? "border-emerald-300 bg-emerald-50"
            : "border-rose-300 bg-rose-50"
      )}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-stone-900">
              <Users className="h-4 w-4" />
              {text.populationGrowthTitle}
            </h3>
            <p className={cn(
              "mt-1 text-xs font-bold",
              populationGrowth.atCap
                ? "text-amber-800"
                : populationGrowth.foodReady ? "text-emerald-800" : "text-rose-800"
            )}>
              {populationGrowth.atCap
                ? text.populationGrowthAtCap
                : populationGrowth.foodReady
                  ? text.populationGrowthReady
                  : text.populationGrowthBlocked}
            </p>
          </div>
          <span className="font-mono text-sm font-black text-stone-800">
            {formatAmount(state.resources.population.amount)} / {formatAmount(state.resources.population.cap)}
          </span>
        </div>
        {!populationGrowth.atCap ? (
          <>
            <div className="mt-3 h-2 overflow-hidden bg-white/80" aria-label={`${text.populationGrowthTitle} ${populationProgress}%`}>
              <div
                className={cn("h-full", populationGrowth.foodReady ? "bg-emerald-600" : "bg-rose-600")}
                style={{ width: `${populationProgress}%` }}
              />
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <p className="text-stone-700">
                {text.populationGrowthRequirement}: <strong className="font-mono">{formatAmount(populationGrowth.foodProductionPerSecond)} / {formatAmount(populationGrowth.requiredFoodProductionPerSecond)}/s</strong>
              </p>
              <p className="text-stone-700 sm:text-right">
                {text.populationGrowthInterval}: <strong className="font-mono">{formatAmount(populationGrowth.growthIntervalMs / 1_000)}s</strong>
              </p>
            </div>
          </>
        ) : null}
      </div>
      <div className="mb-5 border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-black text-stone-900">{text.cityPolicy}</h3>
        <p className="mt-1 text-xs text-stone-500">{text.policyHint}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {POLICIES.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`policy-${id}`}
              disabled={busy || state.policy.id === id}
              onClick={() => onCommand({ type: "SET_POLICY", policyId: id })}
              className={cn("min-h-20 border p-3 text-left disabled:cursor-default", state.policy.id === id ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white hover:bg-stone-50")}
            >
              <span className="block text-xs font-black text-stone-900">{civilizationPolicyNames[language][id]}</span>
              <span className="mt-1 block text-[11px] leading-4 text-stone-500">{civilizationPolicyBenefits[language][id]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
        {jobs.map((id) => {
          const job = CIVILIZATION_JOBS[id];
          const unlocked = !job.buildingRequired || state.buildings[job.buildingRequired] > 0;
          const perWorkerRate = getCivilizationWorkerProductionRate(state, id, 1);
          const totalRate = getCivilizationWorkerProductionRate(state, id);
          const masteryLevel = getCivilizationJobMasteryLevel(state, id);
          return (
            <div key={id} className="flex min-h-20 items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-stone-900">{civilizationJobNames[language][id]}</h3>
                <p className="mt-1 text-xs text-stone-500">
                  {unlocked
                    ? `+${formatAmount(perWorkerRate)}/s ${civilizationResourceNames[language][job.produces]} ${text.perWorker} · ${text.total} +${formatAmount(totalRate)}/s`
                    : `${text.requires}: ${civilizationBuildingNames[language][job.buildingRequired!]}`}
                </p>
                <p className="mt-1 text-[11px] font-bold text-amber-700">{text.mastery} {masteryLevel}/10</p>
              </div>
              <div className="flex h-10 shrink-0 items-center border border-stone-300">
                <button type="button" data-testid={`worker-remove-${id}`} aria-label={`Remove ${id}`} disabled={busy || state.workers[id] <= 0} onClick={() => onCommand({ type: "ASSIGN_WORKER", jobId: id, delta: -1 })} className="flex h-full w-10 items-center justify-center hover:bg-stone-100 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                <span className="flex h-full min-w-10 items-center justify-center border-x border-stone-300 font-mono text-sm font-black">{state.workers[id]}</span>
                <button type="button" data-testid={`worker-add-${id}`} aria-label={`Add ${id}`} disabled={busy || !unlocked || state.idleWorkers <= 0} onClick={() => onCommand({ type: "ASSIGN_WORKER", jobId: id, delta: 1 })} className="flex h-full w-10 items-center justify-center hover:bg-stone-100 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResearchPanel({ state, busy, language, onCommand }: { state: CivilizationState; busy: boolean; language: "th" | "en"; onCommand: (command: CivilizationCommand) => void }) {
  const text = getCivilizationCopy(language);
  const techs = state.era === "space"
    ? [...STONE_TECHS, ...BRONZE_TECHS, ...INDUSTRIAL_TECHS, ...INFORMATION_TECHS, ...SPACE_TECHS]
    : state.era === "information"
    ? [...STONE_TECHS, ...BRONZE_TECHS, ...INDUSTRIAL_TECHS, ...INFORMATION_TECHS]
    : state.era === "industrial"
    ? [...STONE_TECHS, ...BRONZE_TECHS, ...INDUSTRIAL_TECHS]
    : state.era === "bronze" ? [...STONE_TECHS, ...BRONZE_TECHS] : STONE_TECHS;
  return (
    <section aria-labelledby="research-title">
      <h2 id="research-title" className="mb-4 text-lg font-black text-stone-900">{text.researchTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {techs.map((id) => {
          const tech = CIVILIZATION_TECHS[id];
          const complete = state.researchedTechs.includes(id);
          const prerequisitesMet = tech.prerequisites.every((item) => state.researchedTechs.includes(item));
          const affordable = state.resources.science.amount >= tech.scienceCost;
          const completionRequirementsMet = id === "steam_power"
            ? canCompleteCivilizationBronze(state)
            : id === "factory_automation" ? canCompleteCivilizationIndustrial(state)
            : id === "space_science" ? canCompleteCivilizationInformation(state) : true;
          return (
            <article key={id} className={cn("flex min-h-52 flex-col border p-4", complete ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-9 w-9 items-center justify-center bg-stone-100 text-stone-700">{complete ? <Check className="h-5 w-5 text-emerald-700" /> : <Brain className="h-5 w-5" />}</div>
                <span className="font-mono text-xs font-black text-cyan-700">{tech.scienceCost} {civilizationResourceNames[language].science}</span>
              </div>
              <h3 className="mt-3 text-sm font-black text-stone-900">{civilizationTechNames[language][id]}</h3>
              <p className="mt-2 text-xs font-bold text-emerald-800">
                {text.benefit}: {civilizationTechBenefits[language][id]}
              </p>
              {tech.prerequisites.length > 0 ? (
                <p className="mt-1 text-xs text-stone-500">{text.requires}: {tech.prerequisites.map((item) => civilizationTechNames[language][item]).join(", ")}</p>
              ) : <div className="h-5" />}
              {id === "steam_power" ? <p className="mt-1 text-xs font-bold text-amber-700">{text.bronzeRequirements}</p> : null}
              {id === "factory_automation" ? <p className="mt-1 text-xs font-bold text-amber-700">{text.industrialRequirements}</p> : null}
              {id === "space_science" ? <p className="mt-1 text-xs font-bold text-amber-700">{text.informationRequirements}</p> : null}
              <button type="button" data-testid={`research-${id}`} disabled={busy || complete || !prerequisitesMet || !affordable || !completionRequirementsMet} onClick={() => onCommand({ type: "BUY_RESEARCH", techId: id })} className="mt-auto h-9 w-full bg-cyan-800 px-3 text-xs font-black text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:bg-stone-300">
                {complete ? text.completed : prerequisitesMet ? text.researchNow : text.locked}
              </button>
            </article>
          );
        })}
      </div>
      <h3 className="mb-3 mt-6 text-base font-black text-stone-900">{text.repeatableResearch}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {REPEATABLE_RESEARCH.map((id) => {
          const definition = CIVILIZATION_REPEATABLE_RESEARCH[id];
          const level = state.researchLevels[id];
          const eraAvailable = definition.era === "stone" || state.era === definition.era ||
            (state.era === "industrial" && definition.era !== "information" && definition.era !== "space") ||
            (state.era === "information" && definition.era !== "space") || state.era === "space";
          const unlocked = state.researchedTechs.includes(definition.prerequisite) && eraAvailable;
          const cost = getCivilizationRepeatableResearchCost(state, id);
          const atMax = level >= definition.maxLevel;
          return (
            <article key={id} className="flex min-h-40 flex-col border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-black text-stone-900">{civilizationRepeatableResearchNames[language][id]}</h4>
                <span className="font-mono text-xs font-black text-cyan-700">{text.level} {level}/{definition.maxLevel}</span>
              </div>
              <p className="mt-2 text-xs text-emerald-800">{civilizationRepeatableResearchBenefits[language][id]}</p>
              <button type="button" data-testid={`repeatable-research-${id}`} disabled={busy || !unlocked || atMax || state.resources.science.amount < cost} onClick={() => onCommand({ type: "BUY_REPEATABLE_RESEARCH", researchId: id })} className="mt-auto h-9 bg-cyan-800 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-stone-300">
                {atMax ? text.max : unlocked ? `${text.researchNow} · ${cost} ${civilizationResourceNames[language].science}` : text.locked}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SpaceProjectPanel({ state, busy, language, onCommand }: { state: CivilizationState; busy: boolean; language: "th" | "en"; onCommand: (command: CivilizationCommand) => void }) {
  const text = getCivilizationCopy(language);
  const stageNames = language === "th"
    ? ["โครงยาน", "ระบบขับดัน", "ระบบยังชีพ", "เตรียมอพยพ"]
    : ["Ship frame", "Propulsion", "Life support", "Evacuation readiness"];

  return (
    <section className="mb-6 border border-sky-300 bg-sky-50 p-4 sm:p-5" aria-labelledby="space-project-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="space-project-title" className="text-base font-black text-sky-950">{text.spaceProjectTitle}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-sky-900/75">{text.spaceProjectBody}</p>
        </div>
        <span className="border border-sky-300 bg-white px-3 py-1 font-mono text-xs font-black text-sky-900">
          {text.spaceProjectStage} {state.spaceProjectStage}/4
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {([1, 2, 3, 4] as const).map((stage) => {
          const requirements = getCivilizationSpaceProjectStageRequirements(state, stage);
          const complete = state.spaceProjectStage >= stage;
          const ready = requirements.isNextStage && requirements.techReady && requirements.testCenterReady &&
            requirements.evacuationPortReady && requirements.powerReady && requirements.computeReady &&
            canAfford(state, requirements.costs);
          return (
            <article key={stage} className={cn("flex min-h-52 flex-col border p-3", complete ? "border-emerald-300 bg-emerald-50" : requirements.isNextStage ? "border-sky-500 bg-white" : "border-stone-200 bg-stone-100") }>
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center bg-sky-100 font-mono text-xs font-black text-sky-900">{stage}</span>
                {complete ? <Check className="h-5 w-5 text-emerald-700" /> : null}
              </div>
              <h4 className="mt-3 text-sm font-black text-stone-900">{stageNames[stage - 1]}</h4>
              <p className="mt-1 text-xs text-stone-500">{text.requires}: {civilizationTechNames[language][["lightweight_materials", "propulsion_systems", "life_support", "evacuation"][stage - 1] as CivilizationTechId]}</p>
              <div className="mt-3"><CostLine state={state} costs={requirements.costs} language={language} /></div>
              {stage === 2 ? <p className="mt-2 text-[11px] font-bold text-amber-700">{text.requires}: {civilizationBuildingNames[language].test_center}</p> : null}
              {stage === 4 ? <p className="mt-2 text-[11px] font-bold text-amber-700">{text.spaceFinalRequirements}</p> : null}
              <button
                type="button"
                data-testid={`space-project-stage-${stage}`}
                disabled={busy || complete || !ready}
                onClick={() => onCommand({ type: "COMPLETE_SPACE_PROJECT_STAGE", stage })}
                className="mt-auto h-9 bg-sky-800 px-2 text-xs font-black text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {complete ? text.spaceStageComplete : requirements.isNextStage ? text.completeSpaceStage : text.locked}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ConvertersPanel({ state, busy, language, onCommand }: { state: CivilizationState; busy: boolean; language: "th" | "en"; onCommand: (command: CivilizationCommand) => void }) {
  const text = getCivilizationCopy(language);
  const converterIds = state.era === "space"
    ? [...BRONZE_CONVERTERS, ...INDUSTRIAL_CONVERTERS, ...INFORMATION_CONVERTERS, ...SPACE_CONVERTERS]
    : state.era === "information"
    ? [...BRONZE_CONVERTERS, ...INDUSTRIAL_CONVERTERS, ...INFORMATION_CONVERTERS]
    : state.era === "industrial"
    ? [...BRONZE_CONVERTERS, ...INDUSTRIAL_CONVERTERS]
    : BRONZE_CONVERTERS;
  const power = getCivilizationPowerStatus(state);
  const compute = getCivilizationComputeStatus(state);
  const automationSlots = getCivilizationAutomationSlots(state);
  const priorityLabels = [text.priorityHigh, text.priorityNormal, text.priorityLow] as const;
  return (
    <section aria-labelledby="converters-title">
      <h2 id="converters-title" className="mb-4 text-lg font-black text-stone-900">{state.era === "space" ? text.spaceConverterTitle : state.era === "information" ? text.informationConverterTitle : state.era === "industrial" ? text.industrialConverterTitle : text.converterTitle}</h2>
      {state.era === "space" ? <SpaceProjectPanel state={state} busy={busy} language={language} onCommand={onCommand} /> : null}
      {state.researchedTechs.includes("electrification") ? (
        <div className="mb-5 border-y border-cyan-200 bg-cyan-50 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-black text-cyan-950"><Zap className="h-4 w-4" />{text.powerGrid}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div><span className="block text-stone-500">{text.powerSupply}</span><strong className="font-mono text-cyan-900">{formatAmount(power.supply)}</strong></div>
            <div><span className="block text-stone-500">{text.powerUsed}</span><strong className="font-mono text-cyan-900">{formatAmount(power.used)}</strong></div>
            <div><span className="block text-stone-500">{text.powerAvailable}</span><strong className="font-mono text-cyan-900">{formatAmount(power.available)}</strong></div>
          </div>
        </div>
      ) : null}
      {state.era === "information" || state.era === "space" ? (
        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_2fr]">
          <div className="border-y border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-950"><Server className="h-4 w-4" />{text.computeGrid}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div><span className="block text-stone-500">{text.powerSupply}</span><strong className="font-mono text-emerald-900">{formatAmount(compute.supply)}</strong></div>
              <div><span className="block text-stone-500">{text.powerUsed}</span><strong className="font-mono text-emerald-900">{formatAmount(compute.used)}</strong></div>
              <div><span className="block text-stone-500">{text.powerAvailable}</span><strong className="font-mono text-emerald-900">{formatAmount(compute.available)}</strong></div>
            </div>
          </div>
          <div className="border-y border-violet-200 bg-violet-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3 text-sm font-black text-violet-950"><span className="flex items-center gap-2"><Network className="h-4 w-4" />{text.automation}</span><span className="font-mono text-xs">{state.automationRules.length}/{automationSlots} {text.automationSlots}</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {AUTOMATION_RULES.map((ruleId) => {
                const active = state.automationRules.includes(ruleId);
                return <button key={ruleId} type="button" data-testid={`automation-${ruleId}`} disabled={busy || (!active && state.automationRules.length >= automationSlots)} onClick={() => onCommand({ type: "TOGGLE_AUTOMATION_RULE", ruleId })} className={cn("min-h-10 border px-2 text-xs font-black disabled:opacity-40", active ? "border-violet-700 bg-violet-700 text-white" : "border-violet-300 bg-white text-violet-900")}>{civilizationAutomationRuleNames[language][ruleId]}</button>;
              })}
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {converterIds.map((id) => {
          const converter = state.converters[id];
          const definition = CIVILIZATION_CONVERTERS[id];
          const unlocked = state.unlockedConverters.includes(id);
          const costs = getCivilizationConverterCost(state, id);
          const displayedLevel = Math.max(1, converter.count);
          const rates = getCivilizationConverterRates(state, id, displayedLevel);
          const atMax = converter.count >= CIVILIZATION_MAX_CONVERTER_LEVEL;
          const powerDemand = getCivilizationConverterPowerDemand(state, id);
          const canPrioritize = converter.count > 0 && Boolean(definition.powerDemand) && state.researchedTechs.includes("factory_priority");
          return (
            <article key={id} className={cn("flex min-h-56 flex-col border p-4", unlocked ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-100 opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-orange-50 text-orange-700"><Factory className="h-5 w-5" /></div>
                <span className="font-mono text-xs font-black text-stone-500">{text.level} {converter.count}</span>
              </div>
              <h3 className="mt-3 text-sm font-black text-stone-900">{civilizationConverterNames[language][id]}</h3>
              <p className="mt-1 text-[11px] font-bold uppercase text-stone-400">
                {converter.count > 0 ? `${text.total} (${text.level} ${converter.count})` : text.perLevel}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {text.input}: {rates.inputs.map((item) => `${formatAmount(item.amount)}/s ${civilizationResourceNames[language][item.resource]}`).join(", ")}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                {text.output}: {definition.powerSupply
                  ? `${formatAmount(definition.powerSupply * displayedLevel)} ${civilizationResourceNames[language].electricity}`
                  : definition.computeSupply
                    ? `${rates.outputs.map((item) => `${formatAmount(item.amount)}/s ${civilizationResourceNames[language][item.resource]}`).join(", ")} + ${formatAmount(definition.computeSupply * displayedLevel)} ${civilizationResourceNames[language].compute}`
                    : rates.outputs.map((item) => `${formatAmount(item.amount)}/s ${civilizationResourceNames[language][item.resource]}`).join(", ")}
              </p>
              {powerDemand > 0 ? <p className="mt-1 text-xs font-bold text-cyan-800">{text.powerUsed}: {formatAmount(powerDemand)} {civilizationResourceNames[language].electricity}</p> : null}
              {definition.computeDemand ? <p className="mt-1 text-xs font-bold text-emerald-800">{text.powerUsed}: {formatAmount(definition.computeDemand * displayedLevel)} {civilizationResourceNames[language].compute}</p> : null}
              {canPrioritize ? (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-bold text-stone-500">{text.priority}</p>
                  <div className="grid grid-cols-3 border border-stone-300">
                    {([1, 2, 3] as const).map((priority, index) => (
                      <button
                        key={priority}
                        type="button"
                        data-testid={`converter-priority-${id}-${priority}`}
                        disabled={busy || converter.priority === priority}
                        onClick={() => onCommand({ type: "SET_CONVERTER_PRIORITY", converterId: id, priority })}
                        className={cn("h-8 border-r border-stone-300 px-1 text-[10px] font-black last:border-r-0", converter.priority === priority ? "bg-cyan-800 text-white" : "bg-white text-stone-600 hover:bg-stone-100")}
                      >
                        {priorityLabels[index]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {unlocked ? (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-bold text-stone-500">{text.nextUpgradeCost}</p>
                  <CostLine state={state} costs={costs} language={language} />
                </div>
              ) : null}
              <div className="mt-auto pt-4">
                {converter.count > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" data-testid={`converter-toggle-${id}`} disabled={busy} onClick={() => onCommand({ type: "TOGGLE_CONVERTER", converterId: id })} className={cn("h-9 px-3 text-xs font-black text-white disabled:opacity-40", converter.enabled ? "bg-rose-700 hover:bg-rose-800" : "bg-emerald-700 hover:bg-emerald-800")}>{converter.enabled ? text.pause : text.resume}</button>
                    <button type="button" data-testid={`converter-upgrade-${id}`} disabled={busy || atMax || !canAfford(state, costs)} onClick={() => onCommand({ type: "BUY_CONVERTER", converterId: id })} className="h-9 bg-orange-700 px-2 text-xs font-black text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-stone-300">{atMax ? text.max : `${text.upgrade} ${text.level} ${converter.count + 1}`}</button>
                  </div>
                ) : (
                  <button type="button" data-testid={`converter-buy-${id}`} disabled={busy || !unlocked || !canAfford(state, costs)} onClick={() => onCommand({ type: "BUY_CONVERTER", converterId: id })} className="h-9 w-full bg-stone-900 px-3 text-xs font-black text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300">{unlocked ? `${text.build} ${text.level} 1` : text.locked}</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OfflineSummaryDialog({ summary, language, onClose }: { summary: CivilizationSimulationSummary; language: "th" | "en"; onClose: () => void }) {
  const text = getCivilizationCopy(language);
  const elapsedMinutes = Math.floor(summary.simulatedElapsedMs / 60_000);
  const elapsedLabel = elapsedMinutes >= 60
    ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`
    : `${elapsedMinutes}m`;
  const gains = Object.entries(summary.resourceDeltas).filter(([, value]) => value > 0.001) as Array<[CivilizationResourceId, number]>;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="offline-summary-title">
      <div className="w-full max-w-md border border-stone-300 bg-[#fbfaf6] p-5 shadow-2xl sm:p-6">
        <div className="flex h-11 w-11 items-center justify-center bg-emerald-100 text-emerald-800"><Clock3 className="h-5 w-5" /></div>
        <h2 id="offline-summary-title" className="mt-4 text-xl font-black text-stone-900">{text.offlineTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{text.offlineBody}</p>
        <p className="mt-3 font-mono text-sm font-black text-emerald-800">{elapsedLabel}</p>
        {gains.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-2">{gains.map(([id, value]) => <div key={id} className="border border-stone-200 bg-white px-3 py-2 text-xs"><span className="text-stone-500">{civilizationResourceNames[language][id]}</span><strong className="ml-2 text-emerald-700">+{formatAmount(value)}</strong></div>)}</div> : null}
        {summary.discardedElapsedMs > 0 ? <p className="mt-4 text-xs font-bold text-amber-700">{text.offlineCapped}</p> : null}
        {summary.clockAdjusted ? <p className="mt-4 text-xs font-bold text-amber-700">{text.clockAdjusted}</p> : null}
        <button type="button" autoFocus onClick={onClose} className="mt-5 h-11 w-full bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800">{text.continue}</button>
      </div>
    </div>
  );
}

const PERMANENT_REWARD_IDS: CivilizationPermanentRewardId[] = ["abundant_harvest", "research_archive", "founder_stockpile", "efficient_industry"];

function PrestigeDialog({ state, language, busy, onClose, onCommand }: { state: CivilizationState; language: "th" | "en"; busy: boolean; onClose: () => void; onCommand: (command: CivilizationCommand) => void }) {
  const text = getCivilizationCopy(language);
  const [selected, setSelected] = useState<CivilizationPermanentRewardId | null>(null);
  const [confirming, setConfirming] = useState(false);
  const runHours = Math.max(0, Math.floor((state.lastSimulatedAt - state.runStartedAt) / 3_600_000));
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="prestige-title">
      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto border border-amber-300 bg-[#fbfaf6] shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 p-5 sm:p-6">
          <div><p className="text-xs font-black uppercase text-amber-700">{text.prestigeRun} {state.runNumber} · {runHours}h</p><h2 id="prestige-title" className="mt-1 text-2xl font-black text-stone-950">{confirming ? text.prestigeConfirmTitle : text.prestigeTitle}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{confirming ? text.prestigeConfirmBody : text.prestigeBody}</p></div>
          <button type="button" onClick={onClose} aria-label={language === "th" ? "ปิด" : "Close"} className="h-10 w-10 shrink-0 border border-stone-300 text-xl text-stone-600 hover:bg-stone-100">×</button>
        </div>
        <div className="p-5 sm:p-6">
          {!confirming ? <div className="grid gap-3 sm:grid-cols-2">{PERMANENT_REWARD_IDS.map((rewardId) => {
            const level = state.permanentRewards[rewardId];
            const maxed = level >= CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL;
            return <button key={rewardId} type="button" data-testid={`prestige-reward-${rewardId}`} disabled={maxed} onClick={() => setSelected(rewardId)} className={cn("min-h-36 border p-4 text-left transition-colors", selected === rewardId ? "border-amber-600 bg-amber-50" : "border-stone-300 bg-white hover:border-amber-400", maxed && "cursor-not-allowed opacity-50")}><div className="flex items-center justify-between gap-3"><span className="font-black text-stone-900">{civilizationPermanentRewardNames[language][rewardId]}</span><span className="shrink-0 font-mono text-xs font-black text-amber-800">{level}/{CIVILIZATION_PERMANENT_REWARD_MAX_LEVEL}</span></div><p className="mt-3 text-sm leading-6 text-stone-600">{civilizationPermanentRewardBenefits[language][rewardId]}</p><p className="mt-3 text-xs font-black text-amber-800">{maxed ? text.prestigeMaxed : text.prestigeChoose}</p></button>;
          })}</div> : selected ? <div><div className="border border-amber-400 bg-amber-50 p-4"><p className="font-black text-stone-950">{civilizationPermanentRewardNames[language][selected]}</p><p className="mt-2 text-sm leading-6 text-stone-700">{civilizationPermanentRewardBenefits[language][selected]}</p><p className="mt-2 font-mono text-xs font-black text-amber-800">{state.permanentRewards[selected]} → {state.permanentRewards[selected] + 1}</p></div><div className="mt-4 space-y-2 text-sm leading-6"><p className="border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 font-bold text-emerald-950">{text.prestigeKeeps}</p><p className="border-l-4 border-rose-600 bg-rose-50 px-4 py-3 font-bold text-rose-950">{text.prestigeResets}</p></div></div> : null}
          <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={confirming ? () => setConfirming(false) : onClose} className="h-12 border border-stone-300 bg-white text-sm font-black text-stone-700 hover:bg-stone-100">{confirming ? text.prestigeBack : text.later}</button>{confirming && selected ? <button type="button" data-testid="prestige-confirm" disabled={busy} onClick={() => onCommand({ type: "PRESTIGE_RESET", rewardId: selected, confirmRunNumber: state.runNumber })} className="h-12 bg-rose-700 px-3 text-sm font-black text-white hover:bg-rose-800 disabled:opacity-40">{text.prestigeConfirm}</button> : <button type="button" data-testid="prestige-continue" disabled={!selected || busy} onClick={() => setConfirming(true)} className="h-12 bg-amber-700 px-3 text-sm font-black text-white hover:bg-amber-800 disabled:opacity-40">{text.prestigeContinue}</button>}</div>
        </div>
      </div>
    </div>
  );
}

function EventList({ events, language }: { events: CivilizationEngineEvent[]; language: "th" | "en" }) {
  const text = getCivilizationCopy(language);
  return (
    <aside className="border-t border-stone-200 bg-[#f7f4eb] p-4 xl:border-l xl:border-t-0">
      <h2 className="flex items-center gap-2 text-xs font-black uppercase text-stone-700"><ScrollText className="h-4 w-4" />{text.eventTitle}</h2>
      <div className="mt-4 space-y-3">
        {events.length === 0 ? <p className="text-xs leading-5 text-stone-500">{text.noEvents}</p> : events.map((event, index) => (
          <div key={`${event.type}-${event.id ?? "event"}-${index}`} className="border-l-2 border-emerald-600 pl-3 text-xs text-stone-600">
            <p className="font-bold text-stone-800">{event.type.replaceAll("_", " ")}</p>
            {event.id ? <p className="mt-0.5 truncate">{event.id}</p> : null}
          </div>
        ))}
      </div>
    </aside>
  );
}

export function CivilizationGame({ previewState, previewOfflineSummary, previewTab = "actions" }: { previewState?: CivilizationState; previewOfflineSummary?: CivilizationSimulationSummary; previewTab?: GameTab } = {}) {
  const { language } = useLanguage();
  const text = getCivilizationCopy(language);
  const { state, revision, connection, queuedCount, events, lastError, enqueue, retry, refresh, offlineSummary, dismissOfflineSummary } = useCivilizationGame(previewState, previewOfflineSummary);
  const [tab, setTab] = useState<GameTab>(previewTab);
  const [dismissedEraPrompt, setDismissedEraPrompt] = useState<"bronze" | "industrial" | "information" | "space" | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dismissedPrestigeRun, setDismissedPrestigeRun] = useState<number | null>(null);
  const timeOffsetRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now() + timeOffsetRef.current), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const testWindow = window as Window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void;
    };
    testWindow.render_game_to_text = () => JSON.stringify({
      mode: state ? "playing" : connection,
      tab,
      revision,
      queuedCommands: queuedCount,
      era: state?.era,
      resources: state?.resources,
      workers: state?.workers,
      buildings: state?.buildings,
      researchedTechs: state?.researchedTechs,
      activeActions: state?.activeActions,
      converters: state?.converters,
      unlockedConverters: state?.unlockedConverters,
      automationRules: state?.automationRules,
      industrialCompleted: state?.industrialCompleted,
      informationCompleted: state?.informationCompleted,
      spaceProjectStage: state?.spaceProjectStage,
      spaceCompleted: state?.spaceCompleted,
      runNumber: state?.runNumber,
      permanentRewards: state?.permanentRewards,
      prestigeDialogOpen: Boolean(state?.spaceCompleted && dismissedPrestigeRun !== state.runNumber),
      offlineSummary,
      coordinateSystem: "DOM layout; no world coordinates",
    });
    testWindow.advanceTime = (ms: number) => {
      timeOffsetRef.current += Math.max(0, ms);
      setNowMs(Date.now() + timeOffsetRef.current);
    };
    return () => {
      delete testWindow.render_game_to_text;
      delete testWindow.advanceTime;
    };
  }, [connection, dismissedPrestigeRun, offlineSummary, queuedCount, revision, state, tab]);

  const tabs = useMemo<Array<{ id: GameTab; label: string; icon: LucideIcon }>>(() => {
    const items: Array<{ id: GameTab; label: string; icon: LucideIcon }> = [
      { id: "actions", label: text.actions, icon: Sparkles },
      { id: "buildings", label: text.buildings, icon: House },
      { id: "workers", label: text.workers, icon: Users },
      { id: "research", label: text.research, icon: BookOpen },
    ];
    if (state?.era !== "stone") items.push({ id: "converters", label: text.converters, icon: Factory });
    return items;
  }, [state?.era, text]);

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ede9dc] px-6 text-stone-800">
        <div className="text-center">
          {connection === "loading" ? <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-emerald-700" /> : <WifiOff className="mx-auto h-8 w-8 text-rose-600" />}
          <h1 className="mt-4 text-xl font-black">{connection === "loading" ? text.loading : text.loadFailed}</h1>
          {connection !== "loading" ? <button type="button" onClick={() => void refresh()} className="mt-4 h-10 bg-stone-900 px-5 text-sm font-black text-white">{text.refresh}</button> : null}
        </div>
      </main>
    );
  }

  const busy = connection === "syncing" || queuedCount > 0;
  const showPrestige = state.spaceCompleted && dismissedPrestigeRun !== state.runNumber;
  const statusLabel = connection === "syncing" ? text.syncing : connection === "offline" ? text.offline : text.saved;
  const StatusIcon = connection === "offline" ? WifiOff : connection === "syncing" ? LoaderCircle : Check;
  const isBronze = state.era === "bronze";
  const isIndustrial = state.era === "industrial";
  const isInformation = state.era === "information";
  const isSpace = state.era === "space";
  const targetEra = state.era === "stone" && state.unlockedEras.includes("bronze")
    ? "bronze"
    : state.era === "bronze" && state.unlockedEras.includes("industrial") ? "industrial"
    : state.era === "industrial" && state.unlockedEras.includes("information") ? "information"
    : state.era === "information" && state.unlockedEras.includes("space") ? "space" : null;
  const showEraPrompt = targetEra !== null && dismissedEraPrompt !== targetEra;
  const bannerMessage = connection === "offline"
    ? text.commandFailed
    : lastError === "CONFLICT"
      ? text.conflict
      : lastError
        ? civilizationErrorNames[language][lastError]
        : null;

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#ede9dc] text-stone-900">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/20 bg-[#173b2b] px-3 text-white shadow-md sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/student/access" aria-label={text.back} title={text.back} className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/20 hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black sm:text-lg">{text.title}</h1>
            <p className="text-[10px] font-bold uppercase text-emerald-200">{isSpace ? text.spaceEra : isInformation ? text.informationEra : isIndustrial ? text.industrialEra : isBronze ? text.bronzeEra : text.era}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={connection === "offline" ? retry : () => enqueue({ type: "SYNC" })} className="flex h-9 items-center gap-2 border border-white/20 px-3 text-xs font-bold hover:bg-white/10">
            <StatusIcon className={cn("h-4 w-4", connection === "syncing" && "animate-spin")} />
            <span className="hidden sm:inline">{statusLabel}</span>
            {queuedCount > 0 ? <span className="font-mono">{queuedCount}</span> : null}
          </button>
          <LanguageToggle className="h-9 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" />
        </div>
      </header>

      {connection === "offline" || lastError ? (
        <div className={cn("flex min-h-11 items-center justify-center gap-3 px-4 py-2 text-center text-xs font-bold", connection === "offline" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900") }>
          <span>{bannerMessage}</span>
          {connection === "offline" ? <button type="button" onClick={retry} className="underline">{text.retry}</button> : null}
        </div>
      ) : null}

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-64 overflow-hidden border-b border-stone-300 sm:h-80">
        <Image src={isSpace ? "/civilization-idle/space-city.png" : isInformation ? "/civilization-idle/information-city.png" : isIndustrial ? "/civilization-idle/industrial-city.webp" : isBronze ? "/civilization-idle/bronze-village.webp" : "/civilization-idle/stone-village.webp"} alt="" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-5 py-4 text-white backdrop-blur-[2px] sm:px-8">
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <p className="text-xs font-bold uppercase text-emerald-200">{isSpace ? text.spaceStatus : isInformation ? text.informationStatus : isIndustrial ? text.industrialStatus : isBronze ? text.bronzeStatus : text.villageStatus}</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{isSpace ? text.spaceVillage : isInformation ? text.informationVillage : isIndustrial ? text.industrialVillage : isBronze ? text.bronzeVillage : text.village}</h2>
            <p className="mt-1 text-xs text-white/80">{isSpace ? text.spaceGoalActive : isInformation ? text.informationGoalActive : isIndustrial ? text.industrialGoalActive : isBronze ? text.bronzeGoalActive : text.bronzeGoal}</p>
          </motion.div>
        </div>
      </motion.section>

      {state.resources.food.amount <= 0 ? <div className="bg-rose-700 px-4 py-2 text-center text-xs font-black text-white">{text.starving}</div> : null}

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_220px]">
        <ResourceRail state={state} language={language} />
        <div className="min-w-0 bg-[#fbfaf6]">
          <MilestoneStrip state={state} language={language} />
          <nav aria-label="Game sections" className="sticky top-16 z-30 grid border-b border-stone-200 bg-[#fbfaf6]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" data-testid={`tab-${id}`} onClick={() => setTab(id)} className={cn("relative flex h-14 items-center justify-center gap-2 px-2 text-xs font-black transition-colors sm:text-sm", tab === id ? "text-emerald-800" : "text-stone-500 hover:bg-stone-100") }>
                <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
                {tab === id ? <motion.span layoutId="civilization-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-700" /> : null}
              </button>
            ))}
          </nav>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-h-[520px] p-4 sm:p-6">
            {tab === "actions" ? <ActionsPanel state={state} nowMs={nowMs} busy={busy} language={language} onCommand={enqueue} /> : null}
            {tab === "buildings" ? <BuildingsPanel state={state} busy={busy} language={language} onCommand={enqueue} /> : null}
            {tab === "workers" ? <WorkersPanel state={state} busy={busy} language={language} onCommand={enqueue} /> : null}
            {tab === "research" ? <ResearchPanel state={state} busy={busy} language={language} onCommand={enqueue} /> : null}
            {tab === "converters" ? <ConvertersPanel state={state} busy={busy} language={language} onCommand={enqueue} /> : null}
            {state.spaceCompleted ? <div className="mt-5 border border-sky-300 bg-sky-50 p-4 text-sm font-black text-sky-950"><p>{text.currentSpaceComplete}</p><button type="button" data-testid="prestige-open" onClick={() => setDismissedPrestigeRun(null)} className="mt-3 h-10 bg-sky-900 px-4 text-xs font-black text-white hover:bg-sky-950">{text.prestigeOpen}</button></div> : state.informationCompleted && state.era === "information" ? <div className="mt-5 border border-violet-300 bg-violet-50 p-4 text-sm font-black text-violet-950">{text.currentInformationComplete}</div> : state.industrialCompleted && state.era === "industrial" ? <div className="mt-5 border border-cyan-300 bg-cyan-50 p-4 text-sm font-black text-cyan-950">{text.currentIndustrialComplete}</div> : state.era === "bronze" && state.bronzeCompleted ? <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm font-black text-amber-900">{text.currentContentComplete}</div> : null}
          </motion.div>
        </div>
        <div className="xl:block"><EventList events={events} language={language} /></div>
      </div>
      {showEraPrompt ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="era-prompt-title">
          <div className="w-full max-w-md border border-stone-300 bg-[#fbfaf6] p-5 shadow-2xl sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center bg-orange-100 text-orange-800"><Factory className="h-5 w-5" /></div>
            <h2 id="era-prompt-title" className="mt-4 text-xl font-black text-stone-900">{targetEra === "space" ? text.enterSpaceTitle : targetEra === "information" ? text.enterInformationTitle : targetEra === "industrial" ? text.enterIndustrialTitle : text.enterBronzeTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{targetEra === "space" ? text.enterSpaceBody : targetEra === "information" ? text.enterInformationBody : targetEra === "industrial" ? text.enterIndustrialBody : text.enterBronzeBody}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDismissedEraPrompt(targetEra)} className="h-11 border border-stone-300 bg-white text-sm font-black text-stone-700 hover:bg-stone-100">{text.later}</button>
              <button type="button" data-testid={`advance-era-${targetEra}`} disabled={busy || !targetEra} onClick={() => targetEra && enqueue({ type: "ADVANCE_ERA", eraId: targetEra })} className="h-11 bg-orange-700 text-sm font-black text-white hover:bg-orange-800 disabled:opacity-40">{targetEra === "space" ? text.enterSpace : targetEra === "information" ? text.enterInformation : targetEra === "industrial" ? text.enterIndustrial : text.enterBronze}</button>
            </div>
          </div>
        </div>
      ) : null}
      {showPrestige ? <PrestigeDialog state={state} language={language} busy={busy} onClose={() => setDismissedPrestigeRun(state.runNumber)} onCommand={enqueue} /> : null}
      {offlineSummary ? <OfflineSummaryDialog summary={offlineSummary} language={language} onClose={dismissOfflineSummary} /> : null}
    </main>
  );
}
