# System Plan 23: Negamon Content Pack and Live Balance QA

Last updated: 2026-05-24

## Purpose

Phase 25-32 finished the main Game System V2 foundation for Negamon:

- content catalog contracts exist
- skill effects and item effects run through V2 logic
- monster traits, evolution, and battle status effects are wired
- quest rewards and teacher visibility are available
- student UI can explain skills, items, battle logs, and rewards
- build and targeted QA passed after Phase 32

This plan starts the next product layer: adding enough real content and live QA coverage so Negamon feels like a playable classroom RPG, not only a working framework.

## Product Goal

Students should be able to build a monster strategy and understand the result.

- Each monster species should have a clear role.
- Skills should create real battle choices.
- Items should support different play styles.
- Quests should push students toward useful learning actions.
- Teachers should be able to inspect balance outcomes before the system becomes too complex.

## Design Rules

- Keep rules in `src/lib/game-negamon/core/*`.
- Keep UI as display and interaction only.
- Keep catalogs stable-id based; never rename ids casually after persistence.
- Add content in small balanced batches, not one huge catalog dump.
- Every new effect must have at least one unit test or route/battle regression test.
- Every new visible surface must be checked at mobile `390px` and desktop `1366px`.
- Do not stage `dist`, local config, LINE bot work, or unrelated package/prisma changes with this plan.

## Current Starting Point

Important files from Phase 25-32:

- `src/lib/game-negamon/core/catalog.ts`
- `src/lib/game-negamon/core/skills.ts`
- `src/lib/game-negamon/core/items.ts`
- `src/lib/game-negamon/core/traits.ts`
- `src/lib/game-negamon/core/evolution.ts`
- `src/lib/game-negamon/core/battle-engine-v2.ts`
- `src/lib/game-negamon/core/status-effects.ts`
- `src/lib/game-negamon/core/reward-rules.ts`
- `src/components/game/negamon/*`
- `src/components/negamon/NegamonLiteBattleArena.tsx`
- `e2e/student-dashboard-v2.asn.spec.ts`

Known constraints:

- Student UI e2e tests require `ASN_E2E_STUDENT_CODE` to run full dashboard checks.
- Catalogs are still code-backed, not teacher-editable from a full admin editor.
- Inventory and loadout persistence currently reuse existing student fields.
- Production deploy should be checked after every pushed phase because Render is the real release gate.

## Phase 33: Content Pack 1

Goal:

- add the first balanced set of real monsters, skills, items, and rewards

Tasks:

- [x] Inventory current species, skills, items, traits, statuses, rewards, and quest chains
- [x] Define 4 monster roles: attacker, defender, support, control
- [x] Add at least 4 playable species with distinct stats, traits, and evolution rules
- [x] Add starter skill sets for each role
- [x] Add rank-based skills for early, mid, and evolved forms
- [x] Add at least 8 battle items across restore, buff, immunity, and reward boost categories
- [x] Add reward table entries for common, uncommon, and rare item drops
- [x] Add content contract tests for stable ids and valid references
- [x] Add battle tests proving each role has one meaningful effect
- [x] Update student UI labels only if new content needs clearer display text

Exit criteria:

- student can choose or receive monsters that play differently
- every new skill and item id validates through the content catalog
- targeted tests and production build pass

Phase 33 completion notes:

- Formalized the first content pack around four practical roles: attacker, defender, support, and control.
- Reused the existing eight playable Thai/Himmapan species as the first pack and verified each has moves, traits, and six evolution forms.
- Added restore and immunity battle items: minor potion, energy orb, antidote charm, flame ward, and dream bell.
- Added reward table item drops for easy, normal, hard, and boss wins.
- Added catalog tests for role coverage, item effect coverage, and reward drop references.
- Added battle runtime tests proving attacker, defender, support, and control roles map to real effects.

## Phase 34: Battle Balance Pass 1

Goal:

- tune battle length, damage, energy, cooldowns, and reward pacing

Tasks:

