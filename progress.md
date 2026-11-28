# Civilization Idle Progress

Original prompt: **Phase 2**

## Information Age Update (2026-11-27)

- [x] Upgrade save schema/content to v4 with automatic v1/v2/v3 migration.
- [x] Add circuits, data, compute, digital facilities, research, and Information Age progression.
- [x] Add a non-stored compute grid backed by powered Data Centers.
- [x] Add three deterministic server automation rules with capped scheduler slots.
- [x] Add Information completion requirements and guided milestones.
- [x] Add Thai/English UI, preview state, exact research benefits, and a dedicated hero asset.
- [x] Pass 61 focused tests, TypeScript, scoped ESLint, and architecture checks.
- [x] Complete production build and desktop/mobile browser QA.
- [ ] Sign off the 125-hour Information pacing only after staging telemetry.

Browser QA notes:
- Fixed the Information preview prerequisite chain by including `efficient_generator` before `factory_automation`.
- Verified the power/compute grid and automation rule interaction at desktop and 390x844 mobile sizes.
- Hid the mobile resource-rail scrollbar while preserving horizontal swipe and snap behavior.
- `render_game_to_text` now includes automation and era-completion state; the latest client artifact is under `output/phase4-qa/latest`.
- The standalone Playwright client only reports the expected missing local Socket.IO service on port 3001; the Civilization preview itself has no console errors.

Report: `docs/civilization-idle-phase-4-information-report.md`

## Industrial Age Update (2026-11-26)

- [x] Upgrade save schema/content to v3 with automatic v1/v2 migration.
- [x] Add Industrial resources, action, coal worker, buildings, tech tree, repeat research, and factories.
- [x] Add a non-stored power grid with all-or-nothing allocation and three factory priorities.
- [x] Add Industrial completion requirements and guided milestones.
- [x] Add Thai/English UI, responsive Industrial preview, and a dedicated Industrial hero asset.
- [x] Pass 50 focused tests, TypeScript, scoped ESLint, architecture guard, and desktop/mobile browser QA.
- [ ] Sign off the 105-hour Industrial pacing only after staging telemetry.

Report: `docs/civilization-idle-phase-3-industrial-report.md`

## Stone/Bronze Expansion Update (2026-11-26)

- [x] Upgrade save schema/content to v2 with automatic v1 migration.
- [x] Add action level 10, converter level 15, bounded repeat-building caps, job mastery, repeatable research, and city policies.
- [x] Add 12 guided milestones and expose the next objective in the game UI.
- [x] Require all three metal factories and 20 of each metal before Steam Power completes Bronze.
- [x] Add Thai/English UI for mastery, policy effects, advanced research, caps, and completion requirements.
- [x] Update deterministic baseline strategies for the mandatory metal chain.
- [ ] Sign off the 45-hour Stone + 75-hour Bronze pacing only after staging telemetry; local baseline is not pacing evidence.

Report: `docs/civilization-idle-phase-2-stone-bronze-report.md`

## Scope

Persist the deterministic Civilization Idle state behind student access APIs.
Add command idempotency and optimistic revision checks without adding game UI,
applying the Prisma schema to a database, or enabling production.

## Progress

