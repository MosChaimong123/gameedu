# System Plan 21: Negamon Game System V2 Production Completion

Last updated: 2026-05-23

## Purpose

Plan 20 finished the Game System V2 foundation through Phase 15:

- character and monster contracts
- skill catalog and loadout contracts
- battle engine V2 adapter
- item effect and inventory contracts
- reward pipeline foundation
- student-facing UI V2 panels
- legacy interactive battle removal

This plan covers the next work needed to make Negamon V2 production-complete:

- persist progression and rewards into the database
- migrate shop, inventory, and reward grants to shared contracts
- remove remaining battle-engine compatibility where safe
- connect result UI to real reward finalization
- verify the live student journey end to end

## Current State

Completed:

- `src/lib/game-core/*` contains shared economy, inventory, reward, history, and item contracts.
- `src/lib/game-negamon/core/*` contains V2 monster, skill, battle, item, and reward modules.
- `src/components/game/negamon/*` contains V2 monster, skill, inventory, battle, and reward UI foundations.
- Student battle UI starts through `/api/classrooms/[id]/battle/lite/start`.
- Old interactive battle UI and rollback flag were removed.
- Production build passed before commit `a17f8c0`.

Still remaining:

- reward finalization does not yet persist monster exp/level-up/skill unlocks as first-class student state
- `RewardResultModal` exists but is not wired to actual battle completion payload
- shop/equip routes still need full migration to inventory delta contracts
- `/api/classrooms/[id]/battle` keeps history reads only; POST auto-battle now returns `410` and points clients to Negamon Lite V2
- production browser QA has not been completed after deployment

## Design Rules

- React components must render V2 contracts, not calculate game rules.
- Routes should be adapters: validate input, call `game-core` / `game-negamon`, persist result.
- Inventory changes must flow through `GameInventoryChange`.
- Rewards must flow through `GameRewardResult`.
- Reward finalization must be idempotent.
- DB writes must be auditable through economy ledger, history, or reward audit metadata.
- Keep old compatibility only when it has an explicit production reason.

## Phase 16: Persist Monster Progression

Goal:

- make exp, level-up, and skill unlock durable after battle, quest, attendance, or reward events

Tasks:

- [x] Inventory current DB fields for student monster/progression state
- [x] Decide persistence shape for monster exp and unlocked skills
- [x] Add migration or JSON contract if schema changes are required
- [x] Add server helper to apply `NegamonProgressionRewardSummary`
- [x] Persist exp after battle reward finalization
- [x] Persist newly unlocked skills without duplicates
- [x] Add tests for level-up persistence and duplicate unlock prevention

Exit criteria:

- after a rewarded battle, refresh still shows updated exp and unlocked skills

Status: completed on 2026-05-23 as progression persistence foundation.

Phase 16 implementation notes:

- Reused existing `Student.behaviorPoints` as the durable monster progression source and `Student.negamonSkills` as the durable unlocked/equipped skill list.
- Avoided Prisma schema changes in this phase because the existing fields can represent the current progression contract.
- Added `game-negamon/server/progression.ts` to convert V2 EXP deltas into behavior point increments using `expPerPoint`.
- Added duplicate-safe skill unlock merging so persisted `negamonSkills` does not accumulate repeated ids.
- Wired lite battle finalization to apply progression after a successful winner reward finalization.
- Added progression metadata to the battle economy ledger entry for traceability.
- Added tests for progression planning, behavior point persistence, duplicate skill prevention, and no-op persistence.

Implementation notes:

- Prefer a small adapter under `src/lib/game-negamon/server/progression.ts`.
- Do not let `StudentDashboardClient` calculate persisted progression.
- If Prisma schema is changed, commit it separately from local LINE bot/config work.

## Phase 17: Reward Finalization Integration

Goal:

- connect `createNegamonBattleRewardFinalizationPlan` to real battle completion

Tasks:

