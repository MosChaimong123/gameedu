import type { NegamonMonsterSnapshot } from "../core/monster-snapshot";
import { NEGAMON_BATTLE_ENGINE_TARGET } from "./target";
import {
    createNegamonBattleChoiceRequestIdV4,
    type NegamonBattleActionV4,
    type NegamonBattleChoiceV4,
    type NegamonBattleCombatantV4,
    type NegamonBattleSideV4,
    type NegamonBattleStateV4,
} from "./state";
import {
    createNegamonBattleCombatantV4FromSeed,
    createNegamonShowdownSideSeed,
    createNegamonShowdownTeamSet,
    type NegamonShowdownSideSeed,
} from "./mapper";

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

export type NegamonBattleEngineAdapterV4 = {
    target: typeof NEGAMON_BATTLE_ENGINE_TARGET;
    createBattle(input: NegamonBattleAdapterCreateInput): Promise<NegamonBattleStateV4>;
    listChoices(state: NegamonBattleStateV4, side: NegamonBattleSideV4): NegamonBattleChoiceV4[];
    resolveTurn(input: NegamonBattleAdapterTurnInput): Promise<NegamonBattleAdapterResolution>;
};

type ParsedShowdownRequest = {
    moves: Array<{ id: string; move: string; pp: number; maxpp: number; disabled: boolean; target: string }>;
    hp?: number;
    maxHp?: number;
    statusIds: string[];
    fainted: boolean;
};

function createMoveChoices(seed: NegamonShowdownSideSeed, side: NegamonBattleSideV4): NegamonBattleChoiceV4[] {
    return seed.moveSet.map((move, index) => ({
        actionId: `${side}:${move.negamonMoveId}`,
        kind: "move",
        label: move.label,
        enabled: true,
        moveId: move.negamonMoveId,
        moveSlot: index,
        targetSide: move.target === "self" ? side : side === "player" ? "opponent" : "player",
        cost: {
            pp: 1,
            energy: move.energyCost,
        },
    }));
}

