import { getStudentMonsterState, type LevelConfigInput } from "@/lib/classroom-utils";
import type { Prisma } from "@prisma/client";
import type { StudentMonsterState } from "@/lib/types/negamon";
import type {
    NegamonLiteBattleSide,
    NegamonLiteBattleState,
    NegamonLiteCombatant,
    NegamonLiteMove,
    NegamonLiteType,
} from "./types";

export type NegamonLiteSessionResult = {
    mode: "negamon_lite";
    status: "active" | "finished";
    choiceRequestId: string;
    state: NegamonLiteBattleState;
    winnerId?: string;
    requestedGoldReward?: number;
    goldReward?: number;
    rewardBlockedReason?: "daily_cap" | "pair_cooldown" | null;
    rewardPolicy?: Prisma.InputJsonValue;
};

export type NegamonLiteStudentSnapshot = {
    id: string;
    name: string;
    behaviorPoints: number;
};

const DEFAULT_ENERGY = 40;

function createBattleSeed(...parts: Array<string | number>): number {
    const raw = parts.join(":");
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
        hash ^= raw.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mapMove(move: StudentMonsterState["unlockedMoves"][number]): NegamonLiteMove {
    return {
        id: move.id,
        name: move.name,
        type: move.type as NegamonLiteType,
        category: move.category === "HEAL" ? "STATUS" : move.category,
        power: move.power,
        accuracy: move.accuracy,
        pp: 8,
        maxPp: 8,
        energyCost: move.energyCost ?? (move.power > 0 ? 8 : 5),
        priority: move.priority,
        target: move.category === "HEAL" ? "self" : "opponent",
        effect:
            move.category === "HEAL" || move.effect === "HEAL_25"
                ? { kind: "heal", percent: 25 }
                : undefined,
    };
}

function fallbackMove(monster: StudentMonsterState): NegamonLiteMove {
    return {
        id: `${monster.speciesId}:basic-strike`,
        name: "Basic Strike",
        type: "NORMAL",
        category: "PHYSICAL",
        power: 40,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        energyCost: 0,
        target: "opponent",
    };
}

export function createNegamonLiteChoiceRequestId(state: NegamonLiteBattleState): string {
    return `${state.battleId}:${state.turn}:${state.seed}`;
}

export function parseNegamonLiteSessionResult(raw: unknown): NegamonLiteSessionResult | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Partial<NegamonLiteSessionResult>;
    if (value.mode !== "negamon_lite") return null;
    if (value.status !== "active" && value.status !== "finished") return null;
    if (!value.choiceRequestId || typeof value.choiceRequestId !== "string") return null;
    if (!value.state || typeof value.state !== "object") return null;
    return value as NegamonLiteSessionResult;
}

export function createNegamonLiteCombatant(input: {
    side: NegamonLiteBattleSide;
    student: NegamonLiteStudentSnapshot;
    monster: StudentMonsterState;
}): NegamonLiteCombatant {
    const moves = input.monster.unlockedMoves.slice(0, 4).map(mapMove);
    const types = [input.monster.type, input.monster.type2]
        .filter((type): type is NegamonLiteType => Boolean(type));

    return {
        id: input.student.id,
        name: input.student.name,
        speciesId: input.monster.speciesId,
        level: input.monster.rankIndex + 1,
        types,
        stats: {
            hp: input.monster.stats.hp,
            attack: input.monster.stats.atk,
            defense: input.monster.stats.def,
            specialAttack: input.monster.stats.atk,
            specialDefense: input.monster.stats.def,
            speed: input.monster.stats.spd,
        },
        hp: input.monster.stats.hp,
        energy: DEFAULT_ENERGY,
        maxEnergy: DEFAULT_ENERGY,
        moves: moves.length > 0 ? moves : [fallbackMove(input.monster)],
    };
}

export function createNegamonLiteBattleState(input: {
    battleId: string;
    classId: string;
    challenger: NegamonLiteStudentSnapshot;
    defender: NegamonLiteStudentSnapshot;
    levelConfig: LevelConfigInput;
    negamonSettings: Parameters<typeof getStudentMonsterState>[3];
    nowMs?: number;
}): NegamonLiteBattleState | null {
    const challengerMonster = getStudentMonsterState(
        input.challenger.id,
        input.challenger.behaviorPoints,
        input.levelConfig,
        input.negamonSettings
    );
    const defenderMonster = getStudentMonsterState(
        input.defender.id,
        input.defender.behaviorPoints,
        input.levelConfig,
        input.negamonSettings
    );

    if (!challengerMonster || !defenderMonster) return null;

    const seed = createBattleSeed(
        input.classId,
        input.challenger.id,
        input.defender.id,
        input.battleId,
        input.nowMs ?? Date.now()
    );

    return {
        battleId: input.battleId,
        seed,
        turn: 1,
        phase: "choosing",
        sides: {
            player: createNegamonLiteCombatant({
                side: "player",
                student: input.challenger,
                monster: challengerMonster,
            }),
            opponent: createNegamonLiteCombatant({
                side: "opponent",
                student: input.defender,
                monster: defenderMonster,
            }),
        },
        events: [
            {
                id: `${input.battleId}:1:start`,
                turn: 1,
                kind: "battle_started",
                message: "Negamon Lite battle started.",
            },
        ],
    };
}
