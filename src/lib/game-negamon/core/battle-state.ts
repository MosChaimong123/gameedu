import type {
    NegamonLiteBattleEvent,
    NegamonLiteBattlePhase,
    NegamonLiteBattleSide,
    NegamonLiteBattleState,
    NegamonLiteChoice,
    NegamonLiteCombatant,
    NegamonLiteMove,
    NegamonLiteResolvedChoice,
    NegamonLiteValidChoice,
} from "@/lib/negamon-lite";

export type NegamonBattleSide = NegamonLiteBattleSide;
export type NegamonBattlePhase = NegamonLiteBattlePhase;
export type NegamonBattleMove = NegamonLiteMove;
export type NegamonBattleCombatant = NegamonLiteCombatant;
export type NegamonBattleEvent = NegamonLiteBattleEvent;
export type NegamonBattleChoice = NegamonLiteChoice;
export type NegamonBattleValidChoice = NegamonLiteValidChoice;
export type NegamonBattleResolvedChoice = NegamonLiteResolvedChoice;
export type NegamonBattleStateV2 = NegamonLiteBattleState;

export type NegamonBattleReplaySummary = {
    battleId: string;
    status: "active" | "finished";
    turn: number;
    winner?: NegamonBattleSide;
    playerHp: number;
    opponentHp: number;
    eventCount: number;
};

export function cloneNegamonBattleState(state: NegamonBattleStateV2): NegamonBattleStateV2 {
    return {
        ...state,
        sides: {
            player: {
                ...state.sides.player,
                types: [...state.sides.player.types],
                stats: { ...state.sides.player.stats },
                moves: state.sides.player.moves.map((move) => ({ ...move })),
            },
            opponent: {
                ...state.sides.opponent,
                types: [...state.sides.opponent.types],
                stats: { ...state.sides.opponent.stats },
                moves: state.sides.opponent.moves.map((move) => ({ ...move })),
            },
        },
        events: state.events.map((event) => ({ ...event })),
    };
}

export function createNegamonBattleReplaySummary(
    state: NegamonBattleStateV2
): NegamonBattleReplaySummary {
    return {
        battleId: state.battleId,
        status: state.phase === "ended" ? "finished" : "active",
        turn: state.turn,
        winner: state.winner,
        playerHp: state.sides.player.hp,
        opponentHp: state.sides.opponent.hp,
        eventCount: state.events.length,
    };
}