- [x] Read Phase 0 gameplay specification and repository test conventions.
- [x] Add typed content catalog and initial state.
- [x] Add deterministic simulation and commands.
- [x] Add invariant checks and unit tests.
- [x] Run focused tests and TypeScript verification.
- [x] Update implementation documents with Phase 1 status.
- [x] Add isolated Prisma profile and command receipt models.
- [x] Add strict Zod schemas for snapshots and commands.
- [x] Add read-only state loading and atomic command persistence service.
- [x] Add command replay, payload-conflict, and revision-conflict handling.
- [x] Add feature-gated student access state, command, and sync APIs.
- [x] Add service and route authorization/validation tests.
- [x] Run Phase 2 tests, TypeScript, scoped ESLint, Prisma validation, and architecture guard.
- [x] Add the feature-gated `/student/access/civilization` server page.
- [x] Add a bilingual Stone Age game workspace for desktop and mobile.
- [x] Add resource, action, building, worker, research, event, and sync states.
- [x] Add a serial client command queue with stable command IDs, retry, and revision recovery.
- [x] Add a dashboard entry point that appears only while the feature flag is enabled.
- [x] Add a development-only in-memory preview for browser QA without MongoDB writes.
- [x] Run interaction and visual QA across desktop and a 390px mobile viewport.
- [x] Run Phase 3 tests, TypeScript, scoped ESLint, architecture guard, and production build.
- [x] Add server-authoritative offline simulation with an eight-hour cap and resource summary.
- [x] Handle backward server time and discard capped elapsed time without repeat rewards.
- [x] Add concurrent sync and idempotent replay coverage.
- [x] Add the Bronze Age transition, visual state, resources, actions, buildings, and research.
- [x] Add converter purchase, enable/pause controls, costs, inputs, and outputs.
- [x] Add the return-to-game summary dialog for offline gains and capped time.
- [x] Run Phase 4 interaction and responsive browser QA.
- [x] Run Phase 4 focused tests, TypeScript, scoped ESLint, architecture guard, and production build.
- [x] Add classroom-scoped pilot allowlisting across dashboard, page, and APIs.
- [x] Keep the Render deployment dark by default and document pilot environment values.
- [x] Back up and apply the Prisma schema to the confirmed local MongoDB target.
- [x] Add and pass guarded real-Mongo create, replay, reload, and cleanup QA.
- [x] Verify feature-off rollback does not call persistence or replace saved state.
- [x] Run assignment, score, attendance, LINE, and Host/Play regression coverage.
- [x] Add the Phase 5 staging, pilot, monitoring, and rollback runbook.
- [x] Add read-only pilot classroom readiness and cleanup-safe allowlist smoke commands.
- [x] Pass local pilot allowlist smoke with 200 for the QA classroom and 404 for a control classroom.
- [x] Show worker production per person and total assigned output using the engine formula.

## Notes

- The existing worktree contains unrelated user changes. Civilization Idle work
  remains isolated to its models, service, APIs, tests, and planning documents.
- The standalone prototype is reference material only; its Zustand store and
  browser persistence are not copied into the engine.
- Phase 1 validation: 23 focused tests passed, scoped ESLint passed, and the
  repository TypeScript check passed.
- Phase 2 validation: 36 focused tests passed across the engine, persistence
  service, and student access routes. TypeScript, scoped ESLint, Prisma schema
  validation, and the architecture guard also passed.
- No Prisma schema was pushed to MongoDB and `CIVILIZATION_IDLE_ENABLED` remains
  disabled by default. Production data and deployment were not touched.
- Phase 3 validation: 44 focused tests passed. Browser QA completed a manual
  action, shelter purchase, worker assignment, and Basic Tools research in one
  serial queue; the resulting revision was 4 with no queued commands. The
  390px viewport measured exactly 390px document width with no horizontal
  overflow. Desktop and mobile screenshots were visually inspected.
- The production build passed. The existing root SocketProvider tried its
  development Socket.IO endpoint on port 3001 during isolated preview QA; this
  expected dev-only connection failure was separated from Civilization errors.
- Real database reload persistence remains a staging task because the Prisma
  schema has deliberately not been applied to any MongoDB target in this phase.
- Phase 4 validation: 45 focused tests passed, including the eight-hour cap,
  backward time, replay, and concurrent sync behavior. Playwright advanced from
  Stone to Bronze, bought and paused a copper smelter, observed revision 2 with
  no queued commands, and found no Civilization console errors. The 390px
  viewport had no horizontal overflow, and the offline summary was visually
  checked with gains and the capped-time notice.
- `CIVILIZATION_IDLE_ENABLED` remains disabled by default. Phase 4 did not apply
  the Prisma schema, write production data, or deploy the feature.
- Phase 5 local staging validation applied the schema only to `localhost/gamedu`
  after creating a MongoDB archive backup. The guarded persistence QA passed and
  removed its temporary profile and command receipt.