- [x] Create deterministic battle simulation helpers for catalog balance
- [x] Run simulated battles across role matchups
- [x] Tune base damage and scaling so normal battles last a useful number of turns
- [x] Tune energy costs so students cannot spam the strongest move every turn
- [x] Tune cooldowns for status and high-impact skills
- [x] Tune status duration and tick damage
- [x] Tune item restore amounts and buff multipliers
- [x] Add regression tests for overpowered combinations
- [x] Document expected battle length and reward range

Exit criteria:

- no starter build can win only by repeating one overpowering action
- battles are short enough for classroom use but long enough to show strategy

Phase 34 completion notes:

- Added deterministic balance simulation helpers for content-pack role matchups.
- Added battle balance regression coverage for turn range, single-hit burst ceiling, HP pressure, rejected choices, skill gating, item guardrails, and reward output range.
- Tuned hard crowd-control energy costs so caster scaling cannot push PARALYZE/SLEEP/FREEZE-style moves below the pass-1 minimum.
- Documented pass-1 battle expectations in tests: normal role matchups should create meaningful pressure within 16 actions, single hits should stay below 55% max HP, win rewards should stay inside classroom-safe gold/EXP ranges, and item drops should stay at two or fewer ids per reward table row.

## Phase 35: Quest and Reward Content Pass

Goal:

- make daily/weekly/chained quests reward useful game progression

Tasks:

- [x] Add quest chains tied to attendance, assignments, streaks, and battle participation
- [x] Add rewards that include gold, exp, item drops, and skill unlock progress
- [x] Add clear reward rules for repeatable vs one-time quests
- [x] Add cap and idempotency checks for new reward paths
- [x] Add tests for quest chain progression and reward finalization
- [x] Verify teacher reward visibility shows the new reward types

Exit criteria:

- quest progression feels connected to classroom actions
- rewards cannot duplicate through repeat submits or refreshes

Phase 35 completion notes:

- Added centralized quest reward content rules for daily, weekly, and challenge quests so gold, EXP, item drops, skill unlocks, and form progress metadata stay consistent.
- Added new quest chains for attendance streak progression and battle training, including battle played/won conditions.
- Updated quest progress snapshots so daily, weekly, challenge, and chain quest statuses expose item/skill/form rewards to the student UI.
- Updated the student quest claim route to use the shared reward-rule resolver before persistence, keeping existing claim guards and economy ledger idempotency.
- Added tests for mixed quest rewards, reward-rule resolution, reward metadata in snapshots, chain order gates, and battle progression gates.

## Phase 36: Teacher Balance Review

Goal:

- give teachers/admins enough visibility to review game balance before wider release

Tasks:

- [x] Add or refine teacher-facing summaries for top rewarded items, gold, exp, and skill unlocks
- [x] Add balance warning copy for unusually high reward output
- [x] Add filtering by class, student, reward source, and date where already supported
- [x] Add export fields for new content ids and reward rule ids
- [x] Add tests for visibility route shape and permission boundaries
- [x] Document how a teacher should interpret balance data

Exit criteria:

- teacher/admin can answer: who received what, from which activity, and why

Phase 36 completion notes:

- Expanded the teacher balance report with reward gold by source, reward count by source, EXP by source, item usage, skill unlock usage, top reward sources, top rewarded items, and top unlocked skills.
- Added balance warnings for unusually high quest/battle rewards, high unresolved battle rate, and repeated item reward concentration.
- Added route filters for `studentId`, `source`, `from`, and `to` on the classroom Negamon balance endpoint.
- Returned the active filters in the API payload so teacher/admin UI can explain the current report scope.
- Kept permission boundaries unchanged: the route still requires an authenticated teacher and classroom ownership.
- Teacher interpretation guide: use `summary.rewardGoldBySource` for economy pressure, `summary.expBySource` for progression pressure, `rewardReview.topItems` and `rewardReview.topSkillUnlocks` for content concentration, and `balanceWarnings` for immediate tuning flags.

## Phase 37: Student Playtest QA

Goal:

- test the real student loop end to end with production-like data

Tasks:

