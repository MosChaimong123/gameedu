/**
 * B1 (Direction A) — Negamon stat injection for the Pokémon Showdown engine.
 *
 * The V4 battle runs on the real Showdown engine seeded with a proxy Pokémon species.
 * Without this rule, Showdown computes damage from the PROXY species' base stats, so the
 * Negamon roster's hand-tuned atk/def/spa/spd are ignored (see
 * docs/system-plans/31-b1-species-stats-findings.md).
 *
 * This module registers a custom Showdown rule (`negamonstatsmod`) whose `onModifySpecies`
 * hook overrides each combatant's base stats with the Negamon base stats carried on the
 * team set (`set.negamonBaseStats`). Showdown then applies its normal level scaling, so
 * the Negamon identity (e.g. pyronox = physical, lumilune = special) drives real damage.
 *
 * Inject BASE stats (not level-scaled ones): atk/def/spa/spd all fit within Showdown's
 * 1–255 base-stat clamp, while HP can exceed it and is applied via the species `maxHP`
 * field (which bypasses the clamp).
 */

export const NEGAMON_STATS_RULE_ID = "negamonstatsmod";
export const NEGAMON_STATS_RULE_NAME = "Negamon Stats Mod";

/** The custom team-set field the rule reads. Survives JSON team serialization. */
export type NegamonInjectedBaseStats = {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    /** Special defense; falls back to `def` when absent. */
    spd: number;
    /** Speed; falls back to the Negamon speed stat. */
    spe: number;
};

type ShowdownDexLike = {
    data?: { Rulesets?: Record<string, unknown> };
    deepClone?: <T>(value: T) => T;
};

type RuleThis = { dex: { deepClone: <T>(value: T) => T } };
type SpeciesLike = Record<string, unknown> & {
    baseStats?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
};
type TargetLike = { set?: { negamonBaseStats?: NegamonInjectedBaseStats } } | null;

function clampBaseStat(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(255, Math.round(value)));
}

/**
 * Registers the Negamon stat-injection rule into the live Showdown Dex (idempotent).
 * Call before starting/replaying a battle that uses the `negamonstatsmod` format suffix.
 */
export function registerNegamonStatsRule(dex: ShowdownDexLike): void {
    const rulesets = dex?.data?.Rulesets;
    if (!rulesets || rulesets[NEGAMON_STATS_RULE_ID]) return;

    rulesets[NEGAMON_STATS_RULE_ID] = {
        effectType: "Rule",
        name: NEGAMON_STATS_RULE_NAME,
        desc: "Overrides base stats with per-combatant Negamon base stats.",
        onModifySpeciesPriority: 3,
        onModifySpecies(this: RuleThis, species: SpeciesLike, target: TargetLike) {
            const negamon = target?.set?.negamonBaseStats;
            if (!negamon) return undefined;
            const next = this.dex.deepClone(species) as SpeciesLike;
            next.baseStats = {
                hp: clampBaseStat(negamon.hp),
                atk: clampBaseStat(negamon.atk),
                def: clampBaseStat(negamon.def),
                spa: clampBaseStat(negamon.spa ?? negamon.atk),
                spd: clampBaseStat(negamon.spd ?? negamon.def),
                spe: clampBaseStat(negamon.spe),
            };
            // HP frequently exceeds the 255 base-stat clamp; maxHP bypasses it.
            if (Number.isFinite(negamon.hp) && negamon.hp > 255) {
                next.maxHP = Math.round(negamon.hp);
            }
            return next;
        },
    };
}

/** Appends the rule to a Showdown format id (e.g. `gen9customgame@@@negamonstatsmod`). */
export function withNegamonStatsRule(formatid: string): string {
    if (formatid.includes(NEGAMON_STATS_RULE_ID) || formatid.includes(NEGAMON_STATS_RULE_NAME)) return formatid;
    return formatid.includes("@@@")
        ? `${formatid},${NEGAMON_STATS_RULE_NAME}`
        : `${formatid}@@@${NEGAMON_STATS_RULE_NAME}`;
}
