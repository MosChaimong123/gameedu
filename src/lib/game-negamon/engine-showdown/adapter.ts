import type { NegamonMonsterSnapshot } from "../core/monster-snapshot";
import { findNegamonBattleItemDefinition } from "../core/battle-items";
import { applyNegamonConsumableBattleItemEffect } from "../core/item-effects";
import { isNegamonBasicAttackMoveId } from "@/lib/negamon-basic-move";
import { getEnergyProfileForSpecies } from "@/lib/negamon-energy";
import {
    calculateFormulaDamage,
    createNeutralStatStages,
    NEGAMON_MAX_STAT_STAGE,
    NEGAMON_FORMULA_MAX_BURST_TARGET_HP_RATIO,
    NEGAMON_FORMULA_STAB_MULTIPLIER,
    NEGAMON_MIN_STAT_STAGE,
    type NegamonFormulaCategory,
} from "../core/rules";
import { NEGAMON_BATTLE_ENGINE_TARGET } from "./target";
import {
    createNegamonBattleChoiceRequestIdV4,
    type NegamonBattleActionV4,
    type NegamonBattleChoiceDiagnosticsV4,
    type NegamonBattleChoiceV4,
    type NegamonBattleCombatantV4,
    type NegamonBattleEventV4,
    type NegamonBattleResourceStateV4,
    type NegamonBattleStatStageKeyV4,
    type NegamonBattleSideV4,
    type NegamonBattleStateV4,
    type NegamonFormulaDamageExpectationV4,
    type NegamonShowdownParsedRequestSnapshot,
} from "./state";
import {
    createNegamonBattleCombatantV4FromSeed,
    createNegamonShowdownSideSeed,
    createNegamonShowdownTeamSet,
    type NegamonShowdownSideSeed,
} from "./mapper";
import { registerNegamonStatsRule, withNegamonStatsRule } from "./negamon-stats-rule";

const NEGAMON_V4_BASE_FORMAT_ID = "gen9customgame";
const NEGAMON_V4_FORMAT_ID = withNegamonStatsRule(NEGAMON_V4_BASE_FORMAT_ID);

export type NegamonBattleAdapterCreateInput = {
    battleId: string;
    seed: number;
    player: NegamonMonsterSnapshot;
    opponent: NegamonMonsterSnapshot;
};

export type NegamonBattleAdapterTurnInput = {
    state: NegamonBattleStateV4;
    playerAction: NegamonBattleActionV4;
    opponentAction?: NegamonBattleActionV4;
};

export type NegamonBattleAdapterResolution = {
    ok: boolean;
    state: NegamonBattleStateV4;
    validChoices: NegamonBattleChoiceV4[];
    code?: "INVALID_ACTION" | "STALE_STATE" | "BATTLE_ENDED";
};

export function resolveNegamonBattleTimeoutWinner(input: {
    playerHp: number;
    playerMaxHp: number;
    opponentHp: number;
    opponentMaxHp: number;
    challengerId: string;
    defenderId: string;
}): string | null {
    const playerRatio = input.playerHp / Math.max(1, input.playerMaxHp);
    const opponentRatio = input.opponentHp / Math.max(1, input.opponentMaxHp);
    if (playerRatio > opponentRatio) return input.challengerId;
    if (opponentRatio > playerRatio) return input.defenderId;
    return null;
}

export type NegamonBattleEngineAdapterV4 = {
    target: typeof NEGAMON_BATTLE_ENGINE_TARGET;
    createBattle(input: NegamonBattleAdapterCreateInput): Promise<NegamonBattleStateV4>;
    listChoices(state: NegamonBattleStateV4, side: NegamonBattleSideV4): NegamonBattleChoiceV4[];
    resolveTurn(input: NegamonBattleAdapterTurnInput): Promise<NegamonBattleAdapterResolution>;
};

export type NegamonBattleAiScoreBreakdownV4 = {
    lethalDamage: number;
    damage: number;
    survival: number;
    energyEfficiency: number;
    statusValue: number;
    setupValue: number;
    cooldownTiming: number;
};

export type NegamonBattleAiScoredChoiceV4 = {
    choice: NegamonBattleChoiceV4;
    score: number;
    breakdown: NegamonBattleAiScoreBreakdownV4;
};

export type ParsedShowdownRequest = {
    moves: Array<{ id: string; move: string; pp: number; maxpp: number; disabled: boolean; target: string }>;
    hp?: number;
    maxHp?: number;
    statusIds: string[];
    fainted: boolean;
};

function snapshotRequest(request: ParsedShowdownRequest | null): NegamonShowdownParsedRequestSnapshot | null {
    if (!request) return null;
    return {
        moves: request.moves.map((move) => ({ ...move })),
        hp: request.hp,
        maxHp: request.maxHp,
        statusIds: [...request.statusIds],
        fainted: request.fainted,
    };
}

function getDefaultPpForMove(move: NegamonShowdownSideSeed["moveSet"][number]): number {
    if (isNegamonBasicAttackMoveId(move.negamonMoveId)) return 99;
    if (move.category === "heal" || move.category === "buff" || move.category === "debuff" || move.category === "status") {
        return 4;
    }
    if (move.power >= 50) return 4;
    if (move.power >= 35) return 5;
    return 6;
}

function formatBattleStatusLabel(status: string): string {
    const normalized = status.trim().toUpperCase();
    const labels: Record<string, string> = {
        BURN: "ไหม้",
        PARALYZE: "อัมพาต",
        POISON: "พิษ",
        BADLY_POISON: "พิษสะสม",
        SLEEP: "หลับ",
        STUN: "มึนงง",
        SHIELD: "โล่",
        FOCUS: "โฟกัส",
    };
    return labels[normalized] ?? status;
}

function formatBattleStatLabel(stat: string): string {
    const labels: Record<string, string> = {
        attack: "พลังโจมตี",
        defense: "พลังป้องกัน",
        speed: "ความเร็ว",
        accuracy: "ความแม่นยำ",
        specialAttack: "พลังพิเศษ",
        specialDefense: "การป้องกันพิเศษ",
    };
    return labels[stat] ?? stat;
}

function createResourceState(seed: NegamonShowdownSideSeed): NegamonBattleResourceStateV4 {
    return {
        ppByMoveId: Object.fromEntries(seed.moveSet.map((move) => [move.negamonMoveId, getDefaultPpForMove(move)])),
        maxPpByMoveId: Object.fromEntries(seed.moveSet.map((move) => [move.negamonMoveId, getDefaultPpForMove(move)])),
        cooldownByMoveId: Object.fromEntries(seed.moveSet.map((move) => [move.negamonMoveId, 0])),
    };
}

function createMoveChoices(
    seed: NegamonShowdownSideSeed,
    side: NegamonBattleSideV4,
    resources?: NegamonBattleResourceStateV4,
    energyAvailable?: number
): NegamonBattleChoiceV4[] {
    return seed.moveSet.map((move, index) => ({
        ...createChoiceForMove({ seed, side, move, index, resources, energyAvailable }),
    }));
}

function createChoiceForMove(input: {
    seed: NegamonShowdownSideSeed;
    side: NegamonBattleSideV4;
    move: NegamonShowdownSideSeed["moveSet"][number];
    index: number;
    resources?: NegamonBattleResourceStateV4;
    energyAvailable?: number;
}): NegamonBattleChoiceV4 {
    const pp = input.resources?.ppByMoveId[input.move.negamonMoveId] ?? getDefaultPpForMove(input.move);
    const resolvedPp = isNegamonBasicAttackMoveId(input.move.negamonMoveId) ? Math.max(1, pp) : pp;
    const cooldown = input.resources?.cooldownByMoveId[input.move.negamonMoveId] ?? 0;
    const availableEnergy = input.energyAvailable ?? input.seed.energy;
    const hasEnergy = availableEnergy >= input.move.energyCost;
    const enabled = resolvedPp > 0 && cooldown <= 0 && hasEnergy;
    return {
        actionId: `${input.side}:${input.move.negamonMoveId}`,
        kind: "move",
        label: input.move.label,
        enabled,
        reason: resolvedPp <= 0 ? "NO_PP" : cooldown > 0 ? "ON_COOLDOWN" : !hasEnergy ? "NO_ENERGY" : undefined,
        moveId: input.move.negamonMoveId,
        moveSlot: input.index,
        targetSide: input.move.target === "self" ? input.side : input.side === "player" ? "opponent" : "player",
        cost: {
            pp: 1,
            energy: input.move.energyCost,
        },
    };
}

