import { buildBasicAttackMove, isNegamonBasicAttackMoveId } from "@/lib/negamon-basic-move";
import { getMoveEnergyCost } from "@/lib/negamon-energy";
import type {
    MonsterMove,
    MonsterMoveEffectFamily,
    MonsterMoveFlag,
    MonsterSpecies,
    MonsterType,
    StatusEffect,
} from "@/lib/types/negamon";
import { getNegamonFormIndexFromLevel, normalizeNegamonLevel } from "./monster-growth";

export type NegamonSkillCategory = "attack" | "heal" | "buff" | "debuff" | "status" | "special";
export type NegamonSkillTarget = "self" | "enemy" | "allEnemies" | "allAllies";

export type NegamonSkillEffect =
    | { kind: "damage"; power: number }
    | { kind: "heal"; percent: number }
    | {
          kind: "stat_stage";
          stat: "attack" | "defense" | "speed" | "accuracy";
          stages: number;
          target?: "self" | "enemy" | "allEnemies";
          durationTurns?: number;
      }
    | { kind: "status"; effect: StatusEffect; chance: number; durationTurns?: number; fullSkip?: boolean; dotRate?: number }
    | { kind: "self_status"; effect: StatusEffect; durationTurns?: number; fullSkip?: boolean; dotRate?: number }
    | { kind: "energy_shift"; amount: number; target?: "self" | "enemy"; durationTurns?: number; regenPenalty?: number }
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
    effectFamily: MonsterMoveEffectFamily;
    flags: MonsterMoveFlag[];
    roleTag: MonsterMove["roleTag"];
    effects: NegamonSkillEffect[];
    unlock: NegamonSkillUnlockRule;
    sourceMove: MonsterMove;
};

export function getNegamonMoveLearnLevel(move: Pick<MonsterMove, "learnRank" | "learnLevel">): number {
    if (typeof move.learnLevel === "number") {
        return normalizeNegamonLevel(move.learnLevel);
    }

    const rank = Math.max(0, Math.floor(move.learnRank ?? 1));
    if (rank <= 1) return 1;
    if (rank === 2) return 2;
    if (rank === 3) return 4;
    if (rank === 4) return 8;
    if (rank === 5) return 16;
    return 26;
}

function getSkillCategory(move: MonsterMove): NegamonSkillCategory {
    if (move.effectFamily === "HEAL") return "heal";
    if (move.effectFamily === "SELF_BOOST") return "buff";
    if (move.effectFamily === "ENEMY_DEBUFF" || move.effectFamily === "TEMPO_CONTROL") return "debuff";
    if (move.category === "HEAL" || move.effect === "HEAL_25") return "heal";
    if (move.power > 0 && move.effect) return "special";
    if (move.power > 0) return "attack";
    if (move.effect?.startsWith("BOOST_")) return "buff";
    if (move.effect?.startsWith("LOWER_")) return "debuff";
    return "status";
}

function getSkillTarget(move: MonsterMove): NegamonSkillTarget {
    if (move.flags?.includes("selfOnly")) return "self";
    if (move.flags?.includes("allEnemies")) return "allEnemies";
    if (move.category === "HEAL" || move.effect === "HEAL_25" || move.selfEffect) return "self";
    if (move.effect === "LOWER_ATK_ALL") return "allEnemies";
    return "enemy";
}

function getCooldownTurns(move: MonsterMove): number {
    if (isNegamonBasicAttackMoveId(move.id)) return 0;
    if (move.learnRank >= 6) return 2;
    if (move.category === "HEAL") return 2;
    if (move.effect === "PARALYZE" || move.effect === "SLEEP" || move.effect === "FREEZE") return 1;
    if (move.power === 0 && (move.effect?.startsWith("BOOST_") || move.effect?.startsWith("LOWER_"))) return 1;
    return 0;
}

function describeSkill(move: MonsterMove): string {
    const parts: string[] = [];
    if (move.effectFamily) parts.push(move.effectFamily);
    if (move.power > 0) parts.push(`Power ${move.power}`);
    if (move.effect) parts.push(`Effect ${move.effect}`);
    if (move.selfEffect) parts.push(`Self ${move.selfEffect}`);
    if (move.drainPct) parts.push(`Drain ${move.drainPct}%`);
    if (move.critBonus) parts.push(`Crit +${move.critBonus}%`);
    return parts.length ? parts.join(" / ") : "Utility skill";
}

