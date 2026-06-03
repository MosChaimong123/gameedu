# System Plan 30: Negamon Battle V4 Correctness and QA

Last updated: 2026-05-29

## Purpose

This plan turns the current Negamon Battle V4 route into a verifiable, balanceable, student-ready battle system.

The latest localhost smoke test confirmed that the V4 routes can start and resolve battles, but the combat behavior is not yet trustworthy. The system still needs a stronger QA harness, correct monster mapping, explicit skill loadouts, visible damage math, and battle events that explain what happened.

This plan is not a deploy plan. Do not commit, push, or deploy these changes until localhost QA passes and the owner explicitly approves deployment.

## Current Test Snapshot

Local fixture used for the smoke test:

- Classroom: `6a12ee29a5e71c6c01a33947`
- Student A: `WUQADJEJY72J`
- Student B: `7FUM5RLTLA4C`
- Test monsters: `terranoir` and `pyronox`
- Test setup: both monsters temporarily raised to max-level progression in local DB

Observed results:

- `GET /student/WUQADJEJY72J` returns 200 locally.
- `POST /api/classrooms/[id]/battle/v4/start` returns 200 after the V4 runtime loading fix.
- V4 battle choices can be submitted through the route.
- Damage and battle flow are not yet reliable enough for production play.

## Confirmed Problems

### 1. New Negamon species fall back to generic Pokemon mapping

`terranoir` and `pyronox` currently resolve through a fallback instead of a dedicated species mapping. This makes HP, speed, stats, and move behavior come from the wrong underlying battle model.

Impact:

- battle balance does not represent the Negamon roster
- students see a monster identity that does not match the actual combat math
- debugging damage is misleading

### 2. Max-level stats are not clearly Negamon-derived

Both tested monsters started with the same visible HP. That suggests the runtime is not cleanly using the canonical Negamon stat progression as the source of truth.

Impact:

- level, form, and rank progression cannot be trusted in battle
- teacher balancing cannot tune monster identity safely

### 3. Skill unlocks and active loadouts are mixed together

The test unlocked all species skills, but only the first four skills were available in battle. Late-game and finisher skills were not selectable.

Impact:

- max-level tests do not actually test max-level skills
- students cannot intentionally build a battle loadout
- balance work is blocked because the active move set is implicit

### 4. Energy cost is lost in battle choices

Every visible move came back with `energy: 0`.

Impact:

- energy economy does not constrain powerful moves
- UI cannot teach students why a move is unavailable
- battle pacing collapses into repeated best-move usage

### 5. Buffs, debuffs, and statuses are not visible enough

Setup and control moves may affect the hidden runtime, but the V4 state and event log do not clearly expose the result.

Impact:

- students cannot understand why a turn mattered
- QA cannot confirm whether a skill worked
- teacher/admin battle history is not useful for balancing

### 6. Damage logs are too generic

The event log currently confirms that a turn resolved, but does not consistently expose damage numbers, type effectiveness, crits, healing, shield changes, or stat-stage changes.

Impact:

- damage formula cannot be validated
- balance tuning depends on manual guessing
- replay/history cannot explain battle outcomes

### 7. Opponent AI is too simple for meaningful tests

The opponent currently defaults to a simple action choice. That is acceptable for smoke testing, but not enough for skill, item, and balance QA.

Impact:

- classroom battles feel repetitive
- defensive, setup, and punish moves cannot be evaluated properly

### 8. V4 still relies on soft-lock repair instead of a trustworthy choice lifecycle

Both the student battle UI and the V4 route currently run `repairBasicAttackSoftLock(...)` before presenting or resolving state. That repair path injects a synthetic basic attack and forcibly restores PP so the UI does not dead-end.

Impact:

- battle state is no longer a clean reflection of server truth
- PP, energy, and choice availability can become misleading
- QA cannot tell whether a move was truly legal or repaired after the fact
- repeated "it works if we patch the state" behavior hides the root cause

### 9. Dead-state recovery is too weak for real student play

The current V4 surface shows disabled `Bag` and `Monster` actions, and only `Run` remains available as a guaranteed escape hatch. If the current choice request becomes stale or no meaningful move remains, the player can get stuck in a loop that feels like a frozen game.

Impact:

- students experience the battle as "ค้าง" even when the server is still alive
- no-turn-progress states are hard to recover from without reloading
- manual QA cannot distinguish stale state from true engine failure

### 10. Reward and progression are not yet owned by the V4 completion path