function cloneState(state: NegamonBattleStateV4): NegamonBattleStateV4 {
    return {
        ...state,
        sides: {
            player: {
                ...state.sides.player,
                moveIds: [...state.sides.player.moveIds],
                statusIds: [...state.sides.player.statusIds],
                battleItemIds: [...state.sides.player.battleItemIds],
            },
            opponent: {
                ...state.sides.opponent,
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
                p1Team: [...state.metadata.showdown.p1Team],
                p2Team: [...state.metadata.showdown.p2Team],
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
};

function isShowdownRuntimeModule(value: unknown): value is ShowdownRuntimeModule {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.BattleStream === "function" && typeof candidate.getPlayerStreams === "function";
}

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

function createChoicesFromRequest(input: {
    request: ParsedShowdownRequest | null;
    aliases: Array<{ moveSlot: number; negamonMoveId: string; label: string; showdownMoveId: string }>;
    side: NegamonBattleSideV4;
}): NegamonBattleChoiceV4[] {
    if (!input.request) return [];
    return input.aliases.map((alias) => {
        const move = input.request?.moves[alias.moveSlot];
        return {
            actionId: `${input.side}:${alias.negamonMoveId}`,
            kind: "move",
            label: alias.label,
            enabled: Boolean(move && !move.disabled && move.pp > 0),
            reason: !move ? "INVALID_TARGET" : move.disabled ? "LOCKED" : move.pp <= 0 ? "NO_PP" : undefined,
            moveId: alias.negamonMoveId,
            moveSlot: alias.moveSlot,
            targetSide: move?.target === "self" ? input.side : input.side === "player" ? "opponent" : "player",
            cost: {
                pp: move ? 1 : 0,
                energy: 0,
            },
        };
    });
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

    await new Promise((resolve) => setTimeout(resolve, 50));
    return out;
}

function syncCombatantFromRequest(combatant: NegamonBattleCombatantV4, request: ParsedShowdownRequest | null): NegamonBattleCombatantV4 {
    if (!request) return combatant;
    return {
        ...combatant,
        hp: request.hp ?? combatant.hp,
        maxHp: request.maxHp ?? combatant.maxHp,
        statusIds: [...request.statusIds],
        fainted: request.fainted,
    };
}

function chooseDefaultOpponentAction(state: NegamonBattleStateV4): NegamonBattleActionV4 | null {
    const firstEnabled = state.choices.opponent.find((choice) => choice.enabled);
    if (!firstEnabled) return null;
    return {
        actorSide: "opponent",
        kind: "move",
        moveId: firstEnabled.moveId,
        moveSlot: firstEnabled.moveSlot,
        targetSide: firstEnabled.targetSide,
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
            const playerSeed = createNegamonShowdownSideSeed({ snapshot: input.player });
            const opponentSeed = createNegamonShowdownSideSeed({ snapshot: input.opponent });
            const p1Team = [createNegamonShowdownTeamSet(playerSeed)];
            const p2Team = [createNegamonShowdownTeamSet(opponentSeed)];
            const playerAliases = playerSeed.moveSet.map((move, moveSlot) => ({
                moveSlot,
                negamonMoveId: move.negamonMoveId,
                label: move.label,
                showdownMoveId: move.id,
            }));
            const opponentAliases = opponentSeed.moveSet.map((move, moveSlot) => ({
                moveSlot,
                negamonMoveId: move.negamonMoveId,
                label: move.label,
                showdownMoveId: move.id,
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
                    player: createMoveChoices(playerSeed, "player"),
                    opponent: createMoveChoices(opponentSeed, "opponent"),
                },
                queue: [],
                events: [],
                metadata: {
                    upstream: "smogon/pokemon-showdown",
                    packageName: "pokemon-showdown",
                    protocolVersion: 1,
                    showdown: {
                        formatid: "gen9customgame",
                        commandLog: [
                            {
                                stream: "omniscient",
                                message: buildStartMessage({
                                    formatid: "gen9customgame",
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
                        p1Team,
                        p2Team,
                    },
                },
            };

            const replay = await replayShowdownState(state);
            const playerRequest = getLatestRequest(replay.p1);
            const opponentRequest = getLatestRequest(replay.p2);
            state.sides.player = syncCombatantFromRequest(state.sides.player, playerRequest);
            state.sides.opponent = syncCombatantFromRequest(state.sides.opponent, opponentRequest);
            state.choices.player = createChoicesFromRequest({
                request: playerRequest,
                aliases: playerAliases,
                side: "player",
            });
            state.choices.opponent = createChoicesFromRequest({
                request: opponentRequest,
                aliases: opponentAliases,
                side: "opponent",
            });
            state.choiceRequestId = createNegamonBattleChoiceRequestIdV4(state);
            state.events.push({
                id: `${state.battleId}:v4:event:1`,
                turn: 1,
                kind: "battle_started",
                message: `${state.sides.player.name} challenged ${state.sides.opponent.name}.`,
            });
            state.events.push({
                id: `${state.battleId}:v4:event:2`,
                turn: 1,
                kind: "choice_requested",
                actorSide: "player",
                message: "Showdown runtime is waiting for the player choice.",
            });
            return state;
        },
        listChoices(state, side) {
            return state.choices[side].map((choice) => ({ ...choice, cost: choice.cost ? { ...choice.cost } : undefined }));
        },
        async resolveTurn(input) {
            if (input.state.phase === "ended") {
                return {
                    ok: false,
                    code: "BATTLE_ENDED",
                    state: input.state,
                    validChoices: [],
                };
            }

            const next = cloneState(input.state);
            const opponentAction = input.opponentAction ?? chooseDefaultOpponentAction(next);
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

            const replay = await replayShowdownState(next);
            const playerRequest = getLatestRequest(replay.p1);
            const opponentRequest = getLatestRequest(replay.p2);
            next.sides.player = syncCombatantFromRequest(next.sides.player, playerRequest);
            next.sides.opponent = syncCombatantFromRequest(next.sides.opponent, opponentRequest);
            next.choices.player = createChoicesFromRequest({
                request: playerRequest,
                aliases: next.metadata.showdown.aliases.player,
                side: "player",
            });
            next.choices.opponent = createChoicesFromRequest({
                request: opponentRequest,
                aliases: next.metadata.showdown.aliases.opponent,
                side: "opponent",
            });
            next.events.push({
                id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                turn: next.turn,
                kind: "move_selected",
                actorSide: input.playerAction.actorSide,
                moveId: input.playerAction.moveId,
                message: `${next.sides.player.name} selected ${input.playerAction.moveId ?? "an action"}.`,
            });
            next.events.push({
                id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                turn: next.turn,
                kind: "move_resolved",
                actorSide: input.playerAction.actorSide,
                moveId: input.playerAction.moveId,
                message: "Pokemon Showdown runtime resolved the turn.",
            });

            next.queue = [];
            next.phase = next.sides.player.fainted || next.sides.opponent.fainted ? "ended" : "choosing";
            if (next.phase === "ended") {
                next.winner = next.sides.opponent.fainted ? "player" : "opponent";
                next.events.push({
                    id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                    turn: next.turn,
                    kind: "battle_ended",
                    actorSide: next.winner,
                    message: `${next.sides[next.winner].name} won the battle.`,
                });
            }

            next.turn += 1;
            next.stateVersion += 1;
            next.choiceRequestId = createNegamonBattleChoiceRequestIdV4(next);
            if (next.phase !== "ended") {
                next.events.push({
                    id: `${next.battleId}:v4:event:${next.events.length + 1}`,
                    turn: next.turn,
                    kind: "choice_requested",
                    actorSide: "player",
                    message: "Showdown runtime is waiting for the player choice.",
                });
            }

            return {
                ok: true,
                state: next,
                validChoices: this.listChoices(next, "player"),
            };
        },
    };
}
