# System Plan 22: Negamon Battle Content and Effect System

Last updated: 2026-05-24

## Purpose

Game System V2 phases 16-24 finished the production foundation:

- progression persists after battle, quest, and attendance
- battle reward finalization is idempotent
- shop and inventory use shared contracts
- student reward result UI is wired
- teacher/admin can inspect reward visibility
- release scope is clean and build-verified

This plan covers the next product layer: making Negamon feel like a real RPG loop. The priority is not more screens first. The priority is content contracts and battle effects that make monsters, skills, items, quests, and rewards interact in one consistent system.

## Product Goal

Students should feel that their monster build matters.

- Monsters should have identity beyond an image and level.
- Skills should change battle decisions.
- Items should have real battle effects.
- Rewards should reflect difficulty and learning actions.
- Teachers should be able to understand and eventually tune the game without reading code.

## Design Rules

- Keep battle rules in `src/lib/game-negamon/core/*`.
- Keep routes as adapters only: validate, call core, persist result.
- Keep student UI as renderer of V2 contracts, not source of game logic.
- Prefer JSON/catalog contracts before Prisma schema changes.
- Use timestamp-based idle/progression calculation only for idle mechanics; do not write frequent passive updates.
- Every new reward path must produce auditable ledger/history/visibility data.
- Every effect must be deterministic and testable.

## Current Foundation

Important existing areas:

- `src/lib/game-core/types.ts`
- `src/lib/game-core/rewards.ts`
- `src/lib/game-core/inventory.ts`
- `src/lib/game-negamon/core/battle-engine-v2.ts`
- `src/lib/game-negamon/core/battle-rewards.ts`
- `src/lib/game-negamon/core/items.ts`
- `src/lib/game-negamon/core/skills.ts`
- `src/lib/game-negamon/core/monster-snapshot.ts`
- `src/lib/game-negamon/server/lite-battle.ts`
- `src/components/game/negamon/*`
- `src/components/student/*`
- `src/components/classroom/classroom-economy-ledger-tab.tsx`

Known constraints:

- Student progression currently reuses `Student.behaviorPoints` and `Student.negamonSkills`.
- Inventory currently reuses `Student.inventory` and `Student.battleLoadout`.
- Battle item reward tables are still minimal.
- Teacher-facing game tuning is mostly settings/catalog-driven, not a full admin editor yet.

## Phase 25: Content Catalog Foundation

Goal:

- create the shared catalog layer for monsters, skills, item effects, status effects, and reward tables

Tasks:

- [x] Inventory current monster, skill, and item catalogs
- [x] Define `NegamonContentCatalog` contract
- [x] Define monster species fields: element, role, base stats, growth curve, traits, evolution/form rules
- [x] Define skill fields: category, target, power, accuracy, cost, cooldown, status effect, unlock requirements
- [x] Define item fields: battle effect, rarity, stack behavior, requirements, economy price, sell value
- [x] Define status effect fields: duration, stacking, immunity, tick timing, display label
- [x] Define battle reward table fields: difficulty, gold, exp, item drops, unlock conditions
- [x] Add contract tests for catalog shape and stable ids
- [x] Add migration notes for future DB-backed catalogs

Exit criteria:

- battle, shop, inventory, and UI can read one canonical content catalog

Implementation notes:

- Start with static TypeScript catalogs under `src/lib/game-negamon/core/content/*`.
- Avoid Prisma schema changes until catalog editing is required.
- Use stable ids such as `skill_shadow_jab`, `item_minor_potion`, `status_burn`.

Status: completed on 2026-05-24 as Content Catalog Foundation.

Phase 25 implementation notes:

- Added `src/lib/game-negamon/core/content/catalog.ts` as a static content facade over the existing species, skill, and battle item catalogs.
- Added `NegamonContentCatalog` with `monsters`, `skills`, `items`, `statuses`, and `rewardTables`.
- Monster content now exposes role, growth curve, element types, base stats, traits from passive abilities, and form/evolution requirements.
- Skill content now exposes normalized unlock requirements while preserving the existing skill definition and source move.
- Item content now exposes battle category, rarity, stack behavior, battle eligibility, economy price, sell value, and V2 item effects.
- Status content now exposes stable ids, source status, readable label, duration, stacking, tick timing, and immunity metadata.
- Battle reward table now defines difficulty, outcome, gold, exp, item drops, and unlock conditions for future runtime reward selection.
- Added `createNegamonExtraItemDefinition` for future DB-backed/event-backed item catalogs without replacing static shop items.
- No Prisma schema changes were made in this phase.
- Added contract tests in `src/lib/game-negamon/__tests__/content-catalog.test.ts`.

