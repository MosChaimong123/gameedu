# B1 — Species Stats: Findings & Implementation Plan

Last updated: 2026-06-01
Status: **diagnosis complete, fix direction chosen (Direction A)**
Parent: [31-negamon-v4-work-plan.md](./31-negamon-v4-work-plan.md)

---

## TL;DR

The V4 battle resolves real damage through the **Pokémon Showdown engine**, seeded with a
**proxy Pokémon species** (pyronox → Houndoom, terranoir → Hippowdon, …). Showdown computes
damage from the **proxy Pokémon's base stats + the proxy move's base power**. The Negamon
roster's hand-tuned `baseStats` (atk/def/spd) and per-skill `power` are **discarded** — only
HP is scaled back into the Negamon range.

**Chosen fix (Direction A):** keep the Showdown engine, but inject Negamon base stats into
the battle via a custom Showdown rule (`onModifySpecies`), the same mechanism the built-in
`350 Cup Mod` / `Scalemons Mod` use. This keeps Showdown's status/ability/turn mechanics
while making Negamon stats the source of combat truth.

---

## Proof (tested)

Two characterization tests were added and pass on the current code:

| Test | Proves |
|------|--------|
| `src/lib/game-negamon/__tests__/b1-species-stats-characterization.test.ts` | Negamon attack is replaced by proxy-Pokémon attack in the damage path |
| `src/lib/game-negamon/__tests__/b1-showdown-custom-rule-poc.test.ts` | Custom rules (`formatid@@@Rule`) flow through BattleStream and resolve a valid battle |

### Divergence table (level 50)

| Species | Negamon atk (designed) | Proxy Pokémon | Proxy atk (used) | Proxy spa |
|---------|-----------------------:|---------------|-----------------:|----------:|
| pyronox   | 192 (physical burst) | Houndoom    | 110 | 130 |
| aerolisk  | 174 | Hawlucha   | 112 | 94  |
| terranoir | 150 | Hippowdon  | 132 | 88  |
| lumilune  | 136 | Primarina  | 94  | 146 |
| voltshade | 162 | Jolteon    | 85  | 130 |
| tidemaw   | 180 | Feraligatr | 125 | 99  |

Observations:
- Every Negamon's designed attack (136–192) is replaced by a different proxy value (85–132).
- **Identity inversion:** pyronox is physical (atk 192) but Houndoom is special-leaning
  (proxy atk 110 < proxy spa 130) — pyronox's physical moves resolve with the wrong stat.
- **Worst case voltshade:** designed atk 162 → Jolteon proxy atk 85 (~half).
- The power *ordering* is scrambled: designed pyronox > tidemaw > aerolisk, but proxy
  ordering is terranoir > tidemaw > pyronox.

---

## Where the bug lives (code map)

| File | Role in the bug |
|------|-----------------|
| `src/lib/game-negamon/engine-showdown/mapper.ts` | `createNegamonShowdownTeamSet()` emits `species: "Houndoom"` etc. |
| `src/lib/game-negamon/engine-showdown/adapter.ts` | `createBattle()` builds `p1Team`/`p2Team` from those species; `replayShowdownState()` runs the real Showdown engine which computes stats from `species.baseStats` |
| `node_modules/pokemon-showdown` | `Pokemon.setSpecies()` → `spreadModify(species.baseStats, set)` uses the proxy species' base stats |

The proxy formula in `adapter.ts` (`createScaledProxyFormulaExpectation`) is only used for
**expectations/AI scoring/display** — it does not change that the *real* damage comes from
the Showdown engine seeded with proxy species.

---

## Validated fix mechanism

Showdown exposes `onModifySpecies(species, target, source, effect)` as a **format rule hook**.
Built-in examples in `data/rulesets.js`:

- `350cupmod` — doubles base stats for low-BST mons
- `flippedmod` — reverses each stat
- `scalemonsmod` — scales non-HP stats toward a 600 BST

A rule returns a cloned species with overridden `baseStats`. HP above 255 is handled by the
species `maxHP` field (Showdown applies `if (species.maxHP) stats.hp = species.maxHP`).

