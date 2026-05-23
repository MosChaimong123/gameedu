import { describe, expect, it } from "vitest";
import {
    createSeededRng,
    getEffectivenessLabel,
    getTypeMultiplier,
    getValidChoices,
    type NegamonLiteBattleState,
    type NegamonLiteCombatant,
} from "@/lib/negamon-lite";

function makeCombatant(overrides: Partial<NegamonLiteCombatant> = {}): NegamonLiteCombatant {
    return {
        id: "naga-1",
        name: "Naga",
        speciesId: "naga",
        level: 5,
        types: ["WATER"],
        stats: {
            hp: 120,
            attack: 30,
            defense: 20,
            specialAttack: 34,
            specialDefense: 22,
            speed: 16,
        },
        hp: 120,
        energy: 20,
        maxEnergy: 40,
        moves: [
            {
                id: "splash-strike",
                name: "Splash Strike",
                type: "WATER",
                category: "SPECIAL",
                power: 40,
                accuracy: 95,
                pp: 10,
                maxPp: 10,
                energyCost: 12,
                target: "opponent",
            },
            {
                id: "tidal-focus",
                name: "Tidal Focus",
                type: "WATER",
                category: "STATUS",
                power: 0,
                accuracy: 100,
                pp: 5,
                maxPp: 5,
                energyCost: 6,
                target: "self",
                effect: { kind: "buff", stat: "specialAttack", stages: 1 },
            },
        ],
        ...overrides,
    };
}

function makeState(overrides: Partial<NegamonLiteBattleState> = {}): NegamonLiteBattleState {
    return {
        battleId: "battle-1",
        seed: 1234,
        turn: 1,
        phase: "choosing",
        sides: {
            player: makeCombatant(),
            opponent: makeCombatant({
                id: "garuda-1",
                name: "Garuda",
                speciesId: "garuda",
                types: ["FIRE", "WIND"],
            }),
        },
        events: [],
        ...overrides,
    };
}

describe("negamon-lite engine skeleton", () => {
    it("uses a deterministic type chart with dual-type defenders", () => {
        expect(getTypeMultiplier("WATER", ["FIRE"])).toBe(2);
        expect(getTypeMultiplier("WATER", ["FIRE", "DARK"])).toBe(1);
        expect(getTypeMultiplier("NORMAL", ["FIRE", "DARK"])).toBe(1);
        expect(getEffectivenessLabel(2)).toBe("effective");
        expect(getEffectivenessLabel(0.5)).toBe("resisted");
    });

    it("returns enabled move choices with resolved targets", () => {
        const choices = getValidChoices(makeState(), "player");

        expect(choices).toMatchObject([
            {
                kind: "move",
                moveId: "splash-strike",
                targetSide: "opponent",
                enabled: true,
            },
            {
                kind: "move",
                moveId: "tidal-focus",
                targetSide: "player",
                enabled: true,
            },
        ]);
    });

    it("explains disabled move choices instead of hiding them", () => {
        const state = makeState({
            sides: {
                player: makeCombatant({
                    energy: 4,
                    moves: [
                        {
                            id: "empty-big-hit",
                            name: "Empty Big Hit",
                            type: "WATER",
                            category: "SPECIAL",
                            power: 70,
                            accuracy: 90,
                            pp: 0,
                            maxPp: 5,
                            energyCost: 12,
                            target: "opponent",
                        },
                        {
                            id: "low-energy-hit",
                            name: "Low Energy Hit",
                            type: "WATER",
                            category: "SPECIAL",
                            power: 45,
                            accuracy: 90,
                            pp: 3,
                            maxPp: 5,
                            energyCost: 12,
                            target: "opponent",
                        },
                    ],
                }),
                opponent: makeCombatant({ id: "garuda-1", types: ["FIRE"] }),
            },
        });

        expect(getValidChoices(state, "player")).toMatchObject([
            { moveId: "empty-big-hit", enabled: false, reason: "NO_PP" },
            { moveId: "low-energy-hit", enabled: false, reason: "NO_ENERGY" },
        ]);
    });

    it("blocks choices while battle is not accepting input", () => {
        expect(getValidChoices(makeState({ phase: "resolving" }), "player")[0]).toMatchObject({
            enabled: false,
            reason: "NOT_CHOOSING",
        });

        expect(getValidChoices(makeState({ phase: "ended" }), "player")[0]).toMatchObject({
            enabled: false,
            reason: "BATTLE_ENDED",
        });
    });

    it("creates repeatable random sequences from the same seed", () => {
        const first = createSeededRng(777);
        const second = createSeededRng(777);

        expect([first.nextInt(1, 100), first.nextInt(1, 100), first.chance(30)]).toEqual([
            second.nextInt(1, 100),
            second.nextInt(1, 100),
            second.chance(30),
        ]);
    });
});