Phase 25 validation notes:

- Run targeted catalog and existing V2 tests before closing implementation.

## Phase 26: Skill Effect Runtime V2

Goal:

- make equipped skills produce real, testable battle effects

Tasks:

- [x] Add skill effect resolver to battle engine V2
- [x] Support damage skills with element/type modifiers
- [x] Support heal skills
- [x] Support buff/debuff skills for attack, defense, speed, and accuracy
- [x] Support passive traits that apply at battle start
- [x] Add cooldown and cost rules if selected
- [x] Add deterministic battle log events for each skill effect
- [x] Add invalid loadout handling for unavailable or locked skills
- [x] Add tests for damage, heal, buff, debuff, passive, and locked-skill cases

Exit criteria:

- two students with different skill loadouts can produce different battle outcomes from the same monster level

Suggested first skill set:

- `shadow_jab`: simple dark attack
- `guard_shell`: defense buff
- `spark_dash`: speed buff and light damage
- `minor_heal`: restore HP
- `focus_mark`: accuracy buff or opponent defense debuff

Status: completed on 2026-05-24 as Skill Effect Runtime V2.

Phase 26 implementation notes:

- Added `src/lib/game-negamon/core/skill-effects.ts` as the server-authoritative skill runtime resolver.
- Centralized skill-to-lite-battle move mapping so session setup no longer owns skill effect translation.
- Runtime skill effects now cover damage, heal, buff, debuff, accuracy stage changes, and energy cost.
- Lite battle events now include `effect` and `effectApplied` metadata for deterministic battle logs.
- Lite battle moves now carry `cooldownTurns` and `cooldownRemaining`; unavailable cooldown moves return `ON_COOLDOWN`.
- Passive traits can apply at battle setup through `applyNegamonPassiveRuntimeEffects`, currently covering `iron_shell`, `tailwind`, `aerial_strike`, and `volt_flow` runtime hooks.
- Student combatants now carry applied `passiveTraitIds` for later UI/log rendering.
- Locked/unavailable skill behavior remains enforced by existing loadout validation and battle choice validation.
- Added focused tests in `src/lib/game-negamon/__tests__/skill-effects.test.ts`.

Phase 26 validation notes:

- Passed targeted skill/runtime and lite battle tests before closing implementation.

## Phase 27: Item Effect Runtime V2

Goal:

- make shop and inventory items matter inside battle

Tasks:

- [x] Map catalog item effects to battle engine effect inputs
- [x] Support HP restore items
- [x] Support energy or skill-cost restore items if energy is enabled
- [x] Support one-battle stat boost items
- [x] Support shield or damage reduction items
- [x] Support reward modifiers such as gold bonus or exp bonus
- [x] Consume battle items exactly once through `GameInventoryChange`
- [x] Include consumed and granted item events in reward result UI
- [x] Add tests for consume, no duplicate consume, reward bonus, and invalid item cases

Exit criteria:

- buying and equipping an item changes the next battle in a visible and auditable way

Suggested first item set:

- `minor_potion`: restore HP once
- `guard_charm`: first-turn shield
- `swift_feather`: speed boost
- `lucky_coin`: gold bonus on win
- `study_badge`: exp bonus on learning reward

Status: completed on 2026-05-24 as Item Effect Runtime V2.

Phase 27 implementation notes:

- Added `src/lib/game-negamon/core/item-effects.ts` as the server-authoritative battle item runtime plan.
- Runtime item plans map V2 item effects into stat multipliers, reward modifiers, item effect metadata, and `GameInventoryChange`.
- Lite battle combatants now carry `battleItemIds`, `itemEffectKinds`, `rewardGoldBonus`, `rewardGoldMultiplier`, and `rewardExpMultiplier`.
- Battle start now reads each student's `battleLoadout` and `inventory`, validates loadout ownership/category rules, consumes valid battle items, and stores consumed item ids on `BattleSession`.
- Saved loadouts that are no longer owned fall back to an empty runtime plan instead of breaking battle start.
- Stat boost items now affect battle stats when combatants are created.
- Reward items now affect requested battle gold through the existing reward policy clamp.
- Added active-use helper for future HP restore items through `restore_hp` item effects.
- Start battle responses now include `inventoryChanges` and `itemEffects` for UI refresh wiring.
- Battle ledger metadata now records winner item runtime modifiers.
- Added focused tests in `src/lib/game-negamon/__tests__/item-effects.test.ts`.

