import { describe, expect, it } from "vitest";
import {
    calculateDamage,
    resolveChoice,
    type NegamonLiteBattleState,
    type NegamonLiteCombatant,
    type NegamonLiteMove,
} from "@/lib/negamon-lite";

const waterStrike: NegamonLiteMove = {
    id: "water-strike",
    name: "Water Strike",
    type: "WATER",
    category: "SPECIAL",
    power: 50,
    accuracy: 100,
    pp: 10,
    maxPp: 10,
    energyCost: 5,
    target: "opponent",
};

function makeCombatant(overrides: Partial<NegamonLiteCombatant> = {}): NegamonLiteCombatant {
    return {
        id: "naga-1",
        name: "Naga",
        speciesId: "naga",
        level: 10,
        types: ["WATER"],
        stats: {
            hp: 100,
            attack: 24,
            defense: 20,
            specialAttack: 36,
            specialDefense: 24,
            speed: 18,
        },
        hp: 100,
        energy: 20,
        maxEnergy: 40,
        moves: [waterStrike],
        ...overrides,
    };
}

function makeState(overrides: Partial<NegamonLiteBattleState> = {}): NegamonLiteBattleState {
    return {
        battleId: "battle-phase-2",
        seed: 42,
        turn: 1,
        phase: "choosing",
        sides: {
            player: makeCombatant(),
            opponent: makeCombatant({
                id: "garuda-1",
                name: "Garuda",
                speciesId: "garuda",
                types: ["FIRE"],
                stats: {
                    hp: 100,
                    attack: 26,
                    defense: 18,
                    specialAttack: 30,
                    specialDefense: 20,
                    speed: 20,
                },
            }),
        },
        events: [],
        ...overrides,
    };
}