- [ ] Prepare one test classroom and at least one test student code
- [ ] Run student dashboard e2e with `ASN_E2E_STUDENT_CODE`
- [ ] Test monster tab on desktop and mobile
- [ ] Test battle start, skill choice, item display, battle result, and reward modal
- [ ] Test shop buy/equip route with new items
- [ ] Test quest claim and reward finalization
- [ ] Check no horizontal overflow at `390px`
- [ ] Check no console errors in student dashboard flows
- [x] Record manual QA notes in this plan

Exit criteria:

- a real student code can play the new loop without legacy fallback or unclear reward output

Phase 37 QA notes:

- `ASN_E2E_STUDENT_CODE` was not present in the local environment, so full real-student dashboard playtest remains blocked.
- Added gated Playwright coverage for quest reward metadata and shop content-pack battle item categories. These checks run automatically once `ASN_E2E_STUDENT_CODE` is provided.
- Existing gated Playwright checks cover monster tab desktop/mobile, battle start without legacy fallback, battle skill/item/effect surfaces, horizontal overflow, and console errors.
- Ran `npm.cmd run test:e2e:asn`: 3 passed, 9 skipped. The skipped cases are the student dashboard and deep-link cases that require environment-specific student/classroom data.
- Code-less QA smoke confirmed health, lite battle invalid-request contracts, and reward audit auth gate still pass.
- Remaining manual QA blocker: prepare one production-like test classroom and student code, set `ASN_E2E_STUDENT_CODE`, then rerun Playwright to execute the skipped student UI checks.

## Phase 38: Release Gate

Goal:

- prepare the content pack for production deploy

Tasks:

- [x] Run targeted catalog, battle, item, reward, quest, and visibility tests
- [x] Run `npm.cmd run predev`
- [x] Run `npm.cmd run build`
- [x] Run Playwright ASN smoke
- [x] Confirm no unrelated files are staged
- [x] Commit content pack and QA changes
- [x] Push `main`
- [ ] Confirm Render deploy status for the pushed commit

Exit criteria:

- production deploy is live on Render and Phase 33-38 checklist is updated

Phase 38 release notes:

- Targeted release tests passed: 9 files, 47 tests.
- `npm.cmd run predev` passed.
- `npm.cmd run build` passed.
- `npm.cmd run test:e2e:asn` passed with 3 passed and 9 skipped. The skipped cases require `ASN_E2E_STUDENT_CODE` or environment-specific deep-link data.
- Release staging intentionally excludes existing unrelated dirty files such as `dist`, LINE bot files, local config, package/prisma drift, and test result metadata.
- Render deploy status must be confirmed after the pushed commit appears in Render.

## Recommended Build Order

1. Phase 33: Content Pack 1
2. Phase 34: Battle Balance Pass 1
3. Phase 35: Quest and Reward Content Pass
4. Phase 36: Teacher Balance Review
5. Phase 37: Student Playtest QA
6. Phase 38: Release Gate

## First Implementation Slice

Start narrow:

1. Add one attacker, one defender, one support, and one control monster.
2. Add two skills per role.
3. Add four battle items.
4. Add one reward table that can drop those items.
5. Add one simulation or battle test per role.
6. Verify the student battle UI explains the result.

This creates visible gameplay value without turning the catalog into a hard-to-balance content dump.

## Validation Commands

Targeted content and battle tests:

```powershell
npm.cmd test -- src/lib/game-negamon/__tests__
```

Reward and quest tests:

```powershell
npm.cmd test -- src/lib/game-quests src/lib/game-shop src/__tests__/battle-reward-ledger.test.ts
```

Student dashboard smoke:

```powershell
npm.cmd run test:e2e:asn
```

Production gates:

```powershell
npm.cmd run predev
npm.cmd run build
```

## Risks

- Too many new skills at once will make balance bugs harder to isolate.
- Strong item effects can bypass intended battle pacing.
- Reward tables can inflate gold or item counts if caps are not checked.
- Catalog id changes can break persisted loadouts and inventory.
- Student UI can become crowded if every effect is displayed with full text.

## Definition Of Done

This plan is complete when:

- Negamon has a first real balanced content pack
- battle roles feel different in real student play
- quests and rewards grant useful progression without duplication
- teacher visibility explains new rewards and balance signals
- mobile and desktop student UI pass smoke QA
- targeted tests, `predev`, production build, and Render deploy pass