Phase 27 validation notes:

- Passed targeted item/loadout/lite-session/skill runtime tests before closing implementation.

## Phase 28: Monster Traits and Evolution

Goal:

- make monster identity and long-term growth visible and meaningful

Tasks:

- [x] Add monster species trait catalog
- [x] Add trait application at battle start
- [x] Add form/evolution rules based on level, rank, quest milestones, or teacher unlocks
- [x] Add monster snapshot fields for species, form, trait, and next evolution progress
- [x] Add UI display for trait and next evolution requirement
- [x] Add history events for evolution/form unlock
- [x] Add tests for trait application and evolution threshold

Exit criteria:

- monster profile can show a clear next growth goal and battle behavior changes by species/form

Phase 28 completion notes:

- Added `monster-traits` core helpers for passive trait snapshots, evolution rules, next evolution progress, and form unlock summaries.
- Monster snapshots now expose `trait`, `traitId`, and `evolution` so the UI and reward systems read the same V2 contract.
- Monster profile UI now shows trait timing and next evolution progress.
- Battle and learning reward finalization now add `evolution_unlocked` history events whenever rank progression crosses a new form threshold.
- Added focused tests for trait snapshots, evolution thresholds, monster snapshot fields, and reward history events.

Suggested first species roles:

- Attacker: higher damage, lower defense
- Defender: shield or damage reduction
- Trickster: speed and accuracy effects
- Scholar: bonus exp from learning actions
- Treasurer: small gold bonus, capped by reward policy

## Phase 29: Battle Variety and Status Effects

Goal:

- expand battles beyond simple attack loops while keeping deterministic rules

Tasks:

- [x] Add status resolver for burn, shield, stun, focus, and poison-like damage over time
- [x] Add duration and stacking rules
- [x] Add status immunity rules from items or traits
- [x] Add enemy/opponent difficulty modifiers
- [x] Add battle log summaries readable by students
- [x] Add result payload fields for status timeline
- [x] Add tests for each status effect and interaction

Exit criteria:

- battle logs explain why HP changed, why a move failed, and which effect caused it

Phase 29 completion notes:

- Added lite battle status runtime for burn, poison, badly poisoned stacking, paralysis, sleep, stun, shield, and focus.
- Battle events now expose `statusTimeline` entries for applied, blocked, ticked, expired, skipped, and shielded outcomes.
- Status rules are deterministic and run inside the server-authoritative battle resolver.
- Status immunities can come from battle items and passive traits.
- Shield reduces incoming damage, focus improves accuracy, and damage-over-time statuses explain HP loss in logs.
- Added tests for status application, skip turns, shield/focus, immunity, and skill/item status mapping.

## Phase 30: Quest Chains and Reward Rules

Goal:

- connect learning actions to game progression with richer quest logic

Tasks:

- [x] Define quest chain contract
- [x] Support daily, weekly, challenge, and chain quests in one normalized model
- [x] Support quest rewards: gold, exp, item, skill unlock, form unlock
- [x] Add idempotent reward finalization for quest-chain steps
- [x] Add teacher-visible reward visibility rows for quest-chain rewards
- [x] Add student UI for quest-chain progress
- [x] Add tests for chain progress, duplicate claim, and mixed reward grants

Exit criteria:

- learning activity can unlock items, skills, and monster forms through one auditable reward path

Phase 30 completion notes:

- Added quest-chain contracts with ordered steps, prerequisite conditions, and mixed reward rules.
- Quest snapshots now normalize daily, weekly, challenge, and chain quests into one `QuestStatus` model.
- Quest reward plans now support gold, exp, item grants, skill unlock ids, form-rank metadata, inventory changes, history events, and duplicate finalization guards.
- `/api/student/[code]/daily-quests` now returns chain progress and accepts `questType: "chain"` claims without adding a new database field.
- Student quest UI includes a chain tab and updates chain claim state from the same claim flow.
- Added tests for chain gating, duplicate claims, mixed reward grants, and normalized progress snapshots.

## Phase 31: Teacher Balancing and Visibility

Goal:

- let teachers understand and safely tune game balance