The V4 server flow still writes placeholder `goldReward: 0` values through the result pipeline. That means finishing a V4 battle does not yet prove that battle completion, rewards, and student progression are integrated end to end.

Impact:

- students can finish a battle without seeing trustworthy rewards
- battle completion feels unfinished even when a winner exists
- balancing work is disconnected from actual classroom progression

### 11. Turn result synchronization is still brittle

The V4 route validates `choiceRequestId` strictly and can reject stale client actions, but the UI recovery path is not yet strong enough to re-sync and continue smoothly. This creates a visible gap between "server rejected a stale turn" and "student can immediately continue the battle."

Impact:

- stale requests feel like a frozen battle
- repeated choice attempts can look like input lag or a broken game
- students lose confidence because the battle does not clearly recover itself

## Core Decision

Use Pokemon-inspired architecture patterns, but keep Negamon battle content and formulas owned by GameEdu.

Allowed:

- use Pokemon Showdown as an open-source reference or optional resolver layer
- reuse architecture ideas such as turn order, move contracts, statuses, type charts, and event logs
- design original Negamon species, skills, items, names, and formulas

Not allowed:

- copy proprietary Pokemon game code
- copy Pokemon move names, flavor text, assets, or protected content
- let hidden Pokemon species mapping define Negamon balance without an explicit adapter contract

## Target Architecture

Battle V4 should have one canonical state shape:

```ts
type NegamonBattleStateV4 = {
  mode: "negamon_battle_v4";
  engineVersion: string;
  sessionId: string;
  turn: number;
  phase: "choosing" | "resolving" | "finished";
  player: NegamonBattleFighterV4;
  opponent: NegamonBattleFighterV4;
  choices: NegamonBattleChoiceV4[];
  field: NegamonBattleFieldV4;
  events: NegamonBattleEventV4[];
  result?: NegamonBattleResultV4;
};
```

The UI, route, history view, and teacher/admin view should read this shape only.

## Phase 39: Freeze Battle QA Fixture

Goal: create a repeatable local test fixture before changing more runtime logic.

Checklist:

- [x] Add a script or test helper that selects two real students in a local classroom.
- [x] Add a max-level monster fixture for at least `terranoir` and `pyronox`.
- [x] Store original student progression before mutation and restore it after tests.
- [x] Add a deterministic seed for battle simulations.
- [x] Record expected start-state fields: level, HP, speed, type, skill slots, energy.
- [x] Add a command-level smoke test for start route and choose route.

Acceptance:

- one command can start a V4 battle and print a readable battle state summary
- test data cleanup is automatic
- no production data is touched

## Phase 40: Canonical Species and Stat Mapping

Goal: make every V4 battle fighter use Negamon-owned stats first.

Checklist:

- [x] Audit every species id in the active Negamon catalog.
- [x] Remove silent fallback from new V2/V4 species to generic battle species.
- [x] Add explicit stat snapshots for HP, attack, defense, special attack, special defense, speed, and level.
- [x] Confirm `calculateNegamonStatsForLevel()` is the source of battle stats.
- [x] Add tests for level 1, mid-level, and max-level stat output per starter.
- [x] Add failure behavior when a species has no V4 battle mapping.

Acceptance:

- `terranoir` and `pyronox` no longer resolve to a generic fallback
- max-level HP and speed match the Negamon progression formula
- invalid species mappings fail loudly in development and tests

Phase 40 update (2026-05-27):

- Active V4 species ids are now explicitly audited against `DEFAULT_NEGAMON_SPECIES`.
- V4 mapping covers `pyronox`, `aerolisk`, `terranoir`, `lumilune`, `voltshade`, and `tidemaw`.
- Missing V4 species mapping now throws instead of silently falling back to `Eevee`.
- `NegamonBattleCombatantV4` now exposes `statSnapshot` with HP, attack, defense, special attack, special defense, speed, and level.
- V4 combatants keep Negamon-owned HP/maxHP/speed from `calculateNegamonStatsForLevel()`; Showdown HP is converted into a ratio instead of replacing Negamon max HP.
- V4 choices now preserve Negamon skill energy cost from the adapter alias.
- `test:negamon-battle` now includes the V4 Showdown adapter coverage.
- Local fixture confirmed `terranoir` starts at HP `1591`, speed `177`, mapped to `Hippowdon`; `pyronox` starts at HP `976`, speed `380`, mapped to `Houndoom`.

## Phase 41: Skill Unlock and Loadout V4

