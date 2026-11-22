# Civilization Idle Progress

Original prompt: **Phase 2**

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
