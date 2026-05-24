import { describe, expect, it } from "vitest";
import {
    createDeterministicRng,
    createNeutralRuntimeStatStages,
    createRuntimeCombatant,
    resolveRuntimeSkill,
} from "@/lib/game-negamon";
import type { NegamonSkillDefinition } from "@/lib/game-negamon";

function makeSkill(overrides: Partial<NegamonSkillDefinition> = {}): NegamonSkillDefinition {
    return {
        id: "voltshade-chain-shock",
        name: "Chain Shock",
        description: "Damage plus status",
        elementType: "THUNDER",
        category: "special",
        target: "enemy",
        power: 40,
        accuracy: 100,
        energyCost: 10,
        cooldownTurns: 0,
        priority: 0,
        effects: [
            { kind: "damage", power: 40 },
            { kind: "status", effect: "PARALYZE", chance: 100, durationTurns: 2 },
            { kind: "energy_cost", value: 10 },
        ],
        unlock: { rankIndex: 2, speciesId: "voltshade" },
        sourceMove: {
            id: "voltshade-chain-shock",
            name: "Chain Shock",
            type: "THUNDER",
            category: "SPECIAL",
            power: 40,
            accuracy: 100,
            learnRank: 3,
            energyCost: 10,
        },
        ...overrides,
    };
}

function makeCombatant(overrides: Partial<ReturnType<typeof createRuntimeCombatant>> = {}) {
    return createRuntimeCombatant({
        id: overrides.id ?? "student-1",
        side: overrides.side ?? "player",
        name: overrides.name ?? "Voltshade",
        level: overrides.level ?? 6,
        types: overrides.types ?? ["THUNDER", "DARK"],
        stats: overrides.stats ?? {
            maxHp: 340,
            attack: 166,
            defense: 126,
            specialAttack: 166,
            specialDefense: 126,
            speed: 182,
        },
        statStages: overrides.statStages ?? createNeutralRuntimeStatStages(),
        hp: overrides.hp,
        energy: overrides.energy ?? 40,
        maxEnergy: overrides.maxEnergy ?? 40,
        statusImmunities: overrides.statusImmunities,
        statuses: overrides.statuses,
        volatileStates: overrides.volatileStates,
    });
}

describe("Negamon V3 move and status runtime", () => {
    it("resolves damage and applies guaranteed status through the pure runtime", () => {
        const actor = makeCombatant();
        const target = makeCombatant({
            id: "student-2",
            side: "opponent",
            name: "Aerolisk",
            types: ["WIND", "THUNDER"],
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

        const { resolution } = resolveRuntimeSkill({
            actor,
            target,
            skill: makeSkill(),
            rng: createDeterministicRng(9),
        });

        expect(resolution.accepted).toBe(true);
        expect(resolution.missed).toBe(false);
        expect(resolution.damage).toBeGreaterThan(0);
        expect(resolution.target.statuses).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: "PARALYZE" })])
        );
    });

    it("applies self-heal and self-buff effects", () => {
        const actor = makeCombatant({ hp: 180 });
        const target = makeCombatant({ id: "student-2", side: "opponent", name: "Terranoir" });
        const skill = makeSkill({
            id: "lumilune-soft-glow",
            name: "Soft Glow",
            category: "heal",
            target: "self",
            power: 0,
            effects: [
                { kind: "heal", percent: 25 },
                { kind: "self_status", effect: "BOOST_DEF", durationTurns: 2 },
                { kind: "energy_cost", value: 12 },
            ],
            sourceMove: {
                id: "lumilune-soft-glow",
                name: "Soft Glow",
                type: "LIGHT",
                category: "HEAL",
                power: 0,
                accuracy: 100,
                learnRank: 3,
                energyCost: 12,
            },
        });

        const { resolution } = resolveRuntimeSkill({
            actor,
            target,
            skill,
            rng: createDeterministicRng(5),
        });

        expect(resolution.actor.hp).toBeGreaterThan(180);
        expect(resolution.actor.volatileStates).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: "SHIELD" })])
        );
    });

    it("respects turn-start skip and turn-end dot processing", () => {
        const actor = makeCombatant({
            statuses: [{ id: "SLEEP", remainingTurns: 1 }],
        });
        const target = makeCombatant({
            id: "student-2",
            side: "opponent",
            name: "Pyronox",
            statuses: [{ id: "BURN", remainingTurns: 2 }],
        });

        const { resolution } = resolveRuntimeSkill({
            actor,
            target,
            skill: makeSkill(),
            rng: createDeterministicRng(5),
        });

        expect(resolution.damage).toBe(0);
        expect(resolution.timeline).toEqual(
            expect.arrayContaining([expect.objectContaining({ kind: "turn_skipped" })])
        );
        expect(resolution.target.hp).toBeLessThan(target.hp);
    });

    it("respects shield reduction and status immunity", () => {
        const actor = makeCombatant();
        const target = makeCombatant({
            id: "student-2",
            side: "opponent",
            name: "Lumilune",
            volatileStates: [{ id: "SHIELD", remainingTurns: 2 }],
            statusImmunities: ["PARALYZE"],
        });

        const { resolution } = resolveRuntimeSkill({
            actor,
            target,
            skill: makeSkill(),
            rng: createDeterministicRng(9),
        });

        expect(resolution.damage).toBeGreaterThan(0);
        expect(resolution.timeline).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ message: expect.stringContaining("shield reduced") }),
                expect.objectContaining({ kind: "status_blocked", effectId: "PARALYZE" }),
            ])
        );
    });
});