- [x] Extend lite battle final response with V2 reward summary
- [x] Use one idempotency key for gold, exp, items, and level-up
- [x] Apply inventory reward grants through `GameInventoryChange`
- [x] Apply consumed battle item changes through the same finalization path
- [x] Record reward audit/history events for level-up and skill unlock
- [x] Prevent duplicate finalize on repeated choice/session calls
- [x] Add integration tests for duplicate battle finalization

Exit criteria:

- one completed battle cannot grant gold, exp, item, level-up, or unlock twice

Phase 17 implementation notes:

- Persisted the final lite battle result with `rewardIdempotencyKey`, V2 `reward`, and progression summary after successful winner finalization.
- Reused the battle finalization idempotency key across the returned reward summary and persisted session result.
- Added a completed-session retry path so repeated `/battle/lite/choice` calls return the existing final result without awarding gold, EXP, skills, or ledger entries again.
- Added reward/progression metadata to the battle economy ledger entry for auditability.
- Persisted V2 reward `historyEvents` on the finished battle session result.
- Added `PointHistory` rows from finalized reward history events so battle reward, level-up, and skill-unlock outcomes are queryable from student history data.
- Added integration coverage for final payload persistence and completed-session retry behavior.

Remaining follow-up:

- Lite battle currently has no item reward table, so item grant/consume integration is wired through the V2 finalization contract and downstream inventory contracts, but no battle item reward IDs are emitted yet.

## Phase 18: Shop and Inventory Route Migration

Goal:

- make shop buy, equip, consume, and grant item flows use V2 contracts

Tasks:

- [x] Audit `/api/student/[code]/shop/buy`
- [x] Audit `/api/student/[code]/shop/equip`
- [x] Audit `/api/student/[code]/battle-loadout`
- [x] Replace ad hoc inventory mutations with `GameInventoryChange`
- [x] Use `GameItemDefinition` or V2 item catalog for battle item validation
- [x] Add item effect summaries to shop responses
- [x] Add tests for buy/equip/consume/grant contract consistency

Exit criteria:

- shop, inventory, battle consume, and reward item grant share one mutation contract

Phase 18 implementation notes:

- Shop purchases now apply `createShopPurchasePlan().inventoryChange` through `applyInventoryChange` before persisting the updated inventory.
- Shop purchase responses include `inventoryChange` and `itemEffects`; battle items map to V2 `GameItemEffect` summaries from the Negamon battle item catalog.
- Frame equip responses now include the same response shape with `inventoryChange`, `itemEffects`, and `gameState`.
- Battle loadout migration now validates through `validateNegamonBattleItemLoadout`, returns consumed-item `inventoryChange`, and exposes item effect summaries for the selected loadout.
- Legacy auto battle now records challenger/defender consumed-item inventory changes in the saved result and economy ledger metadata.
- Added focused tests for purchase inventory deltas, battle item effect summaries, and loadout validation.

## Phase 19: Battle Engine Consolidation

Goal:

- reduce remaining dependency on old `src/lib/battle-engine.ts`

Tasks:

- [x] Inventory all remaining imports of `src/lib/battle-engine.ts`
- [x] Move gold reward calculation into `game-negamon/core/battle-rewards.ts`
- [x] Move any needed constants into V2 modules
- [x] Replace `/api/classrooms/[id]/battle` auto-battle implementation or mark it admin-only compatibility
- [x] Update tests that still validate old battle internals
- [x] Remove old engine only when no production route depends on it

Exit criteria:

- student and teacher Negamon flows no longer depend on `src/lib/battle-engine.ts`

Phase 19 implementation notes:

- Added V2 battle constants in `game-negamon/core/battle-constants.ts` for gold cap/base and ignore-defense retained multiplier.
- Moved battle gold reward math into `calculateNegamonBattleGoldReward` under `game-negamon/core/battle-rewards.ts`.
- Removed `src/lib/battle-engine.ts` after confirming active student and teacher routes no longer import it.
- Updated move presentation UI helpers to import constants from V2 instead of the legacy engine.
- Retired legacy POST auto battle at `/api/classrooms/[id]/battle` with a `410` response; live student battle creation remains `/battle/lite/start`.
- Kept history GET on `/api/classrooms/[id]/battle` because the battle history panel still reads existing `BattleSession` records.
- Removed legacy battle-engine balance tests; remaining battle coverage now targets V2 contracts, lite battle routes, and inventory/reward contracts.

## Phase 20: Reward Result UI Wiring

Goal:

- show actual reward, level-up, and skill unlock results after battle

Tasks:

- [x] Add V2 reward summary to `/battle/lite/choice` final payload
- [x] Wire `RewardResultModal` into `BattleV2Arena` or `BattleTab`
- [x] Refresh monster snapshot after final reward
- [x] Refresh inventory after consumed or granted items
- [x] Refresh history after reward audit entry
- [x] Add empty, blocked, duplicate, and level-up states
- [x] Verify mobile layout

Exit criteria:

- after battle completion, student sees gold, exp, level-up, skill unlock, and item changes without manual reload

Phase 20 implementation notes:

- `NegamonLiteBattleArena` now opens `RewardResultModal` from the actual V2 final `reward` payload returned by `/battle/lite/choice`.
- Battle final callbacks now pass the full final reward payload through `BattleTab`, `StudentGameTabs`, and `StudentDashboardMainTabs`.
- `StudentDashboardClient` applies final progression to local dashboard state by patching `behaviorPoints` and `negamonSkills`, so monster snapshot/level/skill unlock UI can refresh immediately.
- Reward item grants are applied through `GameInventoryChange` on the dashboard patch path; consumed battle loadout items continue through the existing consumable-spent callback.
- Battle history refresh is triggered when final reward arrives, so the battle history panel refetches the latest sessions.
- Inline final battle summary now prefers V2 `reward.gold` and `reward.exp` over legacy `goldReward` when present.
- `RewardResultModal` now covers blocked, empty, item-grant, multi-level-up, and skill-unlock states.
- Reward modal is constrained with `max-h`/scrolling and compact spacing for mobile viewports.

Remaining follow-up:

- Browser/mobile visual QA should be repeated after any future modal redesign, but Phase 20 layout constraints are in place and build-verified.

## Phase 21: Quest and Attendance Progression

Goal:

- allow non-battle learning actions to grant monster progression through the same reward contract

Tasks:

- [x] Map daily quest rewards to `GameRewardResult`
- [x] Add optional monster exp for quest completion
- [x] Add attendance/check-in exp using `expPerAttendance`
- [x] Add history entries for quest-driven level-up
- [x] Prevent duplicate quest reward finalization
- [x] Add tests for quest and attendance reward idempotency

Exit criteria:

- assignments, quests, attendance, and battles all feed one progression model

Status: completed on 2026-05-23 as Quest and Attendance Progression.

Phase 21 completion notes:

- Added `game-negamon/core/learning-rewards.ts` so quest and attendance rewards create the same `GameRewardResult`, level-up summaries, skill unlock summaries, and history events used by battle rewards.
- Added `game-negamon/server/learning-history.ts` to persist quest/check-in progression audit rows in `PointHistory`.
- Updated `/api/student/[code]/daily-quests` so successful quest claims return `reward`, `progression`, and `historyEvents` while preserving `newGold`, `goldEarned`, and `gameState`.
- Quest monster EXP is optional and only applies when Negamon is enabled and the student has a configured monster; duplicate quest claims still stop at the existing atomic claim guard before progression is applied.
- Updated `/api/student/[code]/checkin` so first check-in of the Bangkok day grants monster EXP from `expPerAttendance`, returns the shared reward payload, and records progression history.
- Added focused tests for learning reward contracts, quest progression, check-in progression, and duplicate/idempotent route behavior.