function ensureServerTruthFallbackChoice(input: {
    choices: NegamonBattleChoiceV4[];
    seed: NegamonShowdownSideSeed;
    resources: NegamonBattleResourceStateV4;
    energyAvailable: number;
    side: NegamonBattleSideV4;
    fainted: boolean;
}): NegamonBattleChoiceV4[] {
    if (input.fainted) return input.choices;
    if (input.choices.some((choice) => choice.enabled)) return input.choices;

    const basicMoveIndex = input.seed.moveSet.findIndex((move) => isNegamonBasicAttackMoveId(move.negamonMoveId));
    if (basicMoveIndex < 0) return input.choices;

    const basicMove = input.seed.moveSet[basicMoveIndex];
    const fallbackBasicChoice = createChoiceForMove({
        seed: input.seed,
        side: input.side,
        move: basicMove,
        index: basicMoveIndex,
        resources: input.resources,
        energyAvailable: input.energyAvailable,
    });
    const enabledBasicChoice: NegamonBattleChoiceV4 = {
        ...fallbackBasicChoice,
        enabled: true,
        reason: undefined,
        cost: {
            pp: 1,
            energy: basicMove.energyCost,
        },
    };

    const existingIndex = input.choices.findIndex((choice) => choice.moveId === basicMove.negamonMoveId);
    if (existingIndex >= 0) {
        const next = [...input.choices];
        next[existingIndex] = {
            ...next[existingIndex],
            ...enabledBasicChoice,
        };
        return next;
    }

    return [enabledBasicChoice, ...input.choices];
}

function createChoiceDiagnostics(input: {
    request: ParsedShowdownRequest | null;
    originalChoices: NegamonBattleChoiceV4[];
    resolvedChoices: NegamonBattleChoiceV4[];
    side: NegamonBattleSideV4;
    fainted: boolean;
}): NegamonBattleChoiceDiagnosticsV4 {
    const requestMissing = !input.request || input.request.moves.length === 0;
    const originalEnabledCount = input.originalChoices.filter((choice) => choice.enabled).length;
    const enabledChoiceCount = input.resolvedChoices.filter((choice) => choice.enabled).length;
    const usedFallbackBasicChoice =
        !input.fainted &&
        originalEnabledCount === 0 &&
        enabledChoiceCount > 0 &&
        input.resolvedChoices.some((choice) => choice.enabled && isNegamonBasicAttackMoveId(choice.moveId ?? ""));
    const allChoicesUnavailable = !input.fainted && originalEnabledCount === 0;

    let message: string | undefined;
    if (requestMissing) {
        message = "ข้อมูลคำสั่งของเทิร์นนี้หายไป ระบบจึงกลับไปใช้ตัวเลือกมาตรฐานของ Negamon อัตโนมัติ";
    } else if (usedFallbackBasicChoice) {
        message = "ทุกท่าในเทิร์นนี้ใช้ไม่ได้ ระบบจึงเปิดการโจมตีพื้นฐานให้เล่นต่อได้";
    } else if (allChoicesUnavailable) {
        message = "ฝั่งนี้ไม่มีแอ็กชันที่ใช้ได้ในตอนนี้";
    }

    return {
        side: input.side,
        requestMissing,
        allChoicesUnavailable,
        usedFallbackBasicChoice,
        enabledChoiceCount,
        message,
    };
}

function cloneState(state: NegamonBattleStateV4): NegamonBattleStateV4 {
    return {
        ...state,
        sides: {
            player: {
                ...state.sides.player,
                statSnapshot: { ...state.sides.player.statSnapshot },
                moveIds: [...state.sides.player.moveIds],
                statusIds: [...state.sides.player.statusIds],
                battleItemIds: [...state.sides.player.battleItemIds],
            },
            opponent: {
                ...state.sides.opponent,
                statSnapshot: { ...state.sides.opponent.statSnapshot },
                moveIds: [...state.sides.opponent.moveIds],
                statusIds: [...state.sides.opponent.statusIds],
                battleItemIds: [...state.sides.opponent.battleItemIds],
            },
        },
        choices: {
            player: state.choices.player.map((choice) => ({ ...choice, cost: choice.cost ? { ...choice.cost } : undefined })),
            opponent: state.choices.opponent.map((choice) => ({ ...choice, cost: choice.cost ? { ...choice.cost } : undefined })),
        },
        queue: state.queue.map((entry) => ({ ...entry })),
        events: state.events.map((event) => ({ ...event })),
        metadata: {
            ...state.metadata,
            showdown: {
                ...state.metadata.showdown,
                commandLog: state.metadata.showdown.commandLog.map((entry) => ({ ...entry })),
                aliases: {
                    player: state.metadata.showdown.aliases.player.map((entry) => ({ ...entry })),
                    opponent: state.metadata.showdown.aliases.opponent.map((entry) => ({ ...entry })),
                },
                adapterInputs: {
                    playerSeed: {
                        ...state.metadata.showdown.adapterInputs.playerSeed,
                        types: [...state.metadata.showdown.adapterInputs.playerSeed.types],
                        moveSet: state.metadata.showdown.adapterInputs.playerSeed.moveSet.map((move) => ({
                            ...move,
                            effects: move.effects.map((effect) => ({ ...effect })),
                        })),
                    },
                    opponentSeed: {
                        ...state.metadata.showdown.adapterInputs.opponentSeed,
                        types: [...state.metadata.showdown.adapterInputs.opponentSeed.types],
                        moveSet: state.metadata.showdown.adapterInputs.opponentSeed.moveSet.map((move) => ({
                            ...move,
                            effects: move.effects.map((effect) => ({ ...effect })),
                        })),
                    },
                },
                parsedRequests: {
                    player: snapshotRequest(state.metadata.showdown.parsedRequests.player),
                    opponent: snapshotRequest(state.metadata.showdown.parsedRequests.opponent),
                },
                choiceDiagnostics: {
                    player: { ...state.metadata.showdown.choiceDiagnostics.player },
                    opponent: { ...state.metadata.showdown.choiceDiagnostics.opponent },
                },
                p1Team: [...state.metadata.showdown.p1Team],
                p2Team: [...state.metadata.showdown.p2Team],
            },
            negamonFormula: {
                ...state.metadata.negamonFormula,
                expectations: {
                    player: state.metadata.negamonFormula.expectations.player.map((entry) => ({
                        ...entry,
                        formulaInput: {
                            ...entry.formulaInput,
                            actorTypes: [...entry.formulaInput.actorTypes],
                            targetTypes: [...entry.formulaInput.targetTypes],
                        },
                        result: { ...entry.result },
                    })),
                    opponent: state.metadata.negamonFormula.expectations.opponent.map((entry) => ({
                        ...entry,
                        formulaInput: {
                            ...entry.formulaInput,
                            actorTypes: [...entry.formulaInput.actorTypes],
                            targetTypes: [...entry.formulaInput.targetTypes],
                        },
                        result: { ...entry.result },
                    })),
                },
            },
            resources: {
                player: {
                    ppByMoveId: { ...state.metadata.resources.player.ppByMoveId },
                    maxPpByMoveId: { ...state.metadata.resources.player.maxPpByMoveId },
                    cooldownByMoveId: { ...state.metadata.resources.player.cooldownByMoveId },
                },
                opponent: {
                    ppByMoveId: { ...state.metadata.resources.opponent.ppByMoveId },
                    maxPpByMoveId: { ...state.metadata.resources.opponent.maxPpByMoveId },
                    cooldownByMoveId: { ...state.metadata.resources.opponent.cooldownByMoveId },
                },
            },
        },
    };
}

type ShowdownRuntimeModule = {
    BattleStream: new () => unknown;
    getPlayerStreams: (stream: unknown) => {
        omniscient: AsyncIterable<string> & { write(message: string): void };
        p1: AsyncIterable<string> & { write(message: string): void };
        p2: AsyncIterable<string> & { write(message: string): void };
    };
    Dex?: {
        species: {
            get: (id: string) => {
                exists?: boolean;
                baseStats?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
                types?: string[];
            };
        };
        moves: {
            get: (id: string) => {
                exists?: boolean;
                basePower?: number;
                type?: string;
                category?: string;
                accuracy?: number | true;
                priority?: number;
            };
        };
    };
};

function isShowdownRuntimeModule(value: unknown): value is ShowdownRuntimeModule {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.BattleStream === "function" && typeof candidate.getPlayerStreams === "function";
}

type ParsedShowdownExactHpSnapshot = {
    hp?: number;
    maxHp?: number;
    fainted: boolean;
};

async function loadShowdownRuntime(): Promise<ShowdownRuntimeModule> {
    const module = (await import("pokemon-showdown")) as {
        default?: unknown;
        "module.exports"?: unknown;
    };
    const candidate =
        (isShowdownRuntimeModule(module) ? module : null) ??
        (isShowdownRuntimeModule(module.default) ? module.default : null) ??
        (isShowdownRuntimeModule(module["module.exports"]) ? module["module.exports"] : null);

    if (!candidate) {
        throw new Error("Pokemon Showdown runtime is missing BattleStream/getPlayerStreams exports.");
    }

    // Register the Negamon stat-injection rule so `gen9customgame@@@negamonstatsmod`
    // overrides proxy base stats with the Negamon roster's tuned stats (idempotent).
    registerNegamonStatsRule(candidate.Dex as Parameters<typeof registerNegamonStatsRule>[0]);

    return candidate;
}

