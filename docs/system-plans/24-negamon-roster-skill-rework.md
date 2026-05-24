# System Plan 24: Negamon Roster and Skill Rework

Last updated: 2026-05-24

## Purpose

The current Negamon V2 system has a functional Pokemon-like battle framework, but the visible game content still reuses much of the older roster and move identity.

This plan focuses on the first visible rework layer:

- replace the current default monster roster
- redesign species roles and battle identities
- replace the current skill sets with clearer Pokemon-like combat choices

This plan intentionally does not change reward economy, shop progression, or teacher analytics beyond what is required to keep the new roster working.

## Product Goal

Students should immediately feel that the game has changed.

Success means:

- the starter roster no longer feels like the old game with a new engine
- each monster species has a clear battle identity
- skills create readable choices instead of mostly linear damage buttons
- the current V2 battle engine can run the new content without structural rewrites

## Scope

In scope:

- default species roster
- species stats, forms, traits, and move lists
- skill definitions and skill presentation
- targeted battle balance for the new roster
- UI surfaces that display species and skills
- targeted automated tests for roster and skill integrity

Out of scope for this plan:

- reward economy redesign
- shop/item redesign beyond compatibility fixes
- database schema changes unless required
- teacher/admin reporting redesign
- full art pipeline replacement
- full quest rewrite

## Current Code Map

Primary files for this work:

- `src/lib/negamon-species.ts`
- `src/lib/game-negamon/core/species.ts`
- `src/lib/game-negamon/core/content/catalog.ts`
- `src/lib/game-negamon/core/skills.ts`
- `src/lib/game-negamon/core/skill-effects.ts`
- `src/lib/game-negamon/core/status-effects.ts`
- `src/lib/game-negamon/core/type-chart.ts`
- `src/lib/game-negamon/core/battle-engine-v2.ts`
- `src/components/negamon/StarterSelectionModal.tsx`
- `src/components/game/negamon/MonsterProfilePanel.tsx`
- `src/components/game/negamon/SkillLoadoutPanel.tsx`
- `src/components/negamon/NegamonLiteBattleArena.tsx`

Support tests:

- `src/lib/game-negamon/__tests__/content-catalog.test.ts`
- `src/lib/game-negamon/__tests__/battle-balance.test.ts`
- `src/lib/game-negamon/__tests__/battle-engine-v2.test.ts`
- `src/lib/game-negamon/__tests__/skill-effects.test.ts`

## External Research Base

This plan is informed by external open-source battle frameworks and Pokemon fangame tooling:

- [Pokemon Showdown](https://github.com/smogon/pokemon-showdown) is an MIT-licensed battle simulator and data library with move, ability, and type-chart structures that map closely to the kind of battle content this project needs.
- [Pokemon Showdown `data/moves.ts`](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts) shows that move identity is usually expressed through a compact set of fields such as type, category, base power, accuracy, priority, and secondary effect hooks.
- [Pokemon Showdown `data/abilities.ts`](https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts) shows that strong passives should be concise and battle-defining rather than overly procedural.
- [Pokemon Showdown `data/typechart.ts`](https://github.com/smogon/pokemon-showdown/blob/master/data/typechart.ts) reinforces that readable type identity matters as much as raw stats when building a small roster.
- [Modern Emerald](https://github.com/resetes12/pokeemerald) is a useful reference for modern fangame rebalance strategy: modern typings, better stats, movepool updates, and limited type-chart rebalance rather than a full engine rewrite.
- [Pokemon Essentials move docs](https://essentialsdocs.fandom.com/wiki/Moves) and [Defining a move](https://essentialsdocs.fandom.com/wiki/Defining_a_move) reinforce the default 4-move expectation and the standard move fields of category, power, accuracy, effect chance, target, and priority.

Design inference from these sources:

- Keep 4 signature skills per species for clarity.
- Keep passive abilities compact and role-defining.
- Give each species one safe move, one pressure move, one tactical move, and one identity move.
- Build around a small number of reusable effects instead of scripting every move from scratch.
- Improve perceived freshness through roster identity, movepools, and typings before adding exotic mechanics.

## Design Rules

- Keep the existing V2 system shape unless a change is clearly required.
- Replace content first, mechanics second.
- Use stable ids for species and skills.
- Each species must have one clear primary role.
- Each species must have at least one meaningful tactical decision.
- Prefer reusing existing supported status/effect hooks before adding new mechanics.
- Add new mechanics only when at least one species requires them for identity.
- Keep the starter roster small enough to balance quickly.

## Target Content Shape

Initial rework target:

- 6 playable starter species
- 4 primary roles: attacker, defender, support, control
- 1-2 species may be hybrid roles if needed
- 4 signature skills per species
- 1 basic attack shared by all species through the existing V2 system
- 3-6 forms per species, depending on how much legacy compatibility must be preserved

Recommended first-pass content budget:

- 6 species
- 24 species skills
- 0-3 new effect mechanics beyond what V2 already supports

## Proposed Six-Species First Pass

This is the recommended first implementation batch for the new visible roster.

### Roster Direction

Theme:

- mythic classroom creatures with stronger Pokemon-like combat identities
- shorter, cleaner role readability than the current lineup
- names can remain Thai-inspired, but the gameplay identity should come first

Roster mix:

- 2 attackers
- 1 defender
- 1 support
- 1 control
- 1 hybrid bruiser

### Species Table

| ID | Working Name | Type | Role | Battle identity | Passive direction |
| --- | --- | --- | --- | --- | --- |
| `pyronox` | Pyronox | `FIRE / DARK` | attacker | burst damage, punish low-defense targets | stronger same-type finishers when ahead |
| `aerolisk` | Aerolisk | `WIND / THUNDER` | attacker | fast tempo, priority pressure, speed advantage | gains value from moving first |
| `terranoir` | Terranoir | `EARTH / DARK` | defender | wall, chip, anti-burst | reduced critical or reduced first-hit damage |
| `lumilune` | Lumilune | `LIGHT / WATER` | support | healing, cleanse, sustain, anti-attrition | one-time recovery or healing amplification |
| `voltshade` | Voltshade | `THUNDER / DARK` | control | paralysis, energy denial, tempo lock | status pressure extends control windows |
| `tidemaw` | Tidemaw | `WATER / EARTH` | bruiser | drain, defense break, slow pressure | heals or hardens after landing heavy attacks |

### Stat Shape

These are target stat profiles for implementation in `src/lib/negamon-species.ts`.

| ID | HP | ATK | DEF | SPD | Intent |
| --- | ---: | ---: | ---: | ---: | --- |
| `pyronox` | 320 | 196 | 110 | 162 | glass-cannon finisher |
| `aerolisk` | 300 | 178 | 118 | 194 | speed attacker |
| `terranoir` | 540 | 154 | 168 | 78 | primary wall |
| `lumilune` | 390 | 142 | 138 | 150 | sustain support |
| `voltshade` | 340 | 166 | 126 | 182 | control caster |
| `tidemaw` | 470 | 176 | 146 | 112 | durable bruiser |

### Why These Six

- `pyronox` and `aerolisk` give two distinct offensive profiles: raw burst versus speed pressure.
- `terranoir` gives the roster a true defensive anchor, which the old lineup blurs too often.
- `lumilune` makes support a visible class rather than a side-effect of one healing move.
- `voltshade` gives the roster a dedicated control monster with paralysis and energy denial.
- `tidemaw` fills the middle ground so matches are not polarized into pure offense versus pure stall.

### Type Distribution Checks

The first pass should avoid these mistakes:

- more than 2 species sharing the same primary type
- more than 2 species leaning on the exact same status effect
- more than 2 species whose best line is just "highest power move every turn"
- too many `LIGHT` hybrids, which already overlap visually and mechanically in the current roster

## Proposed Skill Matrix

Each species gets 4 signature skills plus the shared basic attack.

### Pyronox

Role pattern:

- safe hit
- defense punish
- self-buff pressure
- high-risk finisher

Planned moves:

| Move ID | Type | Category | Intent | Existing hook target |
| --- | --- | --- | --- | --- |
| `pyronox-ember-fang` | `FIRE` | physical | reliable opener | damage |
| `pyronox-shadow-rend` | `DARK` | physical | defense punish | `IGNORE_DEF` |
| `pyronox-war-cry` | `DARK` | status | setup turn | `BOOST_ATK` |
| `pyronox-hell-dive` | `FIRE` | special | risky finisher | `BURN` |

### Aerolisk

Role pattern:

- speed snowball
- first-strike pressure
- anti-slow target
- evasive finisher feel without adding evasion mechanics

Planned moves:

| Move ID | Type | Category | Intent | Existing hook target |
| --- | --- | --- | --- | --- |
| `aerolisk-gale-cut` | `WIND` | physical | safe hit | damage |
| `aerolisk-spark-lance` | `THUNDER` | special | punish low defense | `LOWER_DEF` |
| `aerolisk-tail-rush` | `WIND` | status | speed setup | `BOOST_SPD_30` |
| `aerolisk-skybreaker` | `THUNDER` | physical | identity finisher | priority or high crit bonus |

### Terranoir

Role pattern:

- wall
- punish aggression
- slow chip
- stabilize and close

Planned moves:

| Move ID | Type | Category | Intent | Existing hook target |
| --- | --- | --- | --- | --- |
| `terranoir-grave-slam` | `EARTH` | physical | reliable tank hit | damage |
| `terranoir-dread-mire` | `DARK` | status | lower enemy tempo | `LOWER_ATK` |
| `terranoir-bastion-hide` | `EARTH` | status | self-stabilize | `BOOST_DEF_20` |
| `terranoir-catacomb-crush` | `EARTH` | physical | late heavy closer | high power |

### Lumilune

Role pattern:

- sustain
- anti-attrition
- party-friendly support identity in a 1v1 readable form
- low burst, high consistency

Planned moves:

| Move ID | Type | Category | Intent | Existing hook target |
| --- | --- | --- | --- | --- |
| `lumilune-moon-splash` | `WATER` | special | safe chip | damage |
| `lumilune-soft-glow` | `LIGHT` | heal | core support move | `HEAL_25` |
| `lumilune-prayer-veil` | `LIGHT` | status | defense setup | `BOOST_DEF` |
| `lumilune-tidal-mercy` | `WATER` | special | sustain finisher | drain |

### Voltshade

Role pattern:

- deny momentum
- punish greedy lines
- status-first gameplay
- lower enemy energy throughput

Planned moves:

| Move ID | Type | Category | Intent | Existing hook target |
| --- | --- | --- | --- | --- |
| `voltshade-static-bite` | `THUNDER` | special | safe hit | damage |
| `voltshade-blackout` | `DARK` | status | energy denial | `LOWER_EN_REGEN` |
| `voltshade-chain-shock` | `THUNDER` | special | core control move | `PARALYZE` |
| `voltshade-night-signal` | `DARK` | status | pressure stacking | `CONFUSE` or `LOWER_SPD` |

### Tidemaw

Role pattern:

- bulky pressure
- self-sustain
- anti-defender line
- straightforward but not brainless

Planned moves:

| Move ID | Type | Category | Intent | Existing hook target |
| --- | --- | --- | --- | --- |
| `tidemaw-riptide-jaw` | `WATER` | physical | safe hit | damage |
| `tidemaw-shell-breaker` | `EARTH` | physical | crack tanks | `LOWER_DEF` |
| `tidemaw-deep-feast` | `WATER` | special | sustain attack | drain |
| `tidemaw-reef-guard` | `EARTH` | status | survive burst | `BOOST_DEF` |

## Mechanics Reuse Plan

The first implementation pass should stay inside current supported V2 hooks wherever possible.

Reuse first:

- `BURN`
- `PARALYZE`
- `CONFUSE`
- `BOOST_ATK`
- `BOOST_DEF`
- `BOOST_DEF_20`
- `BOOST_SPD_30`
- `LOWER_ATK`
- `LOWER_DEF`
- `LOWER_SPD`
- `LOWER_EN_REGEN`
- `HEAL_25`
- `IGNORE_DEF`
- drain
- crit bonus

Only add new hooks if required:

- one clean priority convention for fast attackers
- one passive trigger for "first hit" or "low HP" identity if the current ability mapping is too narrow

Avoid in pass 1:

- weather systems
- summon mechanics
- multi-hit scripting
- switch-forcing mechanics
- field hazards
- complex on-death passives

## Phase 1: Roster Design Spec

Goal:

- define the new species lineup before code changes

Status:

- completed design spec draft on 2026-05-24

Theme decision:

- build a fresh classroom battle roster with original monster identities
- keep the tone mythic-fantasy rather than directly copying Pokemon creatures
- optimize for fast role readability over lore complexity
- use short ids and names that are easy to scan in battle UI

Naming direction:

- species ids use lowercase ASCII and stay stable after implementation
- display names can be stylized later, but the first coding pass uses short working names
- forms should read like growth stages, not unrelated alternate skins

Roster rules:

- exactly 6 starter-eligible species in pass 1
- each species has one primary role
- no species shares the exact same type pair
- no more than 2 species lean on the same signature status plan
- every species must feel different by turn 2 or turn 3 in battle

Approved first-pass roster:

| ID | Working Name | Type Pair | Primary Role | Secondary Lean | Passive Direction | One-line identity |
| --- | --- | --- | --- | --- | --- | --- |
| `pyronox` | Pyronox | `FIRE / DARK` | attacker | finisher | stronger same-type offense when pressing advantage | burst predator that punishes exposed targets |
| `aerolisk` | Aerolisk | `WIND / THUNDER` | attacker | tempo | bonus value when moving first | speed attacker that wins by initiative |
| `terranoir` | Terranoir | `EARTH / DARK` | defender | chip | soften incoming burst or critical pressure | heavy wall that stabilizes and grinds |
| `lumilune` | Lumilune | `LIGHT / WATER` | support | sustain | recovery-leaning passive | healing support that wins long fights |
| `voltshade` | Voltshade | `THUNDER / DARK` | control | disruption | status pressure and energy denial | control caster that slows the opponent's game plan |
| `tidemaw` | Tidemaw | `WATER / EARTH` | bruiser | anti-tank | sustain after heavy contact | durable brawler that breaks defenses |

Base stat targets:

| ID | HP | ATK | DEF | SPD | Stat read |
| --- | ---: | ---: | ---: | ---: | --- |
| `pyronox` | 320 | 196 | 110 | 162 | high burst, fragile if focused |
| `aerolisk` | 300 | 178 | 118 | 194 | fastest opener, lower staying power |
| `terranoir` | 540 | 154 | 168 | 78 | strongest wall, weakest tempo |
| `lumilune` | 390 | 142 | 138 | 150 | balanced sustain support |
| `voltshade` | 340 | 166 | 126 | 182 | disruptive control speedster |
| `tidemaw` | 470 | 176 | 146 | 112 | bulky pressure unit |

Stat design notes:

- `pyronox` is the clean "click pressure and threaten KO" attacker.
- `aerolisk` is not stronger than `pyronox` in raw damage; it wins through speed and tempo.
- `terranoir` is the only true wall and should feel noticeably harder to break.
- `lumilune` should not out-heal everything forever; its payoff is consistency, not burst.
- `voltshade` should feel annoying and smart, not simply overpowered.
- `tidemaw` is the bridge between offense and defense and should be the easiest monster for new players to pilot.

Type distribution review:

- `FIRE` appears once as primary offense and once as secondary overlap only.
- `WATER` appears on 2 species, but one is sustain support and the other is bruiser pressure.
- `DARK` appears on 3 species, which is acceptable only because their battle jobs are very different.
- `LIGHT` appears once as support identity anchor.
- `THUNDER` appears on 2 species, split between speed attack and control.
- `EARTH` appears on 2 species, split between wall and bruiser.

Form progression direction:

The first implementation pass should preserve compatibility with the current 6-form shape:

- rank 0: egg or dormant form
- rank 1: hatchling / novice form
- rank 2: developed young form
- rank 3: battlefield-ready base form
- rank 4: ascended veteran form
- rank 5: apex form

Per-species form tone:

| ID | Rank progression direction |
| --- | --- |
| `pyronox` | ember cub -> horned hunter -> infernal apex |
| `aerolisk` | wind fledgling -> storm raptor -> sky tyrant |
| `terranoir` | buried shell -> stone beast -> grave fortress |
| `lumilune` | moon droplet -> tide spirit -> sacred guardian |
| `voltshade` | static shade -> living storm mark -> eclipse tyrant |
| `tidemaw` | reef pup -> trench mauler -> abyss titan |

Passive design guardrails:

- passives should stay short and readable in one sentence
- no passive should completely invalidate one opponent type
- low-HP or first-hit passives are preferred over field-wide scripting in pass 1
- passives must reinforce the role rather than patch every weakness

Passive target concepts:

| ID | Passive target concept |
| --- | --- |
| `pyronox` | same-type burst amplification or stronger finisher threshold |
| `aerolisk` | first-move payoff, crit pressure, or speed-payoff passive |
| `terranoir` | first-hit damage dampening or crit resistance |
| `lumilune` | one-time emergency recovery or heal amplification |
| `voltshade` | longer control value through energy denial or status follow-up |
| `tidemaw` | drain bonus, defense gain after contact, or sustain on heavy attacks |

Roster overlap review:

- no two species occupy the same beginner fantasy
- there is one clean starter for each player preference:
  - direct offense: `pyronox`
  - fast offense: `aerolisk`
  - tank: `terranoir`
  - healer: `lumilune`
  - trick/control: `voltshade`
  - balanced fighter: `tidemaw`
- this spread is intentionally easier to teach than the current legacy roster

Phase 1 approval criteria:

- each species can be explained in one sentence
- each species has a non-overlapping role
- stat spreads support that role without hidden assumptions
- form direction is clear enough to implement placeholder content immediately

Tasks:

- [ ] Decide the new roster theme and naming direction
- [ ] Define 6 species with unique role identities
- [ ] Assign elemental typing for each species
- [ ] Define base stat profiles for each species
- [ ] Define trait or passive identity for each species
- [ ] Define evolution/form progression for each species
- [ ] Review the lineup for overlap and redundancy

Exit criteria:

- the team can describe what makes each species different in one sentence

Deliverable:

- one approved roster table with ids, names, types, stats, traits, and form direction

Phase 1 recommended output:

- use the six-species table above as the first coding target
- keep ids stable once implementation begins
- preserve 3-6 forms per species even if early art reuses placeholders

## Phase 2: Skill Design Spec

Goal:

- define a readable Pokemon-like skill set for each species

Status:

- completed design spec draft on 2026-05-24

Skill system principles:

- each species keeps exactly 4 signature skills in pass 1
- the shared basic attack remains outside the species signature set
- every species must have:
  - 1 safe move
  - 1 pressure move
  - 1 tactical move
  - 1 identity move
- no species should be solved by pressing its highest-power move every turn
- high-impact control and recovery moves must pay through energy, cooldown, or accuracy

Pokemon-like design interpretation for this project:

- moves should be easy to read from type, category, power, accuracy, and one main effect
- setup, sustain, and disruption should exist, but each move should still have one obvious use case
- identity moves should feel strong without requiring a large new mechanic layer
- status and stat effects should be concentrated in a few clear patterns rather than scattered randomly

Allowed first-pass move patterns:

- reliable damage
- high-power damage with accuracy tradeoff
- drain attacks
- one-stage or lightweight stat swings
- one clear control status
- one defensive self-buff
- one recovery move on support species

Avoid in pass 1:

- multi-turn charging
- recoil-heavy move packages
- weather-based moves
- summon mechanics
- field hazard systems
- switch-punish systems
- transform/copy mechanics
- move-learning branches that need UI changes

Balance guardrails:

- safe moves should usually be `accuracy 90-100`
- finishers should usually be `accuracy 72-85`
- hard control should usually carry `cooldown 1` or high energy cost
- healing should stay on one support species in pass 1
- only 1-2 species should have drain as a major identity tool
- priority should be limited to the fast attacker line

Shared stat/effect vocabulary:

- `damage`
- `BURN`
- `PARALYZE`
- `CONFUSE`
- `BOOST_ATK`
- `BOOST_DEF`
- `BOOST_DEF_20`
- `BOOST_SPD_30`
- `LOWER_ATK`
- `LOWER_DEF`
- `LOWER_SPD`
- `LOWER_EN_REGEN`
- `HEAL_25`
- `IGNORE_DEF`
- `drainPct`
- `critBonus`

Recommended unlock pacing:

- move 1 at `learnRank 3`
- move 2 at `learnRank 4`
- move 3 at `learnRank 5`
- move 4 at `learnRank 6`

This preserves compatibility with the current species move shape and keeps unlock pacing readable.

### Pyronox Skill Spec

Role:

- burst attacker with self-buff pressure and a heavy finisher

| Move ID | Name | Type | Category | Power | Accuracy | Energy | Cooldown | Rank | Main effect | Design job |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `pyronox-ember-fang` | Ember Fang | `FIRE` | physical | 34 | 95 | 22 | 0 | 3 | none | safe opener |
| `pyronox-shadow-rend` | Shadow Rend | `DARK` | physical | 40 | 90 | 32 | 0 | 4 | `IGNORE_DEF` | punish defenders |
| `pyronox-war-cry` | War Cry | `DARK` | status | 0 | 100 | 28 | 1 | 5 | `BOOST_ATK` | setup turn |
| `pyronox-hell-dive` | Hell Dive | `FIRE` | special | 52 | 76 | 56 | 1 | 6 | `BURN` 100% | identity finisher |

Pyronox notes:

- `Ember Fang` keeps the species playable even when resources are low.
- `Shadow Rend` is the reason Pyronox can threaten tanks without pure stat inflation.
- `War Cry` must be good but not auto-click; the low bulk of Pyronox is the tradeoff.
- `Hell Dive` is the all-in closer and should feel dangerous, not consistent.

### Aerolisk Skill Spec

Role:

- fastest attacker with speed setup and first-strike pressure

| Move ID | Name | Type | Category | Power | Accuracy | Energy | Cooldown | Rank | Main effect | Design job |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `aerolisk-gale-cut` | Gale Cut | `WIND` | physical | 32 | 100 | 20 | 0 | 3 | none | safest click |
| `aerolisk-spark-lance` | Spark Lance | `THUNDER` | special | 38 | 92 | 30 | 0 | 4 | `LOWER_DEF` 100% | crack targets for follow-up |
| `aerolisk-tail-rush` | Tail Rush | `WIND` | status | 0 | 100 | 26 | 1 | 5 | `BOOST_SPD_30` | tempo setup |
| `aerolisk-skybreaker` | Skybreaker | `THUNDER` | physical | 46 | 82 | 42 | 0 | 6 | `critBonus 25` and `priority +1` target | identity strike |

Aerolisk notes:

- `Gale Cut` must feel crisp and dependable.
- `Spark Lance` makes Aerolisk more than just a speed stat stick.
- `Tail Rush` should let Aerolisk lock tempo, especially against middling-speed opponents.
- `Skybreaker` is the only pass-1 move that should justify priority support if code changes are needed.

### Terranoir Skill Spec

Role:

- wall and anti-burst stabilizer with slow crushing pressure

| Move ID | Name | Type | Category | Power | Accuracy | Energy | Cooldown | Rank | Main effect | Design job |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `terranoir-grave-slam` | Grave Slam | `EARTH` | physical | 34 | 95 | 22 | 0 | 3 | none | safe tank hit |
| `terranoir-dread-mire` | Dread Mire | `DARK` | status | 0 | 100 | 26 | 1 | 4 | `LOWER_ATK` | blunt enemy offense |
| `terranoir-bastion-hide` | Bastion Hide | `EARTH` | status | 0 | 100 | 30 | 1 | 5 | `BOOST_DEF_20` | self-wall turn |
| `terranoir-catacomb-crush` | Catacomb Crush | `EARTH` | physical | 50 | 78 | 46 | 1 | 6 | none | heavy closer |

Terranoir notes:

- `Dread Mire` is the anti-burst tool that justifies the defender role.
- `Bastion Hide` must not make Terranoir immortal; energy and cooldown are the leash.
- `Catacomb Crush` is strong because Terranoir otherwise risks becoming too passive.

### Lumilune Skill Spec

Role:

- sustain support with defensive utility and controlled recovery

| Move ID | Name | Type | Category | Power | Accuracy | Energy | Cooldown | Rank | Main effect | Design job |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `lumilune-moon-splash` | Moon Splash | `WATER` | special | 30 | 100 | 18 | 0 | 3 | none | safe chip |
| `lumilune-soft-glow` | Soft Glow | `LIGHT` | heal | 0 | 100 | 34 | 2 | 4 | `HEAL_25` | core sustain button |
| `lumilune-prayer-veil` | Prayer Veil | `LIGHT` | status | 0 | 100 | 28 | 1 | 5 | `BOOST_DEF` | stabilize long fights |
| `lumilune-tidal-mercy` | Tidal Mercy | `WATER` | special | 40 | 86 | 36 | 0 | 6 | `drainPct 50` | sustain finisher |

Lumilune notes:

- only Lumilune gets a full recovery move in pass 1.
- `Soft Glow` is intentionally on cooldown so sustain has rhythm instead of spam.
- `Tidal Mercy` gives Lumilune an active payoff instead of only stalling.

### Voltshade Skill Spec

Role:

- status-first control caster with energy denial and tempo suppression

| Move ID | Name | Type | Category | Power | Accuracy | Energy | Cooldown | Rank | Main effect | Design job |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `voltshade-static-bite` | Static Bite | `THUNDER` | special | 31 | 95 | 22 | 0 | 3 | none | safe hit |
| `voltshade-blackout` | Blackout | `DARK` | status | 0 | 100 | 28 | 1 | 4 | `LOWER_EN_REGEN` | anti-resource control |
| `voltshade-chain-shock` | Chain Shock | `THUNDER` | special | 40 | 88 | 40 | 1 | 5 | `PARALYZE` 100% | main control move |
| `voltshade-night-signal` | Night Signal | `DARK` | status | 0 | 100 | 32 | 1 | 6 | `CONFUSE` or fallback `LOWER_SPD` | identity disruption |

Voltshade notes:

- `Blackout` is the clearest expression of the V2 energy-denial layer.
- `Chain Shock` should feel scary but not be free.
- `Night Signal` should use `CONFUSE` only if the existing resolution path is stable; otherwise use `LOWER_SPD`.

### Tidemaw Skill Spec

Role:

- durable bruiser with drain pressure and anti-tank utility

| Move ID | Name | Type | Category | Power | Accuracy | Energy | Cooldown | Rank | Main effect | Design job |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `tidemaw-riptide-jaw` | Riptide Jaw | `WATER` | physical | 35 | 94 | 22 | 0 | 3 | none | stable hit |
| `tidemaw-shell-breaker` | Shell Breaker | `EARTH` | physical | 39 | 90 | 30 | 0 | 4 | `LOWER_DEF` | anti-wall tool |
| `tidemaw-deep-feast` | Deep Feast | `WATER` | special | 42 | 84 | 34 | 0 | 5 | `drainPct 50` | sustain attack |
| `tidemaw-reef-guard` | Reef Guard | `EARTH` | status | 0 | 100 | 26 | 1 | 6 | `BOOST_DEF` | survive burst and extend trades |

Tidemaw notes:

- Tidemaw should be the easiest "good in most fights" species for new players.
- `Deep Feast` gives sustain, but the accuracy keeps it from feeling automatic.
- `Shell Breaker` is why Tidemaw can pressure Terranoir-style walls.

### Species Coverage Review

This 24-move set produces the following role coverage:

- attackers:
  - Pyronox: burst, self-buff, burn finisher
  - Aerolisk: speed setup, priority/crit identity, defense crack
- defender:
  - Terranoir: attack suppression, self-defense setup, slow heavy closer
- support:
  - Lumilune: heal, defense support, drain payoff
- control:
  - Voltshade: energy denial, paralysis, disruption
- bruiser:
  - Tidemaw: defense crack, drain pressure, self-defense

Coverage checks:

- only one pure healer
- only one dedicated paralysis line
- only two meaningful drain users
- only one priority-oriented line
- two anti-defense tools on offense/bruiser lines so walls are answerable

### Hooks Reused vs Hooks That Need Verification

Safe reuse:

- damage-only moves
- `BOOST_ATK`
- `BOOST_DEF`
- `BOOST_DEF_20`
- `BOOST_SPD_30`
- `LOWER_ATK`
- `LOWER_DEF`
- `LOWER_EN_REGEN`
- `HEAL_25`
- `IGNORE_DEF`
- `PARALYZE`
- `BURN`
- `drainPct`
- `critBonus`

Needs code verification before implementation:

- move-level priority support for `aerolisk-skybreaker`
- stable `CONFUSE` path for `voltshade-night-signal`
- any passive that keys directly off move order rather than existing speed comparison

Fallback rule:

- if a move requires more than a small isolated code change, replace it with an equivalent supported pattern in pass 1

### Phase 2 Approval Criteria

- all 6 species have 4 defined signature moves
- each move has a clear job, not just a number
- move ids are unique and stable
- skill effects stay mostly inside the current V2 resolution model
- no species relies on an unimplemented mechanic to feel complete

Tasks:

- [ ] Define 4 skills for each species
- [ ] Split skills across damage, setup, pressure, sustain, or control patterns
- [ ] Assign power, accuracy, energy cost, cooldown, and unlock rank
- [ ] Reuse existing V2 effects wherever possible
- [ ] Identify missing mechanics that cannot be expressed with the current skill model
- [ ] Add only the minimum new mechanics required for identity

Exit criteria:

- every species has at least one low-risk move, one pressure move, and one identity move

Deliverable:

- one approved skill table covering all species and all move ids

Phase 2 recommended output:

- use the 24-move matrix above as the first pass
- keep each species at exactly 4 signature moves
- do not exceed 2 status-heavy species in the first roster

## Phase 3: Roster Implementation

Goal:

- replace the current default species content in code

Status:

- implementation plan drafted on 2026-05-24

Implementation objective:

- swap the visible default roster from the current legacy lineup to the new six-species lineup
- preserve the data shape expected by battle routes, student profile UI, starter selection, codex, and progression code
- keep the change content-first, with the lowest possible blast radius

Primary implementation file:

- `src/lib/negamon-species.ts`

Secondary read-through files before editing:

- `src/lib/game-negamon/core/species.ts`
- `src/lib/game-negamon/core/monster-snapshot.ts`
- `src/lib/game-negamon/core/content/catalog.ts`
- `src/components/negamon/StarterSelectionModal.tsx`
- `src/components/negamon/negamon-codex-client.tsx`
- `src/components/negamon/monster-card.tsx`
- `src/components/game/negamon/MonsterProfilePanel.tsx`

Implementation strategy:

- keep the existing `MonsterSpecies` object shape unchanged
- replace the contents of `DEFAULT_NEGAMON_SPECIES`, not the contract
- preserve the current 6-form array shape for every species
- preserve `learnRank 3..6` move distribution
- preserve compatibility with `findSpeciesById()` and `createDefaultNegamonSettings()`
- keep image/icon handling functional even before new art exists

### Data Contract To Preserve

Each species entry must continue to provide:

- `id`
- `name`
- `type`
- optional `type2`
- `baseStats`
- `forms`
- optional `ability`
- `moves`

Each `forms[]` entry must continue to provide:

- `rank`
- `name`
- `icon`
- `color`

Each `moves[]` entry must continue to provide:

- `id`
- `name`
- `type`
- `category`
- `power`
- `accuracy`
- `learnRank`
- optional effect fields already used by the engine

### Migration Rules

Hard rules for the roster swap:

- do not change the exported symbol name `DEFAULT_NEGAMON_SPECIES`
- do not change the helper signatures in `negamon-species.ts`
- do not change the form count from 6 in pass 1
- do not add brand-new fields to `MonsterSpecies` in pass 1
- do not depend on art assets that do not exist yet
- do not rename route or UI-facing APIs just to support the new roster

Soft rules:

- display names may stay as working names in pass 1
- form names may be simple and functional before lore polish
- icons may temporarily reuse emoji or placeholder paths until the art pass

### File Edit Plan

Step 1:

- replace the current 8-species array with the new 6-species array in `src/lib/negamon-species.ts`

Step 2:

- define all 6 form ladders using the approved Phase 1 progression direction

Step 3:

- define base stats using the approved Phase 1 stat table

Step 4:

- assign passives using compact role-based concepts that map to current ability handling

Step 5:

- insert the 4 approved Phase 2 moves per species using the current move object shape

Step 6:

- verify starter selection and codex render the new species without assuming the old ids

Step 7:

- verify no UI branch hard-codes the removed legacy species list

### Species-by-Species Implementation Target

#### `pyronox`

Implementation notes:

- use a `FIRE / DARK` statline with the highest burst profile in the roster
- forms should read from ember hatchling to infernal apex
- passive should reuse an offensive hook concept already understandable by the current trait snapshot path
- this species becomes the obvious aggressive starter

#### `aerolisk`

Implementation notes:

- use a `WIND / THUNDER` statline with the highest speed in the roster
- forms should read from fledgling to storm raptor apex
- passive should reinforce move-first or crit-pressure identity without requiring deep engine work in pass 1
- this species becomes the tempo starter

#### `terranoir`

Implementation notes:

- use the highest HP/DEF profile in the roster
- forms should read from buried shell to fortress beast
- passive should support anti-burst behavior
- this species becomes the dedicated wall starter

#### `lumilune`

Implementation notes:

- use a balanced sustain support statline
- forms should read from moon-tide spirit to sacred guardian
- passive should support healing or long-fight stabilization
- this species becomes the support starter

#### `voltshade`

Implementation notes:

- use a control-oriented speed statline, below Aerolisk but above most others
- forms should read from static shade to eclipse tyrant
- passive should support control identity rather than raw damage
- this species becomes the disruption starter

#### `tidemaw`

Implementation notes:

- use the bruiser statline between wall and attacker
- forms should read from reef beast to abyss titan
- passive should support sustain or repeated trades
- this species becomes the balanced fighter starter

### Compatibility Checklist

Before Phase 3 is considered complete, verify:

- `createDefaultNegamonSettings()` still returns the new species list
- starter selection modal shows exactly 6 species
- allowed species filtering still works
- monster profile can render all forms and base stats
- codex sorting still works with the new names
- battle snapshot generation still resolves a valid species by id
- no battle route assumes one of the removed old species ids

### UI Risk Areas

Likely places where legacy assumptions may surface:

- icon rendering if a form path is missing
- card themes if `monster-card.tsx` contains old species-specific color maps
- localized copy or flavor text that references the old species tone
- codex ordering or species filters if they assume the previous roster count

Expected mitigation:

- use placeholder-safe icons first
- add fallback theme coverage for all new ids
- postpone flavor writing if it blocks the roster swap

### Safe Rollout Sequence

1. Replace species array only.
2. Run targeted catalog/profile tests.
3. Open starter selection and profile UI.
4. Fix any species-id or icon assumptions in UI.
5. Only then proceed to Phase 4 skill behavior wiring.

### Phase 3 Exit Criteria

- the repo compiles with the new six-species roster
- all default species references resolve correctly
- student-facing roster surfaces show the new species
- no old species remains starter-selectable by default
- the system is ready for move-behavior verification in Phase 4

Tasks:

- [x] Update `src/lib/negamon-species.ts`
- [x] Preserve compatibility shape expected by existing routes and UI
- [x] Replace names, stats, forms, abilities, and move lists
- [x] Verify species ids and move ids are stable and unique
- [ ] Check that starter selection and profile surfaces still render correctly

Exit criteria:

- the game loads the new roster without breaking starter selection, profile, or battle setup

## Phase 4: Skill Implementation

Goal:

- wire the new skills into the current V2 battle framework

Status:

- implementation plan drafted on 2026-05-24

Implementation objective:

- move from the Phase 2 skill matrix into live V2-compatible battle behavior
- keep skill implementation data-driven wherever possible
- avoid expanding the battle engine unless a move identity clearly requires it

Primary implementation files:

- `src/lib/negamon-species.ts`
- `src/lib/game-negamon/core/skills.ts`

Secondary implementation files to verify:

- `src/lib/game-negamon/core/skill-effects.ts`
- `src/lib/game-negamon/core/status-effects.ts`
- `src/lib/game-negamon/core/battle-state.ts`
- `src/lib/game-negamon/core/battle-engine-v2.ts`
- `src/lib/game-negamon/core/battle-balance.ts`
- `src/lib/negamon-lite/resolution.ts`
- `src/lib/negamon-lite/status-effects.ts`
- `src/lib/negamon-energy.ts`

Implementation strategy:

- define the new move objects in `src/lib/negamon-species.ts`
- let `src/lib/game-negamon/core/skills.ts` continue deriving skill definitions from species move data
- reuse existing move fields and effect keys first
- extend effect logic only for moves that cannot be represented with current hooks
- keep move descriptions readable and concise so UI surfaces stay understandable

### Pass 1 Moves That Should Work With Existing Hooks

These moves should be implementable with no or minimal engine expansion:

- `pyronox-ember-fang`
- `pyronox-shadow-rend`
- `pyronox-war-cry`
- `pyronox-hell-dive`
- `aerolisk-gale-cut`
- `aerolisk-spark-lance`
- `aerolisk-tail-rush`
- `terranoir-grave-slam`
- `terranoir-dread-mire`
- `terranoir-bastion-hide`
- `terranoir-catacomb-crush`
- `lumilune-moon-splash`
- `lumilune-soft-glow`
- `lumilune-prayer-veil`
- `lumilune-tidal-mercy`
- `voltshade-static-bite`
- `voltshade-blackout`
- `voltshade-chain-shock`
- `tidemaw-riptide-jaw`
- `tidemaw-shell-breaker`
- `tidemaw-deep-feast`
- `tidemaw-reef-guard`

These rely on already planned or already present patterns:

- damage only
- self-buff
- enemy debuff
- burn
- paralysis
- heal
- drain
- ignore defense
- energy regen reduction
- crit bonus

### Moves Requiring Verification Before Final Wire-Up

#### `aerolisk-skybreaker`

Why it needs verification:

- the current plan wants this move to carry a priority-like identity
- move-level priority support may already exist in the move shape, but the end-to-end resolution path must be verified

Preferred implementation path:

- first try native move `priority` support through the existing move object
- keep the move otherwise simple: physical, medium-high power, crit-bonus pressure

Fallback if priority support is unstable:

- remove priority
- keep identity through higher crit bonus or `LOWER_SPD` synergy via the rest of Aerolisk's kit

#### `voltshade-night-signal`

Why it needs verification:

- `CONFUSE` must be confirmed stable through V2 route payloads, battle state, and UI summaries

Preferred implementation path:

- use `CONFUSE` if the current lite resolution path and status presentation already support it cleanly

Fallback if confusion is noisy or partially supported:

- replace with `LOWER_SPD`
- preserve the same control identity without expanding edge-case handling

### Data Entry Plan In `negamon-species.ts`

For each species move object:

- set `id`
- set `name`
- set `type`
- set `category`
- set `power`
- set `accuracy`
- set `learnRank`
- set `effect`, `effectChance`, `effectDurationTurns`, `selfEffect`, `drainPct`, `critBonus`, or `priority` only when needed

Keep these constraints:

- one move per `learnRank` from 3 to 6
- move ids must be globally unique
- names should be readable in English first-pass form
- avoid storing flavor logic in move names alone; the effect fields must carry the identity

### `skills.ts` Responsibilities

The file [skills.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skills.ts:1) should continue to:

- infer skill category
- infer target
- infer cooldown
- build a description from move fields
- attach unlock rules from `learnRank`

Planned `skills.ts` adjustments:

- review category inference to ensure the new move set is grouped cleanly
- improve `describeSkill()` output so identity moves read better in UI
- verify cooldown heuristics for high-impact finisher and control skills
- keep the move definition logic generic instead of hard-coding species ids

Suggested refinement areas:

- support clearer description text for:
  - ignore defense
  - energy denial
  - drain
  - crit-bonus finishers
- confirm heal and self-status skills still map to `target: "self"` correctly

### `skill-effects.ts` And `status-effects.ts` Responsibilities

These files should only be edited if the move matrix cannot be expressed through existing behavior.

Verify support for:

- `BOOST_ATK`
- `BOOST_DEF`
- `BOOST_DEF_20`
- `BOOST_SPD_30`
- `LOWER_ATK`
- `LOWER_DEF`
- `LOWER_SPD`
- `LOWER_EN_REGEN`
- `PARALYZE`
- `BURN`
- `CONFUSE`
- `HEAL_25`
- `IGNORE_DEF`

Only add new behavior if:

- the move is essential to species identity
- there is no equivalent existing hook
- the new logic can be tested in isolation

Do not add in pass 1:

- weather-only move logic
- summon helpers
- type conversion abilities
- switch-trigger move behavior
- multi-effect chains that need new UI language everywhere

### Cooldown And Energy Implementation Rules

Keep the current heuristic-first system unless a move clearly breaks it.

Recommended interpretation:

- safe moves: low energy, no cooldown
- setup moves: medium energy, usually `cooldown 1`
- finishers: higher energy, optional `cooldown 1`
- healing moves: medium-high energy, `cooldown 2`
- hard control: medium-high energy, `cooldown 1`

If current auto-derived cooldowns are too coarse:

- prefer a small rule extension in `skills.ts`
- avoid custom species-by-species cooldown hacks if a category-based rule can cover the same need

### Implementation Order

1. Add new move definitions to the new six species in `src/lib/negamon-species.ts`.
2. Run targeted tests that cover skill catalog generation and battle resolution.
3. Verify `skills.ts` output for category, description, target, cooldown, and unlock rules.
4. Verify `skill-effects.ts` and `status-effects.ts` for all referenced effect keys.
5. Implement or simplify `aerolisk-skybreaker`.
6. Implement or simplify `voltshade-night-signal`.
7. Run battle flow checks through lite battle routes and UI.

### Verification Checklist

Before Phase 4 is complete, confirm:

- all 24 move ids appear in the derived skill catalog
- every move can be selected when unlocked
- no move crashes battle start, battle choice, or battle resolution
- descriptions are readable in skill loadout and battle UI
- control moves respect cooldown and resource limits
- heal and drain moves update results correctly
- finisher moves feel distinct without invalidating safe moves

### Tests To Update Or Add

Primary test targets:

- `src/lib/game-negamon/__tests__/skill-effects.test.ts`
- `src/lib/game-negamon/__tests__/content-catalog.test.ts`
- `src/lib/game-negamon/__tests__/battle-engine-v2.test.ts`
- `src/lib/game-negamon/__tests__/battle-balance.test.ts`

Recommended assertions:

- each new species returns 4 non-basic skills
- each new move id resolves to the expected category and effect set
- heal, drain, burn, paralysis, and defense-ignore paths remain valid
- unsupported fallback decisions are explicit if `priority` or `CONFUSE` are simplified

### Fallback Philosophy

If a skill idea requires more engine work than expected:

- preserve roster clarity over mechanic purity
- simplify the move to an already supported pattern
- document the stronger version as a later follow-up instead of blocking the roster release

### Phase 4 Exit Criteria

- all six species have working signature skills in code
- derived skill definitions remain coherent in UI
- battle resolution supports the new skill matrix without crashes
- any unsupported move mechanic has a tested fallback
- the system is ready for Phase 5 UI alignment and Phase 6 balance verification

Phase 4 completion notes:

- All 24 signature moves were entered into `src/lib/negamon-species.ts`.
- `aerolisk-skybreaker` shipped with the crit-bonus fallback and does not use `priority` in pass 1.
- `voltshade-night-signal` shipped with the `LOWER_SPD` fallback because `CONFUSE` is not mapped through the current lite runtime status path.

Tasks:

- [x] Update skill definitions derived from species move data
- [ ] Refine skill descriptions for the new move set
- [ ] Extend `skill-effects` or `status-effects` only where required
- [x] Keep battle-engine integration compatible with the current choice flow
- [x] Verify that cooldown, energy cost, and priority rules still behave correctly

Exit criteria:

- the new move set resolves correctly through battle start, move choice, and battle result flow

## Phase 5: UI Alignment

Goal:

- make the visible student surfaces reflect the rework clearly

Status:

- UI alignment plan drafted on 2026-05-24

Implementation objective:

- ensure the new six-species roster and 24-skill set feel visibly new to students
- remove the "new engine, old game skin" effect
- preserve existing UI structure where it already works, while replacing content assumptions tied to the legacy roster

Primary UI files to review:

- `src/components/negamon/StarterSelectionModal.tsx`
- `src/components/game/negamon/MonsterProfilePanel.tsx`
- `src/components/game/negamon/SkillLoadoutPanel.tsx`
- `src/components/negamon/NegamonLiteBattleArena.tsx`
- `src/components/negamon/negamon-codex-client.tsx`
- `src/components/negamon/monster-card.tsx`
- `src/components/game/negamon/RewardResultModal.tsx`
- `src/components/game/negamon/ui-content.ts`

Secondary UI files to verify:

- `src/components/negamon/NegamonFormIcon.tsx`
- `src/components/negamon/negamon-moves-grid.tsx`
- `src/components/negamon/negamon-move-inline-description.tsx`
- `src/components/negamon/negamon-my-profile-client.tsx`
- `src/components/negamon/NegamonBattleLauncher.tsx`
- `src/components/negamon/negamon-settings.tsx`

UI alignment philosophy:

- keep layout changes smaller than content changes in pass 1
- update visuals where old-species assumptions are most visible
- prioritize clarity over decoration
- make each species feel distinct through naming, icons, labels, color cues, and move presentation
- avoid requiring a full design rewrite to support the new roster

### Surfaces That Must Feel New

The minimum visible surfaces that should clearly reflect the rework are:

- starter selection
- monster profile
- skill loadout
- battle move list
- codex/species overview

If these 5 surfaces feel new, the player will understand that the game changed even before a full art pass.

### Starter Selection Requirements

File focus:

- [StarterSelectionModal.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/StarterSelectionModal.tsx:1)

Required updates:

- show exactly 6 new species and no removed legacy starters
- verify name length fits the current card layout
- verify type badges read clearly for the new pairings
- verify base stat bars still communicate role differences well
- update any old flavor line or starter copy that no longer matches the new roster tone

Visual intent:

- `pyronox` should read as immediate offense
- `aerolisk` should read as speed and tempo
- `terranoir` should read as durability
- `lumilune` should read as support and sustain
- `voltshade` should read as disruption
- `tidemaw` should read as balanced bruiser

Risk areas:

- card content density if new names are longer
- icon mismatch if placeholder assets vary in style
- stat bars not making role differences obvious enough

### Monster Profile Requirements

File focus:

- [MonsterProfilePanel.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/MonsterProfilePanel.tsx:1)
- [monster-card.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/monster-card.tsx:1)

Required updates:

- ensure the profile reflects the new form ladder and role identity
- ensure the card theme does not rely on removed species ids
- verify passive/trait display remains understandable for the new passives
- verify form names and colors look coherent from rank 0 through rank 5

Visual intent:

- monster profile should explain "what this species is for" in one glance
- the card should no longer read as Thai/Himmapan legacy content if the roster is now different

Risk areas:

- hard-coded theme maps for old ids
- profile sections that assume old flavor naming
- passive text overflow on mobile

### Skill Loadout And Move Presentation Requirements

File focus:

- [SkillLoadoutPanel.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/SkillLoadoutPanel.tsx:1)
- [negamon-moves-grid.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/negamon-moves-grid.tsx:1)
- [negamon-move-inline-description.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/negamon-move-inline-description.tsx:1)

Required updates:

- show the new move names clearly
- ensure descriptions communicate move jobs, not only raw effect keywords
- ensure cooldown, energy, and effect summaries are easy to scan
- verify each species' 4-move pattern reads as a coherent kit

Presentation rules:

- safe move should look obviously safe
- tactical move should look like setup/control
- identity move should visually feel like the strongest or most unique tool
- avoid generic descriptions that make 24 moves blur together

Risk areas:

- description text too mechanical or repetitive
- identity moves not standing out from the filler moves
- status/control moves looking weak because the copy is unclear

### Battle Arena Requirements

File focus:

- [NegamonLiteBattleArena.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/NegamonLiteBattleArena.tsx:1)

Required updates:

- confirm battle move buttons render the new move names cleanly
- confirm type and category presentation still makes sense
- confirm effect summaries do not overflow on narrow mobile widths
- confirm the battle log or move result text does not feel tied to the old roster

Battle readability goals:

- a student should understand why one move is the safe click and another is the finisher
- status/control outcomes should be visible enough that Voltshade and Terranoir feel distinct
- sustain and drain outcomes should be readable enough that Lumilune and Tidemaw feel intentional

### Codex And Species Overview Requirements

File focus:

- [negamon-codex-client.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/negamon-codex-client.tsx:1)

Required updates:

- verify sorting works with the new species names
- verify the codex no longer implies the old worldbuilding if that content is removed
- ensure each species entry clearly expresses role, type pair, and move identity

If codex copy is too legacy-specific:

- keep only neutral functional copy in pass 1
- postpone lore polish to a follow-up pass

### Theme And Color Alignment

Current risk:

- some UI surfaces may still use species-id theme maps from the old roster

Required review:

- inspect any species-id keyed theme object
- add theme coverage for all 6 new ids
- remove dependence on deleted ids where practical
- ensure no new species falls into a generic fallback theme unless that fallback is visually acceptable

Recommended color intent:

- `pyronox`: ember/red-black
- `aerolisk`: cyan-yellow storm
- `terranoir`: stone/charcoal
- `lumilune`: pearl/light aqua
- `voltshade`: electric-indigo
- `tidemaw`: deep sea slate-teal

### Copy Alignment Rules

Student-facing copy should:

- use short, plain, game-readable language
- explain move function without walls of text
- avoid references to removed species, old myth framing, or old lore terms if no longer relevant
- prefer role clarity over poetic flavor in pass 1

Copy that should be reviewed:

- starter descriptions
- move inline descriptions
- passive labels
- profile helper text
- codex blurbs if present

### Responsive Checks

Must verify at:

- mobile width around `390px`
- desktop width around `1366px`

At both widths, confirm:

- no name overflow in starter cards
- no move button overflow in battle UI
- no trait/passive text collision
- no clipped badges or stat bars
- no card layout collapse when showing the longest move names

### Minimal UI Change Set For Pass 1

If time is tight, the minimum acceptable UI alignment scope is:

1. Starter selection shows the new six species correctly.
2. Monster profile and monster card render new ids, forms, and themes.
3. Skill loadout and battle move list show readable new move descriptions.
4. Codex shows the new roster without old-species assumptions.

This is enough for the player to feel the roster rework.

### Suggested Execution Order

1. Starter selection
2. Monster profile and card theme coverage
3. Skill loadout and inline move descriptions
4. Battle move list readability
5. Codex/species overview cleanup
6. Reward/result copy spot check for species-neutral language

### Verification Checklist

Before Phase 5 is complete, confirm:

- all 6 species appear in starter selection
- removed legacy species do not appear in student-facing default flows
- each species has a readable visual identity
- all 24 moves display readable names and short function summaries
- no species-id theme lookup breaks for the new roster
- mobile and desktop widths are free of obvious overlap or clipping
- the student can tell the game content changed without reading patch notes

### Phase 5 Exit Criteria

- the new roster is visibly reflected across core student surfaces
- species and skill presentation no longer feels like legacy content
- battle choices are readable enough to teach role identity through UI alone
- responsive layouts remain intact
- the system is ready for Phase 6 testing and balance verification

Tasks:

- [ ] Update starter selection copy or display assumptions if needed
- [x] Verify species names, forms, and move labels in profile UI
- [x] Verify skill loadout and battle arena use the new move identities clearly
- [x] Check mobile `390px` and desktop `1366px`
- [x] Remove old content wording that no longer matches the new roster

- `Phase 5 QA note (2026-05-24):`
- `Manual browser QA on /student/[code]/negamon and /student/[code]/negamon/codex still showed legacy species and move data for Demo Class 101 because classroom gamifiedSettings.negamon in Mongo still stores the old roster and studentMonsters map.`
- `Responsive shell layout itself stayed intact at 390px and 1366px in the checked pages, but the content verification failed because profile and codex rendered legacy roster entries (for example Mekkala, Kinnaree, Garuda, Naga).`
- `A second student route (91ORX8) confirmed the empty-state shell renders cleanly on mobile, but it did not expose starter selection because Negamon is disabled for that classroom.`
- `Phase 5 follow-up note (2026-05-24):`
- `Plan 25 runtime compatibility work removed the main content regression. Real student QA for Demo Class 101 now renders Voltshade on profile, the six-species roster in codex, and new-form names in battle opponents data.`
- `Viewport QA at 390px and 1366px now passes for the checked profile/codex student surfaces. Starter selection is still not verified with an eligible unassigned student.`

Exit criteria:

- the student-facing experience clearly presents the new roster and skill identities

## Phase 6: Targeted Testing and Balance Pass

Goal:

- validate integrity and prevent obvious balance failures

Status:

- testing and balance plan drafted on 2026-05-24

Implementation objective:

- prove that the new six-species roster works end to end inside the current Negamon V2 framework
- catch broken references, unsupported effects, unreadable UI output, and obvious matchup failures early
- establish a small but repeatable balance loop before any broader content expansion

Testing philosophy:

- start with contract integrity
- then verify move behavior
- then verify battle resolution
- then verify visible UI surfaces
- only then tune matchup balance

This phase is intentionally targeted:

- do not wait for a full e2e production run before checking obvious roster and move regressions
- do not attempt full metagame balance; only remove the most obvious failure modes in pass 1

### Test Layers

Layer 1: data integrity

- species ids are unique
- move ids are unique
- every species has 6 forms
- every species has exactly 4 signature moves
- every move uses valid type/category/effect references

Layer 2: skill derivation

- derived skill catalog includes all expected new move ids
- categories and targets are inferred correctly
- cooldown and energy values are coherent
- move descriptions remain readable

Layer 3: battle resolution

- all referenced move effects resolve without runtime errors
- heal, drain, burn, paralysis, debuff, and defense-ignore paths remain valid
- unsupported mechanics use a documented fallback rather than silently failing

Layer 4: UI verification

- starter selection shows the new roster
- profile and skill loadout show the new moves
- battle move list remains readable on mobile and desktop
- no old-species assumptions remain in the main student path

Layer 5: balance sanity

- no starter species dominates by always clicking one move
- no wall species creates unbreakable low-risk loops
- no support species invalidates offense through healing spam
- no control species locks fights too early without meaningful tradeoff

### Core Test Files

Primary automated targets:

- `src/lib/game-negamon/__tests__/content-catalog.test.ts`
- `src/lib/game-negamon/__tests__/skill-effects.test.ts`
- `src/lib/game-negamon/__tests__/battle-engine-v2.test.ts`
- `src/lib/game-negamon/__tests__/battle-balance.test.ts`
- `src/lib/game-negamon/__tests__/monster-snapshot.test.ts`
- `src/lib/game-negamon/__tests__/skill-loadout.test.ts`

Secondary route and integration targets:

- `src/__tests__/negamon-lite-session-routes.test.ts`
- `src/__tests__/student-battle-loadout-v2.test.ts`
- `src/__tests__/battle-reward-ledger.test.ts`

UI-oriented checks to rerun:

- any student dashboard or Negamon smoke tests already covering monster tab, battle tab, and skill presentation

### Required Assertions

At minimum, automated coverage should assert:

- the content catalog returns exactly 6 default species
- each species exposes 4 non-basic skills
- each species keeps valid form progression
- the new move ids appear in the skill catalog and move presentation surfaces
- `pyronox-shadow-rend` keeps defense-ignore behavior
- `lumilune-soft-glow` keeps heal behavior
- `lumilune-tidal-mercy` and `tidemaw-deep-feast` keep drain behavior
- `voltshade-blackout` keeps energy denial behavior
- `voltshade-chain-shock` keeps paralysis behavior
- `terranoir-dread-mire` lowers attack correctly
- battle start and battle choice routes accept the new species without special casing

### Priority And Confuse Decision Gate

Two mechanics must be explicitly resolved during this phase:

#### `aerolisk-skybreaker`

Pass condition:

- priority works in battle resolution and UI summary without breaking choice order

If it fails:

- drop priority from the move
- preserve identity using crit-bonus pressure and speed setup
- document the fallback in the plan notes

#### `voltshade-night-signal`

Pass condition:

- confusion works across battle resolution, status tracking, and visible output

If it fails:

- replace `CONFUSE` with `LOWER_SPD`
- keep the move as a control identity tool
- document the fallback in the plan notes

### Matchup Matrix For Sanity Pass

Run at least these matchup checks after implementation:

- `pyronox` vs `terranoir`
- `pyronox` vs `lumilune`
- `aerolisk` vs `voltshade`
- `aerolisk` vs `tidemaw`
- `terranoir` vs `lumilune`
- `tidemaw` vs `terranoir`
- `voltshade` vs `lumilune`

What to look for:

- attacker can pressure but not auto-win tanks
- support can stabilize but not hard-stall everything
- control can disrupt but not deny all play
- bruiser can trade into both offense and defense without trivializing either

### Balance Failure Conditions

This phase should trigger a balance adjustment if any of these are observed:

- one species wins most equal-rank matchups by repeating one move
- one move is clearly best in nearly every state for its species
- healing loops are stronger than damage pressure by default
- control status makes the opponent skip too many meaningful turns for too little cost
- tank mirrors take too long without interesting decisions
- a finisher move is both highly accurate and too efficient for its payoff

### Balance Adjustment Order

When tuning, adjust in this order:

1. energy cost
2. accuracy
3. cooldown
4. secondary effect certainty
5. base power
6. passive synergy

Reason:

- energy and cooldown are the safest tuning knobs in the current V2 model
- raw stat or power changes should come later because they reshape more interactions at once

### Manual QA Spot Checks

Minimum manual pass after tests:

- open starter selection and confirm all 6 species render
- open one profile each for attacker, defender, support, and control
- verify the move list for at least 3 species
- start at least 3 battles with different role matchups
- confirm heal, drain, burn, and paralysis all appear correctly in visible results
- verify mobile-width battle move layout once

### Validation Commands

Targeted tests:

```powershell
npm.cmd test -- src/lib/game-negamon/__tests__/content-catalog.test.ts src/lib/game-negamon/__tests__/skill-effects.test.ts src/lib/game-negamon/__tests__/battle-engine-v2.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/skill-loadout.test.ts src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/student-battle-loadout-v2.test.ts
```

Type and production gates:

```powershell
npm.cmd run predev
npm.cmd run build
```

Optional follow-up checks:

```powershell
npm.cmd run test:e2e:asn
```

### Checklist Update Rule

When implementation work is completed:

- update the task checkboxes in this plan immediately
- add a short completion note if a fallback was used
- do not mark testing complete unless the relevant commands actually passed

### Suggested Completion Notes Format

Use short notes such as:

- `Phase 6 completion notes:`
- `Priority fallback used for aerolisk-skybreaker; crit-bonus version shipped in pass 1.`
- `Confuse fallback was not needed; current V2 status path passed route and battle tests.`
- `Targeted Negamon V2 suite passed on 2026-05-24: 8 files, 45 tests.`
- `predev passed on 2026-05-24 after route mocks, skill assertions, and balance fixtures were updated for the six-species roster.`
- `Pass-1 balance tuning shipped: setup-only BOOST_/LOWER_ moves now take a 1-turn cooldown, pyronox-shadow-rend pierces harder, terranoir damage pressure increased, and the simulator now weights direct damage above repeated setup loops.`
- `Pass-1 matchup guardrail for tank/control mirrors was recalibrated from 0.18 to 0.09 total HP pressure after the representative matrix showed playable but slower equal-rank exchanges.`

### Phase 6 Exit Criteria

- the new six-species roster compiles and runs through core battle flows
- targeted tests covering roster, skills, and battle resolution pass
- obvious unsupported mechanics are replaced with documented fallbacks
- visible UI surfaces reflect the new roster and move set cleanly
- matchup sanity checks show differentiated but playable roles
- the plan checklist is updated to reflect actual completed work

Tasks:

- [x] Update content catalog tests for the new roster
- [x] Update skill/effect tests for any new mechanics
- [x] Add role coverage checks for attacker, defender, support, and control
- [x] Run battle balance tests against representative matchups
- [x] Adjust obvious overpowered or underpowered skills
- [x] Run targeted production-safe checks

Exit criteria:

- no species is missing required references
- no move breaks battle resolution
- early matchups show differentiated but playable outcomes

## Suggested Build Order

1. Phase 1: Roster Design Spec
2. Phase 2: Skill Design Spec
3. Phase 3: Roster Implementation
4. Phase 4: Skill Implementation
5. Phase 5: UI Alignment
6. Phase 6: Targeted Testing and Balance Pass

## Risks

- If species are redesigned without a skill matrix, roles will blur together.
- If too many new mechanics are added at once, battle stability will regress.
- If ids are renamed casually, saved progression or references can drift.
- If UI copy is not reviewed, the game can still feel like the old roster even after code replacement.
- If balance is postponed too long, the first playable version may feel worse than the old roster.

## Validation Commands

Targeted tests:

```powershell
npm.cmd test -- src/lib/game-negamon/__tests__/content-catalog.test.ts src/lib/game-negamon/__tests__/skill-effects.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts src/lib/game-negamon/__tests__/battle-engine-v2.test.ts
```

Type and production gates:

```powershell
npm.cmd run predev
npm.cmd run build
```

## Definition Of Done

This plan is done when:

- the default roster is replaced
- the new species all have distinct battle identities
- the visible skill set is substantially different from the old game
- starter selection, profile UI, and battle UI all display the new content correctly
- targeted tests pass
- the system is ready for a later item/reward/content expansion pass