function mapStatusEffectToSkillEffects(input: {
    effect: StatusEffect;
    chance?: number;
    durationTurns?: number;
    target: "self" | "enemy" | "allEnemies";
    fullSkip?: boolean;
    dotRate?: number;
    regenPenalty?: number;
}): NegamonSkillEffect[] {
    const durationTurns = input.durationTurns;

    switch (input.effect) {
        case "BOOST_ATK":
            return [{
                kind: "stat_stage",
                stat: "attack",
                stages: 1,
                target: input.target,
                durationTurns,
            }];
        case "BOOST_DEF":
        case "BOOST_DEF_20":
            return [{
                kind: "stat_stage",
                stat: "defense",
                stages: 1,
                target: input.target,
                durationTurns,
            }];
        case "BOOST_SPD":
        case "BOOST_SPD_30":
            return [{
                kind: "stat_stage",
                stat: "speed",
                stages: 1,
                target: input.target,
                durationTurns,
            }];
        case "BOOST_SPD_100":
            return [{
                kind: "stat_stage",
                stat: "speed",
                stages: 2,
                target: input.target,
                durationTurns,
            }];
        case "LOWER_ATK":
        case "LOWER_ATK_ALL":
            return [{
                kind: "stat_stage",
                stat: "attack",
                stages: -1,
                target: input.target,
                durationTurns,
            }];
        case "LOWER_DEF":
            return [{
                kind: "stat_stage",
                stat: "defense",
                stages: -1,
                target: input.target,
                durationTurns,
            }];
        case "LOWER_SPD":
            return [{
                kind: "stat_stage",
                stat: "speed",
                stages: -2,
                target: input.target,
                durationTurns,
            }];
        case "LOWER_EN_REGEN":
            return [{
                kind: "energy_shift",
                amount: -(input.regenPenalty ?? 15),
                target: input.target === "self" ? "self" : "enemy",
                durationTurns,
                regenPenalty: input.regenPenalty ?? 15,
            }];
        case "HEAL_25":
            return [{ kind: "heal", percent: 25 }];
        default:
            if (input.target === "self") {
                return [{
                    kind: "self_status",
                    effect: input.effect,
                    durationTurns,
                    fullSkip: input.fullSkip,
                    dotRate: input.dotRate,
                }];
            }
            return [{
                kind: "status",
                effect: input.effect,
                chance: input.chance ?? 100,
                durationTurns,
                fullSkip: input.fullSkip,
                dotRate: input.dotRate,
            }];
    }
}

export function createNegamonSkillDefinition(
    move: MonsterMove,
    speciesId: string
): NegamonSkillDefinition {
    const effects: NegamonSkillEffect[] = [];
    if (move.power > 0) effects.push({ kind: "damage", power: move.power });
    if (move.category === "HEAL") {
        effects.push({ kind: "heal", percent: 25 });
    } else if (move.effect) {
        effects.push(
            ...mapStatusEffectToSkillEffects({
                effect: move.effect,
                chance: move.effectChance,
                durationTurns: move.effectDurationTurns,
                target: move.effect === "LOWER_ATK_ALL" ? "allEnemies" : "enemy",
                fullSkip: move.effectParalyzeFullSkip,
                dotRate: move.effectBurnDotRate,
                regenPenalty: move.effectRegenPenalty,
            })
        );
    }
    if (move.selfEffect) {
        effects.push(
            ...mapStatusEffectToSkillEffects({
                effect: move.selfEffect,
                durationTurns: move.selfEffectDurationTurns,
                target: "self",
            })
        );
    }
    if (move.drainPct) effects.push({ kind: "drain", percent: move.drainPct });
    if (move.critBonus) effects.push({ kind: "critical_bonus", percent: move.critBonus });

    const energyCost = getMoveEnergyCost(move, speciesId);
    effects.push({ kind: "energy_cost", value: energyCost });

    const learnLevel = getNegamonMoveLearnLevel(move);
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
        effectFamily: move.effectFamily ?? (move.power > 0 ? "STRIKE" : "SELF_BOOST"),
        flags: move.flags ?? [],
        roleTag: move.roleTag,
        effects,
        unlock: {
            level: learnLevel,
            rankIndex: getNegamonFormIndexFromLevel(learnLevel),
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