function parseRequestChunk(chunk: string | undefined): ParsedShowdownRequest | null {
    if (!chunk?.startsWith("|request|")) return null;
    const raw = chunk.slice("|request|".length);
    const value = JSON.parse(raw) as {
        active?: Array<{ moves?: Array<{ id: string; move: string; pp: number; maxpp: number; disabled?: boolean; target?: string }> }>;
        side?: { pokemon?: Array<{ condition?: string }> };
    };
    const condition = value.side?.pokemon?.[0]?.condition ?? "";
    const [hpPart, statusPart] = condition.split(" ");
    const [hpRaw, maxHpRaw] = hpPart.split("/");
    const hp = Number(hpRaw);
    const maxHp = Number(maxHpRaw);
    return {
        moves:
            value.active?.[0]?.moves?.map((move) => ({
                id: move.id,
                move: move.move,
                pp: move.pp,
                maxpp: move.maxpp,
                disabled: Boolean(move.disabled),
                target: move.target ?? "normal",
            })) ?? [],
        hp: Number.isFinite(hp) ? hp : undefined,
        maxHp: Number.isFinite(maxHp) ? maxHp : undefined,
        statusIds: statusPart ? [statusPart] : [],
        fainted: hpPart === "0" || condition.includes(" fnt"),
    };
}

function getLatestRequest(chunks: string[]): ParsedShowdownRequest | null {
    for (let index = chunks.length - 1; index >= 0; index -= 1) {
        const parsed = parseRequestChunk(chunks[index]);
        if (parsed) return parsed;
    }
    return null;
}

function parseHpCondition(raw: string): ParsedShowdownExactHpSnapshot | null {
    const normalized = raw.trim();
    if (!normalized) return null;
    const [hpPart] = normalized.split(" ");
    if (!hpPart) return null;
    if (hpPart === "0" || hpPart === "0/0") {
        return { hp: 0, maxHp: 0, fainted: true };
    }
    const [hpRaw, maxHpRaw] = hpPart.split("/");
    const hp = Number(hpRaw);
    const maxHp = Number(maxHpRaw);
    if (!Number.isFinite(hp)) return null;
    return {
        hp,
        maxHp: Number.isFinite(maxHp) ? maxHp : undefined,
        fainted: normalized.includes(" fnt") || hp <= 0,
    };
}

function getLatestExactHpSnapshot(chunks: string[], sideId: "p1" | "p2"): ParsedShowdownExactHpSnapshot | null {
    const sidePattern = new RegExp(`^${sideId}[a-z]?:`);
    for (let chunkIndex = chunks.length - 1; chunkIndex >= 0; chunkIndex -= 1) {
        const lines = chunks[chunkIndex]?.split("\n") ?? [];
        for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
            const line = lines[lineIndex]?.trim();
            if (!line?.startsWith("|")) continue;
            const parts = line.split("|");
            const kind = parts[1] ?? "";
            const subject = parts[2] ?? "";
            if (!sidePattern.test(subject)) continue;

            if (kind === "faint") {
                return { hp: 0, maxHp: 0, fainted: true };
            }

            if (
                kind === "switch" ||
                kind === "drag" ||
                kind === "replace" ||
                kind === "detailschange" ||
                kind === "-formechange" ||
                kind === "-damage" ||
                kind === "-heal"
            ) {
                const hpStatus = parts[4] ?? parts[3] ?? "";
                const parsed = parseHpCondition(hpStatus);
                if (parsed) return parsed;
            }

            if (kind === "-sethp") {
                const hpStatus = parts[3] ?? "";
                const parsed = parseHpCondition(hpStatus);
                if (parsed) return parsed;
            }
        }
    }
    return null;
}

export function createNegamonBattleChoicesFromRequestV4(input: {
    request: ParsedShowdownRequest | null;
    aliases: Array<{ moveSlot: number; negamonMoveId: string; label: string; showdownMoveId: string; energyCost: number }>;
    seed: NegamonShowdownSideSeed;
    resources: NegamonBattleResourceStateV4;
    energyAvailable: number;
    side: NegamonBattleSideV4;
    fainted?: boolean;
}): NegamonBattleChoiceV4[] {
    const fallbackChoices = createMoveChoices(input.seed, input.side, input.resources, input.energyAvailable);
    if (!input.request || input.request.moves.length === 0) {
        return ensureServerTruthFallbackChoice({
            choices: fallbackChoices,
            seed: input.seed,
            resources: input.resources,
            energyAvailable: input.energyAvailable,
            side: input.side,
            fainted: input.fainted ?? false,
        });
    }

    const choices: NegamonBattleChoiceV4[] = input.aliases.map((alias) => {
        const move = input.request?.moves[alias.moveSlot];
        const sideMove = input.seed.moveSet[alias.moveSlot];
        const isBasic = isNegamonBasicAttackMoveId(alias.negamonMoveId);
        const pp = input.resources.ppByMoveId[alias.negamonMoveId] ?? move?.pp ?? 0;
        const resolvedPp = isBasic ? Math.max(1, pp) : pp;
        const cooldown = input.resources.cooldownByMoveId[alias.negamonMoveId] ?? 0;
        const hasEnergy = input.energyAvailable >= alias.energyCost;
        const hasShowdownPp = isBasic || (move?.pp ?? 0) > 0;
        const enabled = Boolean(move && !move.disabled && hasShowdownPp && resolvedPp > 0 && cooldown <= 0 && hasEnergy);
        return {
            actionId: `${input.side}:${alias.negamonMoveId}`,
            kind: "move",
            label: alias.label,
            enabled,
            reason: !move
                ? "INVALID_TARGET"
                : move.disabled
                  ? "LOCKED"
                    : (!isBasic && move.pp <= 0) || resolvedPp <= 0
                    ? "NO_PP"
                    : cooldown > 0
                      ? "ON_COOLDOWN"
                      : !hasEnergy
                        ? "NO_ENERGY"
                        : undefined,
            moveId: alias.negamonMoveId,
            moveSlot: alias.moveSlot,
            targetSide: sideMove?.target === "self" || move?.target === "self" ? input.side : input.side === "player" ? "opponent" : "player",
            cost: {
                pp: move ? 1 : 0,
                energy: alias.energyCost,
            },
        };
    });

    return ensureServerTruthFallbackChoice({
        choices,
        seed: input.seed,
        resources: input.resources,
        energyAvailable: input.energyAvailable,
        side: input.side,
        fainted: input.fainted ?? false,
    });
}

function getFormulaCategory(move: NegamonShowdownSideSeed["moveSet"][number]): NegamonFormulaCategory {
    if (
        move.power <= 0 ||
        move.category === "status" ||
        move.category === "heal" ||
        move.category === "buff" ||
        move.category === "debuff"
    ) {
        return "STATUS";
    }
    // Use the raw MonsterMove.category ("PHYSICAL"/"SPECIAL") to correctly split
    // attack vs special-attack stat — NegamonSkillCategory "special" means "physical with
    // secondary effect" and should not be treated as the formula's SPECIAL category.
    return move.sourceCategory === "SPECIAL" ? "SPECIAL" : "PHYSICAL";
}


function createFormulaExpectations(input: {
    actor: NegamonBattleCombatantV4;
    target: NegamonBattleCombatantV4;
    seed: NegamonShowdownSideSeed;
    actorSide: NegamonBattleSideV4;
}): NegamonFormulaDamageExpectationV4[] {
    const targetSide = input.actorSide === "player" ? "opponent" : "player";
    return input.seed.moveSet.map((move, moveSlot) => {
        const category = getFormulaCategory(move);
        const result = calculateFormulaDamage({
            actor: {
                level: input.actor.level,
                types: input.actor.types,
                stats: {
                    maxHp: input.actor.statSnapshot.hp,
                    attack: input.actor.statSnapshot.attack,
                    defense: input.actor.statSnapshot.defense,
                    specialAttack: input.actor.statSnapshot.specialAttack,
                    specialDefense: input.actor.statSnapshot.specialDefense,
                    speed: input.actor.statSnapshot.speed,
                },
                statStages: createNeutralStatStages(),
            },
            target: {
                level: input.target.level,
                types: input.target.types,
                stats: {
                    maxHp: input.target.statSnapshot.hp,
                    attack: input.target.statSnapshot.attack,
                    defense: input.target.statSnapshot.defense,
                    specialAttack: input.target.statSnapshot.specialAttack,
                    specialDefense: input.target.statSnapshot.specialDefense,
                    speed: input.target.statSnapshot.speed,
                },
                statStages: createNeutralStatStages(),
            },
            move: {
                id: move.negamonMoveId,
                type: move.type,
                category,
                power: move.power,
                accuracy: move.accuracy,
                priority: move.priority,
            },
            critical: false,
            randomMultiplier: 1,
        });

        return {
            moveSlot,
            moveId: move.negamonMoveId,
            label: move.label,
            actorSide: input.actorSide,
            targetSide,
            formulaInput: {
                level: input.actor.level,
                power: move.power,
                attack: category === "SPECIAL" ? input.actor.statSnapshot.specialAttack : input.actor.statSnapshot.attack,
                defense: category === "SPECIAL" ? input.target.statSnapshot.specialDefense : input.target.statSnapshot.defense,
                moveType: move.type,
                actorTypes: [...input.actor.types],
                targetTypes: [...input.target.types],
                category,
                randomMultiplier: 1,
                critical: false,
            },
            result: {
                damage: result.damage,
                rawDamage: result.rawDamage,
                stab: result.stab,
                typeMultiplier: result.typeMultiplier,
                effectiveness: result.effectiveness,
                capped: result.capped,
            },
        };
    });
}