- Production remains unchanged. Render defaults the feature to disabled, and a
  real staging dark deploy plus selected pilot Classroom ObjectIds are still
  required before enabling users.
- Worker rows previously displayed only the fixed per-person base rate, so adding
  workers looked ineffective even though simulation multiplied production by the
  assigned count. The UI now shows effective per-person and total output, including
  research bonuses and the starvation multiplier.
- Local production-mode dark-deploy smoke returned 200 from `/api/ready` and
  404 from both the Civilization page and state API while the feature was off.
- Render CLI was not installed on this workstation, so Blueprint validation
  remains a staging/CI step before applying the Render configuration.
- Local pilot uses `QA Core Classroom` (`69f809ddb6be9839a2684b77`) only. The
  smoke run returned 200 for that class and 404 for a non-pilot class, then
  removed both temporary student access sessions (`remainingSmokeSessions=0`).
- No staging `DATABASE_URL` or Render API/MCP connection is configured in this
  workspace, so the real staging deploy has not been attempted. Production was
  not touched.
## 2026-11-25 - Civilization research benefit descriptions

- Added Thai and English benefit descriptions to every Stone and Bronze Age research card.
- Research cards now state the exact production bonus, cooldown reduction, growth bonus, converter unlock, era unlock, or completion effect.
- Kept card actions aligned and verified desktop/mobile layouts.

## 2026-11-25 - Civilization converter upgrades

- Exposed the existing converter count scaling as visible factory levels and upgrades.
- Factory cards now show the current level, effective total input/output rates, next-level cost, pause/resume control, and upgrade action.
- Shared converter-rate calculations between simulation and UI and added level-two cost/output coverage.

## 2026-11-27 - Civilization Phase 5 Space Age

- [x] Add schema/content v5 and migrate v1-v4 saves with safe Space defaults.
- [x] Add Space resources, buildings, six technologies, three powered factories, and two capped repeatable upgrades.
- [x] Add a server-authoritative four-stage evacuation ship project with no automatic reset.
- [x] Require the test center during assembly and an evacuation port, 12 Power, and 4 Compute for the final stage.
- [x] Add Thai/English benefit copy, Space milestones, generated hero art, preview mode, and responsive UI.
- [x] Pass 86 focused tests, TypeScript, ESLint, architecture guard, and production build.
- [x] Inspect desktop and 390x844 screenshots and complete a stage 2 -> 3 interaction with revision 1, queue 0, and no console errors.
- Phase 6 follow-up completed: permanent reward preview, exactly-one selection, atomic reset, run history, audit, and replay protection.
- Production remains untouched; the feature flag remains off and Phase 5 was not deployed.

## 2026-11-27 - Civilization Phase 6 Prestige

- [x] Upgrade save schema/content to v6 and migrate v1-v5 saves with zeroed permanent rewards.
- [x] Add four capped permanent sidegrade rewards and apply their engine bonuses.
- [x] Add an exactly-one reward dialog with a separate review and final confirmation step.
- [x] Reset progression into the next run while preserving only run metadata and permanent rewards.
- [x] Add atomic `CivilizationRunHistory` audit records inside the command transaction.
- [x] Cover not-ready, stale confirmation, capped reward, reset preservation, replay, and migration behavior.
- [x] Pass 91 Civilization tests (2 integration skips), TypeScript, ESLint, Prisma validation, architecture guard, and production build.
- [x] Inspect desktop confirmation/reset and mobile 390x844 reward selection screenshots.
- Phase 7 local balance gate passes all four strategies: industry 288h, balanced 512h, science 728h, population 752h (570h average).
- Fixed science-cap progression locks, full-data compute shutdown, unsupported population growth, starvation recovery, and QA simulation granularity; save schema is now v7.
- Pilot access now fails closed when the classroom allowlist is empty; global rollout requires the explicit `*` value.
- Next: provide a backed-up staging database target, apply schema v7, run real-Mongo reset/rollback QA, then open the classroom allowlist pilot.
- Production remains untouched; no schema push, commit, deploy, or feature-flag change was performed.