describe("negamon-lite turn resolution", () => {
    it("calculates Pokemon-lite damage with STAB and type effectiveness", () => {
        const actor = makeCombatant();
        const target = makeCombatant({ types: ["FIRE"] });

        const result = calculateDamage({ actor, target, move: waterStrike, critical: false });

        expect(result).toMatchObject({
            stab: true,
            typeMultiplier: 2,
            effectiveness: "effective",
        });
        expect(result.damage).toBeGreaterThan(1);
    });

    it("resolves one deterministic damaging turn and never lets HP go below zero", () => {
        const result = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({
                        moves: [{ ...waterStrike, power: 250 }],
                    }),
                    opponent: makeCombatant({
                        id: "garuda-1",
                        name: "Garuda",
                        types: ["FIRE"],
                        hp: 20,
                    }),
                },
            }),
            { side: "player", kind: "move", moveId: "water-strike" }
        );

        expect(result.accepted).toBe(true);
        expect(result.state.sides.opponent.hp).toBe(0);
        expect(result.state.phase).toBe("ended");
        expect(result.state.winner).toBe("player");
        expect(result.state.events.at(-1)).toMatchObject({ kind: "battle_ended", side: "player" });
    });

    it("spends PP and energy after an accepted move", () => {
        const result = resolveChoice(makeState(), { side: "player", kind: "move", moveId: "water-strike" });

        expect(result.accepted).toBe(true);
        expect(result.state.sides.player.moves[0].pp).toBe(9);
        expect(result.state.sides.player.energy).toBe(15);
        expect(result.state.turn).toBe(2);
    });

    it("uses accuracy to miss without dealing damage", () => {
        const result = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({
                        moves: [{ ...waterStrike, accuracy: 0 }],
                    }),
                    opponent: makeCombatant({ id: "garuda-1", name: "Garuda", types: ["FIRE"], hp: 80 }),
                },
            }),
            { side: "player", kind: "move", moveId: "water-strike" }
        );

        expect(result.state.sides.opponent.hp).toBe(80);
        expect(result.state.events.at(-1)).toMatchObject({
            kind: "turn_resolved",
            missed: true,
            damage: 0,
        });
    });

    it("supports basic status healing moves", () => {
        const result = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({
                        hp: 40,
                        moves: [
                            {
                                id: "gentle-rain",
                                name: "Gentle Rain",
                                type: "WATER",
                                category: "STATUS",
                                power: 0,
                                accuracy: 100,
                                pp: 3,
                                maxPp: 3,
                                energyCost: 4,
                                target: "self",
                                effect: { kind: "heal", percent: 30 },
                            },
                        ],
                    }),
                    opponent: makeCombatant({ id: "garuda-1", name: "Garuda", types: ["FIRE"] }),
                },
            }),
            { side: "player", kind: "move", moveId: "gentle-rain" }
        );

        expect(result.state.sides.player.hp).toBe(70);
        expect(result.state.events.at(-1)).toMatchObject({
            healing: 30,
            targetSide: "player",
        });
    });

    it("applies burn damage over time and records a status timeline", () => {
        const result = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({
                        moves: [
                            {
                                ...waterStrike,
                                id: "ember-mark",
                                name: "Ember Mark",
                                type: "FIRE",
                                power: 0,
                                category: "STATUS",
                                effect: { kind: "status", status: "BURN", chance: 100, durationTurns: 2 },
                            },
                        ],
                    }),
                    opponent: makeCombatant({ id: "garuda-1", name: "Garuda", types: ["WIND"], hp: 100 }),
                },
            }),
            { side: "player", kind: "move", moveId: "ember-mark" }
        );

        expect(result.state.sides.opponent.statuses).toEqual([
            { status: "BURN", remainingTurns: 1, sourceMoveId: "ember-mark" },
        ]);
        expect(result.state.sides.opponent.hp).toBe(96);
        expect(result.state.events.at(-1)?.statusTimeline).toEqual([
            expect.objectContaining({ action: "applied", status: "BURN" }),
            expect.objectContaining({ action: "ticked", status: "BURN", damage: 4 }),
        ]);
    });

    it("uses sleep to skip a turn and expires the status", () => {
        const result = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({
                        statuses: [{ status: "SLEEP", remainingTurns: 1 }],
                    }),
                    opponent: makeCombatant({ id: "garuda-1", name: "Garuda", types: ["FIRE"], hp: 100 }),
                },
            }),
            { side: "player", kind: "move", moveId: "water-strike" }
        );

        expect(result.accepted).toBe(true);
        expect(result.state.sides.player.moves[0].pp).toBe(10);
        expect(result.state.sides.opponent.hp).toBe(100);
        expect(result.state.sides.player.statuses).toEqual([]);
        expect(result.state.events.at(-1)).toMatchObject({
            kind: "turn_resolved",
            effectApplied: false,
            statusTimeline: [
                expect.objectContaining({ action: "skipped", status: "SLEEP" }),
                expect.objectContaining({ action: "expired", status: "SLEEP" }),
            ],
        });
    });

    it("reduces damage with shield and improves accuracy with focus", () => {
        const shielded = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({ moves: [{ ...waterStrike, power: 100 }] }),
                    opponent: makeCombatant({
                        id: "garuda-1",
                        name: "Garuda",
                        types: ["FIRE"],
                        statuses: [{ status: "SHIELD", remainingTurns: 2 }],
                    }),
                },
            }),
            { side: "player", kind: "move", moveId: "water-strike" }
        );

        expect(shielded.state.events.at(-1)?.statusTimeline).toEqual(
            expect.arrayContaining([expect.objectContaining({ action: "shielded", status: "SHIELD" })])
        );

        const focused = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({
                        statuses: [{ status: "FOCUS", remainingTurns: 2 }],
                        moves: [{ ...waterStrike, accuracy: 80 }],
                    }),
                    opponent: makeCombatant({ id: "garuda-1", name: "Garuda", types: ["FIRE"], hp: 100 }),
                },
            }),
            { side: "player", kind: "move", moveId: "water-strike" }
        );

        expect(focused.state.events.at(-1)).toMatchObject({
            missed: false,
        });
    });

    it("blocks status application by immunity", () => {
        const result = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({
                        moves: [
                            {
                                ...waterStrike,
                                id: "toxic-mark",
                                name: "Toxic Mark",
                                power: 0,
                                category: "STATUS",
                                effect: { kind: "status", status: "POISON", chance: 100 },
                            },
                        ],
                    }),
                    opponent: makeCombatant({
                        id: "garuda-1",
                        name: "Garuda",
                        types: ["FIRE"],
                        statusImmunities: ["POISON"],
                    }),
                },
            }),
            { side: "player", kind: "move", moveId: "toxic-mark" }
        );

        expect(result.state.sides.opponent.statuses).toEqual([]);
        expect(result.state.events.at(-1)).toMatchObject({
            effectApplied: false,
            statusTimeline: [expect.objectContaining({ action: "blocked", status: "POISON" })],
        });
    });

    it("rejects unavailable moves without mutating battle progress", () => {
        const result = resolveChoice(
            makeState({
                sides: {
                    player: makeCombatant({ energy: 0 }),
                    opponent: makeCombatant({ id: "garuda-1", name: "Garuda", types: ["FIRE"] }),
                },
            }),
            { side: "player", kind: "move", moveId: "water-strike" }
        );

        expect(result).toMatchObject({ accepted: false, reason: "NO_ENERGY" });
        expect(result.state.turn).toBe(1);
        expect(result.state.sides.player.moves[0].pp).toBe(10);
        expect(result.state.events.at(-1)).toMatchObject({ kind: "choice_rejected" });
    });
});