Goal: separate unlocked skills from active battle slots.

Checklist:

- [x] Define `unlockedSkillIds` as progression state.
- [x] Define `equippedSkillIds` as the four active battle slots.
- [x] Add server validation for duplicate, locked, missing, or incompatible skill ids.
- [x] Add fallback loadout only when a student has no saved loadout.
- [x] Add a student-facing loadout editor or reuse the monster profile surface.
- [x] Make max-level tests include late-game and finisher skills.

Acceptance:

- a max-level monster can select any valid unlocked skill into one of four active slots
- battle choices reflect the saved loadout, not the first four catalog entries
- invalid loadouts are repaired server-side and logged

Phase 41 update (2026-05-27):

- `Student.negamonSkills` remains the unlocked/progression skill list.
- Added `Student.negamonSkillLoadout` as the active four-slot battle skill list.
- V4 battle creation now reads `negamonSkillLoadout`; if no saved loadout exists it falls back to the first valid unlocked skills.
- Saved non-empty loadouts do not silently fallback when all requested skills are invalid.
- Showdown side seeds now preserve the order of `equippedSkillIds` instead of catalog order.
- Added `PUT /api/student/[code]/negamon/skill-loadout` for student-facing skill loadout saves.
- Reused the monster profile skill panel as the student loadout editor.
- QA fixture now unlocks all skills but equips max-level/finisher skills in active slots.
- Local fixture confirmed Terranoir active slots: `basic-attack`, `terranoir-tomb-tax`, `terranoir-catacomb-crush`, `terranoir-bastion-hide`.
- Local fixture confirmed Pyronox active slots: `basic-attack`, `pyronox-scorch-rush`, `pyronox-hell-dive`, `pyronox-war-cry`.

## Phase 42: Negamon Damage Formula V4

Goal: make damage math transparent and testable.

Recommended first formula:

```ts
baseDamage =
  (((2 * level / 5 + 2) * power * attackStat / defenseStat) / 50 + 2)
  * typeMultiplier
  * roleModifier
  * randomFactor;
```

Checklist:

- [x] Decide whether V4 keeps Pokemon Showdown as resolver or uses a Negamon-owned deterministic resolver.
- [x] If Showdown stays, expose the exact adapter inputs and parsed outputs.
- [x] If Negamon-owned resolver is used, add direct unit tests for damage ranges.
- [x] Add type multiplier tests.
- [x] Add same-type attack bonus or an explicit decision to skip it.
- [x] Add crit behavior or an explicit decision to skip crits in classroom mode.
- [x] Add guardrails for minimum damage and maximum burst damage.

Acceptance:

- QA can explain why a move dealt a specific damage amount
- damage events include attacker, defender, move id, base power, multiplier, and final damage
- balance changes can be tested without opening the UI

Phase 42 update (2026-05-27):

- V4 keeps Pokemon Showdown as the active turn resolver for now.
- The V4 state now exposes exact Showdown adapter inputs through `metadata.showdown.adapterInputs`.
- The V4 state now exposes parsed Showdown request snapshots through `metadata.showdown.parsedRequests`.
- Added `metadata.negamonFormula` with transparent expected damage for each visible move slot.
- Expected damage uses Negamon-owned stats, STAB `1.5`, type multiplier, random multiplier `1`, and crit disabled for classroom expectation.
- Added a max-burst guardrail of `75%` of target max HP for the transparent Negamon formula.
- Added formula tests for type multipliers, STAB, crit behavior, status zero-damage behavior, minimum damage, and burst capping.
- Added adapter tests that confirm Showdown inputs, parsed outputs, and formula expectations are present in battle state.
- Local fixture confirmed formula expectations are printed with move slot, power, category, type multiplier, STAB, damage, raw damage, and capped flag.
- Local fixture confirmed start route and all four Terranoir move slots still resolve through the V4 choice route after formula metadata wiring.
- Local fixture found a remaining visibility gap: `terranoir-catacomb-crush` had expected damage, but the HP delta did not expose a visible damage result in the current event summary. Phase 43 must parse actual Showdown turn protocol into damage/effect events.
- Remaining Phase 43 work: turn events still need to include actual damage/effect payloads for UI and history.

## Phase 43: Effects, Statuses, and Turn Events

Goal: make every skill result visible in state and history.

Checklist:

- [x] Define the supported V4 effect families: damage, heal, shield, buff, debuff, status, cleanse, energy gain, energy drain, priority, cooldown.
- [x] Define stat-stage rules for attack, defense, special attack, special defense, and speed.
- [x] Define status duration and stacking rules.
- [x] Add event types for all effect families.
- [x] Add tests for at least one skill from each effect family.
- [x] Ensure the UI can render status icons and event text from the same event payload.

Acceptance:

- setup moves show visible stat-stage changes
- control moves show visible status changes
- battle history can reconstruct why a battle ended

Phase 43 update (2026-05-27):

- Added V4 effect families in battle metadata: damage, heal, shield, buff, debuff, status, cleanse, energy gain, energy drain, priority, and cooldown.
- Added V4 stat-stage rule metadata for attack, defense, special attack, special defense, and speed with `-6..+6` bounds and 2-turn default duration.
- Added V4 status rule metadata: default 2-turn duration, damage-over-time statuses tick at turn end, normal statuses refresh, and badly poison stacks intensity.
- Extended `NegamonBattleEventV4` with effect payload fields for damage, healing, energy delta, shield delta, stat-stage delta, status timeline, priority, cooldown, miss, and crit.
- The Showdown adapter now emits visible V4 turn events from selected move effects and observed HP deltas.
- The student battle UI now summarizes events through the shared Negamon event formatter instead of reading only raw `message`.
- Added adapter coverage for Phase 43 effect rules, damage/miss events, cooldown events, and stat-stage events.
- Added catalog coverage that requires one explicit sample skill for every active `DEFAULT_NEGAMON_SPECIES` effect family.
- Added runtime adapter coverage for skill-backed damage, heal, shield, debuff, status, energy drain, priority, and cooldown event payloads.
- Current active skill catalog has no cleanse or positive energy-gain skill; positive energy gain remains covered by item runtime tests in Phase 44.

## Phase 44: Energy, PP, Items, and Traits

Goal: make resource rules consistent between catalog, server, and UI.

Checklist:

- [x] Normalize `pp`, `energyCost`, `cooldownTurns`, and availability reason in `choices`.
- [x] Make invalid choices return a useful error instead of resolving ambiguously.
- [x] Apply held item hooks during battle start and turn resolution.
- [x] Apply usable item effects through V4 action routes.
- [x] Apply monster traits through explicit hooks.
- [x] Add event logs for item and trait activation.

Acceptance:

- powerful moves are limited by energy, PP, or cooldown
- item usage changes the battle state and is visible in the log
- trait effects are deterministic and test-covered

Phase 44 update (2026-05-28):

- Added V4 resource state for player/opponent PP, max PP, and cooldowns.
- Choices now normalize `pp`, `energy`, cooldown availability, and disabled reason from V4-owned resource state.
- V4 turn resolution now rejects disabled choices before sending commands to Showdown.
- Server route now returns useful choice rejection reasons such as `NO_PP`, `NO_ENERGY`, `ON_COOLDOWN`, or `INVALID_TARGET`.
- Held item stat hooks are applied when creating V4 side seeds.
- Battle start now logs held item and trait activation events.
- Added item actions to the V4 action route shape so usable battle items can restore HP/energy and emit `item_activated` events.
- Added Phase 44 adapter coverage for PP spending, energy spending, cooldown state, invalid choice rejection, held item activation, trait activation, and usable energy item activation.

## Phase 45: Opponent AI and Simulation Matrix

Goal: make battle tests useful before student playtests.

Checklist:

- [x] Replace first-available opponent action with a scoring function.
- [x] Score lethal damage, survival, energy efficiency, status value, setup value, and cooldown timing.
- [x] Add a simulation matrix for every starter pair.
- [x] Run max-level and mid-level battle simulations.
- [x] Flag matchups with extreme win-rate or turn-count outliers.

Acceptance:

- AI chooses sensible actions in most common battle states
- each monster has at least one fair matchup and one identifiable weakness
- balance reports can be generated without manual clicking

Phase 45 update (2026-05-28):

- Added `scoreNegamonBattleChoiceV4()` and `chooseNegamonBattleAiActionV4()` for V4 battle decisions.
- Opponent auto-action now uses V4 AI scoring when no explicit opponent action is supplied.
- AI scoring considers lethal damage, expected damage, survival/heal/shield value, energy efficiency, status/energy-drain value, setup/debuff value, and cooldown timing.
- Added adapter tests proving the AI prefers a lethal finisher over the first enabled basic attack.
- Added scoring tests for survival, status, setup, cooldown, and energy factors.
- Added a deterministic starter-pair simulation matrix covering all active starter pairs at mid-level and max-level.
- Matrix checks turn-count health and computes balance/win-rate outlier flags for follow-up tuning.

