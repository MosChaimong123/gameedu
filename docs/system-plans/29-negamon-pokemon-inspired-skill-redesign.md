# System Plan 29: Negamon Pokemon-Inspired Skill and Stat Redesign

Last updated: 2026-05-25

## Purpose

Plan 24 replaced the roster and first-pass move names, while Plan 26 rebuilt the battle runtime into a Pokemon-inspired V3 engine. However, the visible skill layer still carries too much of the old Negamon feel:

- many moves still read like thin wrappers over legacy effects
- move identity is not yet organized around clear tactical families
- some monsters still feel like "damage button plus one gimmick"
- battle depth is improving faster than the movepool design language

This plan defines the next redesign pass for both skills and monster stat balance so the roster feels closer to a modern Pokemon-style battle game without copying Pokemon content directly.

## Reference Base

This plan is informed by open-source Pokemon battle implementations and data models:

- [Pokemon Showdown repository](https://github.com/smogon/pokemon-showdown)
- [Pokemon Showdown `data/moves.ts`](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts)
- [Pokemon Showdown `data/abilities.ts`](https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts)
- [Pokemon Showdown `data/typechart.ts`](https://github.com/smogon/pokemon-showdown/blob/master/data/typechart.ts)
- [Pokemon Showdown `sim/battle.ts`](https://github.com/smogon/pokemon-showdown/blob/master/sim/battle.ts)
- [pret/pokeemerald `battle_script_commands.c`](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
- [pret/pokeemerald `battle_move_effects.h`](https://github.com/pret/pokeemerald/blob/master/include/constants/battle_move_effects.h)
- [Pokemon Essentials: Defining a move](https://essentialsdocs.fandom.com/wiki/Defining_a_move)

Reference takeaways we want to borrow:

- Showdown move data is compact but expressive: power, accuracy, priority, target, flags, and secondary effects carry most move identity.
- Showdown abilities and move hooks reinforce that strong move design comes from reusable battle events rather than one-off scripted exceptions.
- The Showdown type chart and battle core show that move design must respect type identity, role identity, and speed/priority ordering together.
- `pokeemerald` separates move effect families into reusable effect codes rather than treating every move as a unique script.
- Pokemon Essentials reinforces the standard move contract: category, power, accuracy, PP, target, priority, effect code, flags, and effect chance.
- Pokemon battle design also relies on stat distribution and growth pacing to preserve role identity; movepools alone do not create balance if bulk, speed, and offense are mis-budgeted.

Important rule:

- we may reuse architecture patterns, pacing rules, and move-design concepts
- we will not copy Pokemon move names, signature move tables, or protected flavor text wholesale

## Product Goal

Students should feel that each monster now has a real battle identity through both its movepool and its stat profile.

Success means:

1. each monster has a readable game plan
2. each move slot does a distinct job
3. early skills feel useful, not filler
4. higher-form skills feel like upgrades in tactical depth, not only larger damage numbers
5. battle choices feel Pokemon-inspired through tempo, setup, punish, sustain, and status pressure
6. each monster's stats support its intended role without collapsing matchups into pure speed or pure damage races

## What "Complete" Means In This Plan

This plan is complete only when all of the following are true:

1. the repo has a canonical move taxonomy for V3
2. every starter species has a redesigned 4-move core plus early-game utility pacing
3. each starter species has a reviewed stat budget and growth profile aligned with its role
4. move schema supports the tactical fields needed for the new design language
5. runtime supports the required move families without falling back to legacy-lite shortcuts
6. UI communicates move role, unlock level, and targeting cleanly
7. AI can score setup, sustain, control, and finisher moves in a believable way
8. tests and manual QA confirm that the new movepools and stat profiles behave correctly

## Scope

In scope:

- starter-roster move redesign
- starter-roster stat rebalance
- move taxonomy and move schema cleanup
- base stat budget review
- growth multiplier review
- move unlock pacing by level
- move targeting, priority, and secondary-effect patterns
- runtime support for required move families
- skill UI alignment
- AI scoring adjustments for the new movepool logic
- balance and QA for the redesigned skills and stat lines

Out of scope for this plan:

- species art redesign
- full type-chart rewrite
- item system redesign beyond compatibility
- brand-new roster expansion beyond the current 6 core monsters
- animation/VFX pipeline replacement

## Current Code Map

Primary files for this work:

- `src/lib/negamon-species.ts`
- `src/lib/types/negamon.ts`
- `src/lib/game-negamon/core/skills.ts`
- `src/lib/game-negamon/core/monster-growth.ts`
- `src/lib/game-negamon/core/skill-unlock.ts`
- `src/lib/game-negamon/core/engine/move-runtime.ts`
- `src/lib/game-negamon/core/engine/status-runtime.ts`
- `src/lib/game-negamon/core/engine/state-engine.ts`
- `src/lib/game-negamon/core/content/catalog.ts`
- `src/lib/game-negamon/core/rules/damage.ts`
- `src/components/game/negamon/SkillLoadoutPanel.tsx`
- `src/components/negamon/negamon-moves-grid.tsx`
- `src/components/negamon/NegamonLiteBattleArena.tsx`

Primary tests:

- `src/lib/game-negamon/__tests__/move-status-runtime.test.ts`
- `src/lib/game-negamon/__tests__/formula-core.test.ts`
- `src/lib/game-negamon/__tests__/state-engine.test.ts`
- `src/lib/game-negamon/__tests__/ai-engine.test.ts`
- `src/lib/game-negamon/__tests__/skill-loadout.test.ts`
- `src/lib/game-negamon/__tests__/battle-balance.test.ts`
- `src/lib/game-negamon/__tests__/formula-core.test.ts`
- `src/lib/game-negamon/__tests__/monster-snapshot.test.ts`

## Current Gap

Current repo state:

- `src/lib/game-negamon/core/skills.ts` already supports `power`, `accuracy`, `priority`, `target`, and multiple effect kinds
- the V3 runtime already supports damage, heal, stage changes, status application, shield/focus-style effects, abilities, and items
- but many move definitions still over-compress identity into a narrow set of effects
- the move list does not yet fully exploit target design, priority bands, setup timing, punish windows, or move flags the way Pokemon systems do
- some current stat lines still inherit first-pass assumptions from the earlier roster rework and have not yet been re-budgeted against the level `1-60` curve
- speed, bulk, and offense anchors have not yet been formally balanced against the newer V3 formula core

This means:

- the engine is ahead of the movepool language
- battle depth exists, but monster identity still feels thinner than it should
- roster balance still risks drifting if stat budgets are not redesigned together with the skills

## Design Principles

### 1. Every Move Slot Needs A Job

Borrowing from Pokemon move design, each core movepool should intentionally cover jobs such as:

- safe damage
- setup
- punish
- sustain
- control
- finisher
- emergency tempo

No monster should have four moves that all ask the same question.

### 2. Early Game Should Not Feel Empty

Moves unlocked at `Lv 1 / 4 / 8 / 16` must already create meaningful decisions.

Players should not wait until final forms to feel that the monster "works."

### 3. Use Reusable Move Families

Following Showdown and `pokeemerald`, we should define reusable move families instead of hand-authoring one-off gimmicks:

- strike
- strike + secondary
- self-boost
- enemy debuff
- heal / recover
- drain
- shield / guard
- priority strike
- delayed punish
- anti-setup punish
- status infliction
- energy manipulation

### 4. Distinguish Primary Power From Tactical Value

Pokemon move design is rarely just "higher power = better move." We should preserve that:

- some low-power moves should be best because of priority, reliability, or setup value
- some high-power moves should carry risk through energy cost, cooldown, lower accuracy, or delayed payoff

### 5. Preserve Species Identity

Moves should make the species feel different:

- Pyronox should feel like burst and pressure
- Aerolisk should feel like tempo and first-strike advantage
- Terranoir should feel like wall and punish
- Lumilune should feel like sustain and cleanse support
- Voltshade should feel like control and disruption
- Tidemaw should feel like bruiser attrition

### 6. Stat Lines Must Carry The Role

Borrowing from Pokemon stat design patterns, each species should have:

- one or two clearly dominant strengths
- at least one intentional weakness
- enough bulk or speed to execute its game plan before being invalidated
- no "perfect spread" that erases role boundaries

We should avoid:

- two attackers with nearly identical offense/speed profiles
- defensive monsters with enough speed to ignore their intended drawback
- support monsters that accidentally out-damage attackers because of overtuned growth

### 7. Balance Around Matchups, Not Spreadsheet Symmetry

The goal is not to make every stat total identical. The goal is to make matchups healthy.

Following Pokemon-inspired balance thinking, we should tune around:

- offensive pressure versus survivability
- setup payoff versus immediate reliability
- speed advantage versus fragility
- sustain value versus low burst ceiling

## Target Stat Design Framework

Each species should be reviewed through four lenses:

1. base stat budget
2. growth curve through `Lv 1-60`
3. matchup role against the other five core species
4. move synergy with its own stats

### Recommended First-Pass Role Anchors

These are not exact final numbers, but the intended balance pattern:

- `Pyronox`: highest burst pressure, below-average bulk
- `Aerolisk`: highest speed, lower sustained damage if it loses tempo
- `Terranoir`: highest physical survivability, lowest speed
- `Lumilune`: medium bulk, medium speed, low direct damage, high sustain value
- `Voltshade`: high speed control, medium offense, modest bulk
- `Tidemaw`: medium-low speed, high effective durability, strong attrition pressure

### Recommended Balance Checks

The redesign should validate:

- no species wins too often only because it moves first
- no wall can both outlast and out-damage the whole roster
- no support monster becomes dead weight in solo battles
- no bruiser becomes a strictly better attacker plus tank
- form-band growth keeps role identity intact from `Lv 1` to `Lv 60`

## Target Skill Architecture

The redesigned skill layer should standardize these fields per move:

- `id`
- `name`
- `type`
- `category`
- `power`
- `accuracy`
- `priority`
- `target`
- `energyCost`
- `cooldownTurns`
- `effectFamily`
- `secondaryChance`
- `flags`
- `unlockLevel`
- `roleTag`

### Recommended `effectFamily` Set

First-pass canonical families:

- `STRIKE`
- `STRIKE_STATUS`
- `STRIKE_DEBUFF`
- `STRIKE_DRAIN`
- `SELF_BOOST`
- `ENEMY_DEBUFF`
- `HEAL`
- `CLEANSE`
- `SHIELD`
- `PRIORITY_STRIKE`
- `FINISHER`
- `TEMPO_CONTROL`
- `ENERGY_SHIFT`
- `ANTI_SETUP_PUNISH`

### Recommended `flags` Set

Borrowed conceptually from Showdown move flags:

- `contact`
- `sound`
- `pulse`
- `slicing`
- `bite`
- `protectable`
- `highCrit`
- `cannotMiss`
- `selfOnly`
- `allEnemies`

We do not need parity with Pokemon's full flag matrix in the first pass, but we should stop treating all moves as untyped generic buttons.

## Proposed Skill Redesign Direction By Species

### Pyronox

Desired identity:

- burst attacker
- snowballs after gaining pressure
- threatens low-defense targets

Move jobs:

- reliable fire strike
- dark-type armor-punish
- self power-up
- risky finisher with burn or recoil-style tradeoff

### Aerolisk

Desired identity:

- fast tempo attacker
- wins by acting first
- pressures frail or slowed targets

Move jobs:

- safe speed-friendly strike
- anti-slow punish
- self speed setup
- priority or first-move bonus finisher

### Terranoir

Desired identity:

- defensive wall
- chip and stall punish
- punishes contact or overextension

Move jobs:

- reliable earth hit
- chip/debuff mud effect
- guard move
- heavy punish that is slow but rewarding

### Lumilune

Desired identity:

- sustain support
- keeps itself alive and stabilizes long fights
- supports through cleanse/shield/heal rhythm

Move jobs:

- light/water poke
- self-heal
- shield or cleanse
- larger recovery or control-support finisher

### Voltshade

Desired identity:

- battlefield disruptor
- attacks while draining tempo or energy
- creates awkward turns for the opponent

Move jobs:

- electric opener
- resource disruption
- status or speed control
- stronger lockdown identity move

### Tidemaw

Desired identity:

- bruiser
- trades hits well
- wins through drain, break, and pressure

Move jobs:

- safe water strike
- defense break or shell crack
- sustain through drain
- defensive stance or crushing endgame move

## Phase 1: Skill And Stat Taxonomy Spec

Define the final move schema, stat-balance vocabulary, and reusable move-family vocabulary for V3.

This phase should:

- freeze canonical move fields
- freeze `effectFamily` names
- freeze supported target types and flag names
- freeze stat-role terms such as `burst`, `tempo`, `wall`, `support`, `bruiser`
- identify which current `MonsterMove` fields can stay
- identify which fields must be added or renamed
- identify which current stat-growth assumptions can stay
- identify which current base-stat assumptions must be reviewed

Done only when:

- move authors and balance passes can define skills and stat targets without inventing ad hoc structure

### Phase 1 Completion Notes

Status: complete on May 25, 2026

What was frozen:

- canonical skill vocabulary:
  - move-slot jobs: `safe damage`, `setup`, `punish`, `sustain`, `control`, `finisher`, `emergency tempo`
  - species role anchors: `burst`, `tempo`, `wall`, `support`, `control`, `bruiser`
- canonical stat-balance vocabulary:
  - dominant strengths
  - intentional weakness
  - matchup role
  - growth identity through `Lv 1-60`
- canonical move fields for the redesign:
  - `id`
  - `name`
  - `type`
  - `category`
  - `power`
  - `accuracy`
  - `priority`
  - `target`
  - `energyCost`
  - `cooldownTurns`
  - `effectFamily`
  - `secondaryChance`
  - `flags`
  - `unlockLevel`
  - `roleTag`
- canonical reusable move families for the first implementation pass:
  - `STRIKE`
  - `STRIKE_STATUS`
  - `STRIKE_DEBUFF`
  - `STRIKE_DRAIN`
  - `SELF_BOOST`
  - `ENEMY_DEBUFF`
  - `HEAL`
  - `CLEANSE`
  - `SHIELD`
  - `PRIORITY_STRIKE`
  - `FINISHER`
  - `TEMPO_CONTROL`
  - `ENERGY_SHIFT`
  - `ANTI_SETUP_PUNISH`
- canonical move flags for the first pass:
  - `contact`
  - `sound`
  - `pulse`
  - `slicing`
  - `bite`
  - `protectable`
  - `highCrit`
  - `cannotMiss`
  - `selfOnly`
  - `allEnemies`

Contract decisions for the current repo:

- keep the existing `MonsterMove` base in [src/lib/types/negamon.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/types/negamon.ts:1) as the compatibility layer
- extend the redesign around existing supported fields already present in runtime:
  - `power`
  - `accuracy`
  - `priority`
  - `learnLevel`
  - `effect`
  - `effectChance`
  - `selfEffect`
  - `drainPct`
  - `critBonus`
- add the new taxonomy first as a canonical plan-level contract, then project it into code through:
  - richer move metadata in species definitions
  - move-family mapping in [src/lib/game-negamon/core/skills.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skills.ts:1)
  - runtime-family handling in the V3 engine

Stat-contract decisions for the current repo:

- keep `hp / atk / def / spd` as the current first-pass combat stat set
- use role anchors, matchup rules, and growth identity to rebalance those four stats before introducing broader stat dimensions
- treat [src/lib/game-negamon/core/monster-growth.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-growth.ts:1) as the canonical growth-curve authority for the redesign pass
- review base stat budgets and growth multipliers together rather than tuning them in isolation

Phase 1 result:

- the redesign now has a shared language for both skills and stats
- Phase 2 can design the six-species roster without inventing new categories mid-stream
- later code changes can stay data-driven instead of turning into one-off move exceptions

## Phase 2: Six-Species Movepool And Stat Budget Spec

Redesign the 24 core species skills and the six core stat profiles as a full tactical roster.

This phase should:

- assign one clear job per slot
- assign one clear stat role per species
- define unlock levels `1 / 4 / 8 / 16 / 26` as needed
- define power, accuracy, priority, cooldown, energy, target, and secondary effect
- record which move family each skill belongs to
- record target base-stat anchors and intended matchup strengths/weaknesses

Done only when:

- each species has a readable game plan and a readable stat identity from early levels onward

### Phase 2 Completion Notes

Status: complete on May 25, 2026

This phase freezes the first-pass redesign targets for all six starter species so later implementation work can focus on data entry and runtime support instead of re-deciding roles midstream.

### First-Pass Stat Budget Table

These values are the approved first-pass target anchors for the redesign pass.

| Species | Type | Role anchor | HP | ATK | DEF | SPD | Strengths | Weaknesses |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `pyronox` | `FIRE / DARK` | burst | 330 | 192 | 108 | 164 | highest burst pressure, strong punish ceiling | low bulk, accuracy risk on finisher |
| `aerolisk` | `WIND / THUNDER` | tempo | 298 | 174 | 116 | 198 | fastest species, best tempo conversion | fragile if it loses first-move advantage |
| `terranoir` | `EARTH / DARK` | wall | 510 | 150 | 162 | 80 | highest physical survivability, reliable stall punish | lowest speed, weaker immediate damage |
| `lumilune` | `LIGHT / WATER` | support | 402 | 136 | 144 | 148 | sustain, stability, safe mid-speed support | low burst, cannot race attackers head-on |
| `voltshade` | `THUNDER / DARK` | control | 348 | 162 | 124 | 184 | fast disruption, status pressure, energy denial | medium bulk, lower raw finish power |
| `tidemaw` | `WATER / EARTH` | bruiser | 468 | 180 | 148 | 110 | drain pressure, defense break, durable trades | slower tempo, vulnerable to repeated control |

Stat-budget interpretation:

- `pyronox` and `aerolisk` are intentionally separated by damage-vs-speed identity rather than both being generic fast attackers
- `terranoir` remains the slowest monster and should stay that way through future tuning
- `lumilune` gets slightly better defensive reliability than the current first pass so support does not collapse under V3 burst turns
- `voltshade` keeps strong speed but gives up some raw pressure to preserve the control identity
- `tidemaw` remains the most rounded attrition fighter rather than a second wall

### First-Pass Matchup Roles

Each species needs intended matchup logic, not just standalone numbers.

| Species | Should pressure | Should struggle into | Notes |
| --- | --- | --- | --- |
| `pyronox` | `lumilune`, `voltshade` | `terranoir`, `tidemaw` | burst attacker that dislikes armor and drain trades |
| `aerolisk` | `pyronox`, `lumilune` | `terranoir`, `voltshade` | wins by tempo, not by raw staying power |
| `terranoir` | `pyronox`, `aerolisk` | `lumilune`, `tidemaw` | wall/punish profile should not auto-win sustain mirrors |
| `lumilune` | `terranoir`, `voltshade` | `pyronox`, `aerolisk` | support should stabilize control/wall fights but fear burst |
| `voltshade` | `aerolisk`, `tidemaw` | `lumilune`, `terranoir` | disruption should beat tempo and bruiser rhythm better than sustain anchors |
| `tidemaw` | `pyronox`, `terranoir` | `voltshade`, `lumilune` | bruiser should excel in direct trades but suffer versus control and sustain denial |

### Six-Species Movepool Spec

The table below freezes one clear job per slot, with unlock pacing aligned to Plan 28.

#### Pyronox

| Unlock | Move | Family | Job | Target spec |
| --- | --- | --- | --- | --- |
| `Lv 1` | `Cinder Snap` | `STRIKE` | safe same-type opener | `FIRE`, 32 power, 100 acc, 0 priority |
| `Lv 4` | `Shadow Shear` | `STRIKE_DEBUFF` | punish low-defense targets | `DARK`, 40 power, 95 acc, applies defense pressure |
| `Lv 8` | `Predator Roar` | `SELF_BOOST` | burst setup turn | self ATK boost, 0 power |
| `Lv 16` | `Scorch Rush` | `PRIORITY_STRIKE` | emergency tempo and cleanup | `FIRE`, lower power, +1 priority |
| `Lv 26` | `Hellfall` | `FINISHER` | identity finisher | `FIRE`, high power, lower accuracy, burn rider |

Approved play pattern:

- early game teaches burst plus setup
- mid game adds emergency tempo
- late game adds risky closing power

#### Aerolisk

| Unlock | Move | Family | Job | Target spec |
| --- | --- | --- | --- | --- |
| `Lv 1` | `Gale Peck` | `STRIKE` | safe fast opener | `WIND`, 30 power, 100 acc |
| `Lv 4` | `Spark Drill` | `STRIKE_DEBUFF` | punish slower or softened targets | `THUNDER`, 38 power, 95 acc, light defense drop |
| `Lv 8` | `Jetstream` | `SELF_BOOST` | speed setup | self speed boost |
| `Lv 16` | `Crosswind Cut` | `PRIORITY_STRIKE` | first-strike identity | `WIND`, moderate power, +1 priority or first-turn bonus |
| `Lv 26` | `Storm Verdict` | `FINISHER` | high-crit closer | `THUNDER`, higher crit, moderate accuracy |

Approved play pattern:

- wins by preserving tempo
- should not out-trade bruisers or walls in extended fights

#### Terranoir

| Unlock | Move | Family | Job | Target spec |
| --- | --- | --- | --- | --- |
| `Lv 1` | `Grave Knuckle` | `STRIKE` | reliable earth hit | `EARTH`, 34 power, 100 acc |
| `Lv 4` | `Mire Clutch` | `ENEMY_DEBUFF` | weaken offense | dark mud debuff, low or zero power |
| `Lv 8` | `Sepulcher Guard` | `SHIELD` | defensive identity turn | self guard / shield |
| `Lv 16` | `Tomb Tax` | `ANTI_SETUP_PUNISH` | punish boosted or overextended enemies | conditional punish |
| `Lv 26` | `Catacomb Break` | `FINISHER` | slow heavy closer | `EARTH`, high power, low speed synergy |

Approved play pattern:

- should always feel slow and deliberate
- defensive tools must matter before the final form

#### Lumilune

| Unlock | Move | Family | Job | Target spec |
| --- | --- | --- | --- | --- |
| `Lv 1` | `Moon Ripple` | `STRIKE` | safe poke | `LIGHT` or `WATER`, low-mid power, high accuracy |
| `Lv 4` | `Tender Glow` | `HEAL` | early sustain | self-heal |
| `Lv 8` | `Veil Prayer` | `SHIELD` or `CLEANSE` | stabilize tempo | shield or cleanse support |
| `Lv 16` | `Mercy Current` | `STRIKE_DRAIN` | sustain-through-offense | moderate power with drain |
| `Lv 26` | `Astral Tide` | `TEMPO_CONTROL` | support finisher | hybrid sustain/control move |

Approved play pattern:

- should become "online" early
- must not depend on final-form unlocks to feel playable

#### Voltshade

| Unlock | Move | Family | Job | Target spec |
| --- | --- | --- | --- | --- |
| `Lv 1` | `Static Nibble` | `STRIKE` | safe electric poke | `THUNDER`, 31 power, 100 acc |
| `Lv 4` | `Black Signal` | `ENERGY_SHIFT` | disrupt enemy resources | EN penalty or regen reduction |
| `Lv 8` | `Chain Lock` | `STRIKE_STATUS` | status pressure | electric strike with paralysis/control rider |
| `Lv 16` | `Night Tether` | `TEMPO_CONTROL` | speed or action denial | dark control move |
| `Lv 26` | `Eclipse Circuit` | `FINISHER` | control payoff | stronger closer that rewards disrupted targets |

Approved play pattern:

- should feel annoying in a skillful way
- wins by disrupting rhythm, not by raw base power

#### Tidemaw

| Unlock | Move | Family | Job | Target spec |
| --- | --- | --- | --- | --- |
| `Lv 1` | `Riptide Bite` | `STRIKE` | safe bruiser hit | `WATER`, 34 power, 98 acc |
| `Lv 4` | `Shell Crack` | `STRIKE_DEBUFF` | defense break | `EARTH`, moderate power plus defense drop |
| `Lv 8` | `Deep Feast` | `STRIKE_DRAIN` | sustain through trades | drain move |
| `Lv 16` | `Undertow Hide` | `SHIELD` | survive counterpressure | self-guard / anti-burst turn |
| `Lv 26` | `Abyss Breaker` | `FINISHER` | bruiser closer | heavy water/earth hit with attrition payoff |

Approved play pattern:

- should feel favored in long direct trades
- should still lose initiative wars against control and fast tempo species

### Phase 2 Result

This phase locks the first-pass redesign shape for both movepools and stat budgets:

- every species now has a distinct role anchor
- every species now has a documented strength/weakness profile
- unlock pacing is explicitly tied to `Lv 1 / 4 / 8 / 16 / 26`
- the redesign now has enough detail to start real data rewrites in species definitions

## Phase 3: Move Registry And Species Stat Data Rebuild

Update skill definitions, species move tables, and species stat tables in production data.

Primary targets:

- `src/lib/negamon-species.ts`
- `src/lib/types/negamon.ts`
- `src/lib/game-negamon/core/skills.ts`

This phase should:

- replace move definitions with the new schema
- replace first-pass stat spreads with the approved balance spreads
- ensure all unlock levels align with Plan 28
- ensure growth assumptions align with the approved role budgets
- ensure no legacy-lite fallback names remain in starter movepools

Done only when:

- the roster data itself expresses the new skill language and role balance cleanly

### Phase 3 Completion Notes

Status: complete on May 25, 2026

What changed:

- rebuilt the starter roster data in [src/lib/negamon-species.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/negamon-species.ts:1) so all six species now carry:
  - approved first-pass stat-budget anchors
  - canonical `battleRole`
  - five-step unlock pacing at `Lv 1 / 4 / 8 / 16 / 26`
  - move-family metadata, move flags, and slot-role tags on species moves
- extended [src/lib/types/negamon.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/types/negamon.ts:1) with canonical metadata for:
  - `MonsterBattleRole`
  - `MonsterMoveEffectFamily`
  - `MonsterMoveFlag`
  - optional move-level `effectFamily`, `flags`, and `roleTag`
  - optional species-level `battleRole`
- updated [src/lib/game-negamon/core/skills.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skills.ts:1) so the move registry now surfaces:
  - canonical `effectFamily`
  - canonical `flags`
  - canonical `roleTag`
  - improved family-aware description/category/target mapping

Compatibility decisions made in this phase:

- stable move ids such as `pyronox-ember-fang`, `pyronox-hell-dive`, and `aerolisk-gale-cut` were preserved where possible to reduce unnecessary route, persistence, and test churn
- visible move names and tactical meaning were still updated to the new redesign direction
- the extra `Lv 16` slot was added through new intermediate move ids such as `pyronox-scorch-rush`, `aerolisk-crosswind-cut`, `terranoir-tomb-tax`, `voltshade-night-tether`, and `tidemaw-undertow-hide`

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/skill-loadout.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/progression.test.ts src/lib/game-negamon/__tests__/battle-rewards.test.ts src/lib/game-negamon/__tests__/learning-rewards.test.ts src/__tests__/negamon-v3-session-routes.test.ts src/__tests__/negamon-lite-session-routes.test.ts`
- `npm.cmd run build`

Phase 3 result:

- production species data now speaks the new skill/stat language
- unlock pacing now matches the redesign target shape instead of the older 4-skill-only assumption
- later runtime work can build on canonical move-family metadata instead of brittle per-id inference

## Phase 4: Runtime Support For New Move Families And Growth Assumptions

Add or refine runtime support needed by the redesigned movepools.

Likely runtime needs:

- priority strike handling
- anti-setup punish logic
- energy denial or energy swing effects
- clearer shield/guard resolution
- stronger support for strike + secondary combinations
- verification that damage scaling and stat-stage interactions still behave correctly under the adjusted base stats and growth multipliers

Primary targets:

- `src/lib/game-negamon/core/engine/move-runtime.ts`
- `src/lib/game-negamon/core/engine/status-runtime.ts`
- `src/lib/game-negamon/core/engine/state-engine.ts`

Done only when:

- no redesigned move or adjusted stat profile requires a fake approximation that breaks its intended role

### Phase 4 Completion Notes

Status: complete on May 25, 2026

What changed:

- upgraded [src/lib/game-negamon/core/skills.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skills.ts:1) so redesigned move metadata now compiles into executable runtime effects instead of falling back to generic legacy-style status placeholders
- extended [src/lib/game-negamon/core/engine/move-runtime.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/engine/move-runtime.ts:1) with real support for:
  - temporary stat-stage buffs and debuffs with expiry handling
  - drain moves that heal from actual damage dealt
  - full-skip paralysis for control moves such as `Chain Lock`
  - energy denial that both removes current EN and suppresses turn-end EN recovery
  - anti-setup punish damage payoff against boosted or guarded targets
- extended [src/lib/game-negamon/core/engine/status-runtime.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/engine/status-runtime.ts:1) with:
  - temporary runtime volatile states for timed stat modifiers
  - runtime energy-regen penalties
  - per-status metadata for custom burn/paralysis behavior
  - end-of-duration stage rollback so temporary effects do not leak across turns
- aligned [src/lib/game-negamon/core/engine/state-engine.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/engine/state-engine.ts:1), [src/lib/game-negamon/core/engine/hook-framework.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/engine/hook-framework.ts:1), and [src/lib/game-negamon/server/battle.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/battle.ts:1) so V3 battles now restore base EN per turn and let energy-drain effects interact with both passive and baseline recovery

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/state-engine.test.ts src/lib/game-negamon/__tests__/skill-loadout.test.ts src/lib/game-negamon/__tests__/progression.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts`
- `npm.cmd test -- src/lib/game-negamon/__tests__/battle-balance.test.ts src/lib/game-negamon/__tests__/formula-core.test.ts src/lib/game-negamon/__tests__/ai-engine.test.ts`

Phase 4 result:

- the redesigned move families now have concrete runtime behavior instead of metadata-only intent
- V3 battles now support the control, sustain, punish, and temporary-tempo patterns required by the redesigned starter movepools
- later progression, UI, and AI phases can build on battle behavior that matches the Plan 29 movepool contract

## Phase 5: Unlock Pacing, Growth Curve, And Progression Alignment

Align the new movepools with the `Lv 1-60` progression model from Plan 28.

This phase should:

- ensure first useful move exists at battle start
- ensure early unlocks feel rewarding at `Lv 4` and `Lv 8`
- ensure mid-game unlock at `Lv 16` changes gameplay
- ensure later unlocks feel like tactical expansion, not only stronger numbers
- ensure stat growth between form bands preserves the intended role identity
- review whether `src/lib/game-negamon/core/monster-growth.ts` multipliers still fit the redesigned roster

Done only when:

- skill pacing and stat growth feel good on both new and migrated students

### Phase 5 Completion Notes

Status: complete on May 25, 2026

What changed:

- upgraded [src/lib/game-negamon/core/monster-growth.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-growth.ts:1) so the canonical `Lv 1-60` curve now supports role-aware stat growth on top of the shared anchor table:
  - `burst` species scale a little harder in offense
  - `tempo` and `control` species preserve faster speed growth
  - `wall` and `bruiser` species preserve bulk identity deeper into late levels
  - `support` species keep sustain-friendly bulk without drifting into attacker math
- aligned [src/lib/game-negamon/core/monster-snapshot.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-snapshot.ts:1) so snapshot-derived battle stats now resolve from the student's actual canonical level instead of staying pinned to the legacy rank floor inside a form band
- aligned [src/lib/classroom-utils.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/classroom-utils.ts:356) so classroom-facing monster state helpers now use:
  - the student's current canonical level for stat resolution
  - the student's current canonical level for move unlock visibility
  - species battle-role metadata when applying the growth curve
- aligned [src/lib/game-negamon/core/monster-snapshot.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-snapshot.ts:1) and [src/lib/game-negamon/server/battle.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/battle.ts:1) with species energy archetypes so `maxEnergy` and `energyRegen` now match the redesigned roster identities instead of using one shared `40 / 10` fallback everywhere
- refreshed [src/lib/game-negamon/core/battle-balance.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/battle-balance.ts:1) and focused route tests so balance simulations and persistence paths now exercise the same growth assumptions used by live snapshots

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/progression.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts src/lib/game-negamon/__tests__/skill-loadout.test.ts src/lib/game-negamon/__tests__/learning-rewards.test.ts src/lib/game-negamon/__tests__/battle-rewards.test.ts`
- `npm.cmd test -- src/__tests__/negamon-v3-session-routes.test.ts src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/student-checkin-route.test.ts src/__tests__/student-quest-ledger.test.ts`

Phase 5 result:

- unlock pacing at `Lv 1 / 4 / 8 / 16 / 26` now stays aligned with the student's actual level-driven snapshot state
- stat growth inside each form band now reflects real progression instead of only jumping at legacy rank floors
- energy pool and EN regen now reinforce the intended roster identities during progression instead of flattening them
- later UI and AI work can rely on snapshots that already express the redesigned progression and growth contract faithfully

## Phase 6: UI Alignment

Update all skill-facing UI to communicate the redesigned move system clearly.

Primary UI targets:

- loadout panel
- profile page
- codex
- battle action list
- reward / unlock messages

UI should show:

- move role
- unlock level
- target style where useful
- priority or support identity where useful

Done only when:

- players can tell what a move is for without reading engineering language

### Phase 6 Completion Notes

Status: complete on May 25, 2026

What changed:

- expanded [src/components/game/negamon/ui-content.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/ui-content.ts:1) with player-facing formatting helpers for:
  - move role tags
  - target style labels
  - move-family labels
  - priority labels
  - energy-shift effect copy
- upgraded [src/components/game/negamon/SkillLoadoutPanel.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/SkillLoadoutPanel.tsx:1) so each equipped/unlocked skill now surfaces:
  - its tactical role
  - target style
  - move-family identity
  - priority indicator where relevant
  - the existing unlock/EN/accuracy/cooldown metadata in the same visual language
- upgraded [src/components/game/negamon/MonsterProfilePanel.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/MonsterProfilePanel.tsx:1) so the “next skill” card now previews the upcoming move's role, target style, family, and priority identity instead of only the unlock level
- upgraded [src/components/negamon/negamon-moves-grid.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/negamon-moves-grid.tsx:1) so codex/profile move cards now show:
  - learn level
  - move role
  - target style
  - move-family identity
  - readable priority labeling instead of the old shorthand marker
- aligned the live battle action list in [src/components/negamon/NegamonLiteBattleArena.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/NegamonLiteBattleArena.tsx:1) so battle choices use the same role/target/family/priority vocabulary as the profile and codex surfaces
- added the required localization copy in [src/lib/translations.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/translations.ts:551) and extended [src/components/game/negamon/__tests__/ui-content.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/__tests__/ui-content.test.ts:1) to lock the new label formatting contract

Verification completed:

- `npm.cmd test -- src/components/game/negamon/__tests__/ui-content.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/skill-loadout.test.ts`
- `npm.cmd test -- src/components/game/negamon/__tests__/ui-content.test.ts src/__tests__/negamon-v3-session-routes.test.ts src/__tests__/negamon-lite-session-routes.test.ts src/lib/game-negamon/__tests__/state-engine.test.ts`

Phase 6 result:

- move-facing UI now communicates what a skill is for in player-facing language instead of only raw combat numbers
- unlock level, target style, priority, and support/control identity now read consistently across profile, codex, loadout, and battle choice surfaces
- Phase 7 AI work can now target a move language that the player also sees and understands

## Phase 7: AI And Battle Heuristic Alignment

Teach AI to value the new move language.

This phase should:

- score setup turns better
- recognize finisher windows
- value sustain when low
- avoid wasting control moves into bad targets
- treat priority damage as tempo, not only raw power
- respond sensibly to slower tankier stat profiles versus faster frailer ones

Done only when:

- AI no longer behaves like every move is just a damage button

### Phase 7 Completion Notes

Status: complete on May 25, 2026

What changed:

- upgraded [src/lib/game-negamon/core/engine/ai-engine.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/engine/ai-engine.ts:1) so V3 choice scoring now uses the redesigned move language directly instead of leaning mostly on legacy `sourceMove.effect` hints
- added family-aware heuristic layers for:
  - `FINISHER` kill windows
  - `PRIORITY_STRIKE` tempo value, especially when the AI side is slower
  - `STRIKE_DRAIN` and `SHIELD` sustain decisions when HP is low
  - `SELF_BOOST` early setup turns when the AI is healthy and the target is still sturdy
  - `STRIKE_STATUS`, `TEMPO_CONTROL`, and `ENERGY_SHIFT` control logic that avoids wasting disruption into already-controlled or low-value targets
  - `ANTI_SETUP_PUNISH` punishment windows against boosted or guarded opponents
- kept and refined repeat-move and energy-commitment penalties so the AI is less likely to spam setup repeatedly or burn expensive finishers at the wrong time
- aligned the heuristic with effective post-stage speed using combat-stage math, so faster frailer and slower bulkier profiles are judged more sensibly during action selection

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/ai-engine.test.ts src/lib/game-negamon/__tests__/state-engine.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts`
- `npm.cmd test -- src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/skill-loadout.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/__tests__/negamon-v3-session-routes.test.ts src/__tests__/negamon-lite-session-routes.test.ts`

Phase 7 result:

- AI now recognizes setup, sustain, control, priority tempo, and finisher windows as distinct tactical jobs
- disruption moves are less likely to be wasted into already-controlled or low-value targets
- slower tankier and faster frailer monsters now produce more believable move choices under the redesigned Plan 29 move language

## Phase 8: Balance, QA, And Release Gate

Automated test targets:

- move-schema validation
- stat-budget validation
- unlock-level validation
- runtime move-family tests
- per-species movepool sanity tests
- AI scoring tests
- balance regression tests

Manual QA targets:

- new student early-game skill pacing
- migrated student unlock correctness
- battle readability for all six species
- matchup feel for all six species
- profile/codex clarity
- late-game finisher fairness

Balance checks:

- every monster has one reliable low-risk button
- no monster has four dead turns before `Lv 16`
- no single move dominates all choices in the same movepool
- support and control monsters can still win games through identity, not only stall
- speed tiers remain meaningful without making slower monsters invalid
- bulk tiers remain meaningful without making walls unkillable
- growth from `Lv 38` to `Lv 60` does not flatten roster identity

Done only when:

- the redesigned skills feel like a coherent battle language across the roster

### Phase 8 Progress Notes

Status: automated release gate completed on May 25, 2026; six-species local manual smoke completed, but battle-feel sign-off is still partial and staging QA is still pending

What changed:

- added [src/lib/game-negamon/__tests__/plan-29-release-gate.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/__tests__/plan-29-release-gate.test.ts:1) so Plan 29 now has one explicit regression suite for canonical unlock levels, per-species movepool job sanity, role-anchor stat growth, and proactive support/control matchup pressure
- kept the new gate intentionally data-facing, using canonical skill definitions and balance simulations to catch drift in species move order, capstone pacing, and role identity before it leaks into UI or live battles
- added [docs/negamon-plan-29-manual-qa-checklist.md](C:/Users/IHCK/GAMEEDU/gamedu/docs/negamon-plan-29-manual-qa-checklist.md:1) to capture the human-release checks for early-game pacing, migrated unlock correctness, six-species readability, and late-game fairness
- used a real local classroom fixture with migrated Negamon settings to smoke:
  - student profile rendering at `Lv 16`
  - codex rendering against classroom-stored species data
  - V3 battle opponent lookup, session start, session read, and first-turn resolution
- created and exercised a dedicated six-species local fixture in `Demo Class 101` so manual QA now covers:
  - `Lv 1 / 4 / 8 / 16 / 26 / 50` profile progression checkpoints
  - codex visibility for all six redesigned species
  - temporary equal-level `Lv 26` battle passes across three species pairings before restoring the fixture back to the checkpoint ladder

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/plan-29-release-gate.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts src/lib/game-negamon/__tests__/ai-engine.test.ts src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/skill-loadout.test.ts src/lib/game-negamon/__tests__/progression.test.ts`
- `npm.cmd run check:negamon-battle`
- local browser smoke against `http://127.0.0.1:3000/student/7FUM5RLTLA4C/negamon` and `/student/7FUM5RLTLA4C/negamon/codex`
- local API smoke against:
  - `GET /api/classrooms/6a12ee29a5e71c6c01a33947/battle/opponents`
  - `POST /api/classrooms/6a12ee29a5e71c6c01a33947/battle/lite/start`
  - `GET /api/classrooms/6a12ee29a5e71c6c01a33947/battle/lite/session`
  - `POST /api/classrooms/6a12ee29a5e71c6c01a33947/battle/lite/choice`
- local six-species browser smoke against:
  - `/student/cmnbsf5su0001uv1hl8gqnbdk/negamon`
  - `/student/cmnbsf5sx0003uv1hyt555ao7/negamon`
  - `/student/cmnbsf5t00005uv1hlhh5b9oi/negamon`
  - `/student/cmnbsf5t30007uv1hzyteqlse/negamon`
  - `/student/cmnbsf5t60009uv1h4eeuo3zk/negamon`
  - `/student/cmnbsf5t8000buv1h6j8lmn9d/negamon`
  - `/student/cmnbsf5su0001uv1hl8gqnbdk/negamon/codex`
- local six-species API smoke for three pairings in `Demo Class 101`:
  - `Pyronox vs Terranoir`
  - `Aerolisk vs Tidemaw`
  - `Lumilune vs Voltshade`

Phase 8 result:

- automated regression coverage now has a dedicated Plan 29 release gate instead of relying only on scattered lower-level tests
- manual QA expectations are documented and now have a first local smoke pass proving that migrated classroom data still resolves to canonical Plan 29 runtime content
- the broader six-species local fixture pass is now in place and reusable, with checkpoint-level progression coverage restored after smoke execution
- final sign-off still needs a human-driven local battle-feel pass for the remaining unchecked matchup/fairness items and then staging verification before the manual QA checklist can be marked fully complete

## Risks

### Risk 1: We Only Rename Moves Without Changing Their Tactical Shape

Mitigation:

- require a per-slot job table in the design spec
- reject movepools where two or more moves do the same job

### Risk 2: Early Game Still Feels Flat

Mitigation:

- start useful unlocks at `Lv 1` and `Lv 4`
- explicitly test level `1 / 4 / 8 / 16`

### Risk 3: Runtime Complexity Grows Faster Than Content Quality

Mitigation:

- add only move families that at least two skills can reuse
- prefer data-driven fields over one-off custom logic

### Risk 4: Too Much Pokemon Feel Becomes Direct Copying

Mitigation:

- borrow architecture and tactical patterns only
- keep names, flavor, and roster identity original to Negamon

## Exit Criteria

This plan is complete when:

- the six-species core roster has fully redesigned movepools
- the six-species core roster has reviewed and approved stat budgets
- the move schema matches the needs of a Pokemon-inspired V3 battle game
- runtime supports the required move families and the adjusted balance assumptions
- UI and AI understand the new move language
- automated tests and manual QA pass

## Validation Checklist

- [x] Approve Pokemon-inspired skill and stat taxonomy
- [x] Freeze move and stat data contracts
- [x] Approve six-species movepool and stat-budget redesign
- [x] Rebuild move registry and species stat data
- [x] Implement required new move families and balance hooks in runtime
- [x] Align unlock pacing and growth curve with level `1-60`
- [x] Align skill-facing UI
- [x] Align AI with tactical move roles
- [x] Run automated skill/stat regression suite
- [ ] Run manual skill/stat QA
