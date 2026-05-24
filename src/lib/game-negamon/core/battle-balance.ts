import { getEnergyProfileForSpecies } from "@/lib/negamon-energy";
import { calculateDamage, getValidChoices, resolveChoice } from "@/lib/negamon-lite";
import type {
    NegamonLiteBattleSide,
    NegamonLiteBattleState,
    NegamonLiteCombatant,
    NegamonLiteMove,
    NegamonLiteStats,
} from "@/lib/negamon-lite";
import type { MonsterSpecies } from "@/lib/types/negamon";
import { calculateNegamonStats, getNegamonLevelFromRank, normalizeNegamonRankIndex } from "./monster-growth";
import { getNegamonSpeciesSkillCatalog } from "./skills";
import { mapNegamonSkillToLiteMove } from "./skill-effects";

export type NegamonBalanceSimulationSummary = {
    battleId: string;
    winner?: NegamonLiteBattleSide;
    turns: number;
    ended: boolean;
    playerRemainingHpPercent: number;
    opponentRemainingHpPercent: number;
    playerMoveUseCounts: Record<string, number>;
    opponentMoveUseCounts: Record<string, number>;
    maxSingleHitPercent: number;
    rejectedChoices: number;
};

export type NegamonBalanceMatchupInput = {
    player: MonsterSpecies;
    opponent: MonsterSpecies;
    rankIndex?: number;
    maxTurns?: number;
};

function toLiteStats(stats: ReturnType<typeof calculateNegamonStats>): NegamonLiteStats {
    return {
        hp: stats.hp,
        attack: stats.atk,
        defense: stats.def,
        specialAttack: stats.atk,
        specialDefense: stats.def,
        speed: stats.spd,
    };
}

function createBalanceCombatant(input: {
    side: NegamonLiteBattleSide;
    species: MonsterSpecies;
    rankIndex: number;
}): NegamonLiteCombatant {
    const rankIndex = normalizeNegamonRankIndex(input.rankIndex);
    const stats = calculateNegamonStats(input.species.baseStats, rankIndex);
    const energy = getEnergyProfileForSpecies(input.species.id);
    const moves = getNegamonSpeciesSkillCatalog(input.species, { includeBasic: true })
        .filter((skill) => (skill.unlock.rankIndex ?? 0) <= rankIndex)
        .map(mapNegamonSkillToLiteMove);

    return {
        id: `${input.side}:${input.species.id}`,
        name: input.species.name,
        speciesId: input.species.id,
        level: getNegamonLevelFromRank(rankIndex),
        types: [input.species.type, input.species.type2].filter(Boolean) as NegamonLiteCombatant["types"],
        stats: toLiteStats(stats),
        hp: stats.hp,
        energy: energy.maxEnergy,
        maxEnergy: energy.maxEnergy,
        moves,
    };
}

export function createNegamonBalanceBattleState(input: NegamonBalanceMatchupInput): NegamonLiteBattleState {
    const rankIndex = normalizeNegamonRankIndex(input.rankIndex ?? 3);
    return {
        battleId: `balance:${input.player.id}:vs:${input.opponent.id}:r${rankIndex}`,
        seed: 12345,
        turn: 1,
        phase: "choosing",
        sides: {
            player: createBalanceCombatant({ side: "player", species: input.player, rankIndex }),
            opponent: createBalanceCombatant({ side: "opponent", species: input.opponent, rankIndex }),
        },
        events: [],
    };
}

function scoreMove(state: NegamonLiteBattleState, side: NegamonLiteBattleSide, move: NegamonLiteMove): number {
    const actor = state.sides[side];
    const targetSide = side === "player" ? "opponent" : "player";
    const target = move.target === "self" ? actor : state.sides[targetSide];
    if (move.effect?.kind === "heal") {
        const missingHpPercent = 1 - actor.hp / Math.max(1, actor.stats.hp);
        return missingHpPercent >= 0.35 ? 70 + move.effect.percent : -10;
    }
    const preview = calculateDamage({ actor, target, move, critical: false });
    const effectBonus =
        move.effect?.kind === "status" ? 8 :
        move.effect?.kind === "buff" || move.effect?.kind === "debuff" ? 4 :
        0;
    return preview.damage + effectBonus - Math.max(0, (move.energyCost ?? 0) - actor.energy) * 2;
}

function chooseBalanceMove(state: NegamonLiteBattleState, side: NegamonLiteBattleSide): string {
    const choices = getValidChoices(state, side).filter((choice) => choice.enabled);
    const fallback = choices.find((choice) => choice.moveId === "basic-attack") ?? choices[0];
    if (!fallback) return "basic-attack";
    return choices
        .map((choice) => ({ choice, score: scoreMove(state, side, choice.move) }))
        .sort((a, b) => b.score - a.score || a.choice.moveId.localeCompare(b.choice.moveId))[0]?.choice.moveId ?? fallback.moveId;
}

function applyBalancePacing(state: NegamonLiteBattleState, side: NegamonLiteBattleSide, usedMoveId: string) {
    const actor = state.sides[side];
    const energy = getEnergyProfileForSpecies(actor.speciesId);
    actor.energy = Math.min(actor.maxEnergy, actor.energy + energy.regenPerTurn);
    actor.moves = actor.moves.map((move) => {
        if (move.id === usedMoveId) return move;
        return {
            ...move,
            cooldownRemaining: Math.max(0, (move.cooldownRemaining ?? 0) - 1),
        };
    });
}

function incrementCounter(counter: Record<string, number>, key: string) {
    counter[key] = (counter[key] ?? 0) + 1;
}

export function simulateNegamonBalanceMatchup(input: NegamonBalanceMatchupInput): NegamonBalanceSimulationSummary {
    let state = createNegamonBalanceBattleState(input);
    const maxTurns = Math.max(1, Math.floor(input.maxTurns ?? 16));
    const playerMoveUseCounts: Record<string, number> = {};
    const opponentMoveUseCounts: Record<string, number> = {};
    let rejectedChoices = 0;
    let maxSingleHitPercent = 0;

    for (let i = 0; i < maxTurns && state.phase !== "ended"; i += 1) {
        const side: NegamonLiteBattleSide = i % 2 === 0 ? "player" : "opponent";
        const moveId = chooseBalanceMove(state, side);
        const beforeTarget = state.sides[side === "player" ? "opponent" : "player"];
        const beforeHp = beforeTarget.hp;
        const result = resolveChoice(state, { side, kind: "move", moveId });
        if (!result.accepted) {
            rejectedChoices += 1;
            break;
        }
        state = result.state;
        const afterTarget = state.sides[side === "player" ? "opponent" : "player"];
        const damage = Math.max(0, beforeHp - afterTarget.hp);
        maxSingleHitPercent = Math.max(maxSingleHitPercent, damage / Math.max(1, afterTarget.stats.hp));
        incrementCounter(side === "player" ? playerMoveUseCounts : opponentMoveUseCounts, moveId);
        applyBalancePacing(state, side, moveId);
    }

    return {
        battleId: state.battleId,
        winner: state.winner,
        turns: Math.max(0, state.events.filter((event) => event.kind === "turn_resolved").length),
        ended: state.phase === "ended",
        playerRemainingHpPercent: state.sides.player.hp / Math.max(1, state.sides.player.stats.hp),
        opponentRemainingHpPercent: state.sides.opponent.hp / Math.max(1, state.sides.opponent.stats.hp),
        playerMoveUseCounts,
        opponentMoveUseCounts,
        maxSingleHitPercent,
        rejectedChoices,
    };
}
