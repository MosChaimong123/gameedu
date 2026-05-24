# System Plan 27: Negamon Pokemon-Inspired Item Rework

Last updated: 2026-05-24

## Purpose

Plan 26 rebuilt the battle engine into a Pokemon-inspired V3 runtime, but the item layer is still mostly inherited from the older system:

- flat stat boost items
- simple status immunity charms
- reward bonus items mixed into battle loadouts
- no clear separation between held items and usable items

This plan defines the full item-system rework needed to make Negamon items feel native to a modern Pokemon-inspired battle game rather than legacy modifiers attached to the new engine.

## Reference Base

This plan is informed by open-source Pokemon implementations and data models from GitHub:

- [Pokemon Showdown repository](https://github.com/smogon/pokemon-showdown)
- [Pokemon Showdown item data](https://github.com/smogon/pokemon-showdown/blob/master/data/items.ts)
- [Pokemon Showdown simulator core](https://github.com/smogon/pokemon-showdown/tree/master/sim)
- [pret/pokeemerald repository](https://github.com/pret/pokeemerald)
- [pret/pokeemerald item constants](https://github.com/pret/pokeemerald/blob/master/include/constants/items.h)
- [pret/pokeemerald item use logic](https://github.com/pret/pokeemerald/blob/master/src/item_use.c)

Reference takeaways we want to borrow:

- Showdown keeps item behavior data-driven through a per-item registry and runtime hooks
- Pokemon battle design separates passive held effects from active consumable item usage
- item categories matter for UI, inventory, legality, and AI decision logic
- battle items should create turn decisions, survival pivots, and tempo changes, not just permanent flat boosts

Important rule:

- we may reuse architecture patterns and system concepts
- we will not copy Pokemon item names, exact content tables, or proprietary flavor text wholesale

## Product Goal

Students should feel that items are part of battle strategy, not just stat stickers.

The reworked system should make the player ask:

- do I equip a survival item or a damage item
- do I spend my once-per-battle item now or hold it
- do I bring recovery, cleanse, or tempo disruption
- does this monster want crit support, energy support, or sustain

## What "Complete" Means In This Plan

This plan is complete only when all of the following are true:

1. the item system is split into explicit categories with different runtime rules
2. held-item behavior is fully data-driven in V3
3. usable battle items are fully data-driven in V3
4. old flat-boost legacy items are migrated or retired from production loadouts
5. shop, inventory, battle loadout, and reward flows understand the new item model
6. battle UI clearly communicates held items, usable items, and their trigger conditions
7. AI can score usable item actions and held-item synergies
8. tests and manual QA cover the new item layer end to end

## Scope

In scope:

- battle-facing held items
- battle-facing usable consumables
- status cure / cleanse items
- survival / tempo / crit / energy item patterns
- inventory schema changes needed to support item categories
- shop and reward migration for the new taxonomy
- UI and AI support for V3 items

Out of scope for this plan:

- cosmetic frames
- non-battle classroom rewards not tied to the Negamon loop
- open-world consumables
- capture items for a future collection system
- breeding / egg / hatch items

## Current Gap

Current repo state:

- `src/lib/shop-items.ts` still defines one mixed battle item catalog
- many items are stat boosts with legacy-lite flavor
- reward bonus items can sit beside combat-power items in the same loadout concept
- V3 runtime can execute item hooks, but the catalog itself still feels old

This means:

- the engine is more modern than the items it runs
- the UX says "Pokemon-inspired battle", but the item set still says "legacy Negamon buffs"

## Design Principles

### 1. Separate Item Roles Cleanly

The system should distinguish:

- `held` items: equipped before battle, passive or conditional, one slot
- `usable` items: explicitly consumed during battle, limited uses
- `reward` items: progression/economy items, not part of battle loadout power

### 2. Reduce Flat Permanent Math

We should not center the new system on:

- ATK +15%
- DEF +22%
- SPD +28%

Those may still exist in rare cases, but the main set should emphasize:

- survival thresholds
- accuracy / crit support
- energy management
- status recovery
- one-turn shields
- speed swings
- tactical timing

### 3. Favor Readable Battle Decisions

The player should be able to understand:

- what the item does
- when it triggers
- whether it is passive, once-per-battle, or active-use
- whether the item is still available this battle

### 4. Keep First Pass Small

The first release pass should ship a disciplined starter set instead of a giant item dump.

Recommended first-pass target:

- 6 held items
- 6 usable items
- 3 reward-only economy/progression items

## Target Item Taxonomy

### A. Held Items

Passive or conditional effects equipped before battle.

Rules:

- one held item per monster
- persists for the full battle unless explicitly consumed
- may have `battle_start`, `before_move`, `after_move`, `on_damage_taken`, or `turn_end` hooks
- may be once-per-battle through runtime flags

### B. Usable Battle Items

Actively chosen during battle from the command menu.

Rules:

- separate from move choice
- limited by inventory and optional per-battle cap
- consumes an action unless explicitly marked as priority support
- can heal, cleanse, shield, restore energy, or apply controlled tempo effects

### C. Reward / Progression Items

Not part of combat loadout power.

Rules:

- stays in inventory and reward systems
- may affect gold/exp/progression outside live battle authority
- should not occupy the held-item slot

## Proposed First-Pass Item Roster

This starter roster is inspired by Pokemon item roles, but renamed for Negamon and tailored to V3 energy/status rules.

### Held Items

1. `focus_thread`
- role: survival
- effect: if damage would KO from above 1 HP, survive at 1 HP once per battle

2. `scope_prism`
- role: crit offense
- effect: increases crit chance

3. `swift_anklet`
- role: tempo
- effect: grants a speed multiplier at battle start

4. `guard_core`
- role: durability
- effect: reduces incoming damage by a small multiplier

5. `echo_battery`
- role: energy economy
- effect: reduces move energy cost or regenerates a small amount each turn

6. `clear_mind_charm`
- role: status stability
- effect: one-time cleanse or immunity to one disruptive status family

### Usable Battle Items

1. `vital_vial`
- role: healing
- effect: restore HP

2. `charge_capsule`
- role: resource recovery
- effect: restore energy

3. `full_purge`
- role: cleanse
- effect: remove burn, poison, badly poison, sleep, paralyze, stun

4. `mist_shell`
- role: defense tempo
- effect: grant shield / incoming damage reduction for one turn

5. `snare_orb`
- role: control
- effect: lower opponent speed stage

6. `precision_flare`
- role: setup support
- effect: boost the next move's accuracy or crit chance for one turn

### Reward / Progression Items

1. `lucky_coin`
- role: economy
- effect: post-battle gold modifier

2. `scholar_seal`
- role: progression
- effect: post-battle exp modifier

3. `trait_crystal`
- role: growth system
- effect: future trait reroll / refinement currency, not battle loadout power

## Proposed Data Model

## Phase 1: Item Rules And Data Contract Spec

Target schemas:

- `NegamonItemDefinition`
- `NegamonHeldItemEffect`
- `NegamonUsableItemEffect`
- `NegamonRewardItemEffect`
- `NegamonBattleInventorySlot`
- `NegamonBattleItemAction`

Recommended contract:

```ts
type NegamonItemKind = "held" | "usable" | "reward";

type NegamonItemDefinition = {
  id: string;
  kind: NegamonItemKind;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  shopCategory?: "held" | "usable" | "reward";
  stackLimit?: number;
  consumable?: boolean;
  effects: NegamonItemEffect[];
};
```

Design rules:

- held and usable items must not share the same legality path
- reward items must not be valid battle-loadout picks
- item effects must be data-driven, not hardcoded per page

### Phase 1 Contract Freeze

Phase 1 approves the following rules as the contract for the item rework:

#### 1. Canonical Item Kinds

Every production item must belong to exactly one kind:

- `held`
- `usable`
- `reward`

No item may belong to multiple kinds at runtime.

#### 2. Battle Legality Rules

- `held` items are valid in the pre-battle equip slot only
- `usable` items are valid in the battle bag only
- `reward` items are never valid battle actions and never valid held-item equips
- loadout validation must reject kind mismatches explicitly

#### 3. Slot Rules

The first-pass battle item slot contract is:

- `1` held-item slot
- `2` usable-item bag slots
- `0` reward-item battle slots

This becomes the canonical UI and server rule unless later phases revise it explicitly.

#### 4. Inventory Model Direction

Inventory entries should remain stack-aware and item-id based, but item behavior must come from the catalog.

Recommended shape:

```ts
type NegamonInventoryEntry = {
  itemId: string;
  quantity: number;
};
```

Rules:

- quantity matters for `usable` and `reward` items
- quantity is normally `1` for `held` items unless future design allows duplicates in stock
- inventory should not persist copied runtime effects; it should persist only ids and counts

#### 5. Held Item Runtime Contract

Held items must resolve through passive hooks only.

Recommended shape:

```ts
type NegamonHeldItemEffect =
  | { kind: "survive_once"; minHpAfterTrigger: 1; oncePerBattle: true }
  | { kind: "crit_bonus"; percent: number }
  | { kind: "speed_multiplier"; multiplier: number }
  | { kind: "damage_taken_multiplier"; multiplier: number }
  | { kind: "energy_regen"; amount: number; trigger: "turn_end" }
  | { kind: "status_guard"; statuses: NegamonRuntimeStatusId[]; once?: boolean };
```

Rules:

- held items trigger through the V3 hook pipeline
- held items do not create menu actions
- once-per-battle held effects must set runtime flags

#### 6. Usable Item Runtime Contract

Usable items must resolve through explicit player actions.

Recommended shape:

```ts
type NegamonUsableItemEffect =
  | { kind: "heal_hp"; percent?: number; flat?: number }
  | { kind: "restore_energy"; amount: number }
  | { kind: "cleanse_statuses"; statuses?: NegamonRuntimeStatusId[]; allNegative?: boolean }
  | { kind: "grant_shield"; percentReduction: number; durationTurns: number }
  | { kind: "lower_enemy_speed_stage"; stages: number }
  | { kind: "boost_next_move_accuracy"; percent: number; durationTurns: 1 };
```

Rules:

- usable items create action intents
- usable items consume inventory quantity on successful resolution
- usable items consume the turn in first pass
- usable items must appear in replay / event logs as item actions

#### 7. Reward Item Contract

Reward items remain outside battle authority.

Recommended shape:

```ts
type NegamonRewardItemEffect =
  | { kind: "gold_modifier"; flat?: number; multiplier?: number }
  | { kind: "exp_modifier"; multiplier: number }
  | { kind: "progression_currency"; currencyId: "trait_crystal" | "future_core" };
```

Rules:

- reward items cannot be equipped
- reward items cannot be consumed inside V3 battle state
- reward-item effects resolve only in reward/progression pipelines

#### 8. Battle Action Contract

The new action intent shape for usable items should be explicit and version-safe.

Recommended shape:

```ts
type NegamonBattleItemAction = {
  actionType: "use_item";
  battleId: string;
  choiceRequestId: string;
  stateVersion: number;
  itemId: string;
  sourceSide: "player" | "opponent";
  targetSide: "self" | "opponent";
};
```

Rules:

- item actions use the same stale-request protection as move actions
- invalid or unavailable item actions must return the same deterministic validation style as move legality

#### 9. Content Ownership Rule

The item catalog becomes the source of truth for:

- item kind
- rarity
- battle legality
- runtime effect definitions
- shop grouping

Routes, UI, and snapshots must not infer these ad hoc.

#### 10. Phase 1 Conclusion

Phase 1 decision:

- the item system is officially split into `held`, `usable`, and `reward`
- reward items are removed from battle-loadout power space at the contract level
- usable items are first-class V3 actions, not passive pseudo-items
- held items remain passive hooks in the V3 engine

This is enough to begin Phase 2 and Phase 3 safely without re-arguing item identity later.

## Phase 2: Taxonomy And Naming Spec

Decide and freeze:

- naming direction for all first-pass items
- visual icon system for held vs usable vs reward items
- rarity distribution
- first-pass slot limits

Recommended first-pass slot rules:

- held item slots: `1`
- usable item slots in battle bag: `2`
- per-turn usable item action limit: `1`
- total usable item activations per battle: `2`

### Phase 2 Naming Direction

Phase 2 approves the following naming rules for the item system:

#### 1. Tone

Item names should feel:

- readable for students
- fantasy-adjacent
- battle-clear before lore-heavy
- shorter and cleaner than the legacy buff-item naming style

The naming style should feel Pokemon-inspired in structure, but still belong to Negamon.

#### 2. Naming Pattern By Kind

Held items:

- compact noun phrases
- feel like equipment, charms, relics, or battle gear
- examples:
  - `Focus Thread`
  - `Scope Prism`
  - `Swift Anklet`
  - `Guard Core`

Usable items:

- should sound consumable or activatable
- often use vial/capsule/orb/shell/flare style wording
- examples:
  - `Vital Vial`
  - `Charge Capsule`
  - `Mist Shell`

Reward items:

- should sound like currencies, seals, emblems, or progression artifacts
- examples:
  - `Lucky Coin`
  - `Scholar Seal`
  - `Trait Crystal`

#### 3. ID Pattern

Canonical ids should be:

- lowercase
- underscore-separated
- stable across localization

Recommended prefixes:

- held: `held_*`
- usable: `use_*`
- reward: `reward_*`

Examples:

- `held_focus_thread`
- `held_scope_prism`
- `use_vital_vial`
- `use_full_purge`
- `reward_lucky_coin`

Rule:

- legacy `item_*` ids may remain readable during migration
- new production-facing ids should use kind-specific prefixes

#### 4. Shop Taxonomy

The new shop grouping is frozen as:

- `held`
- `usable`
- `reward`

Optional sub-groups inside those buckets:

Held:

- `offense`
- `defense`
- `tempo`
- `resource`
- `status`

Usable:

- `heal`
- `energy`
- `cleanse`
- `shield`
- `control`
- `setup`

Reward:

- `economy`
- `progression`
- `future_system`

#### 5. Rarity Distribution

First-pass rarity guidance is frozen as:

- `common`: baseline recovery / simple utility
- `rare`: stronger tactical effects / better passive support
- `epic`: high-impact survival or tempo items
- `legendary`: limited first-pass use; reserved for system-defining items only

Recommended first-pass distribution:

- held items:
  - 2 common
  - 3 rare
  - 1 epic
- usable items:
  - 3 common
  - 2 rare
  - 1 epic
- reward items:
  - 1 common
  - 1 rare
  - 1 epic

Rule:

- first pass should avoid a large legendary pool
- legendary should mean special, not merely expensive

#### 6. Icon Direction

The visual icon rule is frozen as:

- held items use emblem/gear/charm silhouettes
- usable items use bottle/capsule/orb/shell silhouettes
- reward items use coin/seal/crystal silhouettes

UI distinction rule:

- held item icons should read as passive equipment
- usable item icons should read as consumables
- reward item icons should not visually resemble battle-slot items

#### 7. First-Pass Slot Rules

Phase 2 confirms these slot rules as approved:

- held item slots: `1`
- usable item bag slots: `2`
- per-turn usable item actions: `1`
- total usable item activations per battle: `2`

These become the default design assumption for Phase 3-8 unless later QA forces a revision.

#### 8. Phase 2 Conclusion

Phase 2 decision:

- the item taxonomy is frozen for production design
- naming direction is clean, short, and kind-specific
- new production ids will move away from generic `item_*`
- shop and UI should present item kinds as separate mental models, not one mixed list

## Phase 3: Catalog And Registry Rebuild

Primary file targets:

- `src/lib/shop-items.ts`
- `src/lib/game-negamon/core/battle-items.ts`
- `src/lib/game-negamon/core/content/catalog.ts`

Implementation goals:

- replace the old mixed catalog with explicit `held`, `usable`, and `reward` kinds
- keep legacy ids readable only through migration helpers
- remove legacy production authority from old stat-only items

Done only when:

- the item catalog is one canonical source
- reward-only items cannot be equipped as held items
- the content catalog exposes held and usable items distinctly

### Phase 3 Rebuild Strategy

Phase 3 is where the old mixed item table stops being the production source of truth.

The rebuild should move the repo from:

- one legacy-flavored battle item list

to:

- one canonical item registry with explicit kind, slot legality, and runtime semantics

#### 1. Canonical Registry Direction

The production registry should define every item with:

- stable id
- kind
- rarity
- shop group
- runtime effects
- migration aliases if needed

Recommended target shape:

```ts
type NegamonItemRegistry = Record<string, NegamonItemDefinition>;
```

Recommended helper APIs:

- `getNegamonItemById(id)`
- `getNegamonHeldItemCatalog()`
- `getNegamonUsableItemCatalog()`
- `getNegamonRewardItemCatalog()`
- `getNegamonShopItemCatalog()`
- `resolveNegamonLegacyItemAlias(id)`

#### 2. File Ownership Plan

Recommended ownership split:

- `src/lib/shop-items.ts`
  - stop being the gameplay source of truth
  - either become a shop-facing adapter or be replaced by item-registry imports

- `src/lib/game-negamon/core/battle-items.ts`
  - stop assuming one mixed battle-item concept
  - become a typed adapter over the canonical registry

- `src/lib/game-negamon/core/content/catalog.ts`
  - publish held, usable, and reward items distinctly
  - expose only battle-legal item pools to battle-facing systems

Recommended new module direction:

- `src/lib/game-negamon/core/data/items.ts`
  - canonical item definitions
- `src/lib/game-negamon/core/data/item-registry.ts`
  - lookup helpers, aliases, category selectors

Phase 3 may either introduce these new files directly or keep the same filenames with cleaner boundaries. The important thing is contract ownership, not exact filenames.

#### 3. First-Pass Production Registry

The first production registry should contain exactly these approved starter items:

Held:

- `held_focus_thread`
- `held_scope_prism`
- `held_swift_anklet`
- `held_guard_core`
- `held_echo_battery`
- `held_clear_mind_charm`

Usable:

- `use_vital_vial`
- `use_charge_capsule`
- `use_full_purge`
- `use_mist_shell`
- `use_snare_orb`
- `use_precision_flare`

Reward:

- `reward_lucky_coin`
- `reward_scholar_seal`
- `reward_trait_crystal`

Rule:

- no legacy `item_*` id should be used for new content authoring after Phase 3 begins

#### 4. Legacy Alias Layer

The registry rebuild must preserve safe reads for legacy inventories and loadouts.

Recommended alias table direction:

```ts
type NegamonLegacyItemAlias = {
  legacyId: string;
  replacementId: string;
  migrationMode: "direct_replace" | "reward_reclassify" | "invalidate";
};
```

Recommended alias decisions:

- `item_buckler` -> `held_guard_core`
- `item_iron_shield` -> `held_guard_core`
- `item_aegis_plate` -> `held_guard_core`
- `item_wind_thread` -> `held_swift_anklet`
- `item_swift_feather` -> `held_swift_anklet`
- `item_gale_plume` -> `held_swift_anklet`
- `item_spark_charm` -> `held_scope_prism` or future offense held item
- `item_ember_charm` -> `held_scope_prism` or future offense held item
- `item_inferno_talisman` -> `held_scope_prism` or future offense held item
- `item_minor_potion` -> `use_vital_vial`
- `item_energy_orb` -> `use_charge_capsule`
- `item_antidote_charm` -> `held_clear_mind_charm` or `use_full_purge`
- `item_flame_ward` -> `held_clear_mind_charm` or `use_full_purge`
- `item_dream_bell` -> `held_clear_mind_charm` or `use_full_purge`
- `item_lucky_coin` -> `reward_lucky_coin`
- `item_merchants_sigil` -> `reward_lucky_coin` or invalidate if redundant

Phase 3 task:

- freeze which of those are `direct_replace`
- freeze which require `reward_reclassify`
- freeze which should be invalidated instead of auto-converted

#### 5. Content Catalog Publishing Rules

The content catalog should publish item views separately:

- `catalog.heldItems`
- `catalog.usableItems`
- `catalog.rewardItems`

If a unified `catalog.items` is retained for convenience, each entry must still expose:

- `kind`
- `battleLegal`
- `shopGroup`
- `migrationAliases`

Battle-facing systems must not filter by inference.

#### 6. Loadout Validation Rules

After the registry rebuild:

- held-item validation accepts only one `held` item
- usable bag validation accepts only `usable` items up to the configured cap
- reward items fail validation immediately
- legacy items are normalized through alias resolution before final legality checks

This legality layer must be shared by:

- loadout routes
- battle session creation
- student dashboard editing flows

#### 7. Shop And Reward Publishing Rules

The shop should no longer show one undifferentiated battle item list.

Required publishing behavior:

- held items appear in the held category
- usable items appear in the usable category
- reward items appear only where reward/progression inventory makes sense

Reward pipelines should grant ids from the new registry only.

#### 8. Phase 3 Exit Notes

Phase 3 is not done when the MD says the new ids exist.

Phase 3 is done only when:

- the old mixed production item table is no longer authoritative
- new authoring uses the new ids exclusively
- battle, inventory, and reward systems all read from the same canonical registry
- legacy ids can still be read safely during migration

## Phase 4: Held Item Runtime

Primary file targets:

- `src/lib/game-negamon/core/engine/hook-framework.ts`
- `src/lib/game-negamon/core/engine/runtime-types.ts`
- `src/lib/game-negamon/core/engine/state-engine.ts`

Required support:

- battle-start stat or rule hooks
- conditional once-per-battle survival hooks
- crit support hooks
- passive damage reduction hooks
- energy economy hooks
- hook flags to prevent repeat triggers

First-pass held effect families:

- `survive_once`
- `crit_bonus`
- `speed_multiplier`
- `damage_taken_multiplier`
- `energy_regen`
- `status_guard`

### Phase 4 Runtime Design

Phase 4 defines how held items behave inside the V3 battle engine.

The goal is to make held items:

- passive
- deterministic
- testable
- readable in battle logs

Held items should feel like equipment choices, not hidden script magic.

#### 1. Runtime Ownership

Held item logic should live in the V3 runtime hook path, not in page logic and not in route-specific branching.

Recommended runtime ownership:

- `hook-framework.ts`
  - item hook resolution
  - once-per-battle flags
  - trigger dispatch

- `runtime-types.ts`
  - held-item runtime fields
  - trigger flags
  - pending effect metadata if needed

- `state-engine.ts`
  - battle-start trigger timing
  - turn-end trigger timing
  - item-trigger replay event emission

#### 2. Trigger Timing Rules

Held items may use only approved trigger windows in first pass:

- `battle_start`
- `before_move`
- `after_move`
- `on_damage_taken`
- `turn_end`

Trigger rules:

- `battle_start`
  - apply passive multipliers, immunities, baseline setup effects

- `before_move`
  - apply crit support or next-move modifiers

- `after_move`
  - apply post-action cleanup if explicitly designed

- `on_damage_taken`
  - resolve survival items and reactive defense items

- `turn_end`
  - resolve energy regeneration or delayed sustain effects

No held item in first pass should create a new trigger window outside these five.

#### 3. Event Logging Rules

Every held item trigger that changes battle state should emit a replay/timeline event.

Recommended event shape addition:

```ts
type NegamonBattleEventV3 =
  | {
      kind: "item_triggered";
      itemId: string;
      itemKind: "held";
      actorSide: "player" | "opponent";
      message: string;
    }
  | ...
```

Logging rule:

- if a held item changes HP, damage, crit rate, energy, or status legality, it must be visible in the battle event stream

#### 4. Once-Per-Battle State

Certain held items must trigger once only.

Recommended runtime flag direction:

```ts
type NegamonRuntimeHookFlags = Record<string, boolean>;
```

Examples:

- `item:held_focus_thread:used`
- `item:held_clear_mind_charm:used`

Rules:

- once-per-battle items must use explicit flags
- flags belong to the combatant runtime state
- flags must survive until battle end but not persist back into long-term inventory state

#### 5. First-Pass Held Item Behaviors

##### `held_focus_thread`

Role:

- survival item

Behavior:

- if incoming damage would reduce HP from above `1` to `0`
- survive at `1 HP`
- trigger once per battle

Trigger:

- `on_damage_taken`

Notes:

- should not trigger if already at `1 HP`
- should not stack with another survival held item in first pass because only one held slot exists

##### `held_scope_prism`

Role:

- crit offense

Behavior:

- increase crit chance by a fixed percent or crit stage equivalent

Trigger:

- `before_move`

Notes:

- should affect damaging moves only
- should not alter heal/status-only moves

##### `held_swift_anklet`

Role:

- tempo opener

Behavior:

- apply speed multiplier at battle start

Trigger:

- `battle_start`

Notes:

- use a small stable multiplier
- should be weaker than a full move-based speed setup

##### `held_guard_core`

Role:

- durability

Behavior:

- reduce incoming damage by a small multiplier

Trigger:

- `on_damage_taken`

Notes:

- damage reduction should be globally readable and easy to test
- avoid stacking too many different passive reductions in first pass

##### `held_echo_battery`

Role:

- energy sustain

Behavior:

- restore a small amount of energy at turn end
  or
- reduce move energy cost through a predictable rule

Preferred first pass:

- `turn_end` energy regeneration

Reason:

- easier to explain
- easier to log
- easier to test than hidden cost reduction

##### `held_clear_mind_charm`

Role:

- status stability

Behavior options:

- full immunity to a limited status family
  or
- one-time cleanse when a negative status lands

Preferred first pass:

- one-time cleanse or immunity to one disruptive family, not all statuses globally

Reason:

- keeps the item useful without becoming a universal answer

#### 6. Runtime Guardrails

Held items must obey these first-pass limits:

- no item should rewrite move targeting rules
- no item should create extra turns
- no item should bypass stale-request validation
- no item should hard-counter all status categories at once
- no item should create invisible multipliers without event logs

#### 7. Interaction With Abilities

Held items and passive abilities share the same hook engine, so ordering must be frozen.

Recommended first-pass ordering:

1. battle-start ability hooks
2. battle-start held-item hooks
3. before-move ability hooks
4. before-move held-item hooks
5. move resolution
6. on-damage ability hooks
7. on-damage held-item hooks
8. turn-end ability hooks
9. turn-end held-item hooks

Reason:

- ability identity stays primary
- held items feel supportive, not dominant

#### 8. Testing Targets For Phase 4

Required automated assertions:

- `held_focus_thread` saves from KO once only
- `held_scope_prism` increases crit outcome rate
- `held_swift_anklet` changes speed ordering at battle start
- `held_guard_core` reduces incoming damage deterministically
- `held_echo_battery` restores energy at turn end
- `held_clear_mind_charm` applies its chosen status rule exactly once or exactly to its allowed family

Required regression checks:

- hook flags do not leak between battles
- battle logs contain held-item trigger events
- held items do not apply when the wrong trigger window fires

#### 9. Phase 4 Exit Notes

Phase 4 is not complete when the item names exist.

Phase 4 is complete only when:

- held-item effects resolve through V3 runtime hooks
- their timing is deterministic
- once-per-battle logic is enforced
- replay logs show the effects clearly
- automated tests prove the core behaviors

## Phase 5: Usable Item Runtime

Primary file targets:

- `src/lib/game-negamon/core/state/battle-state-v3.ts`
- `src/lib/game-negamon/core/engine/state-engine.ts`
- `src/lib/game-negamon/core/engine/move-runtime.ts`
- `src/lib/game-negamon/server/battle.ts`

Required support:

- usable item action intents
- server legality checks for bag counts and turn limits
- item resolution events in replay log
- item consumption persistence
- interaction with move priority and stale choices

First-pass usable effect families:

- `heal_hp`
- `restore_energy`
- `cleanse_statuses`
- `grant_shield`
- `lower_enemy_speed_stage`
- `boost_next_move_accuracy`

Important battle rule decision:

- first pass recommendation: using a usable item consumes the turn
- exceptions should be avoided until the base system is stable

### Phase 5 Runtime Design

Phase 5 defines how usable items work as explicit battle actions inside V3.

The goal is to make usable items:

- visible choices
- deterministic server actions
- limited resources
- easy to understand in logs and UI

Usable items should feel like tactical decisions, not hidden passive modifiers.

#### 1. Action Model

Usable items must be first-class action intents, parallel to move actions.

Recommended action families:

- `use_item_on_self`
- `use_item_on_enemy`

Recommended first-pass simplification:

- all first-pass usable items target either `self` or `opponent`
- no ally-targeting because V3 is still 1v1

Recommended contract direction:

```ts
type NegamonBattleActionIntentV3 =
  | {
      actionType: "move";
      ...
    }
  | {
      actionType: "use_item";
      battleId: string;
      choiceRequestId: string;
      stateVersion: number;
      itemId: string;
      sourceSide: "player" | "opponent";
      targetSide: "self" | "opponent";
    };
```

#### 2. State Ownership

Usable-item runtime needs explicit state in V3.

Recommended state additions:

- bag slots or usable item ids on each side
- remaining quantity per item for the current battle
- total activations used this battle
- whether the side has already spent its action this turn

Recommended state direction:

```ts
type NegamonBattleUsableItemSlotV3 = {
  itemId: string;
  quantity: number;
  enabled: boolean;
};
```

Per-side state should expose:

- `usableItemSlots`
- `usableItemActivationsUsed`

#### 3. Validation Rules

A usable-item action is legal only if:

- the acting side is not fainted
- the battle is in `choosing`
- `choiceRequestId` matches current state
- `stateVersion` is current
- the item exists in the current side's usable bag
- the item quantity is greater than `0`
- the item is valid for the chosen target side
- the side has not exceeded per-battle activation limits

Recommended validation result behavior:

- mirror move validation style
- return deterministic error codes
- include fresh valid choices when stale or invalid

Suggested error codes:

- `ITEM_NOT_IN_BAG`
- `ITEM_DEPLETED`
- `ITEM_TARGET_INVALID`
- `ITEM_LIMIT_REACHED`
- `STALE_REQUEST`
- `BATTLE_ENDED`

#### 4. Turn Consumption Rule

Phase 5 freezes the first-pass action economy:

- using a usable item consumes the turn
- usable items do not also allow a move on the same turn
- no free-action support item exceptions in first pass

Reason:

- easier AI
- easier QA
- prevents tempo abuse during first rollout

#### 5. Replay And Timeline Events

Usable item actions must be visible in the battle event stream.

Recommended event additions:

```ts
type NegamonBattleEventV3 =
  | {
      kind: "item_used";
      itemId: string;
      actorSide: "player" | "opponent";
      targetSide: "player" | "opponent";
      message: string;
    }
  | {
      kind: "item_depleted";
      itemId: string;
      actorSide: "player" | "opponent";
      message: string;
    }
  | ...
```

Rules:

- the log must show who used the item
- the log must show the affected side
- healing, cleanse, shield, and stage changes should still emit their normal battle effects too

#### 6. First-Pass Usable Item Behaviors

##### `use_vital_vial`

Role:

- HP recovery

Behavior:

- restore HP by a fixed percent or flat amount

Target:

- `self`

Trigger model:

- action resolution on item use

##### `use_charge_capsule`

Role:

- energy recovery

Behavior:

- restore energy immediately

Target:

- `self`

##### `use_full_purge`

Role:

- negative status cleanse

Behavior:

- remove negative statuses from self

Target:

- `self`

Allowed first-pass cleanses:

- `BURN`
- `POISON`
- `BADLY_POISON`
- `SLEEP`
- `PARALYZE`
- `STUN`

##### `use_mist_shell`

Role:

- emergency defense / tempo

Behavior:

- grant shield or incoming damage reduction volatile for one turn

Target:

- `self`

##### `use_snare_orb`

Role:

- control item

Behavior:

- reduce opponent speed stage

Target:

- `opponent`

Notes:

- must respect target validity and immunity logic if any exist later

##### `use_precision_flare`

Role:

- setup support

Behavior:

- grant a one-turn accuracy bonus or focus-style next-move support

Target:

- `self`

Preferred implementation:

- apply a volatile state that the next move resolution consumes

#### 7. Runtime Resolution Rules

Usable item effects should resolve through the V3 engine, not ad hoc route branching.

Recommended ownership split:

- `state-engine.ts`
  - validate item action
  - spend the action
  - decrement quantity
  - emit item action events

- `move-runtime.ts` or a dedicated item runtime file
  - resolve effect payloads
  - apply HP / energy / status / shield / stage changes

Recommended new module direction:

- `src/lib/game-negamon/core/engine/item-runtime.ts`

This is optional, but likely cleaner than overloading move runtime with item-only logic.

#### 8. AI Expectations

Even before full balance pass, the action model must be AI-readable.

Usable items should expose enough metadata for AI scoring:

- item role
- target side
- heal amount or energy amount
- cleanse scope
- stage effect value

This is necessary so later AI work does not need custom string heuristics.

#### 9. Inventory Consumption Rules

On successful item use:

- battle quantity decreases immediately
- session state reflects the new remaining quantity
- persistence marks the item as consumed for battle inventory accounting

On invalid item use:

- no quantity is spent
- no replay action is committed

On battle end:

- session summary should include consumed usable item ids and counts

#### 10. Testing Targets For Phase 5

Required automated assertions:

- self-heal item restores HP and consumes turn
- energy item restores energy and consumes quantity
- cleanse item removes allowed negative statuses only
- shield item grants the expected volatile or reduction
- control item lowers target speed stage
- setup item applies the expected next-move support state

Required validation tests:

- stale item request rejected
- empty quantity rejected
- invalid target rejected
- item activation cap enforced

Required session tests:

- usable item choices appear in valid choices
- replay logs include `item_used`
- consumed quantities survive through the session summary

#### 11. Phase 5 Exit Notes

Phase 5 is complete only when:

- usable items are selectable V3 actions
- legality is deterministic
- turn consumption is enforced
- quantities decrement correctly
- replay/state/session outputs represent item usage clearly

## Phase 6: Inventory, Shop, Reward, And Migration

Primary file targets:

- `src/app/api/student/[code]/shop/buy/route.ts`
- `src/app/api/student/[code]/battle-loadout/route.ts`
- `src/lib/game-shop/*`
- `src/lib/negamon-compat.ts`

Must define:

- how held items are equipped
- how usable items are stocked for battle
- how reward items stay out of battle slots
- how old item ids map into new categories

Migration strategy:

1. keep legacy ids readable
2. map legacy stat-boost items into new held-item replacements where reasonable
3. map old reward bonus items into reward-only classification
4. invalidate impossible loadouts cleanly instead of silently corrupting them

Likely legacy mapping direction:

- `item_buckler`, `item_iron_shield`, `item_aegis_plate` -> `guard_core`
- `item_wind_thread`, `item_swift_feather`, `item_gale_plume` -> `swift_anklet`
- `item_spark_charm`, `item_ember_charm`, `item_inferno_talisman` -> `scope_prism` or a future offense held item
- `item_minor_potion` -> `vital_vial`
- `item_energy_orb` -> `charge_capsule`
- `item_antidote_charm`, `item_flame_ward`, `item_dream_bell` -> `clear_mind_charm` or `full_purge` depending on role split
- `item_lucky_coin` -> reward-only `lucky_coin`
- `item_merchants_sigil` -> reward-only economy item or retired if redundant

### Phase 6 System Ownership

Phase 6 is the bridge between the new V3 item model and the rest of the game systems.

The main objective is to make sure:

- inventory knows item kinds
- shop knows how to sell them
- loadout knows what can be equipped
- reward flow knows what belongs in battle and what does not
- legacy student data can be normalized safely

#### 1. Ownership Rules

The canonical item registry becomes the source of truth for:

- kind
- rarity
- shop grouping
- battle legality
- migration aliases

Inventory and reward systems should persist only:

- item ids
- quantities
- optionally metadata needed for migration or audit

They should not persist copied item behavior payloads.

#### 2. Inventory Contract Direction

Recommended persistent inventory shape:

```ts
type NegamonInventoryEntry = {
  itemId: string;
  quantity: number;
};
```

Recommended runtime selectors:

- `getHeldItemsFromInventory(entries)`
- `getUsableItemsFromInventory(entries)`
- `getRewardItemsFromInventory(entries)`

Inventory rules:

- held items may exist in stock but only one can be equipped
- usable items may stack by quantity
- reward items may stack by quantity
- unknown legacy ids should be normalized through alias resolution before UI or battle logic consumes them

#### 3. Battle Loadout Contract

The old single battle-loadout concept should be split.

Recommended target shape:

```ts
type NegamonBattleLoadout = {
  heldItemId: string | null;
  usableItemIds: string[];
};
```

Rules:

- `heldItemId` must be `null` or a `held` item
- `usableItemIds` may contain only `usable` items
- `usableItemIds.length <= 2` in first pass
- `reward` items are never legal in either field

Compatibility rule:

- old loadout arrays must be normalized into the new structure before validation completes

#### 4. Shop Publishing Rules

The shop must stop showing one undifferentiated battle-item list.

Required shop sections:

- held items
- usable items
- reward/progression items

Purchase rules:

- buying a held item grants stock, not automatic equip
- buying a usable item increases quantity
- buying a reward item increases quantity but does not place it into battle loadout options

Price design direction:

- held items should usually cost more than common usable items
- reward items should be priced by progression utility, not battle slot pressure

#### 5. Reward Pipeline Rules

Reward systems must become item-kind aware.

Affected flows include:

- battle rewards
- quest rewards
- attendance rewards
- classroom scripted rewards

Rules:

- reward pipelines should grant new ids only
- reward items should remain reward-classified
- if a battle-facing usable item is granted as a reward, it should still be stored as `usable`, not transformed into a pseudo-reward class

Recommended reward publishing helpers:

- `grantNegamonItemReward(itemId, quantity)`
- `normalizeGrantedNegamonItemReward(itemId)`

#### 6. Legacy Alias Resolution

Legacy ids must be readable during migration.

Recommended normalization flow:

1. read inventory / loadout / reward data
2. resolve legacy alias if present
3. determine target kind
4. run legality checks against the new registry
5. emit normalized data or explicit rejection

Recommended alias modes:

- `direct_replace`
  - old item becomes a new equivalent item
- `reward_reclassify`
  - old battle-loadout item becomes a reward-only item
- `invalidate`
  - old item cannot map safely and must be removed from battle slots

#### 7. Recommended Legacy Mapping Freeze

The recommended first-pass mapping is:

- `item_buckler` -> `held_guard_core` (`direct_replace`)
- `item_iron_shield` -> `held_guard_core` (`direct_replace`)
- `item_aegis_plate` -> `held_guard_core` (`direct_replace`)

- `item_wind_thread` -> `held_swift_anklet` (`direct_replace`)
- `item_swift_feather` -> `held_swift_anklet` (`direct_replace`)
- `item_gale_plume` -> `held_swift_anklet` (`direct_replace`)

- `item_spark_charm` -> `held_scope_prism` (`direct_replace`)
- `item_ember_charm` -> `held_scope_prism` (`direct_replace`)
- `item_inferno_talisman` -> `held_scope_prism` (`direct_replace`)

- `item_minor_potion` -> `use_vital_vial` (`direct_replace`)
- `item_energy_orb` -> `use_charge_capsule` (`direct_replace`)

- `item_antidote_charm` -> `held_clear_mind_charm` (`direct_replace`)
- `item_flame_ward` -> `held_clear_mind_charm` (`direct_replace`)
- `item_dream_bell` -> `held_clear_mind_charm` (`direct_replace`)

- `item_lucky_coin` -> `reward_lucky_coin` (`reward_reclassify`)
- `item_merchants_sigil` -> `reward_lucky_coin` (`reward_reclassify`) or `invalidate` if balance says it should disappear

This is not yet code approval for every balance decision, but it is the recommended migration baseline.

#### 8. Normalization Behavior For Existing Students

When reading existing student data:

- normalize legacy inventory ids into new ids
- normalize old battle-loadout arrays into:
  - one held item
  - up to two usable items
- if too many items remain legal after conversion, keep the earliest valid subset and flag the rest for cleanup notes

Recommended cleanup priority:

1. preserve one held item if available
2. preserve up to two usable items
3. remove reward-only items from battle loadout
4. preserve inventory quantity separately

#### 9. Route And Service Touchpoints

Expected implementation surfaces:

- shop buy route
- loadout set route
- session battle creation flow
- reward grant helpers
- student dashboard data assembly

All of these should use shared normalization helpers rather than duplicating rules.

Recommended helper module direction:

- `src/lib/game-negamon/core/item-normalization.ts`
- `src/lib/game-negamon/core/item-loadout.ts`

Suggested helpers:

- `normalizeNegamonInventoryEntries()`
- `normalizeNegamonBattleLoadout()`
- `resolveNegamonLegacyItemAlias()`
- `partitionNegamonItemsByKind()`

#### 10. Rollout Strategy

Recommended rollout order:

1. land canonical registry
2. land alias resolver
3. normalize inventory reads
4. normalize loadout reads/writes
5. switch shop publishing to new categories
6. switch reward grants to new ids
7. run migration QA on demo classroom data

This order minimizes the chance that UI and persistence disagree about item kinds.

#### 11. Required Tests For Phase 6

Automated tests should prove:

- legacy inventory ids normalize correctly
- reward-only items are rejected from loadout
- held/usable partitioning is deterministic
- shop outputs the right categories
- reward grants store the right item kinds
- session creation receives normalized held and usable data

Migration tests should include:

- students with only legacy held-style items
- students with reward bonus items in old loadouts
- mixed inventory with duplicates
- invalid or unknown ids

#### 12. Phase 6 Exit Notes

Phase 6 is complete only when:

- inventory, shop, reward, and loadout all read from the same item registry
- old mixed battle-loadout behavior is gone
- legacy ids remain readable during migration
- reward items no longer leak into battle slots

## Phase 7: UI Alignment

Primary file targets:

- `src/components/game/negamon/InventoryItemPanel.tsx`
- `src/components/game/negamon/SkillLoadoutPanel.tsx`
- `src/components/negamon/NegamonLiteBattleArena.tsx`
- `src/components/negamon/BattleArena.tsx`
- student inventory and shop surfaces

UI must clearly show:

- held item slot
- usable item bag
- reward items
- item remaining uses
- whether the item is passive, active, once-per-battle, or consumed

Done only when:

- students cannot confuse held items with consumables
- battle menus expose usable items without clutter
- item trigger feedback appears in the battle timeline

### Phase 7 UI Design Goals

The item UI must make the new system feel obvious at a glance.

The player should immediately understand:

- what is equipped
- what can be used during battle
- what is just inventory or reward stock
- what has already been consumed this battle

The UI should stop presenting all items as one blended concept.

#### 1. Core UI Separation

The interface should present three clearly different surfaces:

- `Held Item`
- `Battle Bag`
- `Reward Inventory`

Rules:

- held item appears as a single-slot equipment surface
- usable items appear as battle bag slots with quantity
- reward items appear in inventory/progression surfaces only

Reward items should never look like equipable battle power.

#### 2. Inventory Screen Requirements

The inventory UI should be grouped by kind:

- held
- usable
- reward

Each row/card should show:

- icon
- name
- short description
- rarity
- quantity
- kind badge

Held item UX:

- show `equipped` state clearly
- allow equip / unequip
- do not show stack-style battle quantity emphasis

Usable item UX:

- show quantity prominently
- show short action summary such as `restore HP`, `restore energy`, `cleanse`, `shield`

Reward item UX:

- show quantity and purpose
- do not show battle-slot actions

#### 3. Battle Loadout Screen Requirements

The old loadout editor must be visually split into:

- one held-item slot
- two usable item slots

Recommended behavior:

- held slot renders as a dedicated equipment tile
- usable slots render as bag slots with quantity source
- reward items are absent from selection lists

Validation messaging:

- if the player tries to equip the wrong kind, show a kind-specific error
- if no held item is equipped, show an empty slot state rather than implying a bug

#### 4. Battle UI Requirements

The battle screen must expose usable items as a distinct command path, not as passive hidden data.

Recommended battle interaction:

- main action choice includes `Moves` and `Items`
- selecting `Items` opens only usable items from the current battle bag
- each usable item shows:
  - name
  - quantity remaining
  - target type
  - short effect summary

Held items in battle UI:

- do not need their own command menu
- should appear in a passive equipment summary area or combatant detail panel

#### 5. Timeline And Feedback Requirements

When an item triggers or is used, the player should see readable battle feedback.

Required feedback examples:

- `Pyronox used Vital Vial.`
- `Aerolisk restored 60 HP.`
- `Voltshade's Focus Thread activated.`
- `Tidemaw's Guard Core reduced damage.`

Rules:

- held triggers should be visible but lightweight
- usable actions should be visibly distinct from move actions
- item depletion should be understandable without opening another panel

#### 6. Shop UI Requirements

The shop should no longer show one generic battle-item list.

Required shop sections:

- Held Items
- Usable Items
- Reward / Progression Items

Each section should feel purpose-built:

- held items emphasize equip role
- usable items emphasize tactical use
- reward items emphasize long-term value

Purchase affordances:

- held items -> `Buy`
- usable items -> `Buy`
- reward items -> `Buy`

Post-purchase behavior:

- held item purchase does not auto-equip unless explicitly designed later
- usable and reward items update quantities

#### 7. Profile And Monster Panel Requirements

Monster profile surfaces should show:

- current held item
- battle bag summary if relevant
- no reward items mixed into combat profile power

If space is tight:

- show held item only on compact surfaces
- show full usable bag on detailed panels

#### 8. Empty State Rules

The UI must handle empty states cleanly.

Examples:

- no held item equipped
- no usable items stocked
- no reward items yet

Rules:

- empty states should read as intentional, not broken
- do not show reward items as disabled equip slots
- do not show legacy names if normalized items exist

#### 9. Mobile And Desktop Expectations

Mobile:

- held slot remains visible without wrapping into confusion
- usable bag slots remain readable at narrow widths
- quantity text does not overflow

Desktop:

- inventory groups can sit side by side or in clear vertical bands
- battle bag and held slot should scan quickly without giant wasted whitespace

Phase 7 should verify at minimum:

- `390px`
- `768px`
- `1366px`

#### 10. Accessibility And Clarity Rules

Do not rely only on color to explain item type.

Each item should communicate kind through:

- label
- position
- icon style
- slot context

Tooltips or secondary copy may explain unfamiliar item names, but the core function should be inferable from the card itself.

#### 11. Recommended File Touchpoints

Likely UI files to update:

- `src/components/game/negamon/InventoryItemPanel.tsx`
- `src/components/game/negamon/SkillLoadoutPanel.tsx`
- `src/components/negamon/BattleArena.tsx`
- `src/components/negamon/NegamonLiteBattleArena.tsx`
- student dashboard inventory / profile surfaces
- shop dialog or shop list surfaces

The exact files may shift, but the UI contract should stay the same.

#### 12. Manual QA Targets For Phase 7

Required checks:

- inventory shows held, usable, reward separately
- battle loadout allows one held and two usable only
- reward items never appear as battle slot options
- battle screen exposes usable items clearly
- timeline shows item use and item trigger text
- mobile widths do not collapse kind separation

#### 13. Phase 7 Exit Notes

Phase 7 is complete only when:

- students can visually distinguish held, usable, and reward items immediately
- equip flow and battle-bag flow feel different on purpose
- battle feedback makes item actions legible
- UI no longer teaches the old mixed item model implicitly

## Phase 8: AI, Balance, QA, And Release Gate

Primary file targets:

- `src/lib/game-negamon/core/engine/ai-engine.ts`
- `src/lib/game-negamon/__tests__/*`
- battle route tests
- shop/loadout tests

AI requirements:

- know when to heal
- know when to cleanse
- know when to spend energy restore
- avoid wasting consumables at full value
- understand held-item survival and crit patterns

Automated test layers:

1. catalog validation
2. held-item hook tests
3. usable-item legality tests
4. item action resolution tests
5. migration tests
6. AI decision tests
7. route/session regression tests

Manual QA targets:

- shop purchase flow
- inventory rendering
- battle equip flow
- usable item action in live battle
- reward item classification
- classroom demo data migration

### Phase 8 AI Design Goals

The item system is not complete if only humans can use it well.

AI must understand:

- when to heal
- when to recover energy
- when to cleanse
- when to spend a once-per-battle defensive option
- when to preserve an item instead of wasting it

The first-pass AI does not need deep metagame mastery, but it must avoid obviously bad item play.

#### 1. AI Scoring Inputs

Usable items should expose enough structured data for scoring:

- item kind
- role
- target side
- heal amount or percentage
- energy restore amount
- cleanse scope
- shield strength
- stage change magnitude
- once-per-battle or quantity scarcity

Held items should expose enough metadata for pre-battle and passive scoring:

- offense bias
- defense bias
- sustain value
- status protection value
- energy economy value

AI should not need to infer item usefulness from string names.

#### 2. First-Pass AI Rules For Usable Items

Recommended baseline behaviors:

- use HP recovery when projected survival is threatened and the heal changes the next-turn outcome meaningfully
- use energy recovery when the actor is blocked from its strongest relevant move without the item
- use cleanse when a negative status materially reduces expected output or survival
- use shield when lethal or near-lethal damage is likely next turn
- use control/setup items only when they improve the expected next action instead of delaying obvious winning damage

Anti-waste rules:

- do not heal at near-full HP
- do not restore energy when already near max
- do not cleanse if no removable negative status exists
- do not spend a control item on a target that is already fainting or clearly losing the speed race anyway

#### 3. First-Pass AI Rules For Held Items

Held items should influence AI expectations even when they are passive.

Examples:

- a monster with `held_focus_thread` can accept slightly riskier lines
- a monster with `held_echo_battery` can plan around slower energy pressure
- a monster with `held_scope_prism` can value crit-enabled offense more
- a monster with `held_guard_core` can tolerate more incoming chip before choosing recovery

AI does not need perfect probabilistic modeling in first pass, but it should use held-item metadata in a consistent direction.

#### 4. Balance Guardrails

The first item roster should improve tactics without replacing the move system.

Balance guardrails:

- held items must support monster identity, not erase it
- usable items must create timing decisions, not endless stall loops
- reward items must not leak battle power directly
- no single item should become mandatory for all six monsters

Recommended guardrails by family:

- survival held item:
  - once per battle only
- crit held item:
  - meaningful but not guaranteed critical overflow
- speed held item:
  - enough to matter, not enough to invalidate speed archetypes
- defense held item:
  - small stable mitigation, not pseudo-invulnerability
- energy held item:
  - enough to smooth turns, not enough to remove energy tension
- usable heal:
  - enough to save a turn, not enough to reset the whole fight

#### 5. Balance Questions To Freeze During Implementation

These should be explicitly decided and then protected by tests:

- how much HP the first heal item restores
- how much energy the first energy item restores
- how much damage reduction the first shield or guard effect grants
- how much crit bonus `held_scope_prism` grants
- whether `held_clear_mind_charm` is a one-time cleanse or a narrower immunity

Phase 8 should not leave these as vague tuning notes forever.

#### 6. Automated Test Layers

Required automated suites:

1. **catalog validation**
- ids are unique
- item kinds are valid
- shop groups match item kinds

2. **held-item runtime tests**
- passive hooks trigger at the right times
- once-per-battle logic works
- trigger flags do not leak between battles

3. **usable-item runtime tests**
- legal actions resolve correctly
- invalid actions fail safely
- quantities decrement on success only

4. **inventory and migration tests**
- legacy ids normalize correctly
- reward items are filtered out of battle slots
- loadouts partition into held and usable correctly

5. **AI behavior tests**
- heal usage under low HP
- no wasteful heal at high HP
- energy restore when needed
- cleanse when status materially harms the actor

6. **route and session tests**
- battle session payload exposes held and usable data correctly
- replay log contains item events
- post-battle summary contains consumed item data

7. **balance sanity tests**
- no item creates infinite or degenerate loops in the simulation harness
- average battle length stays within acceptable bounds
- item action frequency remains reasonable

#### 7. Manual QA Matrix

Required manual QA paths:

- buy held item
- buy usable item
- buy reward item
- equip held item
- stock usable bag
- verify reward item does not appear in loadout
- start battle with held item only
- start battle with usable bag only
- use heal item in battle
- use cleanse item in battle
- use shield/control/setup item in battle
- verify quantities after battle
- verify migrated legacy student inventory

Required viewport checks:

- `390px`
- `768px`
- `1366px`

Required role checks:

- student view
- classroom/demo flow
- any teacher/admin visibility surface that summarizes inventory or battle kit

#### 8. Release Gate

The item rework is not production-ready until all of the following are true:

- canonical registry is live
- held and usable items work in V3 battle flow
- reward items are out of battle loadout power
- legacy data normalizes safely
- AI can use the new usable items at a basic competent level
- automated tests pass
- manual QA passes on demo classroom data

Recommended release gate commands:

- targeted item runtime tests
- route/session tests
- `npm.cmd run build`
- `npm.cmd run predev`

Exact command lists can be finalized during implementation, but the release gate should not rely on local intuition alone.

#### 9. Rollout Recommendation

Recommended rollout:

1. land item registry and normalization first
2. land held runtime
3. land usable runtime
4. land UI separation
5. run migration QA on demo data
6. enable in local/demo classroom first
7. then promote to production

If rollback is needed:

- old legacy item reads should still remain interpretable during the transition window
- battle creation should prefer safe invalidation over corrupt mixed loadouts

#### 10. Phase 8 Exit Notes

Phase 8 is complete only when:

- AI can score and use item actions responsibly
- item tuning is documented and tested
- automated regression is green
- manual QA is green
- the release gate is explicit and repeatable

## Suggested Delivery Order

1. freeze taxonomy and schema
2. build the new item registry
3. implement held-item runtime
4. implement usable-item actions
5. migrate shop and inventory contracts
6. align UI
7. run balance and migration QA

## Risks

### Risk 1: Item System Bloats Too Fast

Mitigation:

- ship only 12 battle-facing items first
- do not add niche counters until the base loop feels good

### Risk 2: Old Reward Items Leak Back Into Battle Power

Mitigation:

- reward items must be a separate kind in the schema
- loadout validation must reject them

### Risk 3: Usable Items Slow Battle Pace Too Much

Mitigation:

- keep activation cap small
- make item usage consume the turn in first pass
- instrument AI and QA around stall patterns

### Risk 4: Migration Breaks Existing Inventories

Mitigation:

- keep runtime compatibility during rollout
- write explicit mapping tests
- prefer safe invalidation over silent wrong equips

## Exit Criteria

This plan is complete when:

- the production V3 item catalog is fully Pokemon-inspired in structure
- held items and usable items are separated in runtime and UI
- reward items no longer occupy battle loadout power space
- old legacy battle items are retired or migrated cleanly
- automated tests and manual QA pass

## Validation Checklist

- [x] Approve Pokemon-inspired item taxonomy
- [x] Freeze item data contracts
- [x] Approve first-pass item roster
- [x] Rebuild item catalog and registry
- [ ] Implement held-item runtime
- [ ] Implement usable-item battle actions
- [x] Migrate shop, inventory, and reward classification
- [x] Remap or retire legacy battle items
- [x] Align battle and inventory UI
- [ ] Upgrade AI for item actions
- [x] Run automated item regression suite
- [ ] Run manual classroom item QA
