/**
 * B1 Direction A — PoC: register a custom `onModifySpecies` rule into the live Showdown
 * Dex at runtime, inject per-combatant Negamon base stats via a custom team-set field,
 * and verify the battle engine computes HP from the INJECTED stats (not the proxy species).
 *
 * If this passes, the production adapter can adopt the same mechanism so Negamon
 * atk/def/spa/spd/hp drive real Showdown damage.
 */
import { describe, it, expect } from "vitest";

type ShowdownDex = {
    data: { Rulesets: Record<string, unknown> };
};
type WritableStream = AsyncIterable<string> & { write(message: string): void };
type ShowdownModule = {
    BattleStream: new () => unknown;
    getPlayerStreams: (stream: unknown) => { omniscient: WritableStream; p1: WritableStream; p2: WritableStream };
    Dex?: ShowdownDex;
};

async function loadShowdown(): Promise<ShowdownModule | null> {
    const mod = (await import("pokemon-showdown")) as unknown as ShowdownModule & { default?: ShowdownModule };
    if (typeof mod?.getPlayerStreams === "function") return mod;
    if (typeof mod.default?.getPlayerStreams === "function") return mod.default;
    return null;
}

const RULE_ID = "negamonstatsmod";

/** Register the stat-injection rule once. The rule reads `target.set.negamonBaseStats`. */
function registerNegamonStatsRule(dex: ShowdownDex): void {
    if (dex.data.Rulesets[RULE_ID]) return;
    dex.data.Rulesets[RULE_ID] = {
        effectType: "Rule",
        name: "Negamon Stats Mod",
        desc: "Overrides base stats with per-combatant Negamon stats.",
        onModifySpeciesPriority: 3,
        onModifySpecies(this: { dex: { deepClone: <T>(v: T) => T } }, species: Record<string, unknown>, target: { set?: { negamonBaseStats?: Record<string, number> } } | null) {
            const negamon = target?.set?.negamonBaseStats;
            if (!negamon) return;
            const next = this.dex.deepClone(species) as Record<string, unknown>;
            const clamp = (v: number) => Math.max(1, Math.min(255, Math.round(v)));
            next.baseStats = {
                hp: clamp(negamon.hp),
                atk: clamp(negamon.atk),
                def: clamp(negamon.def),
                spa: clamp(negamon.spa ?? negamon.atk),
                spd: clamp(negamon.spd_def ?? negamon.def),
                spe: clamp(negamon.spe ?? negamon.spd),
            };
            if (negamon.hp > 255) next.maxHP = Math.round(negamon.hp); // bypass the 255 base-stat clamp for HP
            return next;
        },
    };
}

function makeTeam(speciesProxy: string, level: number, negamonBaseStats: Record<string, number>) {
    return [
        {
            name: "Mon",
            species: speciesProxy,
            ability: "noability",
            item: "",
            level,
            moves: ["tackle"],
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            negamonBaseStats,
        },
    ];
}

async function startAndReadMaxHp(
    formatid: string,
    team: unknown[],
    showdown: ShowdownModule,
): Promise<number | null> {
    const streams = showdown.getPlayerStreams(new showdown.BattleStream());
    const omni: string[] = [];
    const listen = async (stream: WritableStream, bucket: string[]) => {
        for await (const chunk of stream) bucket.push(chunk);
    };
    void listen(streams.omniscient, omni);
    void listen(streams.p1, []);
    void listen(streams.p2, []);

    streams.omniscient.write(`>start ${JSON.stringify({ formatid })}`);
    streams.omniscient.write(`>player p1 ${JSON.stringify({ name: "P1", team })}`);
    streams.omniscient.write(`>player p2 ${JSON.stringify({ name: "P2", team })}`);
    streams.p1.write("team 1");
    streams.p2.write("team 1");

    let stable = 0;
    let lastLen = -1;
    for (let i = 0; i < 20; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (omni.length === lastLen) {
            if (++stable >= 2) break;
        } else {
            stable = 0;
            lastLen = omni.length;
        }
    }
    const match = omni.join("\n").match(/\|switch\|p1a:[^|]*\|[^|]*\|\d+\/(\d+)/);
    return match ? Number(match[1]) : null;
}

// HP formula (gen 3+): floor((2*base + iv + floor(ev/4)) * level/100) + level + 10
function expectedHp(baseHp: number, level: number): number {
    return Math.floor(((2 * baseHp + 31) * level) / 100) + level + 10;
}

describe("B1 PoC — inject Negamon base stats into Showdown via onModifySpecies", () => {
    it("HP is computed from the injected Negamon hp, not the proxy species", async () => {
        const showdown = await loadShowdown();
        if (!showdown?.Dex) {
            expect(showdown?.Dex).toBeUndefined();
            return;
        }
        registerNegamonStatsRule(showdown.Dex);

        const LEVEL = 50;
        // Proxy species = Pikachu (base HP 35). Inject terranoir-like HP 200 (≤255 so no maxHP needed).
        const injectedHp = 200;
        const team = makeTeam("Pikachu", LEVEL, { hp: injectedHp, atk: 150, def: 162, spa: 120, spd: 80 });

        const maxHp = await startAndReadMaxHp(`gen9customgame@@@${RULE_ID}`, team, showdown);

        // eslint-disable-next-line no-console
        console.log(`[B1 inject PoC] proxy=Pikachu injectedHp=${injectedHp} → battle maxHp=${maxHp} (expected≈${expectedHp(injectedHp, LEVEL)})`);

        expect(maxHp).not.toBeNull();
        // Battle HP should match the INJECTED base (200), not Pikachu's base (35 → 110).
        expect(maxHp).toBe(expectedHp(injectedHp, LEVEL));
        expect(maxHp).not.toBe(expectedHp(35, LEVEL)); // would be 110 if proxy stats leaked through
    });
});
