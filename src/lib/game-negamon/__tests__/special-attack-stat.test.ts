/**
 * Verifies the new special-attack (`spa`) stat is wired through the roster, growth,
 * and battle snapshot — giving each species a distinct physical/special identity.
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import { calculateNegamonStatsForLevel } from "@/lib/game-negamon/core/monster-growth";

describe("special-attack stat (spa)", () => {
    it("every canonical species defines a spa base stat", () => {
        for (const species of DEFAULT_NEGAMON_SPECIES) {
            expect(species.baseStats.spa, `${species.id} should define spa`).toBeTypeOf("number");
            expect(species.baseStats.spa!).toBeGreaterThan(0);
        }
    });

    it("caster roles favour spa, physical roles favour atk", () => {
        const byId = Object.fromEntries(DEFAULT_NEGAMON_SPECIES.map((s) => [s.id, s.baseStats]));

        // Special attackers: spa should exceed atk.
        expect(byId.lumilune.spa!).toBeGreaterThan(byId.lumilune.atk); // 190 > 136
        expect(byId.voltshade.spa!).toBeGreaterThan(byId.voltshade.atk); // 184 > 162

        // Physical attackers: atk should exceed spa.
        expect(byId.pyronox.atk).toBeGreaterThan(byId.pyronox.spa!); // 192 > 130
        expect(byId.tidemaw.atk).toBeGreaterThan(byId.tidemaw.spa!); // 180 > 124
        expect(byId.terranoir.atk).toBeGreaterThan(byId.terranoir.spa!); // 150 > 120
    });

    it("computed battle stats include a level-scaled spa that preserves identity", () => {
        const lumilune = DEFAULT_NEGAMON_SPECIES.find((s) => s.id === "lumilune")!;
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((s) => s.id === "pyronox")!;

        const lumiluneStats = calculateNegamonStatsForLevel(lumilune.baseStats, 50, lumilune.battleRole);
        const pyronoxStats = calculateNegamonStatsForLevel(pyronox.baseStats, 50, pyronox.battleRole);

        // spa is present and scaled above the base value.
        expect(lumiluneStats.spa!).toBeGreaterThan(lumilune.baseStats.spa!);
        expect(pyronoxStats.spa!).toBeGreaterThan(pyronox.baseStats.spa!);

        // Identity holds after scaling: lumilune is the stronger special attacker,
        // pyronox the stronger physical attacker.
        expect(lumiluneStats.spa!).toBeGreaterThan(lumiluneStats.atk);
        expect(pyronoxStats.atk).toBeGreaterThan(pyronoxStats.spa!);
        expect(lumiluneStats.spa!).toBeGreaterThan(pyronoxStats.spa!);
    });

    it("falls back to the atk base when a species predates the spa stat", () => {
        const legacyBase = { hp: 300, atk: 150, def: 120, spd: 140 }; // no spa
        const stats = calculateNegamonStatsForLevel(legacyBase, 50, "bruiser");
        expect(stats.spa).toBeDefined();
        expect(stats.spa!).toBeGreaterThan(0);
        // spa uses atk as its BASE value, but applies spa's own role-offset multiplier,
        // so it lands close to (not exactly equal to) the atk-derived value.
        const ratio = stats.spa! / stats.atk;
        expect(ratio).toBeGreaterThan(0.9);
        expect(ratio).toBeLessThan(1.1);
    });
});