function syncFormulaMetadata(state: NegamonBattleStateV4): void {
    state.metadata.negamonFormula.expectations = {
        player: createFormulaExpectations({
            actor: state.sides.player,
            target: state.sides.opponent,
            seed: state.metadata.showdown.adapterInputs.playerSeed,
            actorSide: "player",
        }),
        opponent: createFormulaExpectations({
            actor: state.sides.opponent,
            target: state.sides.player,
            seed: state.metadata.showdown.adapterInputs.opponentSeed,
            actorSide: "opponent",
        }),
    };
}

function getEventId(state: NegamonBattleStateV4, offset = 1): string {
    return `${state.battleId}:v4:event:${state.events.length + offset}`;
}

function getActionMove(state: NegamonBattleStateV4, action: NegamonBattleActionV4 | null | undefined) {
    if (!action || action.kind !== "move") return null;
    const seed =
        action.actorSide === "player"
            ? state.metadata.showdown.adapterInputs.playerSeed
            : state.metadata.showdown.adapterInputs.opponentSeed;
    return seed.moveSet.find((move, index) => index === action.moveSlot || move.negamonMoveId === action.moveId) ?? null;
}

function getStatusDurationTurns(status: string, explicitDuration?: number): number | null {
    if (typeof explicitDuration === "number") return explicitDuration;
    if (status === "POISON" || status === "BADLY_POISON") return null;
    return 2;
}

function getStatusStacking(status: string): "refresh" | "stack_intensity" | "unique" {
    return status === "BADLY_POISON" ? "stack_intensity" : "refresh";
}

function toStatStageKey(stat: string): NegamonBattleStatStageKeyV4 | null {
    if (stat === "attack" || stat === "defense" || stat === "speed") return stat;
    if (stat === "specialAttack" || stat === "specialDefense") return stat;
    return null;
}

function appendEffectEvents(input: {
    state: NegamonBattleStateV4;
    action: NegamonBattleActionV4 | null | undefined;
    before: NegamonBattleCombatantV4;
    after: NegamonBattleCombatantV4;
    targetBefore: NegamonBattleCombatantV4;
    targetAfter: NegamonBattleCombatantV4;
}): void {
    const move = getActionMove(input.state, input.action);
    if (!move || !input.action) return;
    const actor = input.state.sides[input.action.actorSide];
    const targetSide = input.action.targetSide ?? (input.action.actorSide === "player" ? "opponent" : "player");
    const target = input.state.sides[targetSide];
    const hpDelta = input.targetAfter.hp - input.targetBefore.hp;
    const actorHpDelta = input.after.hp - input.before.hp;
    const events: NegamonBattleEventV4[] = [];

    const formulaExp = input.state.metadata.negamonFormula.expectations[input.action.actorSide].find(
        (e) => e.moveId === move.negamonMoveId
    );
    const effectiveness = formulaExp?.result.effectiveness;

    if (move.priority > 0) {
        events.push({
            id: getEventId(input.state, events.length + 1),
            turn: input.state.turn,
            kind: "priority_applied",
            actorSide: input.action.actorSide,
            targetSide,
            moveId: move.negamonMoveId,
            effectFamily: "priority",
            effectKind: "priority",
            priority: move.priority,
            message: `${actor.name} ใช้ความไวลำดับ ${move.priority > 0 ? `+${move.priority}` : move.priority} กับ ${move.label}`,
        });
    }

    if (move.cooldownTurns > 0) {
        events.push({
            id: getEventId(input.state, events.length + 1),
            turn: input.state.turn,
            kind: "cooldown_applied",
            actorSide: input.action.actorSide,
            targetSide,
            moveId: move.negamonMoveId,
            effectFamily: "cooldown",
            effectKind: "cooldown",
            cooldownTurns: move.cooldownTurns,
            message: `${move.label} เข้าคูลดาวน์ ${move.cooldownTurns} เทิร์น`,
        });
    }

    if (hpDelta < 0) {
        const dmg = Math.abs(hpDelta);
        const effLabel =
            effectiveness === "effective" ? " (super effective!)" :
            effectiveness === "resisted" ? " (not very effective)" :
            effectiveness === "immune" ? " (immune)" : "";
        events.push({
            id: getEventId(input.state, events.length + 1),
            turn: input.state.turn,
            kind: "damage_applied",
            actorSide: input.action.actorSide,
            targetSide,
            moveId: move.negamonMoveId,
            effectFamily: "damage",
            effectKind: "damage",
            moveName: move.label,
            effectiveness,
            damage: dmg,
            hpBefore: input.targetBefore.hp,
            hpAfter: input.targetAfter.hp,
            targetMaxHp: target.maxHp,
            message: `${move.label} — ${dmg} dmg${effLabel} — HP ${input.targetAfter.hp}/${target.maxHp}`,
        });
    } else if (move.effects.some((effect) => effect.kind === "damage" && effect.power > 0)) {
        events.push({
            id: getEventId(input.state, events.length + 1),
            turn: input.state.turn,
            kind: "move_missed",
            actorSide: input.action.actorSide,
            targetSide,
            moveId: move.negamonMoveId,
            effectFamily: "damage",
            effectKind: "damage",
            moveName: move.label,
            damage: 0,
            missed: true,
            message: `${move.label} — พลาดเป้า`,
        });
    }

    if (actorHpDelta > 0) {
        events.push({
            id: getEventId(input.state, events.length + 1),
            turn: input.state.turn,
            kind: "heal_applied",
            actorSide: input.action.actorSide,
            targetSide: input.action.actorSide,
            moveId: move.negamonMoveId,
            effectFamily: "heal",
            effectKind: "heal",
            moveName: move.label,
            healing: actorHpDelta,
            message: `${move.label} — ฟื้นฟู HP ${actorHpDelta}`,
        });
    }

    for (const effect of move.effects) {
        if (effect.kind === "heal" && actorHpDelta <= 0) {
            events.push({
                id: getEventId(input.state, events.length + 1),
                turn: input.state.turn,
                kind: "heal_applied",
                actorSide: input.action.actorSide,
                targetSide: input.action.actorSide,
                moveId: move.negamonMoveId,
                effectFamily: "heal",
                effectKind: "heal",
                healing: 0,
                message: `${move.label} พยายามฟื้นฟู HP`,
            });
        }

        if (effect.kind === "stat_stage") {
            const stat = toStatStageKey(effect.stat);
            if (!stat) continue;
            const isSelfBuff = move.effectFamily === "SELF_BOOST" || move.effectFamily === "SHIELD" || effect.target === "self";
            const resolvedTarget = isSelfBuff ? input.action.actorSide : (effect.target === "enemy" || effect.target === "allEnemies" ? targetSide : input.action.actorSide);
            const sign = effect.stages > 0 ? "+" : "";
            events.push({
                id: getEventId(input.state, events.length + 1),
                turn: input.state.turn,
                kind: "stat_stage_changed",
                actorSide: input.action.actorSide,
                targetSide: resolvedTarget,
                moveId: move.negamonMoveId,
                effectFamily: move.effectFamily === "SHIELD" ? "shield" : effect.stages >= 0 ? "buff" : "debuff",
                effectKind: "stat_stage",
                moveName: move.label,
                statStageDelta: {
                    stat,
                    stages: effect.stages,
                    durationTurns: effect.durationTurns ?? 2,
                },
                message: `${move.label} — ${formatBattleStatLabel(stat)} ${sign}${effect.stages}`,
            });
        }

        if (effect.kind === "status" || effect.kind === "self_status") {
            const resolvedTarget = effect.kind === "self_status" ? input.action.actorSide : targetSide;
            const durationTurns = getStatusDurationTurns(effect.effect, effect.durationTurns);
            events.push({
                id: getEventId(input.state, events.length + 1),
                turn: input.state.turn,
                kind: "status_applied",
                actorSide: input.action.actorSide,
                targetSide: resolvedTarget,
                moveId: move.negamonMoveId,
                effectFamily: "status",
                effectKind: "status",
                statusTimeline: [
                    {
                        status: effect.effect,
                        action: "applied",
                        message: `${formatBattleStatusLabel(effect.effect)} ติดสถานะ`,
                        durationTurns,
                        stacking: getStatusStacking(effect.effect),
                    },
                ],
                message: `${move.label} ทำให้เกิดสถานะ${formatBattleStatusLabel(effect.effect)}`,
            });
        }

        if (effect.kind === "energy_shift") {
            const resolvedTarget = effect.target === "self" ? input.action.actorSide : targetSide;
            events.push({
                id: getEventId(input.state, events.length + 1),
                turn: input.state.turn,
                kind: "energy_changed",
                actorSide: input.action.actorSide,
                targetSide: resolvedTarget,
                moveId: move.negamonMoveId,
                effectFamily: effect.amount >= 0 ? "energy_gain" : "energy_drain",
                effectKind: "energy_shift",
                energyDelta: effect.amount,
                message: `${move.label} เปลี่ยนพลังงาน${resolvedTarget === input.action.actorSide ? "ฝ่ายตนเอง" : "ฝ่ายตรงข้าม"} ${effect.amount > 0 ? "+" : ""}${effect.amount}`,
            });
        }

        if (effect.kind === "drain" && hpDelta < 0) {
            const healing = Math.max(1, Math.floor(Math.abs(hpDelta) * (effect.percent / 100)));
            events.push({
                id: getEventId(input.state, events.length + 1),
                turn: input.state.turn,
                kind: "heal_applied",
                actorSide: input.action.actorSide,
                targetSide: input.action.actorSide,
                moveId: move.negamonMoveId,
                effectFamily: "heal",
                effectKind: "heal",
                healing,
                message: `${actor.name} ดูดพลังชีวิตกลับ ${healing} HP`,
            });
        }
    }

    input.state.events.push(...events);
}

