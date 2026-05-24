import { describe, expect, it } from "vitest";
import {
    applyRuntimeHooks,
    createDeterministicRng,
    createNeutralRuntimeStatStages,
    createRuntimeCombatant,
} from "@/lib/game-negamon";
import type { NegamonSkillDefinition } from "@/lib/game-negamon";

function makeCombatant(overrides: Partial<ReturnType<typeof createRuntimeCombatant>> = {}) {
    return createRuntimeCombatant({
        id: overrides.id ?? "student-1",
        side: overrides.side ?? "player",
        name: overrides.name ?? "Combatant",
        level: overrides.level ?? 6,
        types: overrides.types ?? ["FIRE", "DARK"],
        stats: overrides.stats ?? {
            maxHp: 320,
            attack: 196,
            defense: 110,
            specialAttack: 196,
            specialDefense: 110,
            speed: 162,
        },
        statStages: overrides.statStages ?? createNeutralRuntimeStatStages(),
        hp: overrides.hp,
        energy: overrides.energy ?? 40,
        maxEnergy: overrides.maxEnergy ?? 40,
        abilityId: overrides.abilityId,
        battleItemIds: overrides.battleItemIds ?? [],
        statuses: overrides.statuses,
        volatileStates: overrides.volatileStates,
        statusImmunities: overrides.statusImmunities,
    });
}

function makeSkill(overrides: Partial<NegamonSkillDefinition> = {}): NegamonSkillDefinition {
    return {
        id: "pyronox-hell-dive",
        name: "Hell Dive",
        description: "Attack",
        elementType: "FIRE",
        category: "special",
        target: "enemy",
        power: 74,
        accuracy: 100,
        energyCost: 12,
        cooldownTurns: 0,
        priority: 0,
        effects: [{ kind: "damage", power: 74 }, { kind: "energy_cost", value: 12 }],
        unlock: { rankIndex: 3, speciesId: "pyronox" },
        sourceMove: {
            id: "pyronox-hell-dive",
            name: "Hell Dive",
            type: "FIRE",
            category: "SPECIAL",
            power: 74,
            accuracy: 100,
            learnRank: 4,
            energyCost: 12,
        },
        ...overrides,
    };
}

describe("Negamon V3 ability and item hook framework", () => {
    it("applies battle-start ability and item hooks", () => {
        const combatant = makeCombatant({
            abilityId: "iron_shell",
            battleItemIds: ["held_guard_core", "reward_lucky_coin"],
        });

        const { timeline } = applyRuntimeHooks({
            trigger: "battle_start",
            combatant,
            rng: createDeterministicRng(1),
        });

        expect(combatant.stats.defense).toBeGreaterThan(110);
        expect(combatant.rewardGoldBonus).toBe(15);
        expect(timeline.length).toBeGreaterThan(0);
    });

    it("applies turn-end ability hooks such as volt flow and guardian scale", () => {
        const voltFlow = makeCombatant({
            abilityId: "volt_flow",
            energy: 10,
            maxEnergy: 40,
        });
        const guardian = makeCombatant({
            abilityId: "guardian_scale",
            hp: 80,
            stats: {
                maxHp: 320,
                attack: 196,
                defense: 110,
                specialAttack: 196,
                specialDefense: 110,
                speed: 162,
            },
        });

        applyRuntimeHooks({ trigger: "turn_end", combatant: voltFlow, rng: createDeterministicRng(1) });
        applyRuntimeHooks({ trigger: "turn_end", combatant: guardian, rng: createDeterministicRng(1) });
        applyRuntimeHooks({ trigger: "turn_end", combatant: guardian, rng: createDeterministicRng(1) });

        expect(voltFlow.energy).toBe(25);
        expect(guardian.hp).toBeGreaterThan(80);
        expect(guardian.hookFlags?.guardian_scale_once).toBe(true);
    });

    it("applies before-move and on-damage hooks through the runtime hook framework", () => {
        const actor = makeCombatant({
            abilityId: "rage_mode",
            hp: 120,
            types: ["DARK"],
            stats: {
                maxHp: 320,
                attack: 196,
                defense: 110,
                specialAttack: 196,
                specialDefense: 110,
                speed: 162,
            },
        });
        const target = makeCombatant({
            id: "student-2",
            side: "opponent",
            name: "Flame Body",
            abilityId: "flame_body",
            types: ["WIND"],
            stats: {
                maxHp: 300,
                attack: 178,
                defense: 118,
                specialAttack: 178,
                specialDefense: 118,
                speed: 194,
            },
            hp: 300,
        });

        applyRuntimeHooks({
            trigger: "before_move",
            combatant: actor,
            attacker: target,
            rng: createDeterministicRng(1),
        });
        expect(actor.outgoingDamageMultiplier).toBeGreaterThan(1);

        const hookResult = applyRuntimeHooks({
            trigger: "on_damage_taken",
            combatant: target,
            attacker: actor,
            rng: createDeterministicRng(1),
        });

        expect(hookResult.timeline).toEqual(
            expect.arrayContaining([expect.objectContaining({ kind: "status_applied", effectId: "BURN" })])
        );
        expect(actor.statuses).toEqual(expect.arrayContaining([expect.objectContaining({ id: "BURN" })]));
    });

    it("maps status immunity items into runtime hook protection", () => {
        const combatant = makeCombatant({
            battleItemIds: ["held_clear_mind_charm"],
        });

        applyRuntimeHooks({
            trigger: "battle_start",
            combatant,
            rng: createDeterministicRng(1),
        });

        expect(combatant.statusImmunities).toEqual(expect.arrayContaining(["POISON", "BADLY_POISON"]));
    });
});
