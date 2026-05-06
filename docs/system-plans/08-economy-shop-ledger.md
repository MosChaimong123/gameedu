# System Plan 08: Economy / Shop / Ledger

Last updated: 2026-05-06

## Scope

- Gold ledger, shop buy/equip, passive gold, admin adjustment, analytics, reconciliation

## Key Files

- `src/app/api/classrooms/[id]/economy/*`
- `src/app/api/student/[code]/shop/buy`
- `src/app/api/student/[code]/shop/equip`
- `src/app/api/student/[code]/claim-passive-gold`
- Prisma: `EconomyTransaction`, `Student`

## Problem Analysis Checklist

- [x] ตรวจ transaction idempotency
- [x] ตรวจ balance ไม่ mismatch กับ ledger
- [x] ตรวจ shop buy/equip ownership และ affordability
- [x] ตรวจ passive gold duplicate claim
- [x] ตรวจ teacher adjustment scope
- [x] ตรวจ CSV export authorization
- [x] ตรวจ reconciliation รายงาน mismatch ชัด

## Improvement Plan

- [x] Review ledger write paths
- [x] Add idempotency keys/service boundary where needed
- [x] Strengthen reconciliation and export tests
- [x] Add teacher adjustment UI QA
- [x] Review economy abuse limits

## Validation

- `npm.cmd test -- src/__tests__/economy-ledger-idempotency.test.ts`
- `npm.cmd test -- src/__tests__/classroom-economy-*-route.test.ts`
- `npm.cmd test -- src/__tests__/student-shop-ledger.test.ts src/__tests__/student-quest-ledger.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Retry/reload ไม่ duplicate gold
- Reconciliation ตรวจและอธิบาย mismatch ได้

## Teacher Adjustment UI QA Checklist

- Open classroom economy adjustment as the owning teacher and verify selected-student and all-class scopes show the target count before submit.
- Submit a positive adjustment and verify the student balance, ledger row, and operation id appear consistently after refresh.
- Submit a negative adjustment that would cross below zero and verify the UI shows the server error without changing any balance.
- Try an adjustment from a non-owner/unauthenticated session and verify it is blocked before student data loads.
- Export the ledger after adjustment and verify CSV values open safely in spreadsheets without formula execution.

## Execution Update

- Reviewed ledger write paths for passive gold, quests, shop purchases, battle rewards, and teacher adjustments.
- Hardened shop equip so `/shop/equip` only accepts owned frame items; battle items can no longer be written into `equippedFrame` even when they exist in inventory.
- Added route tests for battle-item equip rejection and trimmed frame ids, plus passive gold duplicate-claim race coverage.
- Added reconciliation service coverage for `transaction_balance_mismatch` so bad ledger math is reported separately from current balance drift.
- Confirmed teacher adjustment scope, negative-balance prevention, CSV export auth/sanitization, ledger idempotency, and shop affordability/ownership remain covered by tests.

## Checklist Resolution

- Transaction idempotency: covered by `recordEconomyTransaction` idempotency-key tests plus quest/battle ledger idempotency keys.
- Balance mismatch with ledger: covered by ledger math guard and reconciliation route/service mismatch tests.
- Shop buy/equip ownership and affordability: buy is atomic with `gold >= price`; equip now validates item type is `frame` and item is owned.
- Passive gold duplicate claim: covered by `lastGoldAt` compare-and-set test where duplicate claims do not create ledger rows.
- Teacher adjustment scope: covered by owning-teacher classroom checks, selected/all scopes, and negative-balance prevention tests.
- CSV export authorization: covered by auth/teacher-scope tests and spreadsheet formula sanitization test.
- Reconciliation mismatch clarity: covered by chain gap, missing ledger, current balance mismatch, and transaction balance mismatch tests.

## Validation Log

- `npm.cmd test -- src/__tests__/economy-ledger-idempotency.test.ts src/__tests__/economy-reconciliation-service.test.ts src/__tests__/classroom-economy-adjust-route.test.ts src/__tests__/classroom-economy-analytics-route.test.ts src/__tests__/classroom-economy-ledger-export-route.test.ts src/__tests__/classroom-economy-ledger-route.test.ts src/__tests__/classroom-economy-reconciliation-route.test.ts src/__tests__/student-economy-command-routes.test.ts src/__tests__/student-shop-ledger.test.ts src/__tests__/student-quest-ledger.test.ts src/__tests__/student-passive-gold-route.test.ts` passed: 11 files, 28 tests.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed. Prisma generate reported a Windows engine lock, then continued because the existing generated client matched the current schema.
- `npm.cmd run check:economy-shop-ledger` passed on `2026-05-06` with `11 files / 28 tests`.

## Follow-up Fix

- Re-ran strict i18n after the shop equip error-path change; no suspicious hardcoded user-facing strings were found.
- Re-ran full Plan 08 economy validation, lint, and build after the equip hardening to close the follow-up cleanly.
- Build still reports the known Prisma Windows engine lock warning, but the generated client matches the current schema and the build succeeds without stopping the dev server.

## Progress Note 1

- Added one-command economy preflight in [package.json](/C:/Users/IHCK/GAMEEDU/gamedu/package.json): `npm.cmd run test:economy-shop-ledger` and `npm.cmd run check:economy-shop-ledger`.
- Added dedicated handoff checklist in [economy-shop-ledger-manual-qa-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/economy-shop-ledger-manual-qa-checklist.md).
- Staging smoke on `https://www.teachplayedu.com/` passed after creating a temporary classroom fixture: selected and all-class adjustments wrote consistent balances and ledger rows, blocked negative adjustment stayed rejected, shop buy/equip flows matched ledger writes, CSV export kept spreadsheet-like strings sanitized, and reconciliation reported a clean fixture with no warnings or mismatches.
- Temporary staging classroom `69fb65ca93d9f1cbd256649a` was deleted after verification, returning the plan-limit slot immediately.
- Passive-gold duplicate-claim guard was rechecked on the long-lived student fixture `P8JT3L3YBP8R`; repeated claims stayed `alreadyClaimed: true` and did not add ledger rows.