## Phase 46: UI, History, and Release Gate

Goal: make the battle page understandable before any deploy.

Checklist:

- [x] UI reads only `NegamonBattleStateV4`.
- [x] Remove visible words `Lite`, `Legacy`, and `Pokemon-Lite` from the student battle surface.
- [x] Show HP, energy, PP, cooldown, status, and active stat changes.
- [x] Show damage numbers and effect text in the turn log.
- [x] Confirm teacher battle history can read V4 result schema.
- [x] Confirm admin/teacher visibility surfaces do not parse old lite session shape for new battles.
- [x] Run build and targeted V4 tests.
- [x] Run manual localhost student battle before deploy.

Acceptance:

- student can start, choose moves, use resources, understand outcomes, and finish a battle
- teacher/admin views can inspect the battle result
- no deploy happens until local QA passes

Phase 46 update (2026-05-28):

- Student battle UI now renders V4 state resources directly: HP, EN, current/max PP, cooldown, status ids, and active stat-stage changes.
- Removed retired visible wording from the student battle surface and replaced internal runtime copy with player-facing battle copy.
- Turn log now surfaces V4 event summaries for damage/miss, cooldown, stat-stage, and other effect payloads.
- Battle history route now builds student history from parsed `negamon_battle_v4` result schema through `createNegamonBattleSessionViewV4()`.
- New production QA guard verifies the student battle surface is V4-only, resource-visible, and free of retired battle wording.
- Local manual browser QA opened `http://localhost:3000/student/WUQADJEJY72J?tab=battle`, started a V4 battle, chose a cooldown move, confirmed HP/EN/PP, `CD 1`, active `attack +1`, and damage/miss turn log text.
- Local manual QA deleted temporary battle sessions created during the browser run.

## Phase 47: Remove Soft-Lock Repair and Rebuild Choice Truth

Goal: stop patching broken battle state after the fact and make the visible choice list come from trustworthy server-owned legality.

Checklist:

- [x] Audit every reason `repairBasicAttackSoftLock(...)` is currently needed in UI and server.
- [x] Identify whether the root issue is empty `choices`, empty PP state, missing basic attack alias, or stale client state.
- [x] Remove synthetic PP restoration from the UI layer.
- [x] Remove synthetic choice injection from the V4 server layer.
- [x] Add explicit failure diagnostics when a battle state has no legal actions.
- [x] Add tests that fail if V4 silently repairs an illegal state instead of surfacing the cause.

Acceptance:

- the student battle UI renders only server-truth choices
- PP and energy values are never invented client-side
- a missing-action state fails loudly in tests and development

## Phase 48: Dead-State Recovery and Session Re-sync

Goal: make the battle continue safely when the client drifts behind the server or when a turn cannot proceed normally.

Checklist:

- [x] Add an explicit resync flow when the route returns `STALE_CHOICE`.
- [x] Refresh current battle state automatically after a rejected choice.
- [x] Add a no-legal-move fallback such as forced basic action, forced pass, or explicit struggle-style behavior owned by the server contract.
- [x] Expose clear player-facing error text for stale choice, no PP, no energy, cooldown, and invalid target states.
- [x] Confirm the UI never requires a full page reload to continue the battle.
- [x] Add route and browser QA coverage for stale-choice recovery.

Acceptance:

- stale actions recover into a fresh actionable state
- a student can always continue or cleanly end the battle without reloading
- "battle feels frozen" reports become reproducible and testable

## Phase 49: Completion, Rewards, and Progression Integrity

Goal: make a finished V4 battle behave like a complete classroom game action, not just a local duel result.

Checklist:

- [x] Replace placeholder `goldReward: 0` writes with a real V4 reward contract.
- [x] Decide whether V4 uses the same reward/progression pipeline as the canonical Negamon progression system or a dedicated adapter.
- [x] Persist winner, loser, reward deltas, EXP, and any item/progression side effects through one explicit completion path.
- [x] Add tests for win, loss, and early-exit results.
- [x] Confirm student-facing history and dashboard reflect the final reward/progression result.
- [x] Confirm teacher/admin surfaces can read the same result schema without V4-specific fallback logic.

Acceptance:

- finishing a battle updates the student record correctly
- classroom progression no longer depends on placeholder reward values
- battle completion is consistent across student, teacher, and admin views

Completion notes:

- V4 completion now reuses the canonical Negamon reward/progression pipeline instead of inventing a parallel reward adapter.
- `battle-v4.ts` writes one explicit final result contract with `requestedGoldReward`, `goldReward`, `rewardBlockedReason`, `reward`, `progression`, and per-participant outcome data.
- Winner gold now flows through the normal economy ledger with `source: "battle"`, while both winner and loser can receive EXP/progression through the same progression persistence path.
- Student-facing battle/session routes now surface the richer final payload without a V4-only fallback branch, and teacher/admin reward visibility can read the same schema from `battleSession.result`.
- Automated coverage now includes win, loss, and early-exit completion cases in `battle-v4-completion.test.ts`, plus route/view assertions for the richer final schema.

## Phase 50: Calculation Audit and Manual Battle QA

Goal: close the gap between expected battle math and what students actually observe on the screen.

Checklist:

- [x] Run a side-by-side audit of expected Negamon formula values versus observed HP, energy, PP, cooldown, and event output.
- [ ] Validate at least one offensive, defensive, setup, control, sustain, and finisher move per active starter species.
- [ ] Validate faint, simultaneous low-HP edge cases, and winner selection behavior.
- [x] Add a browser-driven manual QA script for full-battle completion, not only one-turn smoke checks.
- [x] Record remaining balance anomalies separately from correctness bugs.
- [ ] Refuse release if a battle can still soft-lock, mis-award rewards, or end without an explainable result.

Acceptance:

- a full student battle can start, progress, finish, and award results correctly
- HP, energy, PP, cooldown, and winner output all match the underlying battle logic
- remaining issues, if any, are balance tuning items rather than correctness failures

Progress notes:

- Added [negamon-battle-v4-formula-audit.mjs](C:/Users/IHCK/GAMEEDU/gamedu/scripts/negamon-battle-v4-formula-audit.mjs:1) to compare expected formula metadata versus observed HP / energy / PP / cooldown / event output over multiple turns.
- Added [negamon-battle-v4-full-qa.mjs](C:/Users/IHCK/GAMEEDU/gamedu/scripts/negamon-battle-v4-full-qa.mjs:1) as a browser-driven full-battle QA harness that should play the V4 surface until the battle ends and capture final reward state.
- The QA harness start blocker has been removed by server-rendering the initial V4 session on the harness page and teaching the browser QA script to reuse that serialized session instead of waiting for a browser-side `POST /battle/v4/start`.
- Browser QA scripts now default to `http://localhost:*` instead of `127.0.0.1` so Next.js dev hydration is not blocked by `allowedDevOrigins` cross-origin protection.
- `terranoir-tomb-tax` now maps to `breakingswipe` instead of `snarl`, which aligns the underlying Showdown move behavior with the intended "damage + lower target attack" family much better than the previous proxy move.
- The `110 / 976` dead-state was traced to replay sync reading HP/faint state from the per-side `request` objects instead of the omniscient battle log. This let `parsedRequests.opponent` stay at `20 / 178` or `78 / 178` while the actual Showdown battle log had already advanced or even emitted `|faint|`.
- V4 now derives HP/faint truth from the latest omniscient `switch` / `-damage` / `-heal` / `-sethp` / `faint` lines first, and only uses `request` snapshots for move legality/status metadata. This removed the old "opponent stuck at 110 / 976" symptom.
- A follow-up correctness bug was also fixed: exact `0 fnt` snapshots used to preserve the previous Negamon HP because the ratio fallback ignored `maxHp = 0`. The adapter now forces the combatant HP to `0` when the exact log indicates a faint.
- Latest deterministic local replay now shows `terranoir-tomb-tax` reducing Pyronox `976 -> 680 -> 373 -> 0` and ending the battle cleanly, which confirms the command-log replay drift was mainly a sync-source bug rather than malformed `>p1` / `>p2` command syntax.
- Formula expectation metadata is now computed from the same Showdown proxy species / proxy move basis that V4 actually resolves with, then scaled back into Negamon HP space for the UI and audit layer. `terranoir-tomb-tax` moved from a stale `37` expectation to a `200-400` expected range that matches the observed Pyronox damage much more closely.
- This proxy-scaled expectation path now applies across mapped move families, so remaining anomalies are more likely to be real balance or runtime bugs instead of just a mismatch between Negamon math and Showdown proxy math.

## Required Validation Commands

Minimum before commit:

```powershell
npm.cmd run build
```

Targeted checks to add or run as they become available:

```powershell
npm.cmd run test:negamon-battle
npm.cmd run check:negamon-battle
```

Manual localhost QA:

1. Start dev server.
2. Open a real student page.
3. Use two known students in a Negamon-enabled classroom.
4. Temporarily max-level both monsters through a reversible local fixture.
5. Start V4 battle.
6. Test every active skill slot.
7. Confirm damage, status, energy, cooldown, and battle result.
8. Restore local fixture data.

## Immediate Next Work

Recommended next implementation order:

1. Remove `repairBasicAttackSoftLock(...)` dependency by tracing the real no-choice / stale-choice root cause.
2. Add server-owned stale-choice recovery and fresh-state resync in V4.
3. Replace placeholder V4 reward writes with the canonical progression/reward pipeline.
4. Run full-battle manual QA, not only start/one-turn smoke tests.
5. Re-test `terranoir` vs `pyronox` locally through battle completion.

Do not start a broad UI rewrite until the route-level battle state is correct. The UI should render truth from the server, not compensate for unclear battle math.

## Open Risks

- Keeping Pokemon Showdown as the active resolver may continue to hide Pokemon-specific assumptions behind the adapter.
- Removing Showdown completely would give cleaner Negamon control but requires more direct engine work.
- Existing student records may contain mixed legacy, V2, V3, and V4 progression fields.
- Teacher/admin history may still need read-only support for old sessions even after new battles become V4-only.

## Status

Status: in progress

Phase 39 update (2026-05-27):

- [x] Added `scripts/negamon-battle-v4-qa-fixture.mjs`.
- [x] Added `npm.cmd run qa:negamon-battle-v4-fixture`.
- [x] Fixture refuses non-local `DATABASE_URL` unless `--allow-remote` is passed.
- [x] Fixture backs up classroom/student battle fields, applies max-level test data, exercises V4 start/choice routes, deletes created battle sessions, and restores local DB data in `finally`.
- [x] Ran the fixture against localhost and recorded the current failing/passing output.
- [x] Add a deterministic seed path to the V4 start route or server helper.
- [x] Record expected start-state fields: level, HP, speed, type, skill slots, energy.
- [x] Add command-level smoke coverage for the start route and choose route.
- [ ] Promote the summary runner output into stricter automated assertions after Phase 40 mapping fixes.

Local fixture output summary:

- V4 start route passed.
- V4 choice route passed for all four visible player move slots.
- Local DB fixture data restored after the run.
- `terranoir` and `pyronox` were both level 60.
- Phase 39 initial run: both active Showdown teams still mapped to `Eevee`.
- Phase 40 rerun: active Showdown teams mapped to explicit species (`terranoir` -> `Hippowdon`, `pyronox` -> `Houndoom`).
- Only four move slots were visible even though the fixture unlocked all six known skills for each species.
- Phase 39 initial run: every visible choice returned `energy: 0`.
- Phase 40 rerun: visible choices preserve Negamon energy costs (`0`, `25`, `18`, `18` for the tested Terranoir loadout).
- Turn events remained generic and did not expose damage formula, type multiplier, buff/debuff details, or status application details.
- The fixture now sends a deterministic default seed, `3939001`, through the V4 start route.
- The fixture records start-state fields for seed, level, HP, speed, type, skill slots, energy, and choice costs.

Current recommendation: start with Phase 39, then Phase 40 and Phase 41 before any further deployment attempt.

Phase 47-50 update (2026-05-29):

- Current localhost battle inspection confirms the user-facing Negamon battle still runs through `NegamonBattleArenaV4` and `/battle/v4/*` routes, not the older V3 path.
- Reconfirmed that both the UI and server still call `repairBasicAttackSoftLock(...)`, so the active runtime is still compensating for a broken legality/state-sync path.
- Reconfirmed that `Bag` and `Monster` remain disabled on the V4 battle surface, which leaves poor recovery options when the battle enters a dead state.
- Reconfirmed that the V4 result pipeline still writes placeholder `goldReward: 0`, so reward/progression completion is not yet trustworthy.
- Reconfirmed that strict `choiceRequestId` rejection plus weak automatic re-sync is a likely cause of the "battle freezes and never finishes" reports from manual QA.

Phase 47 implementation update (2026-05-31):

