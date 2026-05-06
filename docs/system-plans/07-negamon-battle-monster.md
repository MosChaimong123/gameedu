# System Plan 07: Negamon Battle / Monster

Last updated: 2026-05-06

## Scope

- Monster state, battle engine, moves, passives, statuses, items, battle UI, codex, loadout

## Key Files

- `src/components/negamon/*`
- `src/lib/game-engine`
- `src/lib/negamon`
- `src/app/api/classrooms/[id]/battle`
- `src/app/api/classrooms/[id]/battle/opponents`
- `src/app/api/student/[code]/battle-loadout`
- `src/app/api/student/[code]/negamon/unlock-skill`
- Prisma: `BattleSession`

## Problem Analysis Checklist

- [x] ตรวจ battle engine server-authoritative
- [x] ตรวจ move/status/passive edge cases
- [x] ตรวจ battle session idempotency
- [x] ตรวจ loadout item ownership/category limit
- [x] ตรวจ reward result sync กับ economy
- [x] ตรวจ battle UI hooks/lint/mobile layout
- [x] ตรวจ auto mode/speed/rematch

## Improvement Plan

- [x] Lock battle engine contract with tests
- [x] Add scenario tests for statuses/passives/items
- [x] Separate engine fixes from UI polish
- [x] Add battle UI manual QA checklist
- [x] Review balance/tuning after correctness

## Validation

- `npm.cmd test -- src/lib/game-engine/__tests__/negamon-battle-engine.test.ts`
- `npm.cmd test -- src/lib/__tests__/negamon-battle-balance.test.ts src/lib/__tests__/battle-loadout-and-gold.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Battle result เชื่อถือ server ได้
- UI ไม่มี hook lint errors และเล่น flow หลักจบได้

## Battle UI Manual QA Checklist

- Start a student Negamon battle from mobile width and verify the opponent list, action buttons, HP/EN bars, and battle log remain readable without horizontal scrolling.
- Toggle auto/speed controls during an active fight and verify the server still resolves the actor/action order from session state, not client timing.
- Finish a fight, verify rematch/start-next flow creates a new session instead of replaying the completed session.
- Verify disabled/passive-skill route returns `NEGAMON_PASSIVES_DISABLED` and the UI does not offer purchasable passive upgrades.
- Verify Thai/English battle result, item/loadout errors, and reward text remain translated through existing i18n keys.

## Execution Update

- Locked the Negamon engine contract further with scenario tests for status immunity, item ownership, stack-aware item consumption, and loadout sanitization.
- Fixed battle-engine status event emission so an immune target no longer receives a misleading `status_apply` event when the effect was blocked.
- Confirmed server-authoritative interactive battle flow remains covered by route tests: client-reported saves are rejected, turns use `stateVersion`, stale finalization returns conflict, and reward ledger rows use battle session idempotency keys.
- Confirmed reward result sync to economy through battle reward policy and live reward sync regression tests.
- Kept UI polish separate from engine correctness; lint/build are clean and the manual QA checklist above captures mobile/auto/speed/rematch verification for browser pass.

## Checklist Resolution

- Battle engine server-authoritative: covered by `resolveServerOwnedInteractiveTurn` tests and battle route tests rejecting `saveInteractive` client-reported results.
- Move/status/passive edge cases: covered by balance tests, including IGNORE_DEF, poison/burn passives, speed priority, energy fallback, stat non-stacking, and new immunity assertion.
- Battle session idempotency: covered by pending session limits, `stateVersion` update guards, conflict handling, and ledger idempotency keys.
- Loadout item ownership/category limit: covered by validator tests plus new frame rejection, missing ownership, missing stack, and sanitize tests.
- Reward result sync with economy: covered by battle reward policy, ledger, and Negamon live reward sync tests.
- Battle UI hooks/lint/mobile layout: lint/build passed; mobile/manual UI pass documented in QA checklist.
- Auto mode/speed/rematch: server contract and manual QA checklist now explicitly cover these flows.

## Validation Log

- `npm.cmd test -- src/lib/game-engine/__tests__/negamon-battle-engine.test.ts src/lib/__tests__/negamon-battle-balance.test.ts src/lib/__tests__/battle-loadout-and-gold.test.ts` passed: 3 files, 43 tests.
- `npm.cmd test -- src/__tests__/battle-reward-ledger.test.ts src/__tests__/battle-reward-policy.test.ts src/__tests__/negamon-live-reward-sync.test.ts` passed: 3 files, 20 tests.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed. Prisma generate reported a Windows engine lock, then continued because the existing generated client matched the current schema.
- `npm.cmd run check:negamon-battle` passed on `2026-05-06` with `9 files / 70 tests`.

## Progress Note 1

- Added one-command Negamon preflight in [package.json](/C:/Users/IHCK/GAMEEDU/gamedu/package.json): `npm.cmd run test:negamon-battle` and `npm.cmd run check:negamon-battle`.
- Added dedicated handoff checklist in [negamon-battle-manual-qa-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/negamon-battle-manual-qa-checklist.md).
- Added regression coverage in [negamon-passives-disabled-route.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/negamon-passives-disabled-route.test.ts) so the deprecated passive unlock endpoint is locked to `NEGAMON_PASSIVES_DISABLED`.
- Staging smoke on `https://www.teachplayedu.com/` passed after creating a temporary Negamon fixture: opponent lookup stayed classroom-scoped, invalid battle loadout returned `INVALID_BATTLE_LOADOUT`, passive unlock returned `NEGAMON_PASSIVES_DISABLED`, `saveInteractive` stayed blocked behind `SERVER_AUTHORITATIVE_REQUIRED`, auto battle created session `69fb5fea93d9f1cbd2566497`, interactive battle created session `69fb5feb93d9f1cbd2566499`, and reward sync honored `pair_cooldown` on the second battle.
- Temporary staging classroom `69f9facaeaecc54536c0cdf1` was deleted after the pass, so the plan-limit slot was returned immediately.
