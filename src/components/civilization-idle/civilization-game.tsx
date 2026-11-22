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
  Check,
  Cherry,
  CircleDot,
  Clock3,
  Factory,
  FlaskConical,
  Hammer,
  House,
  LoaderCircle,
  Minus,
  Pickaxe,
  Plus,
  ScrollText,
  Sparkles,
  Sprout,
  TentTree,
  Trees,
  Users,
  WifiOff,
  Wheat,
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
  CIVILIZATION_TECHS,
  getCivilizationActionCooldownMs,
  getCivilizationActionReward,
  getCivilizationActionUpgradeCost,
  getCivilizationBuildingCost,
  getCivilizationConverterCost,
  type CivilizationActionId,
  type CivilizationBuildingId,
  type CivilizationCommand,
  type CivilizationConverterId,
  type CivilizationEngineEvent,
  type CivilizationJobId,
  type CivilizationResourceId,
  type CivilizationState,
  type CivilizationTechId,
} from "@/lib/civilization-idle";
import { cn } from "@/lib/utils";
import {
  civilizationActionNames,
  civilizationBuildingNames,
  civilizationConverterNames,
  civilizationErrorNames,
  civilizationJobNames,
  civilizationResourceNames,
  civilizationTechNames,
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

const resourceIcons: Record<CivilizationResourceId, LucideIcon> = {
  food: Apple,
  population: Users,
  wood: Trees,
  stone: CircleDot,
  science: FlaskConical,
  copper: CircleDot,
  bronze: CircleDot,
  iron: CircleDot,
};
const actionIcons: Record<CivilizationActionId, LucideIcon> = {
  gather_fruit: Cherry,
  chop_wood: Axe,
  mine_stone: Pickaxe,
  pan_copper: CircleDot,
  forge_iron: Hammer,
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
  const resources = state.era === "bronze"
    ? [...STONE_RESOURCES, ...BRONZE_RESOURCES]
    : STONE_RESOURCES;
  return (
    <aside className="min-w-0 max-w-full overflow-hidden border-b border-stone-200 bg-[#f7f4eb] lg:border-b-0 lg:border-r">
      <div className="flex max-w-full gap-2 overflow-x-auto px-3 py-3 lg:block lg:space-y-0 lg:px-4 lg:py-5">
        {resources.map((id) => {
          const resource = state.resources[id];
          const Icon = resourceIcons[id];
          const percent = Math.min(100, (resource.amount / Math.max(1, resource.cap)) * 100);
          return (
            <div
              key={id}
              className="min-w-36 border-r border-stone-200 px-3 py-2 last:border-r-0 lg:min-w-0 lg:border-b lg:border-r-0 lg:px-1 lg:py-4"
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
              <p className="mt-1 text-right font-mono text-[10px] text-stone-400">/ {formatAmount(resource.cap)}</p>
            </div>
          );
        })}
      </div>
    </aside>
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
  const actions = state.era === "bronze" ? [...STONE_ACTIONS, ...BRONZE_ACTIONS] : STONE_ACTIONS;
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
                <span className="text-[11px] font-bold text-stone-500">{text.level} {level}/5</span>
              </div>
              <h3 className="mt-3 text-sm font-black text-stone-900">{civilizationActionNames[language][id]}</h3>
              <p className="mt-1 text-xs text-stone-500">
                +{formatAmount(getCivilizationActionReward(state, id))} {civilizationResourceNames[language][CIVILIZATION_ACTIONS[id].reward.resource]}
              </p>
              <button
                type="button"
                data-testid={`action-start-${id}`}
                disabled={busy || Boolean(active)}
                onClick={() => onCommand({ type: "START_ACTION", actionId: id })}
                className="mt-4 h-10 w-full bg-emerald-700 px-3 text-sm font-black text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {active ? `${text.working} ${Math.ceil(remaining / 1000)}s` : text.gather}
              </button>
              <button
                type="button"
                data-testid={`action-upgrade-${id}`}
                disabled={busy || level >= 5 || !canAfford(state, [upgradeCost])}
                onClick={() => onCommand({ type: "UPGRADE_ACTION", actionId: id })}
                className="mt-2 h-9 w-full border border-stone-300 bg-white px-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {level >= 5 ? text.max : `${text.upgrade} · ${civilizationResourceNames[language][upgradeCost.resource]} ${formatAmount(upgradeCost.amount)}`}
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
  const buildings = state.era === "bronze"
    ? [...STONE_BUILDINGS, ...BRONZE_BUILDINGS]
    : STONE_BUILDINGS;
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
  return (
    <section aria-labelledby="workers-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id="workers-title" className="text-lg font-black text-stone-900">{text.workersTitle}</h2>
        <p className="text-sm font-black text-emerald-700">{text.idle} {state.idleWorkers}</p>
      </div>
      <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
        {STONE_JOBS.map((id) => {
          const job = CIVILIZATION_JOBS[id];
          const unlocked = !job.buildingRequired || state.buildings[job.buildingRequired] > 0;
          return (
            <div key={id} className="flex min-h-20 items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-stone-900">{civilizationJobNames[language][id]}</h3>
                <p className="mt-1 text-xs text-stone-500">
                  {unlocked
                    ? `+${job.baseRate}/s ${civilizationResourceNames[language][job.produces]}`
                    : `${text.requires}: ${civilizationBuildingNames[language][job.buildingRequired!]}`}
                </p>
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
  const techs = state.era === "bronze" ? [...STONE_TECHS, ...BRONZE_TECHS] : STONE_TECHS;
  return (
    <section aria-labelledby="research-title">
      <h2 id="research-title" className="mb-4 text-lg font-black text-stone-900">{text.researchTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {techs.map((id) => {
          const tech = CIVILIZATION_TECHS[id];
          const complete = state.researchedTechs.includes(id);
          const prerequisitesMet = tech.prerequisites.every((item) => state.researchedTechs.includes(item));
          const affordable = state.resources.science.amount >= tech.scienceCost;
          return (
            <article key={id} className={cn("border p-4", complete ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-9 w-9 items-center justify-center bg-stone-100 text-stone-700">{complete ? <Check className="h-5 w-5 text-emerald-700" /> : <Brain className="h-5 w-5" />}</div>
                <span className="font-mono text-xs font-black text-cyan-700">{tech.scienceCost} {civilizationResourceNames[language].science}</span>
              </div>
              <h3 className="mt-3 text-sm font-black text-stone-900">{civilizationTechNames[language][id]}</h3>
              {tech.prerequisites.length > 0 ? (
                <p className="mt-1 text-xs text-stone-500">{text.requires}: {tech.prerequisites.map((item) => civilizationTechNames[language][item]).join(", ")}</p>
              ) : <div className="h-5" />}
              <button type="button" data-testid={`research-${id}`} disabled={busy || complete || !prerequisitesMet || !affordable} onClick={() => onCommand({ type: "BUY_RESEARCH", techId: id })} className="mt-3 h-9 w-full bg-cyan-800 px-3 text-xs font-black text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:bg-stone-300">
                {complete ? text.completed : prerequisitesMet ? text.researchNow : text.locked}
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
  return (
    <section aria-labelledby="converters-title">
      <h2 id="converters-title" className="mb-4 text-lg font-black text-stone-900">{text.converterTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {BRONZE_CONVERTERS.map((id) => {
          const definition = CIVILIZATION_CONVERTERS[id];
          const converter = state.converters[id];
          const unlocked = state.unlockedConverters.includes(id);
          const costs = getCivilizationConverterCost(state, id);
          return (
            <article key={id} className={cn("flex min-h-56 flex-col border p-4", unlocked ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-100 opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-orange-50 text-orange-700"><Factory className="h-5 w-5" /></div>
                <span className="font-mono text-xs font-black text-stone-500">x{converter.count}</span>
              </div>
              <h3 className="mt-3 text-sm font-black text-stone-900">{civilizationConverterNames[language][id]}</h3>
              <p className="mt-1 text-xs text-stone-500">
                {text.input}: {definition.inputs.map((item) => `${formatAmount(item.amount)}/s ${civilizationResourceNames[language][item.resource]}`).join(", ")}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                {text.output}: {definition.outputs.map((item) => `${formatAmount(item.amount)}/s ${civilizationResourceNames[language][item.resource]}`).join(", ")}
              </p>
              {converter.count === 0 ? <div className="mt-3"><CostLine state={state} costs={costs} language={language} /></div> : null}
              <div className="mt-auto pt-4">
                {converter.count > 0 ? (
                  <button type="button" data-testid={`converter-toggle-${id}`} disabled={busy} onClick={() => onCommand({ type: "TOGGLE_CONVERTER", converterId: id })} className={cn("h-9 w-full px-3 text-xs font-black text-white disabled:opacity-40", converter.enabled ? "bg-rose-700 hover:bg-rose-800" : "bg-emerald-700 hover:bg-emerald-800")}>{converter.enabled ? text.pause : text.resume}</button>
                ) : (
                  <button type="button" data-testid={`converter-buy-${id}`} disabled={busy || !unlocked || !canAfford(state, costs)} onClick={() => onCommand({ type: "BUY_CONVERTER", converterId: id })} className="h-9 w-full bg-stone-900 px-3 text-xs font-black text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300">{unlocked ? text.build : text.locked}</button>
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

export function CivilizationGame({ previewState, previewOfflineSummary }: { previewState?: CivilizationState; previewOfflineSummary?: CivilizationSimulationSummary } = {}) {
  const { language } = useLanguage();
  const text = getCivilizationCopy(language);
  const { state, revision, connection, queuedCount, events, lastError, enqueue, retry, refresh, offlineSummary, dismissOfflineSummary } = useCivilizationGame(previewState, previewOfflineSummary);
  const [tab, setTab] = useState<GameTab>("actions");
  const [eraPromptDismissed, setEraPromptDismissed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
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
  }, [connection, offlineSummary, queuedCount, revision, state, tab]);

  const tabs = useMemo<Array<{ id: GameTab; label: string; icon: LucideIcon }>>(() => {
    const items: Array<{ id: GameTab; label: string; icon: LucideIcon }> = [
      { id: "actions", label: text.actions, icon: Sparkles },
      { id: "buildings", label: text.buildings, icon: House },
      { id: "workers", label: text.workers, icon: Users },
      { id: "research", label: text.research, icon: BookOpen },
    ];
    if (state?.era === "bronze") items.push({ id: "converters", label: text.converters, icon: Factory });
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
  const statusLabel = connection === "syncing" ? text.syncing : connection === "offline" ? text.offline : text.saved;
  const StatusIcon = connection === "offline" ? WifiOff : connection === "syncing" ? LoaderCircle : Check;
  const isBronze = state.era === "bronze";
  const showEraPrompt = !isBronze && state.unlockedEras.includes("bronze") && !eraPromptDismissed;
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
            <p className="text-[10px] font-bold uppercase text-emerald-200">{isBronze ? text.bronzeEra : text.era}</p>
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
        <Image src={isBronze ? "/civilization-idle/bronze-village.webp" : "/civilization-idle/stone-village.webp"} alt="" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-5 py-4 text-white backdrop-blur-[2px] sm:px-8">
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <p className="text-xs font-bold uppercase text-emerald-200">{isBronze ? text.bronzeStatus : text.villageStatus}</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{isBronze ? text.bronzeVillage : text.village}</h2>
            <p className="mt-1 text-xs text-white/80">{isBronze ? text.bronzeGoalActive : text.bronzeGoal}</p>
          </motion.div>
        </div>
      </motion.section>

      {state.resources.food.amount <= 0 ? <div className="bg-rose-700 px-4 py-2 text-center text-xs font-black text-white">{text.starving}</div> : null}

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_220px]">
        <ResourceRail state={state} language={language} />
        <div className="min-w-0 bg-[#fbfaf6]">
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
            {state.bronzeCompleted ? <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm font-black text-amber-900">{text.currentContentComplete}</div> : null}
          </motion.div>
        </div>
        <div className="xl:block"><EventList events={events} language={language} /></div>
      </div>
      {showEraPrompt ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="era-prompt-title">
          <div className="w-full max-w-md border border-stone-300 bg-[#fbfaf6] p-5 shadow-2xl sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center bg-orange-100 text-orange-800"><Factory className="h-5 w-5" /></div>
            <h2 id="era-prompt-title" className="mt-4 text-xl font-black text-stone-900">{text.enterBronzeTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{text.enterBronzeBody}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEraPromptDismissed(true)} className="h-11 border border-stone-300 bg-white text-sm font-black text-stone-700 hover:bg-stone-100">{text.later}</button>
              <button type="button" data-testid="advance-era-bronze" disabled={busy} onClick={() => enqueue({ type: "ADVANCE_ERA", eraId: "bronze" })} className="h-11 bg-orange-700 text-sm font-black text-white hover:bg-orange-800 disabled:opacity-40">{text.enterBronze}</button>
            </div>
          </div>
        </div>
      ) : null}
      {offlineSummary ? <OfflineSummaryDialog summary={offlineSummary} language={language} onClose={dismissOfflineSummary} /> : null}
    </main>
  );
}