The PoC test confirmed that `formatid@@@<rule>` is accepted by the BattleStream pipeline
(`getPlayerStreams` + `>start`/`>player`/`team 1`) and resolves a valid battle.

---

## Implementation steps (Direction A)

### Step 1 — Register a `negamonstatsmod` rule

Add a custom rule (via a Showdown Dex mod or a registered ruleset) with:

```ts
onModifySpeciesPriority: 2,
onModifySpecies(species, target) {
    // Read Negamon base stats for THIS combatant.
    const negamon = target?.set ? readNegamonStats(target.set) : null;
    if (!negamon) return;
    const next = this.dex.deepClone(species);
    next.baseStats = {
        hp: clamp(negamon.hp, 1, 255),
        atk: clamp(negamon.atk, 1, 255),
        def: clamp(negamon.def, 1, 255),
        spa: clamp(negamon.spa ?? negamon.atk, 1, 255),
        spd: clamp(negamon.spd ?? negamon.def, 1, 255),
        spe: clamp(negamon.spd_speed ?? negamon.spe, 1, 255),
    };
    if (negamon.hp > 255) next.maxHP = negamon.hp; // bypass the 255 clamp for HP
    next.types = negamon.types; // align type identity too
    return next;
}
```

### Step 2 — Carry Negamon stats on the team set

Decide how the rule reads per-combatant stats. Options (verify which Showdown preserves):
- **Custom set field**: add `negamonBaseStats` to the JSON team set and read `target.set.negamonBaseStats`. (Verify Showdown's set parser does not strip unknown fields in JSON team mode.)
- **Name-encoded**: pack stats into the set `name` and parse them in the rule (robust, ugly).
- **Side index map**: register the rule with a per-battle lookup keyed by player slot.

### Step 3 — Switch the battle format

In `adapter.ts:createBattle()` and `replayShowdownState()`, change `formatid` from
`gen9customgame` to `gen9customgame@@@negamonstatsmod` (or the modded format id).

### Step 4 — Decide physical vs special split

Negamon stats are `{hp, atk, def, spd(=speed)}` — a single attack and single defense.
Showdown needs `atk/def/spa/spd/spe`. Map:
- `spa = atk`, `spd(defense) = def`, `spe = Negamon spd`
- This makes physical/special irrelevant (both use the same stat) — matches the Negamon
  single-attack model. Confirm the move category mapping in `mapper.ts` is consistent.

### Step 5 — Re-point the proxy expectations

Update `createScaledProxyFormulaExpectation` to use the injected Negamon stats (or remove the
proxy expectation path and use the Negamon formula for expectations) so AI scoring/display
matches the real damage.

### Step 6 — Update the characterization test

Once injected, `b1-species-stats-characterization.test.ts` should be updated so that the
proxy attack now equals the Negamon-derived attack (the assertion flips from "diverges" to
"matches"). That test flip is the landing signal for B1.

---

## QA

```bash
npm run check:negamon-battle
node ./node_modules/vitest/vitest.mjs run --config vitest.config.mts --pool threads \
  src/lib/game-negamon/__tests__/b1-species-stats-characterization.test.ts \
  src/lib/game-negamon/__tests__/b1-showdown-custom-rule-poc.test.ts
npx tsc --noEmit
node scripts/negamon-battle-v4-qa-fixture.mjs   # local only
```

**Acceptance:**
- [ ] In-battle attack/defense reflect Negamon `baseStats` (not proxy Pokémon)
- [ ] pyronox (atk 192) out-damages terranoir (atk 150) with the same move
- [ ] terranoir (def 162) takes less damage than pyronox (def 108) from the same hit
- [ ] HP > 255 species (terranoir 510) keeps correct max HP via `maxHP`
- [ ] `npm run check:negamon-battle` stays green

---

## Open questions for the owner

1. **Physical/Special:** keep the single-stat Negamon model (atk used for both), or introduce
   a special-attack stat to the roster? (Affects Step 4 and species data.)
2. **Move power source:** Step 1 fixes stats, but move *base power* still comes from the proxy
   Showdown move (e.g. "inferno"=100). Do we also inject Negamon per-skill `power` via an
   `onModifyMove`/`onBasePower` rule? (Recommended as B1.5.)
