# System Plan 26: Negamon Pokemon-Inspired System Rebuild

Last updated: 2026-05-24

## Purpose

Plans 24 and 25 moved visible content and runtime compatibility forward, but the battle runtime still depends on the older `negamon-lite` engine.

This plan defines the full next-stage rebuild needed to turn Negamon into a clearly modern Pokemon-inspired game system, not just a roster refresh on top of legacy battle math.

The goal of this plan is to make it explicit which systems must be rebuilt, which can be adapted, and which are intentionally out of scope for the first complete pass.

## Reference Base

This plan is informed by open-source Pokemon-adjacent implementations and documentation patterns:

- Pokemon Showdown repository
  - battle simulator architecture: `sim/`
  - move data tables
  - ability data tables
  - type chart data
- pret `pokeemerald`
  - battle runtime separation
  - battle script / move effect organization
  - item / status / stat-stage handling patterns
- Pokemon Essentials move and item documentation
  - move definitions
  - item usage categories
  - battle-facing data modeling

Reference links:

- [Pokemon Showdown](https://github.com/smogon/pokemon-showdown)
- [Pokemon Showdown moves data](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts)
- [Pokemon Showdown abilities data](https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts)
- [Pokemon Showdown type chart](https://github.com/smogon/pokemon-showdown/blob/master/data/typechart.ts)
- [pret/pokeemerald](https://github.com/pret/pokeemerald)
- [Pokemon Essentials moves overview](https://essentialsdocs.fandom.com/wiki/Moves)
- [Pokemon Essentials defining a move](https://essentialsdocs.fandom.com/wiki/Defining_a_move)
- [Pokemon Essentials defining an item](https://essentialsdocs.fandom.com/wiki/Defining_an_item)

Important rule:

- we will reuse architecture patterns, data-model patterns, and battle-system concepts
- we will not copy proprietary Pokemon species, names, move lists, or content wholesale

## Product Goal

Students should feel that Negamon is a real monster-battle game with Pokemon-like clarity:

- battle resolution should follow a modern, testable rules engine
- stats, moves, abilities, items, and statuses should interact predictably
- content should be data-driven instead of hardwired into page logic
- battle UI should show meaningful choices instead of thin wrappers over legacy runtime
- future roster expansion should not require reworking the engine every time

## What “Complete” Means In This Plan

This plan treats the following as first-class systems that must be addressed:

1. battle state model
2. turn order and action resolution
3. damage and stat formulas
4. type system
5. move system
6. status and volatile effects
7. passive abilities / traits
8. battle item system
9. monster progression and learnset rules
10. opponent generation and AI scoring
11. battle protocol and UI contract
12. persistence, replay, and QA coverage

If a subsystem is not addressed in this list, the rebuild is not considered complete.

## Scope

In scope:

- 1v1 Pokemon-inspired battle runtime
- server-authoritative turn resolution
- stat-stage and status-effect framework
- move metadata and move-effect hook system
- passive trait / ability hook system
- battle-item runtime integration
- battle-facing AI and opponent decision logic
- party slot model preparation for future expansion
- battle protocol versioning and replay/event log format
- migration path away from `negamon-lite` for production battle flows

Out of scope for this plan:

- open-world exploration
- capture loop
- breeding
- IV / EV / Nature full competitive depth
- weather, terrain, and doubles battles in the first pass
- full six-mon party switching in the first release pass
- cloning exact Pokemon content

## Current Gap

Current state in repo:

- roster content has already moved to the new six-species set
- skill definitions exist in the V2 layer
- runtime compatibility for legacy classroom data exists
- but battle resolution still routes through `src/lib/negamon-lite/*`

This means:

- content is newer than the engine
- formulas and status runtime are still constrained by the legacy-lite model
- long-term expansion is still expensive until the battle core is replaced

## Target Architecture

Target module layout for the new system:

- `src/lib/game-negamon/core/rules/`
  - pure rules and formulas
- `src/lib/game-negamon/core/data/`
  - species, moves, abilities, items, type chart, learnsets
- `src/lib/game-negamon/core/state/`
  - battle state, combatants, volatile state, replay events
- `src/lib/game-negamon/core/engine/`
  - turn resolution, order, effect dispatch, AI scoring
- `src/lib/game-negamon/server/`
  - classroom battle orchestration and persistence
- `src/components/game/negamon/`
  - UI against server-provided state and valid actions

Design rules:

- engine logic must be pure and testable
- routes may orchestrate but not calculate battle outcomes directly
- UI consumes valid actions from server state instead of guessing legality
- battle effects should be data-driven through effect ids / handlers

## System Inventory

### A. Battle State And Protocol

Must define:

- combatant snapshot shape
- persistent battle state shape
- action request / action response contract
- RNG seed handling
- replay event schema
- optimistic locking / `choiceRequestId` / `stateVersion`

Done only when:

- the client can render a full battle from server state alone
- the server can reject stale or illegal actions deterministically

### B. Turn Order And Action Resolution

Must define:

- action queue
- move priority
- speed comparison
- tie-break handling
- start-of-turn hooks
- on-action hooks
- end-of-turn hooks
- faint resolution
- victory resolution

Pokemon reference direction:

- Showdown-style server-owned resolution pipeline
- Emerald-style hook timing separation

### C. Damage And Formula Engine

Must define:

- physical vs special split
- level factor
- attack / defense selection
- STAB
- type effectiveness
- crit
- random damage band decision
- shields / reduction modifiers
- fixed-damage and percent-based effect support

First-pass rule:

- implement one explicit Negamon formula inspired by Pokemon structure
- do not mix old-lite shortcuts with new formula paths

### D. Type System

Must define:

- canonical type ids
- type matchup table
- dual-type multiplier rules
- immunity handling
- display labels for effectiveness

Done only when:

- all battle math and UI surfaces use one canonical type chart source

### E. Move System

Must define:

- move data schema
- target rules
- accuracy rules
- PP rules
- energy rules
- cooldown rules if retained
- priority rules
- effect categories
- move execution hooks

Move-effect families required:

- direct damage
- heal
- buff
- debuff
- damage + status
- drain
- stat reset / cleanse
- protection / shield
- multi-turn prep reserved for later, but data shape should allow it

### F. Status And Volatile Effects

Must define:

- persistent status
- temporary volatile status
- stat stages
- accuracy/evasion stages or chosen simplified equivalent
- turn skip rules
- DOT timing
- cleanse / overwrite / refresh rules
- immunity rules

Required first-pass statuses:

- burn
- poison
- badly poison
- paralysis
- sleep
- stun/freeze equivalent if retained
- shield / focus / battle-specific temporary states

### G. Passive Abilities / Traits

Must define:

- ability data schema
- trigger timing model
- passive modifier hooks
- immunity hooks
- battle-start hooks
- turn-end hooks
- move-interaction hooks

First-pass rule:

- unify current “trait” and “ability” runtime into one hook framework
- species content can still display friendly names, but engine should use stable ids

### H. Battle Item System

Must define:

- consumable battle items
- held/passive battle items if included in first pass
- targeting rules
- eligibility rules
- inventory consumption
- effect timing
- battle log integration

Minimum supported item groups:

- heal item
- stat boost item
- shield / protection item
- reward modifier item
- cleanse item

### I. Monster Progression And Learnsets

Must define:

- level/rank growth contract
- learnset unlock timing
- skill slot/loadout rules
- evolution/form progression coupling
- future support for alternate learn methods

First-pass rule:

- keep current classroom-friendly rank progression
- but separate growth formulas from battle runtime so later changes do not break combat

### J. Opponent Generation And Battle AI

Must define:

- opponent sampling rules
- AI move scoring
- heal timing logic
- buff/debuff value heuristics
- finish / setup / stall logic
- anti-loop safeguards

Pokemon reference direction:

- simpler than full competitive AI
- richer than current one-step lite scoring

### K. UI, Replay, And Presentation

Must define:

- action menu contract
- disabled-choice reasons
- move detail surface
- status panel
- turn log / battle events
- replay / history summary
- result screen

Done only when:

- UI no longer embeds battle rules assumptions that belong in the engine

### L. Persistence And Migration

Must define:

- how live classrooms move from `negamon-lite` sessions to the new engine
- how old sessions remain readable
- whether there is engine version tagging in `BattleSession.result`
- migration rules for loadouts and disabled moves

## Execution Phases

## Phase 1: Rules And Data Contract Spec

Goal:

- freeze the rules vocabulary before rewriting runtime

Tasks:

- define battle state schema
- define move schema
- define ability schema
- define item schema
- define event log schema
- define action protocol schema
- define engine-version strategy

Exit criteria:

- one approved contract document exists for battle state, move/ability/item data, and replay events

### Phase 1 Contract Spec

Status:

- completed on 2026-05-24 for first-pass data contract scope

Design decision:

- keep the current classroom-friendly Negamon rank/progression model
- replace the runtime contract under it with a dedicated Pokemon-inspired battle schema
- version the new engine explicitly instead of mutating `negamon-lite` payloads in place

### 1. Canonical Engine Identity

First-pass engine id:

- `negamon_v3_pokemon_inspired`

Session payload rule:

- every new-format battle payload stored in `BattleSession.result` must carry:
  - `mode`
  - `engineVersion`
  - `status`

First-pass values:

- `mode: "negamon_battle"`
- `engineVersion: "negamon_v3_pokemon_inspired"`
- `status: "active" | "finished"`

Backward-compatibility rule:

- existing `negamon_lite` sessions remain readable
- new routes should branch by `result.mode` and `result.engineVersion`
- do not silently reinterpret old session payloads as new ones

### 2. Battle State Schema

Target top-level battle state shape:

```ts
type NegamonBattleStateV3 = {
  battleId: string;
  engineVersion: "negamon_v3_pokemon_inspired";
  seed: number;
  rngCursor: number;
  turn: number;
  phase: "choosing" | "resolving" | "ended";
  sides: {
    player: NegamonBattleCombatantV3;
    opponent: NegamonBattleCombatantV3;
  };
  queue: NegamonBattleActionV3[];
  field: NegamonBattleFieldStateV3;
  events: NegamonBattleEventV3[];
  winner?: "player" | "opponent";
  choiceRequestId: string;
  stateVersion: number;
};
```

Combatant shape:

```ts
type NegamonBattleCombatantV3 = {
  id: string;
  studentId?: string;
  side: "player" | "opponent";
  displayName: string;
  speciesId: string;
  speciesName: string;
  formName: string;
  rankIndex: number;
  level: number;
  types: NegamonBattleTypeId[];
  maxHp: number;
  hp: number;
  energy: number;
  maxEnergy: number;
  stats: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  statStages: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
    accuracy: number;
    evasion: number;
  };
  abilityId?: string;
  battleItemIds: string[];
  moveSlots: NegamonBattleMoveSlotV3[];
  statuses: NegamonBattleStatusStateV3[];
  volatileStates: NegamonBattleVolatileStateV3[];
  fainted: boolean;
};
```

Field shape:

```ts
type NegamonBattleFieldStateV3 = {
  weather: null;
  terrain: null;
  roomEffects: [];
};
```

First-pass rule:

- `weather`, `terrain`, and room effects stay structurally reserved but inactive in pass 1

### 3. Action And Choice Contract

Client-to-server action shape:

```ts
type NegamonBattleActionIntentV3 = {
  battleId: string;
  choiceRequestId: string;
  stateVersion: number;
  side: "player" | "opponent";
  action: {
    kind: "move";
    moveSlot: 0 | 1 | 2 | 3;
    targetSlot: "self" | "opponent";
  };
};
```

Valid choice shape returned by server:

```ts
type NegamonBattleValidChoiceV3 = {
  moveSlot: 0 | 1 | 2 | 3;
  moveId: string;
  label: string;
  targetSlot: "self" | "opponent";
  enabled: boolean;
  reason?:
    | "BATTLE_ENDED"
    | "NOT_CHOOSING"
    | "FAINTED"
    | "NO_PP"
    | "NO_ENERGY"
    | "ON_COOLDOWN"
    | "LOCKED"
    | "INVALID_TARGET";
  cost: {
    pp: number;
    energy: number;
  };
  priority: number;
};
```

Protocol rule:

- UI must render actions from `validChoices`
- UI must not infer legality from local PP/energy alone
- server rejects any action whose `choiceRequestId` or `stateVersion` is stale

### 4. Move Data Schema

Target move definition shape:

```ts
type NegamonMoveDefinitionV3 = {
  id: string;
  name: string;
  description: string;
  type: NegamonBattleTypeId;
  category: "PHYSICAL" | "SPECIAL" | "STATUS";
  target: "self" | "opponent";
  power: number;
  accuracy: number;
  maxPp: number;
  energyCost: number;
  priority: number;
  cooldownTurns: number;
  critRateStage: number;
  drainPercent?: number;
  unlock: {
    rankIndex: number;
    speciesId: string;
  };
  tags: string[];
  effects: NegamonMoveEffectV3[];
};
```

Effect model:

```ts
type NegamonMoveEffectV3 =
  | { kind: "damage" }
  | { kind: "heal"; percentOfMaxHp: number }
  | { kind: "apply_status"; statusId: string; chance: number; durationTurns?: number }
  | { kind: "apply_volatile"; volatileId: string; durationTurns?: number }
  | { kind: "modify_stat_stage"; stat: string; stages: number; target: "self" | "opponent" }
  | { kind: "cleanse_status"; target: "self" | "opponent" }
  | { kind: "grant_shield"; percentReduction: number; durationTurns: number }
  | { kind: "drain"; percentOfDamage: number };
```

First-pass rule:

- one move may carry multiple effects
- raw battle execution is driven by `effects`, not by ad hoc `if move.id === ...` branches
- `cooldownTurns` is retained in pass 1 because current Negamon pacing already uses it and classroom balance depends on it

### 5. Ability Data Schema

Target ability definition shape:

```ts
type NegamonAbilityDefinitionV3 = {
  id: string;
  name: string;
  description: string;
  hooks: NegamonAbilityHookV3[];
};
```

Hook model:

```ts
type NegamonAbilityHookV3 =
  | { trigger: "battle_start"; effect: NegamonHookEffectV3 }
  | { trigger: "before_move"; effect: NegamonHookEffectV3 }
  | { trigger: "after_move"; effect: NegamonHookEffectV3 }
  | { trigger: "on_damage_taken"; effect: NegamonHookEffectV3 }
  | { trigger: "turn_end"; effect: NegamonHookEffectV3 };
```

Hook effect model:

```ts
type NegamonHookEffectV3 =
  | { kind: "modify_energy_regen"; flatBonus: number }
  | { kind: "modify_damage_multiplier"; multiplier: number; when: "low_hp" | "statused_target" | "always" }
  | { kind: "grant_status_immunity"; statusId: string }
  | { kind: "apply_status"; statusId: string; chance: number };
```

First-pass rule:

- trait and ability runtime unify under this schema
- source-of-truth id stays stable even if displayed copy changes

### 6. Battle Item Data Schema

Target item definition shape:

```ts
type NegamonBattleItemDefinitionV3 = {
  id: string;
  name: string;
  description: string;
  kind: "consumable" | "passive";
  usage: "battle_start" | "manual" | "on_hit" | "turn_end";
  target: "self" | "opponent" | "none";
  effect: NegamonBattleItemEffectV3;
};
```

Effect model:

```ts
type NegamonBattleItemEffectV3 =
  | { kind: "heal"; percentOfMaxHp: number }
  | { kind: "modify_stat_stage"; stat: string; stages: number }
  | { kind: "grant_shield"; percentReduction: number; durationTurns: number }
  | { kind: "cleanse_status" }
  | { kind: "reward_bonus"; goldFlat?: number; goldMultiplier?: number; expMultiplier?: number };
```

First-pass rule:

- existing production reward bonus items must remain representable
- item runtime must emit replay events when an item changes battle state

### 7. Status And Volatile State Schema

Persistent status ids:

- `BURN`
- `POISON`
- `BADLY_POISON`
- `PARALYZE`
- `SLEEP`

Volatile state ids:

- `SHIELD`
- `FOCUS`
- `STUN`
- `LOCKED_MOVE`

State shape:

```ts
type NegamonBattleStatusStateV3 = {
  id: string;
  sourceMoveId?: string;
  remainingTurns: number | null;
  stacks?: number;
};
```

Volatile shape:

```ts
type NegamonBattleVolatileStateV3 = {
  id: string;
  sourceMoveId?: string;
  remainingTurns: number | null;
  data?: Record<string, number | string | boolean>;
};
```

Rule decision:

- `accuracy` and `evasion` are explicit stat stages in V3
- current simplified statuses like `SHIELD` and `FOCUS` remain supported as Negamon-specific volatile states

### 8. Replay Event Schema

Target event shape:

```ts
type NegamonBattleEventV3 = {
  id: string;
  turn: number;
  phase: "battle_start" | "action_commit" | "action_resolve" | "turn_end" | "battle_end";
  kind:
    | "battle_started"
    | "action_rejected"
    | "move_used"
    | "damage_dealt"
    | "heal_applied"
    | "status_applied"
    | "status_blocked"
    | "status_ticked"
    | "volatile_applied"
    | "stat_stage_changed"
    | "item_triggered"
    | "ability_triggered"
    | "combatant_fainted"
    | "battle_ended";
  actorSide?: "player" | "opponent";
  targetSide?: "player" | "opponent";
  moveId?: string;
  itemId?: string;
  abilityId?: string;
  delta?: {
    hp?: number;
    energy?: number;
    pp?: number;
    statStages?: Record<string, number>;
  };
  message: string;
};
```

Replay rule:

- events are append-only
- UI text may be derived from `message` in pass 1
- later localization can key off `kind` + structured fields without changing engine behavior

### 9. Type System Contract

Canonical type ids for pass 1:

- `NORMAL`
- `FIRE`
- `WATER`
- `EARTH`
- `WIND`
- `THUNDER`
- `LIGHT`
- `DARK`

Rule decision:

- pass 1 keeps the current Negamon eight-type identity
- the type chart source moves under `core/data/` and becomes the only authoritative table for formula/UI usage

### 10. Engine-Version Strategy

Implementation rule:

- old and new engines coexist by explicit version
- route handlers decide engine path from classroom feature flag + session payload version
- persistence format must never require guessing which engine created a battle record

Suggested classroom gate:

- `gamifiedSettings.negamon.engineVersion = "lite" | "pokemon_v3"`

Fallback rule:

- existing classrooms default to `lite` until explicitly migrated
- QA/demo classrooms may opt into `pokemon_v3` first

### 11. Phase 1 Output Decision

Approved module boundaries for implementation:

- `src/lib/game-negamon/core/data/`
- `src/lib/game-negamon/core/rules/`
- `src/lib/game-negamon/core/state/`
- `src/lib/game-negamon/core/engine/`
- `src/lib/game-negamon/server/`

Phase 1 conclusion:

- the rebuild now has a frozen first-pass contract for:
  - battle state
  - move data
  - ability hooks
  - battle items
  - status/volatile state
  - replay events
  - action protocol
  - engine versioning
- Phase 2 can now implement pure formula modules without redefining the battle payload shape midstream

## Phase 2: Formula Core

Goal:

- implement the new pure battle math layer

Tasks:

- build damage formula module
- build type multiplier module
- build stat-stage module
- build crit / accuracy / random-band helpers
- build deterministic RNG wrapper

Exit criteria:

- formula helpers run without DB or UI dependencies
- unit tests cover expected math paths

### Phase 2 Formula Decisions

Status:

- completed on 2026-05-24 for first-pass pure formula core

Implemented module boundary:

- `src/lib/game-negamon/core/rules/`
  - `types.ts`
  - `stat-stages.ts`
  - `type-multiplier.ts`
  - `accuracy.ts`
  - `rng.ts`
  - `damage.ts`

First-pass formula rules locked in this phase:

1. Damage structure
   - Pokemon-inspired base structure:
     - level factor
     - power
     - attack vs defense
     - STAB
     - type multiplier
     - crit multiplier
     - random damage band
   - first-pass damage formula uses:

```ts
baseDamage = ((levelFactor * power * attack) / defense) / 50 + 2
finalDamage =
  baseDamage *
  stabMultiplier *
  typeMultiplier *
  critMultiplier *
  randomMultiplier *
  flatModifier
```

2. STAB and crit
   - `STAB = 1.5x`
   - `crit = 1.5x`
   - crit chance remains stage-driven instead of fixed-per-move only

3. Random damage band
   - first-pass band is `0.85` to `1.00`
   - random generation is deterministic and cursor-based

4. Type multiplier
   - V3 keeps the current Negamon eight-type identity
   - formula layer now owns a canonical type chart for pure battle math

5. Stat stages
   - stat stages use bounded values from `-6` to `+6`
   - first-pass multiplier table follows a Pokemon-like progression
   - explicit support exists for:
     - attack
     - defense
     - specialAttack
     - specialDefense
     - speed
     - accuracy
     - evasion

6. Accuracy and evasion
   - effective accuracy is derived from:
     - move base accuracy
     - actor accuracy stage
     - target evasion stage
     - optional bonus multiplier from statuses/abilities/items

7. RNG model
   - deterministic linear-congruential RNG wrapper
   - each roll advances a visible `cursor`
   - intended to support replay/debug parity in later engine phases

Why this phase is considered complete:

- formula code now exists outside `negamon-lite`
- formula helpers are pure and have no DB/UI coupling
- damage, type, stage, accuracy, and RNG rules can be tested independently

Verification completed:

- added `src/lib/game-negamon/__tests__/formula-core.test.ts`
- `npm.cmd test -- src/lib/game-negamon/__tests__/formula-core.test.ts` passed
- `npm.cmd run predev` passed

Phase 2 conclusion:

- the rebuild now has a real pure formula core under `core/rules/`
- later phases can consume these helpers instead of pulling math from `negamon-lite/resolution.ts`
- Phase 3 should now wire move/status execution to this formula layer

## Phase 3: Move And Status Runtime

Goal:

- replace legacy-lite effect execution with extensible move resolution

Tasks:

- implement move execution pipeline
- implement status application / refresh / immunity rules
- implement turn start/end effect processing
- implement stat buffs/debuffs
- implement shield/focus-style volatile states under the new engine

Exit criteria:

- a battle can resolve direct damage, status, buff, debuff, and heal moves using only the new runtime

### Phase 3 Runtime Notes

Status:

- completed on 2026-05-24 for pure move/status runtime scope

Implemented module boundary:

- `src/lib/game-negamon/core/engine/`
  - `runtime-types.ts`
  - `status-runtime.ts`
  - `move-runtime.ts`
  - `index.ts`

What Phase 3 now covers:

1. Pure runtime combatant shape
   - added a V3-oriented runtime combatant/state fragment separate from `negamon-lite`
   - supports:
     - HP / energy
     - formula stats
     - stat stages
     - status list
     - volatile-state list
     - status immunities

2. Status application and lifecycle
   - implemented runtime status application for:
     - `BURN`
     - `POISON`
     - `BADLY_POISON`
     - `PARALYZE`
     - `SLEEP`
     - `STUN`
   - implemented:
     - chance gate
     - immunity blocking
     - duration refresh
     - badly-poison stacking
     - turn-start skip handling
     - turn-end DOT ticking
     - status expiration

3. Volatile-state handling
   - implemented runtime volatile support for:
     - `SHIELD`
     - `FOCUS`
   - implemented:
     - volatile application
     - shield-based damage reduction
     - focus-based accuracy bonus
     - turn-end expiration

4. Move execution pipeline
   - added pure move-resolution runtime that:
     - consumes `NegamonSkillDefinition`
     - spends energy
     - checks turn-start statuses
     - rolls accuracy
     - rolls crit
     - rolls deterministic damage band
     - calculates damage from the new formula core
     - applies shield reduction
     - applies heal / stat-stage / status / volatile effects
     - processes end-of-turn statuses

5. Timeline output
   - runtime now emits structured timeline events for:
     - move use
     - damage
     - heal
     - status applied / blocked / ticked / expired
     - volatile applied / expired
     - stat-stage changes
     - turn skipped

Important scope note:

- this phase builds the new pure runtime
- it does not yet replace production battle orchestration
- production path migration remains for later phases:
  - Phase 5 for state engine / turn order
  - Phase 7 for routes and session migration

Verification completed:

- added `src/lib/game-negamon/__tests__/move-status-runtime.test.ts`
- `npm.cmd test -- src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/formula-core.test.ts` passed
- `npm.cmd run predev` passed

Phase 3 conclusion:

- the rebuild now has a real move-and-status runtime above the new formula layer
- direct damage, heal, buff, debuff, status, shield, focus, sleep skip, paralysis skip, and DOT timing all resolve without `negamon-lite`
- the next major step is Phase 4 ability/item hook integration so production traits and battle items can join the new runtime cleanly

## Phase 4: Ability And Item Hook Framework

Goal:

- move battle modifiers out of one-off conditionals into reusable hooks

Tasks:

- implement ability trigger registry
- implement item effect registry
- wire battle-start, on-hit, on-turn-end, and immunity hooks
- port current production traits/items into the new framework

Exit criteria:

- current production traits and battle items work through the new hook framework

### Phase 4 Hook Framework Notes

Status:

- completed on 2026-05-24 for first-pass ability/item hook integration

Implemented module boundary:

- `src/lib/game-negamon/core/engine/`
  - `hook-framework.ts`
  - `runtime-types.ts`
  - `move-runtime.ts`

What Phase 4 now covers:

1. Unified runtime hook model
   - added one hook registry for both passive abilities and battle items
   - supports trigger timings:
     - `battle_start`
     - `before_move`
     - `after_move`
     - `on_damage_taken`
     - `turn_end`

2. Ability hook integration
   - ported first-pass production ability ids into the new runtime:
     - `acid_rain`
     - `flame_body`
     - `iron_shell`
     - `tailwind`
     - `rage_mode`
     - `aerial_strike`
     - `volt_flow`
     - `guardian_scale`
   - added support for:
     - stat multipliers
     - critical-rate bonuses
     - low-HP damage boosts
     - end-of-turn energy restore
     - one-time low-HP heal gates
     - retaliatory status application

3. Battle item hook integration
   - mapped current production battle-item effects into runtime hooks:
     - stat boosts
     - status immunity
     - reward bonus / reward multiplier
     - post-move heal
     - post-move energy restore
   - normalized poison-immunity items so `POISON` protection also covers `BADLY_POISON`

4. Runtime execution wiring
   - battle-start hooks now apply once per combatant through runtime flags
   - move runtime now invokes hook phases during execution so damage/status resolution can consume:
     - ability boosts
     - item modifiers
     - reactive status hooks
     - turn-end sustain hooks

Important scope note:

- this phase integrates the hook framework into the new pure runtime
- it does not yet replace production session orchestration or route flow
- later phases still own:
  - Phase 5 for battle-state engine / turn order
  - Phase 7 for route and persistence migration

Verification completed:

- added/updated `src/lib/game-negamon/__tests__/hook-framework.test.ts`
- `npm.cmd test -- src/lib/game-negamon/__tests__/hook-framework.test.ts src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/formula-core.test.ts` passed
- `npm.cmd run predev` passed

Phase 4 conclusion:

- the rebuild now has a unified ability/item hook layer above the V3 formula and move/status runtime
- current production-style passive modifiers and battle-item effects can be expressed without new `move.id === ...` conditionals
- the next major step is Phase 5 so the new hook-enabled runtime can own turn order, action validation, and full battle state progression

## Phase 5: Battle State Engine And Turn Order

Goal:

- replace `negamon-lite` as the primary turn resolver

Tasks:

- implement action validation
- implement priority/speed ordering
- implement stale-action protection
- implement faint / battle-end resolution
- implement replay event emission

Exit criteria:

- the new engine can run a full 1v1 battle end to end without `negamon-lite`

### Phase 5 State Engine Notes

Status:

- completed on 2026-05-24 for pure battle-state engine scope

Implemented module boundary:

- `src/lib/game-negamon/core/state/`
  - `battle-state-v3.ts`
  - `index.ts`
- `src/lib/game-negamon/core/engine/`
  - `state-engine.ts`
  - `move-runtime.ts` (turn-end control handoff)

What Phase 5 now covers:

1. Explicit V3 battle state
   - added a dedicated `NegamonBattleStateV3` contract under `core/state/`
   - stores:
     - battle id
     - engine version
     - RNG state
     - turn / phase
     - combatant state
     - move-slot PP / cooldown
     - event log
     - `choiceRequestId`
     - `stateVersion`

2. Action validation and stale-request protection
   - added server-style validation for:
     - stale `choiceRequestId`
     - stale `stateVersion`
     - illegal move slot
     - invalid target
     - no PP
     - no energy
     - cooldown lock
     - fainted actor

3. Turn order resolution
   - implemented V3 action ordering using:
     - move priority
     - effective speed after stat stages
     - deterministic RNG tie-break
   - the new resolver can now execute both sides' actions in one owned queue

4. Turn lifecycle ownership
   - refactored move runtime so turn-end processing can be controlled by the state engine
   - V3 engine now owns:
     - action commit
     - per-action runtime resolution
     - end-of-turn hooks
     - end-of-turn status ticks
     - cooldown decrement
     - faint detection
     - battle-end detection

5. Replay / event emission
   - added append-only V3 battle events for:
     - battle start
     - action rejection
     - move use
     - damage / heal
     - status and volatile changes
     - turn skip
     - faint
     - battle end

Important scope note:

- this phase completes the pure V3 state resolver in `core/`
- it does not yet migrate production routes or session persistence to use it
- live route adoption remains Phase 7 work

Verification completed:

- added `src/lib/game-negamon/__tests__/state-engine.test.ts`
- `npm.cmd test -- src/lib/game-negamon/__tests__/state-engine.test.ts src/lib/game-negamon/__tests__/hook-framework.test.ts src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/formula-core.test.ts` passed
- `npm.cmd run predev` passed

Phase 5 conclusion:

- the rebuild now has a full pure turn resolver that can validate, order, resolve, tick turn-end effects, and end a 1v1 battle without `negamon-lite`
- the next step is Phase 6 so opponents can make credible decisions against this new engine

## Phase 6: AI And Opponent Logic

Goal:

- make PvE opponents use the new system credibly

Tasks:

- replace lite scoring logic
- implement move desirability heuristics
- add heal/setup/finisher logic
- add anti-loop safeguards
- validate matchups across the six-species roster

Exit criteria:

- AI does not collapse into obvious spam or dead turns in common matchups

### Phase 6 AI Notes

Status:

- completed on 2026-05-24 for first-pass V3 opponent heuristic scope

Implemented module boundary:

- `src/lib/game-negamon/core/engine/`
  - `ai-engine.ts`

What Phase 6 now covers:

1. V3 move scoring layer
   - added a dedicated AI scorer on top of `NegamonBattleStateV3`
   - AI now evaluates server-style `validChoices` instead of guessing directly from move data

2. Damage / finisher heuristics
   - estimates move value from:
     - predicted damage
     - percent of target HP removed
     - finisher bonus when a move can KO
     - light crit-value bump for high-crit moves

3. Heal / setup / debuff heuristics
   - heal moves gain priority when HP is low and lose value when HP is already healthy
   - setup moves are strongest in early turns and lose value when the fight is already in kill range
   - debuffs/status moves now score separately instead of piggybacking on raw damage only

4. Anti-loop safeguards
   - added repeat penalties using recent move history
   - repeated non-damaging setup loops are penalized heavily
   - repeated damage moves are only lightly penalized so the AI can still finish fights cleanly

5. Action output
   - AI now returns a fully formed V3 action intent:
     - `battleId`
     - `choiceRequestId`
     - `stateVersion`
     - `side`
     - selected move slot / target slot
   - this keeps Phase 7 route integration straightforward

Important scope note:

- this phase adds a credible first-pass heuristic AI
- it is still intentionally simpler than full Pokemon simulator AI
- matchup breadth, route integration, and classroom-scale regression remain later-phase work

Verification completed:

- added `src/lib/game-negamon/__tests__/ai-engine.test.ts`
- `npm.cmd test -- src/lib/game-negamon/__tests__/ai-engine.test.ts src/lib/game-negamon/__tests__/state-engine.test.ts src/lib/game-negamon/__tests__/hook-framework.test.ts src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/formula-core.test.ts` passed
- `npm.cmd run predev` passed

Phase 6 conclusion:

- the rebuild now has a V3 opponent decision layer that can heal, finish, set up, debuff, and avoid trivial setup spam
- the next step is Phase 7 so routes and persisted sessions can start driving real classroom battles through the new engine

## Phase 7: Route, Session, And Persistence Migration

Goal:

- move live routes and sessions onto the new engine safely

Tasks:

- version battle session payloads
- update start/choice/session routes
- preserve legacy session read behavior if needed
- migrate or gate old session formats
- update classroom battle orchestration paths

Exit criteria:

- production routes resolve through the new engine for the target feature flag path

### Phase 7 Migration Notes

Status:

- completed on 2026-05-24 for feature-gated V3 route/session migration scope

Implemented module boundary:

- `src/lib/game-negamon/server/`
  - `battle.ts`
- `src/lib/game-negamon/core/`
  - `session-v3.ts`
- route updates:
  - `src/app/api/classrooms/[id]/battle/lite/start/route.ts`
  - `src/app/api/classrooms/[id]/battle/lite/choice/route.ts`
  - `src/app/api/classrooms/[id]/battle/lite/session/route.ts`

What Phase 7 now covers:

1. Engine version gate
   - added explicit classroom-level engine selection via:
     - `gamifiedSettings.negamon.engineVersion`
   - supported values:
     - `lite`
     - `pokemon_v3`
   - classrooms on `lite` keep the old production path
   - classrooms on `pokemon_v3` now route through the V3 battle stack

2. V3 session payload and parsing
   - added a dedicated V3 session result shape:
     - `mode: "negamon_battle"`
     - `engineVersion: "negamon_v3_pokemon_inspired"`
   - added parse/view helpers for reading active and finished V3 sessions cleanly

3. Start / choice route migration
   - migrated the existing interactive route surface so:
     - `battle/lite/start` can start V3 sessions when the classroom is gated on
     - `battle/lite/choice` can resolve a V3 player move plus V3 AI response
   - kept the HTTP surface stable for current callers while swapping the engine behind the gate

4. Persistence and optimistic locking
   - V3 sessions now persist into `BattleSession.result`
   - retained `interactivePending` and `stateVersion` locking behavior
   - active sessions remain server-authoritative and stale-save safe through the existing optimistic-lock path

5. Reward/progression continuity
   - V3 finished battles now reuse the existing reward/progression/economy pipeline
   - this keeps:
     - gold reward policy
     - progression persistence
     - point history
     - economy ledger writes
     aligned with the rest of Negamon

6. Mixed-engine read compatibility
   - the shared session route can now read both:
     - legacy `negamon_lite` sessions
     - new `negamon_battle` V3 sessions
   - this prevents route-level breakage during partial rollout

Important scope note:

- this phase migrates the start/choice/session production path behind a feature gate
- it does not retire `negamon-lite`
- old classrooms and old sessions remain intentionally readable until Phase 10

Verification completed:

- added `src/__tests__/negamon-v3-session-routes.test.ts`
- `npm.cmd test -- src/lib/game-negamon/__tests__/formula-core.test.ts src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/hook-framework.test.ts src/lib/game-negamon/__tests__/state-engine.test.ts src/lib/game-negamon/__tests__/ai-engine.test.ts src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/negamon-v3-session-routes.test.ts` passed
- `npm.cmd run predev` passed

Phase 7 conclusion:

- the target feature-flag path can now create, resolve, persist, and read V3 battle sessions through the existing classroom API surface
- the next step is Phase 8 so the frontend reflects the richer V3 contract instead of continuing to behave like a lite battle wrapper

## Phase 8: UI Alignment

Goal:

- make battle UI reflect the new server contract cleanly

Tasks:

- update action menu and move cards
- show priority/energy/status/cooldown consistently
- show richer turn logs
- update result and replay surfaces
- remove UI assumptions that depend on `negamon-lite` internals

Exit criteria:

- UI renders entirely from new engine state and valid-choice payloads

### Phase 8 UI Notes

Status:

- completed on 2026-05-24 for battle-arena contract alignment

Implemented UI surface:

- `src/components/negamon/BattleArena.tsx`
- `src/components/negamon/NegamonLiteBattleArena.tsx`
- `src/components/game/negamon/BattleV2Arena.tsx`
- `src/components/game/negamon/ui-content.ts`

What Phase 8 now covers:

1. Shared battle session handling
   - the classroom battle tab now accepts either:
     - legacy `negamon_lite`
     - V3 `negamon_battle`
   - session state and valid choices are stored as a union instead of assuming lite-only payloads

2. Action menu alignment
   - move cards now render from server-provided valid choices instead of assuming `choice.move` always exists
   - V3 move cards now surface:
     - PP
     - energy cost
     - priority
     - cooldown
   - disabled reasons continue to render from server choice reasons

3. Battle header and turn-state alignment
   - the arena now shows engine badge context:
     - `Lite`
     - `V3`
   - V3 sessions now show `stateVersion` alongside turn/request metadata

4. Event log alignment
   - battle event summary helpers now accept both:
     - `NegamonLiteBattleEvent`
     - `NegamonBattleEventV3`
   - the turn log no longer relies on lite-only fields for every event row

5. Client-side battle assumptions removed
   - the battle arena now submits:
     - `moveId` for lite sessions
     - `moveSlot` plus `moveId` for V3 sessions
   - frontend rendering no longer assumes all combatants use the lite stats shape

Verification completed:

- `npm.cmd test -- src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/negamon-v3-session-routes.test.ts` passed
- `npm.cmd run predev` passed

Follow-up note:

- a later `npm.cmd run build` check exposed unrelated pre-existing TypeScript blockers in the V3 core engine path (`hook-framework.ts`, `move-runtime.ts`, then `state-engine.ts`) while validating end-to-end build health
- those blockers are outside the UI contract work itself, so Phase 8 is complete, but Plan 26 should not be considered release-ready until Phase 9 clears full regression/build verification

## Phase 9: Balance, QA, And Release Gate

Goal:

- close the loop before rollout

Tasks:

- targeted unit tests
- matchup simulation suite
- manual classroom QA
- stale-action and session-concurrency QA
- regression check against reward/progression persistence
- release checklist and rollback note

Exit criteria:

- automated and manual QA confirm that the new engine is functionally ready

### Phase 9 Release Gate Notes

Status:

- completed on 2026-05-24 for V3 balance, regression, and release-gate verification

What Phase 9 covered:

1. Build and type gate
   - cleared the remaining V3 type-contract blockers surfaced after Phase 8
   - aligned:
     - `runtime-types.ts` ability ids
     - `monster-snapshot.ts` ability id typing
     - `move-runtime.ts` effect-duration narrowing
     - `state-engine.ts` end-of-battle guards
     - `server/battle.ts` Prisma JSON persistence for V3 session results

2. Automated regression suites
   - V3 core/runtime/session suite passed:
     - `formula-core.test.ts`
     - `move-status-runtime.test.ts`
     - `hook-framework.test.ts`
     - `state-engine.test.ts`
     - `ai-engine.test.ts`
     - `negamon-lite-session-routes.test.ts`
     - `negamon-v3-session-routes.test.ts`
   - content/balance/support suite passed:
     - `battle-balance.test.ts`
     - `battle-engine-v2.test.ts`
     - `content-catalog.test.ts`
     - `monster-snapshot.test.ts`
     - `skill-effects.test.ts`
     - `skill-loadout.test.ts`

3. Build verification
   - `npm.cmd run build` passed end to end after the V3 type-contract fixes
   - `npm.cmd run predev` passed

4. Manual classroom QA rerun
   - switched local `Demo Class 101` to `engineVersion: "pokemon_v3"` for QA coverage
   - verified student-facing V3 roster/profile surface at:
     - `/student/[code]/negamon`
   - verified codex surface at:
     - `/student/[code]/negamon/codex`
   - confirmed runtime content shows the reworked roster (`Voltshade`, `Aerolisk`, `Pyronox`, `Terranoir`, `Tidemaw`, `Lumilune`) instead of legacy species names

5. Session-concurrency and stale-choice QA
   - manual API smoke confirmed:
     - battle start returns `mode: "negamon_battle"`
     - engine version returns `negamon_v3_pokemon_inspired`
     - valid V3 move choice resolves successfully
     - replaying the stale choice request returns `409 STALE_CHOICE`
     - replacement `choiceRequestId` is surfaced correctly with refreshed valid choices

Release conclusion:

- the V3 path is now functionally build-clean and QA-cleared for the current feature-gated rollout path
- the remaining major plan item is not release-gate correctness, but Phase 10 retirement work to remove `negamon-lite` as long-term production authority

Rollback note:

- classrooms can still be returned to `gamifiedSettings.negamon.engineVersion = "lite"` if a targeted rollback is needed
- mixed-engine session reads remain supported, so reverting the classroom flag does not require deleting existing battle-session records

## Phase 10: Legacy Engine Retirement

Goal:

- remove long-term dependence on the old battle core

Tasks:

- identify remaining `negamon-lite` production callers
- remove or isolate old runtime paths
- leave adapters only where backward compatibility is required
- update plan/status docs

Exit criteria:

- `negamon-lite` is no longer the production battle authority for Negamon V2

### Phase 10 Retirement Notes

Status:

- completed on 2026-05-24 for production-authority retirement scope

What Phase 10 changed:

1. Production battle authority moved fully to V3
   - `startNegamonBattle()` now starts V3 battles unconditionally
   - `chooseNegamonBattleMove()` now resolves production actions through V3 only
   - the production write path no longer falls back to `startNegamonLiteBattle()` or `chooseNegamonLiteMove()`

2. Legacy runtime isolated to compatibility-only use
   - `negamon-lite` session payloads are still readable through the shared session route
   - legacy helper/runtime code remains available for:
     - compatibility reads
     - explicit legacy tests
     - migration/reference purposes
   - legacy sessions are no longer accepted as writable production battle sessions

3. Legacy session action behavior
   - if a production action hits an old `negamon_lite` session, the server now returns:
     - `409 LEGACY_SESSION_READ_ONLY`
   - this makes the boundary explicit instead of silently resolving through the old engine

4. Retirement verification
   - route/build verification passed after retirement changes
   - legacy compatibility tests were preserved by moving them to direct helper coverage instead of production route coverage

Verification completed:

- `npm.cmd test -- src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/negamon-v3-session-routes.test.ts` passed
- `npm.cmd run build` passed

Phase 10 conclusion:

- `negamon-lite` remains in the repository as a compatibility/runtime reference layer
- it is no longer the production battle authority for new starts or live action resolution
- Plan 26 is now complete for the intended V3 rebuild and rollout path

## Recommended Build Order

Recommended order of actual implementation:

1. rules/data contract spec
2. formula core
3. move/status runtime
4. ability/item hooks
5. state engine + turn order
6. AI
7. routes/session migration
8. UI alignment
9. QA + release gate
10. legacy retirement

## Risks

- If we only swap formulas but keep the old effect pipeline, the system will stay hard to extend.
- If UI keeps local battle assumptions, engine correctness will drift from what players can click.
- If item/ability hooks are not unified early, move logic will accumulate special-case branches again.
- If session versioning is skipped, live battle retries and resume flows may break silently.
- If we keep both old and new rules active without explicit versioning, debugging will become much harder.

## Validation Checklist

Tasks:

- [x] Approve full subsystem scope for the rebuild
- [x] Approve target architecture and module boundaries
- [x] Freeze battle data contracts
- [x] Implement pure formula core
- [x] Implement move/status runtime
- [x] Implement ability hook system
- [x] Implement battle item hook system
- [x] Implement state engine and turn order resolver
- [x] Upgrade opponent AI
- [x] Migrate battle routes and session payloads
- [x] Align battle UI with the new contract
- [x] Run automated regression and balance suites
- [x] Run manual classroom QA
- [x] Retire or isolate `negamon-lite` production authority

## Definition Of Done

This rebuild is done when:

- the production Negamon battle path no longer depends on `negamon-lite` as its rules authority
- battle outcomes are resolved by a pure Pokemon-inspired engine under `src/lib/game-negamon/core/`
- stats, moves, statuses, abilities, and items interact through one coherent rule system
- routes, UI, and persistence all consume the same battle contract
- the plan checklist reflects verified implementation status