function applyResourceCommit(state: NegamonBattleStateV4, action: NegamonBattleActionV4 | null | undefined): void {
    const move = getActionMove(state, action);
    if (!move || !action || action.kind !== "move") return;
    const resources = state.metadata.resources[action.actorSide];
    const actor = state.sides[action.actorSide];
    if (!isNegamonBasicAttackMoveId(move.negamonMoveId)) {
        resources.ppByMoveId[move.negamonMoveId] = Math.max(0, (resources.ppByMoveId[move.negamonMoveId] ?? getDefaultPpForMove(move)) - 1);
    }
    resources.cooldownByMoveId[move.negamonMoveId] = Math.max(0, move.cooldownTurns);
    actor.energy = Math.max(0, actor.energy - move.energyCost);
}

function tickCooldowns(resources: NegamonBattleResourceStateV4): void {
    for (const [moveId, remaining] of Object.entries(resources.cooldownByMoveId)) {
        resources.cooldownByMoveId[moveId] = Math.max(0, remaining - 1);
    }
}

function appendBattleStartHooks(state: NegamonBattleStateV4): void {
    for (const side of ["player", "opponent"] as const) {
        const seed = state.metadata.showdown.adapterInputs[side === "player" ? "playerSeed" : "opponentSeed"];
        for (const itemId of seed.heldItemIds) {
            state.events.push({
                id: getEventId(state),
                turn: state.turn,
                kind: "item_activated",
                actorSide: side,
                targetSide: side,
                itemId,
                effectFamily: "buff",
                effectKind: "shield",
                message: `${state.sides[side].name}'s ${itemId} activated at battle start.`,
            });
        }
        if (seed.traitId) {
            state.events.push({
                id: getEventId(state),
                turn: state.turn,
                kind: "trait_activated",
                actorSide: side,
                targetSide: side,
                traitId: seed.traitId,
                effectFamily: "buff",
                effectKind: "stat_stage",
                message: `${state.sides[side].name}'s ${seed.traitName ?? seed.traitId} activated.`,
            });
        }
    }
}

function applyHeldItemTurnHooks(state: NegamonBattleStateV4): void {
    for (const side of ["player", "opponent"] as const) {
        const seed = state.metadata.showdown.adapterInputs[side === "player" ? "playerSeed" : "opponentSeed"];
        for (const itemId of seed.heldItemIds) {
            const item = findNegamonBattleItemDefinition(itemId);
            if (!item) continue;
            for (const effect of item.effects) {
                if (effect.kind === "energy_regen") {
                    const before = state.sides[side].energy;
                    state.sides[side].energy = Math.min(state.sides[side].maxEnergy, before + effect.amount);
                    const energyDelta = state.sides[side].energy - before;
                    state.events.push({
                        id: getEventId(state),
                        turn: state.turn,
                        kind: "item_activated",
                        actorSide: side,
                        targetSide: side,
                        itemId,
                        effectFamily: "energy_gain",
                        effectKind: "energy_shift",
                        energyDelta,
                        message: `${itemId} ของ ${state.sides[side].name} ฟื้นฟูพลังงาน ${energyDelta}`,
                    });
                }
                if (effect.kind === "damage_taken_multiplier") {
                    state.events.push({
                        id: getEventId(state),
                        turn: state.turn,
                        kind: "shield_changed",
                        actorSide: side,
                        targetSide: side,
                        itemId,
                        effectFamily: "shield",
                        effectKind: "shield",
                        message: `${itemId} ของ ${state.sides[side].name} ช่วยลดแรงปะทะที่ได้รับ`,
                    });
                }
            }
        }
    }
}

function applyBaseEnergyRegen(state: NegamonBattleStateV4): void {
    for (const side of ["player", "opponent"] as const) {
        const actor = state.sides[side];
        const amount = getEnergyProfileForSpecies(actor.speciesId).regenPerTurn;
        if (amount <= 0 || actor.energy >= actor.maxEnergy) continue;
        const before = actor.energy;
        actor.energy = Math.min(actor.maxEnergy, actor.energy + amount);
        const energyDelta = actor.energy - before;
        if (energyDelta <= 0) continue;
        state.events.push({
            id: getEventId(state),
            turn: state.turn,
            kind: "energy_changed",
            actorSide: side,
            targetSide: side,
            effectFamily: "energy_gain",
            effectKind: "energy_shift",
            energyDelta,
            message: `${actor.name} ฟื้นฟูพลังงาน ${energyDelta}`,
        });
    }
}

async function replayShowdownState(state: NegamonBattleStateV4) {
    const showdown = await loadShowdownRuntime();
    const streams = showdown.getPlayerStreams(new showdown.BattleStream());
    const out = { omni: [] as string[], p1: [] as string[], p2: [] as string[] };

    const listen = async (stream: AsyncIterable<string>, bucket: string[]) => {
        for await (const chunk of stream) bucket.push(chunk);
    };

    void listen(streams.omniscient, out.omni);
    void listen(streams.p1, out.p1);
    void listen(streams.p2, out.p2);

    for (const entry of state.metadata.showdown.commandLog) {
        if (entry.stream === "omniscient") streams.omniscient.write(entry.message);
        if (entry.stream === "p1") streams.p1.write(entry.message);
        if (entry.stream === "p2") streams.p2.write(entry.message);
        await new Promise((resolve) => setTimeout(resolve, 30));
    }

    let stablePasses = 0;
    let lastSignature = "";
    for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const signature = `${out.omni.length}:${out.p1.length}:${out.p2.length}`;
        if (signature === lastSignature) {
            stablePasses += 1;
            if (stablePasses >= 2) break;
        } else {
            stablePasses = 0;
            lastSignature = signature;
        }
    }
    return out;
}

