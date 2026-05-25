import { describe, expect, it } from "vitest";
import {
    formatNegamonItemEffect,
    formatNegamonSkillFamily,
    formatNegamonSkillEffect,
    formatNegamonSkillPriority,
    formatNegamonSkillRequirement,
    formatNegamonSkillRoleTag,
    formatNegamonSkillTarget,
    formatNegamonStatusTimeline,
    summarizeNegamonBattleEvent,
    summarizeNegamonReward,
    type NegamonUiTranslateFn,
} from "../ui-content";
import type { NegamonSkillDefinition } from "@/lib/game-negamon";

const enT: NegamonUiTranslateFn = (key, params) => {
    const templates: Record<string, string> = {
        negamonSkillEffectStatStage: "{target} {stat} {stages}",
        negamonSkillEffectTargetEnemy: "Enemy",
        negamonSkillEffectTargetAllEnemies: "All enemies",
        negamonSkillEffectTargetSelf: "Self",
        negamonSkillEffectEnergyShift: "{target} EN {amount}",
        negamonSkillEffectStatus: "{effect} {chance}%",
        negamonSkillLevelReq: "Level {level}",
        negamonSkillRole_tempo: "Tempo",
        negamonSkillTarget_enemy: "Enemy target",
        negamonSkillFamily_PRIORITY_STRIKE: "Priority strike",
        negamonSkillPriority: "PRI {value}",
        negamonItemEffectImmune: "Immune {status}",
    };
    const template = templates[key] ?? key;
    if (!params) return template;
    return Object.entries(params).reduce(
        (text, [paramKey, value]) => text.replace(`{${paramKey}}`, String(value)),
        template
    );
};

function makeSkill(overrides: Partial<NegamonSkillDefinition> = {}): NegamonSkillDefinition {
    return {
        id: "skill_focus_mark",
        name: "Focus Mark",
        description: "Focus and mark the enemy.",
        elementType: "LIGHT",
        category: "debuff",
        target: "enemy",
        power: 0,
        accuracy: 90,
        energyCost: 8,
        cooldownTurns: 1,
        priority: 0,
        effects: [
            { kind: "stat_stage", stat: "accuracy", stages: -1, target: "enemy" },
            { kind: "status", effect: "PARALYZE", chance: 50 },
        ],
        unlock: { level: 3, rankIndex: 2, speciesId: "naga" },
        sourceMove: {
            id: "focus",
            name: "Focus",
            type: "LIGHT",
            category: "STATUS",
            power: 0,
            accuracy: 90,
            learnRank: 3,
        },
        ...overrides,
    };
}

describe("Negamon UI content helpers", () => {
    it("formats skill effects and requirements for compact UI labels", () => {
        const skill = makeSkill();

        expect(formatNegamonSkillEffect(skill, enT)).toBe("Enemy accuracy -1 / PARALYZE 50%");
        expect(formatNegamonSkillRequirement(skill, enT)).toBe("Level 3");
    });

    it("formats role, target, family, priority, and energy-shift labels", () => {
        const skill = makeSkill({
            priority: 1,
            roleTag: "tempo",
            effectFamily: "PRIORITY_STRIKE",
            effects: [{ kind: "energy_shift", amount: -15, target: "enemy", regenPenalty: 15 }],
        });

        expect(formatNegamonSkillRoleTag(skill.roleTag, enT)).toBe("Tempo");
        expect(formatNegamonSkillTarget(skill.target, enT)).toBe("Enemy target");
        expect(formatNegamonSkillFamily(skill.effectFamily, enT)).toBe("Priority strike");
        expect(formatNegamonSkillPriority(skill.priority, enT)).toBe("PRI +1");
        expect(formatNegamonSkillEffect(skill, enT)).toBe("Enemy EN 15");
    });

    it("formats item, status timeline, battle event, and reward summaries", () => {
        expect(formatNegamonItemEffect({ kind: "status_immunity", status: "POISON" }, enT)).toBe(
            "Immune POISON"
        );
        expect(formatNegamonStatusTimeline({
            side: "opponent",
            status: "BURN",
            action: "ticked",
            damage: 4,
            message: "Burn ticked.",
        })).toBe("BURN dealt 4 damage");
        expect(summarizeNegamonBattleEvent({
            id: "event-1",
            turn: 2,
            kind: "turn_resolved",
            damage: 10,
            statusTimeline: [
                {
                    side: "opponent",
                    status: "SHIELD",
                    action: "shielded",
                    preventedDamage: 3,
                    message: "Shield reduced damage.",
                },
            ],
            message: "Naga used Guard.",
        })).toBe("Shield reduced 3 damage");
        expect(summarizeNegamonReward({
            gold: 15,
            exp: 10,
            grantedItemIds: ["item_minor_potion"],
            levelUps: [{ fromLevel: 1, toLevel: 2, expBefore: 0, expAfter: 10 }],
            unlockedSkillIds: ["naga-aqua-jet"],
        })).toEqual(["Gold +15", "EXP +10", "Items 1", "Level 2", "Skills 1"]);
    });
});
