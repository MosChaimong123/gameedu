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
    it("calculates type multiplier in 4-element rock-paper-scissors cycle", () => {
        // FIRE beats ELECTRICITY ×2
        expect(getFormulaTypeMultiplier("FIRE", ["ELECTRICITY"])).toBe(2);
        // FIRE resisted by WATER ×0.5
        expect(getFormulaTypeMultiplier("FIRE", ["WATER"])).toBe(0.5);
        // GRASS beats WATER ×2
        expect(getFormulaTypeMultiplier("GRASS", ["WATER"])).toBe(2);
        // ELECTRICITY beats GRASS ×2
        expect(getFormulaTypeMultiplier("ELECTRICITY", ["GRASS"])).toBe(2);
        // NORMAL always ×1
        expect(getFormulaTypeMultiplier("NORMAL", ["FIRE"])).toBe(1);
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
            types: ["FIRE"] as const,
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
            types: ["ELECTRICITY"] as const,
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
        expect(normal.typeMultiplier).toBe(2);
        expect(normal.rawDamage).toBeGreaterThanOrEqual(normal.damage);
        expect(normal.damage).toBeGreaterThan(critical.damage / 2);
        expect(critical.damage).toBeGreaterThan(normal.damage);
        expect(critical.critical).toBe(true);
    });

    it("returns zero damage for status moves and keeps damaging moves above the minimum", () => {
        const actor = {
            level: 60,
            types: ["NORMAL"] as const,
            stats: { maxHp: 500, attack: 200, defense: 200, specialAttack: 200, specialDefense: 200, speed: 100 },
            statStages: createNeutralStatStages(),
        };
        const target = {
            level: 60,
            types: ["DARK"] as const,
            stats: { maxHp: 500, attack: 200, defense: 200, specialAttack: 200, specialDefense: 200, speed: 100 },
            statStages: createNeutralStatStages(),
        };

        expect(
            calculateFormulaDamage({
                actor,
                target,
                move: { id: "guard", type: "LIGHT", category: "STATUS", power: 0, accuracy: 100, priority: 0 },
            }).damage
        ).toBe(0);
        expect(
            calculateFormulaDamage({
                actor,
                target,
                move: { id: "neutral-hit", type: "NORMAL", category: "PHYSICAL", power: 80, accuracy: 100, priority: 0 },
            }).damage
        ).toBeGreaterThanOrEqual(1);
    });

    it("caps one-hit burst damage to a classroom-safe target HP ratio", () => {
        const actor = {
            level: 60,
            types: ["FIRE"] as const,
            stats: { maxHp: 999, attack: 5000, defense: 100, specialAttack: 5000, specialDefense: 100, speed: 100 },
            statStages: createNeutralStatStages(),
        };
        const target = {
            level: 60,
            types: ["WIND"] as const,
            stats: { maxHp: 100, attack: 100, defense: 1, specialAttack: 100, specialDefense: 1, speed: 100 },
            statStages: createNeutralStatStages(),
        };
        const result = calculateFormulaDamage({
            actor,
            target,
            move: { id: "burst", type: "FIRE", category: "SPECIAL", power: 250, accuracy: 100, priority: 0 },
            randomMultiplier: 1,
        });

        expect(result.rawDamage).toBeGreaterThan(75);
        expect(result.damage).toBe(75);
        expect(result.capped).toBe(true);
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