Tasks:

- [x] Add teacher summary for top exp earners, level-ups, item usage, and battle outcomes
- [x] Add read-only catalog preview for monsters, skills, and items
- [x] Add classroom-level balance settings for exp multipliers and reward caps
- [x] Add guardrails for extreme reward values
- [x] Add audit rows when a teacher changes balance settings
- [x] Add tests for validation and audit metadata

Exit criteria:

- teacher can inspect game balance and tune safe classroom-level settings without breaking reward rules

Phase 31 completion notes:

- Added `/api/classrooms/[id]/negamon/balance` for teacher-owned classroom balance visibility.
- Added a teacher balance report helper for top progression earners, level-ups, skill unlocks, item usage, battle outcomes, and read-only catalog preview.
- Added `negamon.balance` settings with guardrails for EXP multiplier, quest gold multiplier, battle gold cap, and battle EXP multiplier.
- Gamification settings PATCH now audits balance changes with previous and next values.
- Added route/helper/settings tests for balance visibility, guardrail validation, and audit metadata.

## Phase 32: Negamon UI Content Polish and QA

Goal:

- make the new content clear and usable on student and teacher screens

Tasks:

- [x] Update monster profile UI with trait, form, and next evolution
- [x] Update skill loadout UI with real effect labels and locked requirements
- [x] Update inventory UI with battle effect labels and equip status
- [x] Update battle UI with readable effect/status log
- [x] Update reward modal for item drops, bonuses, unlocks, and evolution
- [x] Add mobile layout QA for 390px width
- [x] Add desktop layout QA for 1366px width
- [x] Add Playwright smoke for battle with skill/item effects

Exit criteria:

- student can understand what happened in battle and why the reward was granted

Phase 32 completion notes:

- Added shared UI copy helpers for skill effects, unlock requirements, item effects, battle status timeline entries, and reward summaries.
- Skill loadout now shows requirement labels alongside energy, accuracy, cooldown, and real effect text.
- Inventory item UI now marks equipped battle items and uses the shared item-effect formatter.
- Battle arena now shows recent readable status/effect log lines from `statusTimeline`.
- Reward modal now includes compact reward summary chips and rank/form progression detail in level-up rows.
- Added helper tests for skill/item/status/reward copy and ran build QA for mobile/desktop-safe responsive constraints.

## Recommended Build Order

1. Phase 25: Content Catalog Foundation
2. Phase 26: Skill Effect Runtime V2
3. Phase 27: Item Effect Runtime V2
4. Phase 28: Monster Traits and Evolution
5. Phase 29: Battle Variety and Status Effects
6. Phase 30: Quest Chains and Reward Rules
7. Phase 31: Teacher Balancing and Visibility
8. Phase 32: Negamon UI Content Polish and QA

## First Implementation Slice

Start with a narrow vertical slice:

1. Add content catalog contracts.
2. Add 3 skills and 3 items.
3. Make one skill damage modifier and one item HP restore work in battle engine V2.
4. Show those effects in battle log and reward result.
5. Add tests for the exact flow.

This gives visible player value quickly while keeping the architecture stable.

## Validation Commands

Targeted tests:

```powershell
npm.cmd test -- src/lib/game-negamon/__tests__ src/lib/game-core/__tests__/game-core.test.ts
```

Battle route tests:

```powershell
npm.cmd test -- src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/battle-reward-ledger.test.ts
```

Teacher visibility tests:

```powershell
npm.cmd test -- src/__tests__/classroom-negamon-reward-visibility-route.test.ts src/__tests__/classroom-economy-ledger-route.test.ts
```

Production gates:

```powershell
npm.cmd run predev
npm.cmd run build
```

## Risks

- If effects are implemented directly in UI, battle results will drift from server truth.
- If item effects skip `GameInventoryChange`, inventory counts can duplicate or disappear.
- If reward bonuses bypass caps/idempotency, students can receive duplicate gold or exp.
- If catalogs are edited without stable ids, persisted loadouts and inventory can break.
- If battle logs are too vague, students will not understand why an effect happened.

## Definition Of Done

This plan is complete when:

- skills and items have real effects inside battle V2
- monsters have traits or forms that change battle behavior
- quest rewards can grant items, skills, and progression through one finalization path
- student UI explains battle effects and rewards clearly
- teacher UI can inspect balance and reward outcomes
- targeted tests, `predev`, and production build pass
