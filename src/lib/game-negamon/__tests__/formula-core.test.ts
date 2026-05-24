import { describe, expect, it } from "vitest";
import {
    calculateFormulaDamage,
    createDeterministicRng,
    createNeutralStatStages,
    getAccuracyStageMultiplier,
    getCriticalChancePercent,
    getEffectiveAccuracy,
    getFormulaTypeMultiplier,
    mergeStatStageDelta,
    rollDamageBand,
    rollPercent,
} from "@/lib/game-negamon";

describe("Negamon formula core", () => {
    it("calculates type multiplier across dual types", () => {
        expect(getFormulaTypeMultiplier("FIRE", ["WIND", "LIGHT"])).toBe(4);
        expect(getFormulaTypeMultiplier("LIGHT", ["DARK", "FIRE"])).toBe(1);
    });

    it("applies stat stages with bounds", () => {
        const stages = createNeutralStatStages();
        const boosted = mergeStatStageDelta(stages, "attack", 3);
        const lowered = mergeStatStageDelta(boosted, "attack", -10);

        expect(boosted.attack).toBe(3);
        expect(lowered.attack).toBe(-6);
    });

    it("calculates accuracy from accuracy and evasion stages", () => {
        expect(getAccuracyStageMultiplier(2, 0)).toBe(2);
        expect(getAccuracyStageMultiplier(0, 2)).toBe(0.5);
        expect(getEffectiveAccuracy({ baseAccuracy: 85, accuracyStage: 1, evasionStage: 0 })).toBe(100);
    });

    it("scales crit chance by crit rate stage", () => {
        expect(getCriticalChancePercent(0)).toBe(6.25);
        expect(getCriticalChancePercent(2)).toBe(25);
        expect(getCriticalChancePercent(9)).toBe(50);
    });

    it("calculates Pokemon-inspired damage with stab, type, and crit", () => {
        const actor = {
            level: 6,
            types: ["FIRE", "DARK"] as const,
            stats: {
                maxHp: 320,
                attack: 196,
                defense: 110,
                specialAttack: 196,
                specialDefense: 110,
                speed: 162,
            },
            statStages: createNeutralStatStages(),
        };
        const target = {
            level: 6,
            types: ["WIND", "LIGHT"] as const,
            stats: {
                maxHp: 300,
                attack: 178,
                defense: 118,
                specialAttack: 178,
                specialDefense: 118,
                speed: 194,
            },
            statStages: createNeutralStatStages(),
        };
        const move = {
            id: "pyronox-hell-dive",
            type: "FIRE" as const,
            category: "SPECIAL" as const,
            power: 74,
            accuracy: 90,
            priority: 0,
        };

        const normal = calculateFormulaDamage({
            actor,
            target,
            move,
            critical: false,
            randomMultiplier: 1,
        });
        const critical = calculateFormulaDamage({
            actor,
            target,
            move,
            critical: true,
            randomMultiplier: 1,
        });

        expect(normal.stab).toBe(true);
        expect(normal.typeMultiplier).toBe(4);
        expect(normal.damage).toBeGreaterThan(critical.damage / 2);
        expect(critical.damage).toBeGreaterThan(normal.damage);
    });

    it("provides deterministic rng outputs", () => {
        const rng = createDeterministicRng(12345);
        const firstRoll = rollPercent(rng, 50);
        const bandRoll = rollDamageBand(firstRoll.rng);
        const secondRoll = rollPercent(bandRoll.rng, 50);

        expect(firstRoll.rolled).toBeGreaterThanOrEqual(0);
        expect(firstRoll.rolled).toBeLessThan(100);
        expect(bandRoll.multiplier).toBeGreaterThanOrEqual(0.85);
        expect(bandRoll.multiplier).toBeLessThanOrEqual(1);
        expect(secondRoll.rng.cursor).toBe(3);
    });
});
