import type { LevelConfigInput } from "@/lib/classroom-utils";
import {
    createNegamonMonsterSnapshot,
    createNegamonSkillLoadoutPlan,
    applyNegamonPassiveRuntimeEffects,
    applyNegamonBattleItemRuntimeEffects,
    mapNegamonSkillToLiteMove,
    type NegamonMonsterSnapshot,
} from "@/lib/game-negamon";
import type { GameHistoryEvent, GameRewardResult } from "@/lib/game-core";
import type { NegamonProgressionPersistencePlan } from "@/lib/game-negamon/server/progression";
import type { Prisma } from "@prisma/client";
import type {
    NegamonLiteBattleSide,
    NegamonLiteBattleState,
    NegamonLiteCombatant,
    NegamonLiteDifficulty,
    NegamonLiteMove,
    NegamonLiteStatus,
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
    rewardIdempotencyKey?: string;
    reward?: GameRewardResult;
    progression?: NegamonProgressionPersistencePlan | null;
    historyEvents?: GameHistoryEvent[];
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

function getTraitStatusImmunities(traitIds: string[]): NegamonLiteStatus[] {
    const immunities: NegamonLiteStatus[] = [];
    if (traitIds.includes("trait_flame_body")) immunities.push("BURN");
    if (traitIds.includes("trait_acid_rain")) immunities.push("POISON", "BADLY_POISON");
    if (traitIds.includes("trait_iron_shell")) immunities.push("STUN");
    return [...new Set(immunities)];
}

export function applyNegamonLiteDifficultyModifier(
    combatant: NegamonLiteCombatant,
    difficulty: NegamonLiteDifficulty = "normal"
): NegamonLiteCombatant {
    const multipliers: Record<NegamonLiteDifficulty, { hp: number; offense: number; defense: number; speed: number }> = {
        easy: { hp: 0.9, offense: 0.95, defense: 0.95, speed: 1 },
        normal: { hp: 1, offense: 1, defense: 1, speed: 1 },
        hard: { hp: 1.15, offense: 1.08, defense: 1.05, speed: 1.05 },
        boss: { hp: 1.35, offense: 1.15, defense: 1.12, speed: 1.08 },
    };
    const multiplier = multipliers[difficulty];
    const stats = {
        hp: Math.max(1, Math.floor(combatant.stats.hp * multiplier.hp)),
        attack: Math.max(1, Math.floor(combatant.stats.attack * multiplier.offense)),
        defense: Math.max(1, Math.floor(combatant.stats.defense * multiplier.defense)),
        specialAttack: Math.max(1, Math.floor(combatant.stats.specialAttack * multiplier.offense)),
        specialDefense: Math.max(1, Math.floor(combatant.stats.specialDefense * multiplier.defense)),
        speed: Math.max(1, Math.floor(combatant.stats.speed * multiplier.speed)),
    };
    return {
        ...combatant,
        stats,
        hp: Math.min(stats.hp, Math.max(1, Math.floor(combatant.hp * multiplier.hp))),
        difficulty,
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
    monster: NegamonMonsterSnapshot;
}): NegamonLiteCombatant {
    const loadout = createNegamonSkillLoadoutPlan({ monster: input.monster });
    const moves = loadout.skills.map(mapNegamonSkillToLiteMove);
    const passive = applyNegamonPassiveRuntimeEffects(input.monster);
    const itemRuntime = applyNegamonBattleItemRuntimeEffects({ monster: input.monster });
    const runtimeStats = {
        ...passive.stats,
        atk: Math.max(1, Math.floor(passive.stats.atk * itemRuntime.plan.statMultipliers.atk)),
        def: Math.max(1, Math.floor(passive.stats.def * itemRuntime.plan.statMultipliers.def)),
        spd: Math.max(1, Math.floor(passive.stats.spd * itemRuntime.plan.statMultipliers.spd)),
    };

    return {
        id: input.student.id,
        name: input.student.name,
        speciesId: input.monster.speciesId,
        level: input.monster.level,
        types: toNegamonLiteTypes(input.monster.elementTypes),
        stats: {
            hp: runtimeStats.maxHp,
            attack: runtimeStats.atk,
            defense: runtimeStats.def,
            specialAttack: runtimeStats.atk,
            specialDefense: runtimeStats.def,
            speed: runtimeStats.spd,
        },
        hp: runtimeStats.maxHp,
        energy: passive.maxEnergy,
        maxEnergy: passive.maxEnergy,
        moves: moves.length > 0 ? moves : [fallbackMove(input.monster)],
        statusImmunities: [
            ...new Set([
                ...itemRuntime.plan.statusImmunities,
                ...getTraitStatusImmunities(passive.passiveTraitIds),
            ]),
        ],
        passiveTraitIds: passive.passiveTraitIds,
        battleItemIds: itemRuntime.plan.itemIds,
        itemEffectKinds: itemRuntime.plan.effects.map((effect) => effect.kind),
        rewardGoldBonus: itemRuntime.plan.rewardModifiers.goldBonus,
        rewardGoldMultiplier: itemRuntime.plan.rewardModifiers.goldMultiplier,
        rewardExpMultiplier: itemRuntime.plan.rewardModifiers.expMultiplier,
    };
}

export function createNegamonLiteBattleState(input: {
    battleId: string;
    classId: string;
    challenger: NegamonLiteStudentSnapshot;
    defender: NegamonLiteStudentSnapshot;
    levelConfig: LevelConfigInput;
    negamonSettings: Parameters<typeof createNegamonMonsterSnapshot>[0]["negamonSettings"];
    challengerBattleItemIds?: string[];
    defenderBattleItemIds?: string[];
    opponentDifficulty?: NegamonLiteDifficulty;
    nowMs?: number;
}): NegamonLiteBattleState | null {
    const challengerMonster = createNegamonMonsterSnapshot({
        studentId: input.challenger.id,
        studentName: input.challenger.name,
        points: input.challenger.behaviorPoints,
        levelConfig: input.levelConfig,
        negamonSettings: input.negamonSettings,
        equippedItemIds: input.challengerBattleItemIds,
    });
    const defenderMonster = createNegamonMonsterSnapshot({
        studentId: input.defender.id,
        studentName: input.defender.name,
        points: input.defender.behaviorPoints,
        levelConfig: input.levelConfig,
        negamonSettings: input.negamonSettings,
        equippedItemIds: input.defenderBattleItemIds,
    });

    if (!challengerMonster || !defenderMonster) return null;

    const seed = createBattleSeed(
        input.classId,
        input.challenger.id,
        input.defender.id,
        input.battleId,
        input.nowMs ?? Date.now()
    );

    const player = createNegamonLiteCombatant({
        side: "player",
        student: input.challenger,
        monster: challengerMonster,
    });
    const opponent = applyNegamonLiteDifficultyModifier(
        createNegamonLiteCombatant({
            side: "opponent",
            student: input.defender,
            monster: defenderMonster,
        }),
        input.opponentDifficulty ?? "normal"
    );

    return {
        battleId: input.battleId,
        seed,
        turn: 1,
        phase: "choosing",
        sides: {
            player,
            opponent,
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
