import type { LevelConfigInput } from "@/lib/classroom-utils";
import {
    createNegamonMonsterSnapshot,
    createNegamonSkillLoadoutPlan,
    getPrimaryLiteEffectForSkill,
    type NegamonMonsterSnapshot,
    type NegamonSkillDefinition,
} from "@/lib/game-negamon";
import type { Prisma } from "@prisma/client";
import type {
    NegamonLiteBattleSide,
    NegamonLiteBattleState,
    NegamonLiteCombatant,
    NegamonLiteMove,
    NegamonLiteMoveCategory,
    NegamonLiteType,
} from "./types";
import { NEGAMON_LITE_TYPES } from "./type-chart";

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

const NEGAMON_LITE_TYPE_SET = new Set<string>(NEGAMON_LITE_TYPES);

function createBattleSeed(...parts: Array<string | number>): number {
    const raw = parts.join(":");
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
        hash ^= raw.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mapLiteMoveCategory(skill: NegamonSkillDefinition): NegamonLiteMoveCategory {
    if (skill.category === "heal" || skill.category === "status" || skill.category === "buff" || skill.category === "debuff") {
        return "STATUS";
    }
    return skill.sourceMove.category === "SPECIAL" ? "SPECIAL" : "PHYSICAL";
}

function mapSkillDefinition(skill: NegamonSkillDefinition): NegamonLiteMove {
    const move = skill.sourceMove;
    return {
        id: skill.id,
        name: skill.name,
        type: skill.elementType as NegamonLiteType,
        category: mapLiteMoveCategory(skill),
        power: skill.power,
        accuracy: skill.accuracy,
        pp: 8,
        maxPp: 8,
        energyCost: skill.energyCost,
        priority: skill.priority,
        target: skill.target === "self" ? "self" : "opponent",
        effect: getPrimaryLiteEffectForSkill(skill),
    };
}

function fallbackMove(monster: NegamonMonsterSnapshot): NegamonLiteMove {
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

function toNegamonLiteTypes(types: string[]): NegamonLiteType[] {
    return types.filter((type): type is NegamonLiteType => NEGAMON_LITE_TYPE_SET.has(type));
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
    monster: NegamonMonsterSnapshot;
}): NegamonLiteCombatant {
    const loadout = createNegamonSkillLoadoutPlan({ monster: input.monster });
    const moves = loadout.skills.map(mapSkillDefinition);

    return {
        id: input.student.id,
        name: input.student.name,
        speciesId: input.monster.speciesId,
        level: input.monster.level,
        types: toNegamonLiteTypes(input.monster.elementTypes),
        stats: {
            hp: input.monster.derivedStats.maxHp,
            attack: input.monster.derivedStats.atk,
            defense: input.monster.derivedStats.def,
            specialAttack: input.monster.derivedStats.atk,
            specialDefense: input.monster.derivedStats.def,
            speed: input.monster.derivedStats.spd,
        },
        hp: input.monster.derivedStats.maxHp,
        energy: input.monster.derivedStats.maxEnergy,
        maxEnergy: input.monster.derivedStats.maxEnergy,
        moves: moves.length > 0 ? moves : [fallbackMove(input.monster)],
    };
}

export function createNegamonLiteBattleState(input: {
    battleId: string;
    classId: string;
    challenger: NegamonLiteStudentSnapshot;
    defender: NegamonLiteStudentSnapshot;
    levelConfig: LevelConfigInput;
    negamonSettings: Parameters<typeof createNegamonMonsterSnapshot>[0]["negamonSettings"];
    nowMs?: number;
}): NegamonLiteBattleState | null {
    const challengerMonster = createNegamonMonsterSnapshot({
        studentId: input.challenger.id,
        studentName: input.challenger.name,
        points: input.challenger.behaviorPoints,
        levelConfig: input.levelConfig,
        negamonSettings: input.negamonSettings,
    });
    const defenderMonster = createNegamonMonsterSnapshot({
        studentId: input.defender.id,
        studentName: input.defender.name,
        points: input.defender.behaviorPoints,
        levelConfig: input.levelConfig,
        negamonSettings: input.negamonSettings,
    });

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
