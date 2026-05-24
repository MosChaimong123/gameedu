import { buildBasicAttackMove, isNegamonBasicAttackMoveId } from "@/lib/negamon-basic-move";
import { getMoveEnergyCost } from "@/lib/negamon-energy";
import type { MonsterMove, MonsterSpecies, MonsterType, StatusEffect } from "@/lib/types/negamon";

export type NegamonSkillCategory = "attack" | "heal" | "buff" | "debuff" | "status" | "special";
export type NegamonSkillTarget = "self" | "enemy" | "allEnemies" | "allAllies";

export type NegamonSkillEffect =
    | { kind: "damage"; power: number }
    | { kind: "heal"; percent: number }
    | { kind: "stat_stage"; stat: "attack" | "defense" | "speed" | "accuracy"; stages: number; target?: "self" | "enemy" }
    | { kind: "status"; effect: StatusEffect; chance: number; durationTurns?: number }
    | { kind: "self_status"; effect: StatusEffect; durationTurns?: number }
    | { kind: "drain"; percent: number }
    | { kind: "critical_bonus"; percent: number }
    | { kind: "energy_cost"; value: number };

export type NegamonSkillUnlockRule = {
    level?: number;
    rankIndex?: number;
    speciesId?: string;
    itemId?: string;
};

export type NegamonSkillDefinition = {
    id: string;
    name: string;
    description: string;
    elementType: MonsterType;
    category: NegamonSkillCategory;
    target: NegamonSkillTarget;
    power: number;
    accuracy: number;
    energyCost: number;
    cooldownTurns: number;
    priority: number;
    effects: NegamonSkillEffect[];
    unlock: NegamonSkillUnlockRule;
    sourceMove: MonsterMove;
};

function getSkillCategory(move: MonsterMove): NegamonSkillCategory {
    if (move.category === "HEAL" || move.effect === "HEAL_25") return "heal";
    if (move.power > 0 && move.effect) return "special";
    if (move.power > 0) return "attack";
    if (move.effect?.startsWith("BOOST_")) return "buff";
    if (move.effect?.startsWith("LOWER_")) return "debuff";
    return "status";
}

function getSkillTarget(move: MonsterMove): NegamonSkillTarget {
    if (move.category === "HEAL" || move.effect === "HEAL_25" || move.selfEffect) return "self";
    if (move.effect === "LOWER_ATK_ALL") return "allEnemies";
    return "enemy";
}

function getCooldownTurns(move: MonsterMove): number {
    if (isNegamonBasicAttackMoveId(move.id)) return 0;
    if (move.learnRank >= 6) return 2;
    if (move.category === "HEAL") return 2;
    if (move.effect === "PARALYZE" || move.effect === "SLEEP" || move.effect === "FREEZE") return 1;
    return 0;
}

function describeSkill(move: MonsterMove): string {
    const parts: string[] = [];
    if (move.power > 0) parts.push(`Power ${move.power}`);
    if (move.effect) parts.push(`Effect ${move.effect}`);
    if (move.selfEffect) parts.push(`Self ${move.selfEffect}`);
    if (move.drainPct) parts.push(`Drain ${move.drainPct}%`);
    if (move.critBonus) parts.push(`Crit +${move.critBonus}%`);
    return parts.length ? parts.join(" / ") : "Utility skill";
}

export function createNegamonSkillDefinition(
    move: MonsterMove,
    speciesId: string
): NegamonSkillDefinition {
    const effects: NegamonSkillEffect[] = [];
    if (move.power > 0) effects.push({ kind: "damage", power: move.power });
    if (move.category === "HEAL" || move.effect === "HEAL_25") {
        effects.push({ kind: "heal", percent: 25 });
    } else if (move.effect) {
        effects.push({
            kind: "status",
            effect: move.effect,
            chance: move.effectChance ?? 100,
            durationTurns: move.effectDurationTurns,
        });
    }
    if (move.selfEffect) {
        effects.push({
            kind: "self_status",
            effect: move.selfEffect,
            durationTurns: move.selfEffectDurationTurns,
        });
    }
    if (move.drainPct) effects.push({ kind: "drain", percent: move.drainPct });
    if (move.critBonus) effects.push({ kind: "critical_bonus", percent: move.critBonus });

    const energyCost = getMoveEnergyCost(move, speciesId);
    effects.push({ kind: "energy_cost", value: energyCost });

    return {
        id: move.id,
        name: move.name,
        description: describeSkill(move),
        elementType: move.type,
        category: getSkillCategory(move),
        target: getSkillTarget(move),
        power: move.power,
        accuracy: move.accuracy,
        energyCost,
        cooldownTurns: getCooldownTurns(move),
        priority: move.priority ?? 0,
        effects,
        unlock: {
            level: Math.max(1, move.learnRank),
            rankIndex: Math.max(0, move.learnRank - 1),
            speciesId,
        },
        sourceMove: { ...move, energyCost },
    };
}

export function createNegamonBasicSkillDefinition(): NegamonSkillDefinition {
    const basic = buildBasicAttackMove();
    return createNegamonSkillDefinition(basic, "basic");
}

export function getNegamonSpeciesSkillCatalog(
    species: MonsterSpecies,
    options: { includeBasic?: boolean } = {}
): NegamonSkillDefinition[] {
    const skills = species.moves.map((move) => createNegamonSkillDefinition(move, species.id));
    return options.includeBasic ? [createNegamonBasicSkillDefinition(), ...skills] : skills;
}

export function findNegamonSkillDefinition(
    skillId: string,
    catalog: NegamonSkillDefinition[]
): NegamonSkillDefinition | null {
    return catalog.find((skill) => skill.id === skillId) ?? null;
}