function deriveCombatantActiveState(state: NegamonBattleStateV4): void {
    const sides: NegamonBattleSideV4[] = ["player", "opponent"];
    for (const side of sides) {
        state.sides[side].statStages = { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
        state.sides[side].activeStatusIds = [];
    }
    for (const event of state.events) {
        const side = event.targetSide;
        if (!side) continue;
        if (event.kind === "stat_stage_changed" && event.statStageDelta) {
            const { stat, stages, durationTurns } = event.statStageDelta;
            const expired = durationTurns != null && event.turn + durationTurns < state.turn;
            if (!expired) {
                const cur = state.sides[side].statStages[stat] ?? 0;
                state.sides[side].statStages[stat] = Math.max(-6, Math.min(6, cur + stages));
            }
        }
        if (event.kind === "status_applied" && event.statusTimeline?.[0]) {
            const { status, durationTurns } = event.statusTimeline[0];
            const expired = durationTurns != null && event.turn + durationTurns < state.turn;
            if (!expired && !state.sides[side].activeStatusIds.includes(status)) {
                state.sides[side].activeStatusIds.push(status);
            }
        }
        if ((event.kind === "status_expired" || event.kind === "cleanse_applied") && event.statusTimeline?.[0]) {
            const { status } = event.statusTimeline[0];
            state.sides[side].activeStatusIds = state.sides[side].activeStatusIds.filter((id) => id !== status);
        }
    }
}

function syncCombatantFromReplay(input: {
    combatant: NegamonBattleCombatantV4;
    request: ParsedShowdownRequest | null;
    exactHp: ParsedShowdownExactHpSnapshot | null;
}): NegamonBattleCombatantV4 {
    const { combatant, request, exactHp } = input;
    if (!request && !exactHp) return combatant;
    const hpSource = exactHp?.hp !== undefined ? exactHp : request;
    const exactFaint = Boolean(exactHp?.fainted || exactHp?.hp === 0);
    const hpRatio =
        exactFaint
            ? 0
            : typeof hpSource?.hp === "number" && typeof hpSource?.maxHp === "number" && hpSource.maxHp > 0
            ? hpSource.hp / hpSource.maxHp
            : combatant.hp / Math.max(1, combatant.maxHp);
    const nextHp = Math.max(0, Math.min(combatant.maxHp, Math.round(combatant.maxHp * hpRatio)));
    return {
        ...combatant,
        hp: nextHp,
        maxHp: combatant.maxHp,
        statusIds: request ? [...request.statusIds] : combatant.statusIds,
        fainted: Boolean(exactFaint || request?.fainted || nextHp <= 0),
    };
}

function getOpponentSide(side: NegamonBattleSideV4): NegamonBattleSideV4 {
    return side === "player" ? "opponent" : "player";
}

function getMoveSetForSide(state: NegamonBattleStateV4, side: NegamonBattleSideV4): NegamonShowdownSideSeed["moveSet"] {
    return state.metadata.showdown.adapterInputs[side === "player" ? "playerSeed" : "opponentSeed"].moveSet;
}

function getMoveForChoice(
    state: NegamonBattleStateV4,
    side: NegamonBattleSideV4,
    choice: NegamonBattleChoiceV4
): NegamonShowdownSideSeed["moveSet"][number] | null {
    return (
        getMoveSetForSide(state, side).find((move, index) => index === choice.moveSlot || move.negamonMoveId === choice.moveId) ??
        null
    );
}

function getFormulaExpectationForChoice(
    state: NegamonBattleStateV4,
    side: NegamonBattleSideV4,
    choice: NegamonBattleChoiceV4
): NegamonFormulaDamageExpectationV4 | null {
    return (
        state.metadata.negamonFormula.expectations[side].find(
            (entry) => entry.moveSlot === choice.moveSlot || entry.moveId === choice.moveId
        ) ?? null
    );
}

export function scoreNegamonBattleChoiceV4(input: {
    state: NegamonBattleStateV4;
    side: NegamonBattleSideV4;
    choice: NegamonBattleChoiceV4;
}): NegamonBattleAiScoredChoiceV4 {
    const { state, side, choice } = input;
    if (!choice.enabled) {
        return {
            choice,
            score: Number.NEGATIVE_INFINITY,
            breakdown: {
                lethalDamage: 0,
                damage: 0,
                survival: 0,
                energyEfficiency: 0,
                statusValue: 0,
                setupValue: 0,
                cooldownTiming: 0,
            },
        };
    }

    const actor = state.sides[side];
    const target = state.sides[getOpponentSide(side)];
    const move = getMoveForChoice(state, side, choice);
    const expectation = getFormulaExpectationForChoice(state, side, choice);
    const expectedDamage = expectation?.result.damage ?? move?.effects.find((effect) => effect.kind === "damage")?.power ?? 0;
    const targetHpRatio = target.hp / Math.max(1, target.maxHp);
    const actorHpRatio = actor.hp / Math.max(1, actor.maxHp);
    const missingHp = Math.max(0, actor.maxHp - actor.hp);
    const energyCost = choice.cost?.energy ?? move?.energyCost ?? 0;
    const remainingEnergy = actor.energy - energyCost;
    const cooldownTurns = move?.cooldownTurns ?? 0;
    const effects = move?.effects ?? [];

    const lethalDamage = expectedDamage >= target.hp && expectedDamage > 0 ? 500 : 0;
    const damage = expectedDamage + (expectedDamage / Math.max(1, target.hp)) * 120;
    const survival = effects.reduce((score, effect) => {
        if (effect.kind === "heal") return score + Math.min(80, missingHp * (effect.percent / 100)) + (actorHpRatio < 0.35 ? 45 : 12);
        if (effect.kind === "stat_stage" && effect.stages > 0 && (effect.stat === "defense" || effect.stat === "speed")) {
            return score + (actorHpRatio < 0.5 ? 36 : 18) + effect.stages * 8;
        }
        if (effect.kind === "drain") return score + (actorHpRatio < 0.55 ? 24 : 10);
        return score;
    }, 0);
    const energyEfficiency = energyCost <= 0 ? 30 : Math.max(-35, 34 - energyCost * 0.6 + Math.max(0, remainingEnergy) * 0.08);
    const statusValue = effects.reduce((score, effect) => {
        if (effect.kind === "status") return score + (target.activeStatusIds.length > 0 ? 8 : 42) + (targetHpRatio > 0.45 ? 16 : -10);
        if (effect.kind === "energy_shift" && effect.amount < 0) return score + 24 + Math.min(20, Math.abs(effect.amount));
        if (
            effect.kind === "stat_stage" &&
            effect.stages < 0 &&
            (effect.stat === "specialAttack" || effect.stat === "attack" || effect.stat === "speed")
        ) {
            return score + (targetHpRatio > 0.35 ? 26 : 12) + Math.abs(effect.stages) * 8;
        }
        return score;
    }, 0);
    const setupValue = effects.reduce((score, effect) => {
        if (effect.kind !== "stat_stage") return score;
        if (effect.stages > 0) {
            const currentStage = actor.statStages[effect.stat as keyof typeof actor.statStages] ?? 0;
            if (currentStage >= 4) return score - 30;
            const readiness = actorHpRatio > 0.65 ? 40 : actorHpRatio > 0.4 ? 18 : -15;
            return score + readiness + effect.stages * 10;
        }
        return score + (targetHpRatio > 0.3 ? 34 : 12) + Math.abs(effect.stages) * 10;
    }, 0);
    const cooldownTiming =
        cooldownTurns <= 0
            ? 8
            : lethalDamage > 0
              ? 45 - cooldownTurns * 4
              : targetHpRatio < 0.4
                ? 20 - cooldownTurns * 5
                : -cooldownTurns * 10;

    const breakdown = {
        lethalDamage,
        damage,
        survival,
        energyEfficiency,
        statusValue,
        setupValue,
        cooldownTiming,
    };
    const score = Object.values(breakdown).reduce((total, value) => total + value, 0);
    return { choice, score, breakdown };
}

export function chooseNegamonBattleAiActionV4(input: {
    state: NegamonBattleStateV4;
    side: NegamonBattleSideV4;
}): { action: NegamonBattleActionV4 | null; scoredChoices: NegamonBattleAiScoredChoiceV4[] } {
    const scoredChoices = input.state.choices[input.side]
        .map((choice) => scoreNegamonBattleChoiceV4({ state: input.state, side: input.side, choice }))
        .sort((left, right) => right.score - left.score || (left.choice.moveSlot ?? 99) - (right.choice.moveSlot ?? 99));
    const selected = scoredChoices.find((entry) => entry.choice.enabled)?.choice;
    if (!selected) return { action: null, scoredChoices };
    return {
        action: {
            actorSide: input.side,
            kind: "move",
            moveId: selected.moveId,
            moveSlot: selected.moveSlot,
            targetSide: selected.targetSide,
        },
        scoredChoices,
    };
}

function resolveItemAction(state: NegamonBattleStateV4, action: NegamonBattleActionV4): NegamonBattleAdapterResolution {
    const itemId = action.itemId?.trim();
    if (!itemId || !state.sides.player.battleItemIds.includes(itemId)) {
        return { ok: false, code: "INVALID_ACTION", state, validChoices: state.choices.player };
    }
    const item = findNegamonBattleItemDefinition(itemId);
    if (!item || item.battleKind !== "usable") {
        return { ok: false, code: "INVALID_ACTION", state, validChoices: state.choices.player };
    }

    const next = cloneState(state);
    const before = next.sides.player;
    let after = {
        hp: before.hp,
        energy: before.energy,
        maxEnergy: before.maxEnergy,
        stats: { hp: before.maxHp },
    };
    for (const effect of item.effects) {
        after = applyNegamonConsumableBattleItemEffect({ combatant: after, effect });
    }
    next.sides.player = {
        ...before,
        hp: after.hp,
        energy: after.energy,
        battleItemIds: before.battleItemIds.filter((id) => id !== itemId),
    };
    const healing = Math.max(0, next.sides.player.hp - before.hp);
    const energyDelta = next.sides.player.energy - before.energy;
    next.events.push({
        id: getEventId(next),
        turn: next.turn,
        kind: "item_activated",
        actorSide: "player",
        targetSide: "player",
        itemId,
        effectFamily: healing > 0 ? "heal" : energyDelta > 0 ? "energy_gain" : "buff",
        effectKind: healing > 0 ? "heal" : energyDelta > 0 ? "energy_shift" : "shield",
        healing: healing || undefined,
        energyDelta: energyDelta || undefined,
        message: `${next.sides.player.name} used ${itemId}.`,
    });
    next.stateVersion += 1;
    next.choiceRequestId = createNegamonBattleChoiceRequestIdV4(next);
    return {
        ok: true,
        state: next,
        validChoices: next.choices.player,
    };
}

function buildStartMessage(input: {
    formatid: string;
    seed: [number, number, number, number];
    p1: unknown[];
    p2: unknown[];
}) {
    return `>start ${JSON.stringify({ formatid: input.formatid, seed: input.seed })}
>player p1 ${JSON.stringify({ name: "Player", team: input.p1 })}
>player p2 ${JSON.stringify({ name: "Opponent", team: input.p2 })}`;
}

export function createNegamonShowdownBattleAdapter(): NegamonBattleEngineAdapterV4 {
    return {
        target: NEGAMON_BATTLE_ENGINE_TARGET,
        async createBattle(input) {
            const showdown = await loadShowdownRuntime();
            const playerSeed = createNegamonShowdownSideSeed({ snapshot: input.player });
            const opponentSeed = createNegamonShowdownSideSeed({ snapshot: input.opponent });
            const p1Team = [createNegamonShowdownTeamSet(playerSeed)];
            const p2Team = [createNegamonShowdownTeamSet(opponentSeed)];
            const resources = {
                player: createResourceState(playerSeed),
                opponent: createResourceState(opponentSeed),
            };
            const playerAliases = playerSeed.moveSet.map((move, moveSlot) => ({
                moveSlot,
                negamonMoveId: move.negamonMoveId,
                label: move.label,
                showdownMoveId: move.id,
                energyCost: move.energyCost,
            }));
            const opponentAliases = opponentSeed.moveSet.map((move, moveSlot) => ({
                moveSlot,
                negamonMoveId: move.negamonMoveId,
                label: move.label,
                showdownMoveId: move.id,
                energyCost: move.energyCost,
            }));

            const state: NegamonBattleStateV4 = {
                battleId: input.battleId,
                engineVersion: "negamon_v4_showdown_adapter",
                adapterKind: "showdown",
                phase: "choosing",
                turn: 1,
                stateVersion: 1,
                seed: input.seed,
                choiceRequestId: "",
                sides: {
                    player: createNegamonBattleCombatantV4FromSeed(playerSeed),
                    opponent: createNegamonBattleCombatantV4FromSeed(opponentSeed),
                },
                choices: {
                    player: createMoveChoices(playerSeed, "player", resources.player),
                    opponent: createMoveChoices(opponentSeed, "opponent", resources.opponent),
                },
                queue: [],
                events: [],
                metadata: {
                    upstream: "smogon/pokemon-showdown",
                    packageName: "pokemon-showdown",
                    protocolVersion: 1,
                    showdown: {
                        formatid: NEGAMON_V4_FORMAT_ID,
                        commandLog: [
                            {
                                stream: "omniscient",
                                message: buildStartMessage({
                                    formatid: NEGAMON_V4_FORMAT_ID,
                                    seed: [input.seed, input.seed + 1, input.seed + 2, input.seed + 3] as [number, number, number, number],
                                    p1: p1Team,
                                    p2: p2Team,
                                }),
                            },
                            { stream: "p1", message: "team 1" },
                            { stream: "p2", message: "team 1" },
                        ],
                        aliases: {
                            player: playerAliases,
                            opponent: opponentAliases,
                        },
                        adapterInputs: {
                            playerSeed,
                            opponentSeed,
                        },
                        parsedRequests: {
                            player: null,
                            opponent: null,
                        },
                        choiceDiagnostics: {
                            player: {
                                side: "player",
                                requestMissing: false,
                                allChoicesUnavailable: false,
                                usedFallbackBasicChoice: false,
                                enabledChoiceCount: 0,
                            },
                            opponent: {
                                side: "opponent",
                                requestMissing: false,
                                allChoicesUnavailable: false,
                                usedFallbackBasicChoice: false,
                                enabledChoiceCount: 0,
                            },
                        },
                        p1Team,
                        p2Team,
                    },
                    negamonFormula: {
                        resolverDecision: "showdown_resolver_with_negamon_expected_damage",
                        sameTypeAttackBonus: NEGAMON_FORMULA_STAB_MULTIPLIER,
                        criticalMode: "disabled_in_formula_expectation",
                        randomMultiplier: 1,
                        maxBurstTargetHpRatio: NEGAMON_FORMULA_MAX_BURST_TARGET_HP_RATIO,
                        expectations: {
                            player: [],
                            opponent: [],
                        },
                    },
                    effectRules: {
                        supportedFamilies: [
                            "damage",
                            "heal",
                            "shield",
                            "buff",
                            "debuff",
                            "status",
                            "cleanse",
                            "energy_gain",
                            "energy_drain",
                            "priority",
                            "cooldown",
                        ],
                        statStage: {
                            supportedStats: ["attack", "defense", "specialAttack", "specialDefense", "speed"],
                            min: NEGAMON_MIN_STAT_STAGE,
                            max: NEGAMON_MAX_STAT_STAGE,
                            defaultDurationTurns: 2,
                        },
                        status: {
                            defaultDurationTurns: 2,
                            stacking: {
                                default: "refresh",
                                badlyPoison: "stack_intensity",
                            },
                            tickTiming: {
                                damageOverTime: "turn_end",
                                utility: "instant",
                            },
                        },
                    },
                    resources,
                },
            };

            const replay = await replayShowdownState(state);
            const playerRequest = getLatestRequest(replay.p1);
            const opponentRequest = getLatestRequest(replay.p2);
            const playerExactHp = getLatestExactHpSnapshot(replay.omni, "p1");
            const opponentExactHp = getLatestExactHpSnapshot(replay.omni, "p2");
            const playerFallbackChoices = createMoveChoices(playerSeed, "player", state.metadata.resources.player, state.sides.player.energy);
            const opponentFallbackChoices = createMoveChoices(opponentSeed, "opponent", state.metadata.resources.opponent, state.sides.opponent.energy);
            state.metadata.showdown.parsedRequests = {
                player: snapshotRequest(playerRequest),
                opponent: snapshotRequest(opponentRequest),
            };
            state.sides.player = syncCombatantFromReplay({
                combatant: state.sides.player,
                request: playerRequest,
                exactHp: playerExactHp,
            });
            state.sides.opponent = syncCombatantFromReplay({
                combatant: state.sides.opponent,
                request: opponentRequest,
                exactHp: opponentExactHp,
            });
            state.choices.player = createNegamonBattleChoicesFromRequestV4({
                request: playerRequest,
                aliases: playerAliases,
                seed: playerSeed,
                resources: state.metadata.resources.player,
                energyAvailable: state.sides.player.energy,
                side: "player",
                fainted: state.sides.player.fainted,
            });
            state.choices.opponent = createNegamonBattleChoicesFromRequestV4({
                request: opponentRequest,
                aliases: opponentAliases,
                seed: opponentSeed,
                resources: state.metadata.resources.opponent,
                energyAvailable: state.sides.opponent.energy,
                side: "opponent",
                fainted: state.sides.opponent.fainted,
            });
            state.metadata.showdown.choiceDiagnostics = {
                player: createChoiceDiagnostics({
                    request: playerRequest,
                    originalChoices: playerFallbackChoices,
                    resolvedChoices: state.choices.player,
                    side: "player",
                    fainted: state.sides.player.fainted,
                }),
                opponent: createChoiceDiagnostics({
                    request: opponentRequest,
                    originalChoices: opponentFallbackChoices,
                    resolvedChoices: state.choices.opponent,
                    side: "opponent",
                    fainted: state.sides.opponent.fainted,
                }),
            };
            syncFormulaMetadata(state);
            state.choiceRequestId = createNegamonBattleChoiceRequestIdV4(state);
            state.events.push({
                id: `${state.battleId}:v4:event:1`,
                turn: 1,
                kind: "battle_started",
                message: `${state.sides.player.name} ท้า ${state.sides.opponent.name} ต่อสู้`,
            });
            state.events.push({
                id: `${state.battleId}:v4:event:2`,
                turn: 1,
                kind: "choice_requested",
                actorSide: "player",
                message: "ระบบกำลังรอผู้เล่นเลือกท่า",
            });
            for (const diagnostics of Object.values(state.metadata.showdown.choiceDiagnostics)) {
                if (!diagnostics.message) continue;
                state.events.push({
                    id: `${state.battleId}:v4:event:${state.events.length + 1}`,
                    turn: state.turn,
                    kind: "choice_requested",
                    actorSide: diagnostics.side,
                    message: diagnostics.message,
                });
            }
            appendBattleStartHooks(state);
            return state;
        },
        listChoices(state, side) {
            return state.choices[side].map((choice) => ({ ...choice, cost: choice.cost ? { ...choice.cost } : undefined }));
        },
        async resolveTurn(input) {
            const showdown = await loadShowdownRuntime();
            if (input.state.phase === "ended") {
                return {
                    ok: false,
                    code: "BATTLE_ENDED",
                    state: input.state,
                    validChoices: [],
                };
            }
            if (input.playerAction.kind === "item") {
                return resolveItemAction(input.state, input.playerAction);
            }

            const next = cloneState(input.state);
            const opponentAction = input.opponentAction ?? chooseNegamonBattleAiActionV4({ state: next, side: "opponent" }).action;
            const selectedChoice = this.listChoices(next, input.playerAction.actorSide).find((choice) => {
                if (typeof input.playerAction.moveSlot === "number" && choice.moveSlot === input.playerAction.moveSlot) return true;
                return input.playerAction.moveId ? choice.moveId === input.playerAction.moveId : false;
            });
            if (!selectedChoice?.enabled) {
                return {
                    ok: false,
                    code: "INVALID_ACTION",
                    state: next,
                    validChoices: this.listChoices(next, "player"),
                };
            }
            const beforePlayer = { ...next.sides.player, statSnapshot: { ...next.sides.player.statSnapshot } };
            const beforeOpponent = { ...next.sides.opponent, statSnapshot: { ...next.sides.opponent.statSnapshot } };
            next.phase = "resolving";
            next.queue.push({ ...input.playerAction });
            if (opponentAction) next.queue.push({ ...opponentAction });
            next.metadata.showdown.commandLog.push({
                stream: "p1",
                message: `move ${(input.playerAction.moveSlot ?? 0) + 1}`,
            });
            if (opponentAction?.moveSlot !== undefined) {
                next.metadata.showdown.commandLog.push({
                    stream: "p2",
                    message: `move ${opponentAction.moveSlot + 1}`,
                });
            }
            applyResourceCommit(next, input.playerAction);
            applyResourceCommit(next, opponentAction);

            const replay = await replayShowdownState(next);
            const playerRequest = getLatestRequest(replay.p1);
            const opponentRequest = getLatestRequest(replay.p2);
            const playerExactHp = getLatestExactHpSnapshot(replay.omni, "p1");
            const opponentExactHp = getLatestExactHpSnapshot(replay.omni, "p2");
            const playerFallbackChoices = createMoveChoices(
                next.metadata.showdown.adapterInputs.playerSeed,
                "player",
                next.metadata.resources.player,
                next.sides.player.energy
            );
            const opponentFallbackChoices = createMoveChoices(
                next.metadata.showdown.adapterInputs.opponentSeed,
                "opponent",
                next.metadata.resources.opponent,
                next.sides.opponent.energy
            );
            next.metadata.showdown.parsedRequests = {
                player: snapshotRequest(playerRequest),
                opponent: snapshotRequest(opponentRequest),
            };
            next.sides.player = syncCombatantFromReplay({
                combatant: next.sides.player,
                request: playerRequest,
                exactHp: playerExactHp,
            });
            next.sides.opponent = syncCombatantFromReplay({
                combatant: next.sides.opponent,
                request: opponentRequest,
                exactHp: opponentExactHp,
            });
            next.choices.player = createNegamonBattleChoicesFromRequestV4({
                request: playerRequest,
                aliases: next.metadata.showdown.aliases.player,
                seed: next.metadata.showdown.adapterInputs.playerSeed,
                resources: next.metadata.resources.player,
                energyAvailable: next.sides.player.energy,
                side: "player",
                fainted: next.sides.player.fainted,
            });
            next.choices.opponent = createNegamonBattleChoicesFromRequestV4({
                request: opponentRequest,
                aliases: next.metadata.showdown.aliases.opponent,
                seed: next.metadata.showdown.adapterInputs.opponentSeed,
                resources: next.metadata.resources.opponent,
                energyAvailable: next.sides.opponent.energy,
                side: "opponent",
                fainted: next.sides.opponent.fainted,
            });
            next.metadata.showdown.choiceDiagnostics = {
                player: createChoiceDiagnostics({
                    request: playerRequest,
                    originalChoices: playerFallbackChoices,
                    resolvedChoices: next.choices.player,
                    side: "player",
                    fainted: next.sides.player.fainted,
                }),
                opponent: createChoiceDiagnostics({
                    request: opponentRequest,
                    originalChoices: opponentFallbackChoices,
                    resolvedChoices: next.choices.opponent,
                    side: "opponent",
                    fainted: next.sides.opponent.fainted,
                }),
            };
            syncFormulaMetadata(next);
            next.events.push({
                id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                turn: next.turn,
                kind: "move_selected",
                actorSide: input.playerAction.actorSide,
                moveId: input.playerAction.moveId,
                message: `${next.sides.player.name} เลือกใช้ ${input.playerAction.moveId ?? "แอ็กชันหนึ่งอย่าง"}`,
            });
            next.events.push({
                id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                turn: next.turn,
                kind: "move_resolved",
                actorSide: input.playerAction.actorSide,
                moveId: input.playerAction.moveId,
                message: "ระบบประมวลผลเทิร์นนี้เรียบร้อยแล้ว",
            });
            appendEffectEvents({
                state: next,
                action: input.playerAction,
                before: beforePlayer,
                after: next.sides.player,
                targetBefore: beforeOpponent,
                targetAfter: next.sides.opponent,
            });
            if (opponentAction) {
                appendEffectEvents({
                    state: next,
                    action: opponentAction,
                    before: beforeOpponent,
                    after: next.sides.opponent,
                    targetBefore: beforePlayer,
                    targetAfter: next.sides.player,
                });
            }
            applyHeldItemTurnHooks(next);
            applyBaseEnergyRegen(next);
            deriveCombatantActiveState(next);

            next.queue = [];
            next.phase = next.sides.player.fainted || next.sides.opponent.fainted ? "ended" : "choosing";
            if (next.phase === "ended") {
                next.winner = next.sides.opponent.fainted ? "player" : "opponent";
                next.events.push({
                    id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                    turn: next.turn,
                    kind: "battle_ended",
                    actorSide: next.winner,
                    message: `${next.sides[next.winner].name} ชนะการต่อสู้`,
                });
            }

            next.turn += 1;
            next.stateVersion += 1;
            tickCooldowns(next.metadata.resources.player);
            tickCooldowns(next.metadata.resources.opponent);
            next.choices.player = createNegamonBattleChoicesFromRequestV4({
                request: next.metadata.showdown.parsedRequests.player,
                aliases: next.metadata.showdown.aliases.player,
                seed: next.metadata.showdown.adapterInputs.playerSeed,
                resources: next.metadata.resources.player,
                energyAvailable: next.sides.player.energy,
                side: "player",
                fainted: next.sides.player.fainted,
            });
            next.choices.opponent = createNegamonBattleChoicesFromRequestV4({
                request: next.metadata.showdown.parsedRequests.opponent,
                aliases: next.metadata.showdown.aliases.opponent,
                seed: next.metadata.showdown.adapterInputs.opponentSeed,
                resources: next.metadata.resources.opponent,
                energyAvailable: next.sides.opponent.energy,
                side: "opponent",
                fainted: next.sides.opponent.fainted,
            });
            next.choiceRequestId = createNegamonBattleChoiceRequestIdV4(next);
            if (next.phase !== "ended") {
                next.events.push({
                    id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                    turn: next.turn,
                    kind: "choice_requested",
                    actorSide: "player",
                    message: "ระบบกำลังรอผู้เล่นเลือกท่า",
                });
                for (const diagnostics of Object.values(next.metadata.showdown.choiceDiagnostics)) {
                    if (!diagnostics.message) continue;
                    next.events.push({
                        id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                        turn: next.turn,
                        kind: "choice_requested",
                        actorSide: diagnostics.side,
                        message: diagnostics.message,
                    });
                }
            }

            return {
                ok: true,
                state: next,
                validChoices: this.listChoices(next, "player"),
            };
        },
    };
}
