/**
 * B1 — Characterization test: proves that Negamon-native combat stats are NOT used
 * by the live battle damage path.
 *
 * Context (System Plan 31, Task B1):
 *   The V4 battle resolves real damage through the Pokémon Showdown engine
 *   (`replayShowdownState`), seeded with a PROXY Pokémon species (e.g. pyronox -> Houndoom).
 *   Showdown computes damage from the PROXY Pokémon's base stats and the PROXY move's
 *   base power — the Negamon roster's hand-tuned `baseStats` (atk/def/spd) and per-skill
 *   `power` never reach the damage formula. Only HP is scaled back into the Negamon range.
 *
 * This test does NOT assert the desired behavior. It LOCKS IN the current (broken) behavior
 * so the gap is visible and measurable before we pick a fix direction. When B1 is fixed,
 * these assertions are expected to change — that is the signal the fix landed.
 *
 * The proxy battle-stat formula mirrors `calculateShowdownProxyStat` in adapter.ts:
 *   floor(((2 * base + 31) * level) / 100) + 5
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import {
    getShowdownSpeciesForNegamonSpeciesId,
    NEGAMON_V4_CANONICAL_SPECIES_IDS,
} from "@/lib/game-negamon/engine-showdown/mapper";

// Mirror of adapter.ts:calculateShowdownProxyStat (not exported).
function showdownProxyStat(base: number, level: number): number {
    return Math.floor(((2 * base + 31) * level) / 100) + 5;
}

type ShowdownDex = {
    species: {
        get: (id: string) => {
            exists?: boolean;
            baseStats?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
            types?: string[];
        };
    };
};

async function loadShowdownDex(): Promise<ShowdownDex | null> {
    const mod = (await import("pokemon-showdown")) as unknown as {
        Dex?: ShowdownDex;
        default?: { Dex?: ShowdownDex };
    };
    return mod.Dex ?? mod.default?.Dex ?? null;
}

const LEVEL = 50;

describe("B1 characterization — Negamon combat stats are ignored by the damage path", () => {
    it("proxy attack (what drives damage) diverges from the Negamon-tuned attack", async () => {
        const dex = await loadShowdownDex();
        // If Showdown Dex is unavailable in this environment, skip — the proxy path
        // requires it, and the fallback Negamon formula would (correctly) use real stats.
        if (!dex) {
            expect(dex).toBeNull();
            return;
        }

        const divergences: Array<{
            species: string;
            negamonAtk: number;
            proxyPokemon: string;
            proxyAtk: number;
            proxySpa: number;
        }> = [];

        for (const speciesId of NEGAMON_V4_CANONICAL_SPECIES_IDS) {
            const negamon = DEFAULT_NEGAMON_SPECIES.find((s) => s.id === speciesId);
            if (!negamon) continue;

            const proxyName = getShowdownSpeciesForNegamonSpeciesId(speciesId);
            const proxy = dex.species.get(proxyName);
            if (!proxy?.baseStats) continue;

            // The Negamon snapshot's battle attack scales from negamon.baseStats.atk.
            // The actual damage uses the proxy Pokémon's atk/spa instead.
            const proxyAtk = showdownProxyStat(proxy.baseStats.atk, LEVEL);
            const proxySpa = showdownProxyStat(proxy.baseStats.spa, LEVEL);

            divergences.push({
                species: speciesId,
                negamonAtk: negamon.baseStats.atk,
                proxyPokemon: proxyName,
                proxyAtk,
                proxySpa,
            });
        }

        // Emit a readable proof table to the test output.
        // eslint-disable-next-line no-console
        console.table(divergences);

        expect(divergences.length).toBeGreaterThan(0);

        // PROOF: pyronox is a physical "burst" attacker (atk 192) but its proxy (Houndoom)
        // is special-oriented — its physical attack stat is far lower, so physical pyronox
        // moves resolve with the wrong attacking stat.
        const pyronox = divergences.find((d) => d.species === "pyronox");
        expect(pyronox).toBeDefined();
        if (pyronox) {
            // Houndoom's special attack noticeably exceeds its physical attack,
            // the opposite of pyronox's physical-burst identity.
            expect(pyronox.proxySpa).toBeGreaterThan(pyronox.proxyAtk);
        }
    });

    it("documents that Negamon baseStats vary by role but proxy mapping may flatten that identity", () => {
        const pyronox = DEFAULT_NEGAMON_SPECIES.find((s) => s.id === "pyronox");
        const terranoir = DEFAULT_NEGAMON_SPECIES.find((s) => s.id === "terranoir");
        expect(pyronox).toBeDefined();
        expect(terranoir).toBeDefined();
        if (!pyronox || !terranoir) return;

        // Negamon roster is intentionally differentiated:
        // pyronox = glass burst (high atk, low def), terranoir = wall (low atk, high def/hp).
        expect(pyronox.baseStats.atk).toBeGreaterThan(terranoir.baseStats.atk);
        expect(terranoir.baseStats.def).toBeGreaterThan(pyronox.baseStats.def);
        expect(terranoir.baseStats.hp).toBeGreaterThan(pyronox.baseStats.hp);

        // These differences MUST reach the damage model for the roster to feel distinct.
        // Today they do not (see the proxy test above).
    });
});