## Phase 22: Student Dashboard Production QA

Goal:

- verify the live student experience after V2 migration

Manual QA checklist:

- [ ] open `/student/[code]`
- [ ] switch Learn/Game modes
- [ ] open Monster tab
- [ ] verify MonsterProfilePanel renders actual species/form/stats
- [ ] verify SkillLoadoutPanel renders equipped and unlocked skills
- [ ] verify InventoryItemPanel renders owned battle items and effects
- [ ] start battle from Battle tab
- [ ] choose moves until battle ends
- [ ] verify reward modal or final summary
- [ ] verify inventory decreases after consumed battle items
- [ ] verify gold/history refresh
- [ ] verify mobile width around 390px
- [ ] verify desktop width around 1366px

Automated QA checklist:

- [x] add Playwright smoke for student monster tab
- [x] add Playwright smoke for battle start screen
- [x] add API smoke for lite battle start/session/choice
- [x] add regression test for no legacy interactive mode

Exit criteria:

- production student flow can be demonstrated without console errors or layout overlap

Status: automated QA foundation completed on 2026-05-23.

Phase 22 implementation notes:

- Added `e2e/student-dashboard-v2.asn.spec.ts` with production-capable student dashboard smoke checks.
- The smoke uses `ASN_E2E_STUDENT_CODE` for real student dashboard checks and skips those UI checks when no fixture code is supplied.
- Added stable `data-testid` hooks for the student dashboard mode toggle and tab triggers, avoiding language-dependent QA selectors.
- Added API smoke coverage for lite battle start/session/choice invalid-request contracts.
- Added a regression guard that the student battle tab uses the V2 lite battle start path and no longer imports `LegacyInteractiveBattle`.
- Updated `playwright.asn.config.ts` so production `PLAYWRIGHT_BASE_URL` runs do not start a local dev server.

Phase 22 validation notes:

- Passed: `npm.cmd test -- src/__tests__/student-dashboard-production-qa.test.ts src/__tests__/student-dashboard-header.test.ts src/__tests__/student-dashboard-main-tabs.test.ts`
- Passed: `npm.cmd run check:student-dashboard`
- Passed: `npm.cmd exec -- playwright test -c playwright.asn.config.ts -g "lite battle APIs"`
- Passed: `npm.cmd run build`
- Production UI smoke should be rerun after this phase is deployed with:
  `$env:PLAYWRIGHT_BASE_URL="https://www.teachplayedu.com"; $env:ASN_E2E_STUDENT_CODE="<live student code>"; npm.cmd exec -- playwright test -c playwright.asn.config.ts -g "Student dashboard V2 smoke"`

## Phase 23: Teacher/Admin Visibility

Goal:

- let teachers understand reward/progression events without reading raw DB rows

Tasks:

- [x] Add reward/progression rows to student history where useful
- [x] Add teacher-visible reward audit summary for V2 reward finalize
- [x] Add filters for battle, quest, level-up, skill unlock
- [x] Show blocked reward reasons in readable copy
- [x] Add analytics for exp earned and level-ups

Exit criteria:

- teacher can trace why a student received gold, exp, item, or skill unlock

Status: completed on 2026-05-24 as Teacher/Admin Visibility.

Phase 23 implementation notes:

- Added `/api/classrooms/[id]/negamon/reward-visibility` for teacher-owned classrooms.
- The route combines V2 economy transactions, Negamon `PointHistory` rows, and completed lite battle sessions into one teacher-readable event feed.
- Added filters for `battle`, `quest`, `attendance`, `level_up`, `skill_unlock`, and `blocked`.
- Blocked battle reward reasons now return readable copy such as daily cap and pair cooldown.
- Added summary analytics for total gold, total EXP, reward events, blocked events, level-ups, and skill unlocks.
- Added a classroom ledger panel so teachers can inspect recent V2 reward/progression events without opening raw DB data.
- Added route regression coverage for auth, classroom ownership, summary aggregation, and blocked-reason filtering.

