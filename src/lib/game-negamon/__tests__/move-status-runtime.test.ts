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
        name: "Chain Lock",
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
            name: "Chain Lock",
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
            name: "Tender Glow",
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
                name: "Tender Glow",
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

    it("supports drain attacks and temporary stat-stage moves", () => {
        const actor = makeCombatant({ hp: 140 });
        const target = makeCombatant({
            id: "student-2",
            side: "opponent",
            name: "Terranoir",
            stats: {
                maxHp: 400,
                attack: 150,
                defense: 150,
                specialAttack: 150,
                specialDefense: 150,
                speed: 90,
            },
            hp: 400,
        });

        const drainSkill = makeSkill({
            id: "tidemaw-deep-feast",
            name: "Deep Feast",
            power: 42,
            effects: [
                { kind: "damage", power: 42 },
                { kind: "drain", percent: 50 },
                { kind: "energy_cost", value: 10 },
            ],
            sourceMove: {
                id: "tidemaw-deep-feast",
                name: "Deep Feast",
                type: "WATER",
                category: "SPECIAL",
                power: 42,
                accuracy: 100,
                learnRank: 4,
                energyCost: 10,
            },
        });

        const drainResult = resolveRuntimeSkill({
            actor,
            target,
            skill: drainSkill,
            rng: createDeterministicRng(13),
        });

        expect(drainResult.resolution.damage).toBeGreaterThan(0);
        expect(drainResult.resolution.actor.hp).toBeGreaterThan(140);
        expect(drainResult.resolution.timeline).toEqual(
            expect.arrayContaining([expect.objectContaining({ kind: "heal", message: expect.stringContaining("drained") })])
        );

        const buffSkill = makeSkill({
            id: "aerolisk-jetstream",
            name: "Jetstream",
            category: "buff",
            target: "self",
            power: 0,
            effects: [
                { kind: "stat_stage", stat: "speed", stages: 1, target: "self", durationTurns: 1 },
                { kind: "energy_cost", value: 8 },
            ],
            sourceMove: {
                id: "aerolisk-jetstream",
                name: "Jetstream",
                type: "WIND",
                category: "STATUS",
                power: 0,
                accuracy: 100,
                learnRank: 4,
                energyCost: 8,
            },
        });

        const buffResult = resolveRuntimeSkill({
            actor: makeCombatant(),
            target: makeCombatant({ id: "student-2", side: "opponent", name: "Pyronox" }),
            skill: buffSkill,
            rng: createDeterministicRng(3),
        });

        expect(buffResult.resolution.actor.statStages.speed).toBe(0);
        expect(buffResult.resolution.timeline).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ kind: "stat_stage_changed", amount: 1 }),
                expect.objectContaining({ kind: "stat_stage_changed", amount: -1 }),
                expect.objectContaining({ kind: "volatile_expired", effectId: "STAT_STAGE_MOD" }),
            ])
        );
    });

    it("supports full-skip paralysis and energy denial effects", () => {
        const actor = makeCombatant();
        const target = makeCombatant({
            id: "student-2",
            side: "opponent",
            name: "Voltshade",
            energy: 35,
            maxEnergy: 40,
            energyRegenPerTurn: 12,
        });

        const chainLock = makeSkill({
            id: "voltshade-chain-lock",
            name: "Chain Lock",
            effects: [
                { kind: "damage", power: 38 },
                { kind: "status", effect: "PARALYZE", chance: 100, durationTurns: 1, fullSkip: true },
                { kind: "energy_cost", value: 10 },
            ],
        });
        const blackSignal = makeSkill({
            id: "voltshade-black-signal",
            name: "Black Signal",
            category: "status",
            target: "enemy",
            power: 0,
            effects: [
                { kind: "energy_shift", amount: -15, target: "enemy", durationTurns: 2, regenPenalty: 15 },
                { kind: "energy_cost", value: 10 },
            ],
            sourceMove: {
                id: "voltshade-black-signal",
                name: "Black Signal",
                type: "DARK",
                category: "STATUS",
                power: 0,
                accuracy: 100,
                learnRank: 3,
                energyCost: 10,
            },
        });

        const paralyzeResult = resolveRuntimeSkill({
            actor,
            target,
            skill: chainLock,
            rng: createDeterministicRng(7),
            processTurnEnd: false,
        });
        expect(paralyzeResult.resolution.target.statuses).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: "PARALYZE", data: expect.objectContaining({ fullSkip: true }) })])
        );

        const skipResult = resolveRuntimeSkill({
            actor: paralyzeResult.resolution.target,
            target: paralyzeResult.resolution.actor,
            skill: makeSkill(),
            rng: paralyzeResult.rng,
            processTurnEnd: false,
        });
        expect(skipResult.resolution.timeline).toEqual(
            expect.arrayContaining([expect.objectContaining({ kind: "turn_skipped", message: expect.stringContaining("locked down") })])
        );

        const energyResult = resolveRuntimeSkill({
            actor,
            target,
            skill: blackSignal,
            rng: createDeterministicRng(11),
            processTurnEnd: false,
        });
        expect(energyResult.resolution.target.energy).toBe(20);
        expect(energyResult.resolution.target.volatileStates).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: "ENERGY_REGEN_DOWN" })])
        );
    });
});