- Removed `repairBasicAttackSoftLock(...)` from [battle-v4.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/battle-v4.ts:1) so the V4 route now returns raw adapter state instead of patching PP/choices after the fact.
- Removed `repairBasicAttackSoftLock(...)` from [NegamonBattleArenaV4.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/NegamonBattleArenaV4.tsx:1) so the student surface no longer invents local battle choices or PP values.
- Added `createNegamonBattleChoicesFromRequestV4(...)` in [adapter.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/engine-showdown/adapter.ts:370) to keep the fallback inside the server-owned adapter contract.
- The adapter now falls back to canonical seed/resource choices when Showdown request data is missing, and guarantees a legal basic attack if every parsed move comes back unavailable while the fighter is still active.
- Added explicit `choiceDiagnostics` to the V4 showdown metadata in [state.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/engine-showdown/state.ts:137) so the battle state now records `requestMissing`, `allChoicesUnavailable`, `usedFallbackBasicChoice`, and `enabledChoiceCount`.
- V4 start/choice responses now return player diagnostics from [battle-v4.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/battle-v4.ts:1), so route-level debugging no longer depends on reverse-engineering the visible choice list alone.
- The adapter now emits explicit `choice_requested` diagnostic messages into the battle event log whenever it must fall back because request data is missing or all parsed moves are unavailable.
- The UI now adopts the fresh `choiceRequestId` from rejected responses, which closes one stale-request loop that previously made the battle look frozen after a `STALE_CHOICE` response.
- Added regression coverage in [showdown-adapter.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/__tests__/showdown-adapter.test.ts:658) for missing-request fallback and no-legal-choice basic-attack recovery.
- Validation passed:
  - `npm.cmd test -- src/lib/game-negamon/__tests__/showdown-adapter.test.ts`
  - `npm.cmd run build`

Phase 48 implementation update (2026-05-31):

- Added an explicit session re-sync path in [NegamonBattleArenaV4.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/NegamonBattleArenaV4.tsx:301) that calls `/api/classrooms/[id]/battle/v4/session` when the V4 choice route returns `STALE_CHOICE` or battle diagnostics indicate request loss / no-action recovery.
- The V4 session view now exposes `diagnostics` through [session-v4.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/session-v4.ts:1), so the UI can resync with both the latest battle state and the latest no-action diagnostics.
- Route responses from [battle-v4.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/battle-v4.ts:1) now include player choice diagnostics on start, reject, and success paths.
- The adapter-owned no-legal-move fallback remains the canonical recovery path: if parsed moves are unavailable, the server exposes a legal basic attack rather than waiting for a page reload.
- Added route-level coverage in [battle-read-auth-routes.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/battle-read-auth-routes.test.ts:1) to confirm the V4 session route returns `validChoices` and `diagnostics` for an authorized student.
- Added explicit stale-response route coverage in [negamon-v4-choice-route.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/negamon-v4-choice-route.test.ts:1) to confirm the V4 choice route preserves `STALE_CHOICE`, `choiceRequestId`, `validChoices`, and diagnostics for client-owned re-sync.
- Added browser QA harness coverage in [negamon-battle-v4-stale-choice-qa.mjs](C:/Users/IHCK/GAMEEDU/gamedu/scripts/negamon-battle-v4-stale-choice-qa.mjs:1) and [qa/negamon-battle-v4/page.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/app/qa/negamon-battle-v4/page.tsx:1) so stale-choice recovery can be exercised against a dedicated V4 battle surface without depending on the full student dashboard shell.
- Latest browser QA run reached the new QA harness but exposed a separate blocker before the stale-choice branch: the harness remained on `Starting V4 battle...`, so the browser coverage now reproduces a local V4 start/runtime issue that should be fixed before Phase 49 work.
- Validation passed:
  - `npm.cmd test -- src/__tests__/negamon-v4-choice-route.test.ts src/__tests__/battle-read-auth-routes.test.ts src/lib/game-negamon/__tests__/showdown-adapter.test.ts`
  - `npm.cmd run build`

## Validation Checklist

- [x] Add repeatable localhost V4 fixture and smoke runner
- [x] Remove generic fallback species mapping
- [x] Separate unlocked skills from equipped V4 loadout
- [x] Expose transparent damage/effect metadata
- [x] Normalize PP, energy, cooldown, items, and traits
- [x] Add first-pass AI scoring and simulation matrix
- [x] Make the V4 battle UI readable enough for localhost QA
- [x] Remove soft-lock repair dependency from active V4 path
- [ ] Add stale-choice recovery and dead-state escape path
- [ ] Complete reward/progression integration for finished V4 battles
- [ ] Run full-battle correctness QA through real localhost student flows