## Phase 24: Cleanup and Release Gate

Goal:

- prepare a clean deploy package and remove unrelated work from release scope

Tasks:

- [x] keep LINE bot work out unless explicitly selected
- [x] keep `.claude`, `.cursor`, and local config out
- [x] decide whether `package.json`, `package-lock.json`, and `prisma/schema.prisma` changes belong to Game System V2
- [x] avoid committing `dist/` unless it is intentionally tracked release output
- [x] run targeted tests
- [x] run `npm.cmd run predev`
- [x] run `npm.cmd run build`
- [x] push to `main`
- [x] verify Render deploy
- [x] verify `/api/health`

Exit criteria:

- deploy is clean, tested, and contains only intended V2 production-completion files

Status: completed on 2026-05-24 as Cleanup and Release Gate.

Phase 24 scope decisions:

- LINE bot files remain out of Game System V2 release scope: `.env.example`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `docs/line-bot-mvp.md`, `src/app/api/webhooks/line/`, `src/lib/line-bot/`, and `src/__tests__/line-webhook-route.test.ts`.
- Local/editor files remain out of release scope: `.claude/settings.local.json`, `.cursor/`, and `test-results/.last-run.json`.
- Generated `dist/` changes remain out of release scope unless a future release explicitly selects tracked build output.
- The Game System V2 production-completion release currently consists of committed Phase 16-23 work plus this release-gate documentation.
- `package.json`, `package-lock.json`, and `prisma/schema.prisma` changes are LINE bot work, not Game System V2 work.

Phase 24 validation notes:

- Passed: `npm.cmd test -- src/lib/game-core/__tests__/game-core.test.ts src/lib/game-negamon/__tests__ src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/battle-reward-ledger.test.ts src/__tests__/classroom-negamon-reward-visibility-route.test.ts`
- Passed: `npm.cmd run predev`
- Passed: `npm.cmd run build`
- Production health endpoint returned `200 OK` on 2026-05-24.

Remaining outside Game System V2:

- Decide separately whether to keep, discard, or branch the LINE bot MVP work.
- Decide separately whether tracked `dist/` files should remain part of the repository long term.

## Validation Commands

Targeted V2 tests:

```powershell
npm.cmd test -- src/lib/game-core/__tests__/game-core.test.ts src/lib/game-negamon/__tests__ src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/battle-reward-ledger.test.ts
```

Type and production gates:

```powershell
npm.cmd run predev
npm.cmd run build
```

Optional broader checks:

```powershell
npm.cmd test -- src/lib/game-quests src/lib/game-shop
npm.cmd run check:i18n:strict
```

## Suggested Build Order

1. Phase 16: Persist Monster Progression
2. Phase 17: Reward Finalization Integration
3. Phase 20: Reward Result UI Wiring
4. Phase 18: Shop and Inventory Route Migration
5. Phase 21: Quest and Attendance Progression
6. Phase 19: Battle Engine Consolidation
7. Phase 22: Student Dashboard Production QA
8. Phase 23: Teacher/Admin Visibility
9. Phase 24: Cleanup and Release Gate

## Risks

- If progression is not persisted, UI V2 will look correct only until refresh.
- If reward finalization is split across routes, duplicate rewards can return.
- If shop and battle consume paths mutate inventory differently, item counts will drift.
- If compatibility shims return without clear ownership, battle balancing can split across multiple engines again.
- If production QA is skipped, UI V2 can pass build but still fail the student journey.

## Definition Of Done

Negamon Game System V2 is production-complete when:

- student battle uses V2 battle flow only
- battle result persists gold, exp, item, level-up, and skill unlock exactly once
- monster tab reflects persisted progression after refresh
- shop and inventory routes use shared V2 inventory contracts
- teacher/admin can trace reward events
- production build passes
- live Render deployment passes student flow QA
