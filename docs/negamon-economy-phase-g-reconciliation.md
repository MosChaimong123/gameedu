# Negamon Economy Phase G: Reconciliation

Phase G adds a read-only reconciliation layer for the gold economy.

## What changed

- Added a reconciliation service that compares student `gold` against classroom-scoped `EconomyTransaction` rows.
- Added `GET /api/classrooms/[id]/economy/reconciliation` for teacher-scoped reconciliation reports.
- Added an Economy tab health panel showing total students, OK balances, issue count, and current gold total.
- Added route coverage for auth and mismatch detection.

## Issues Detected

- `transaction_balance_mismatch`: a row does not satisfy `balanceAfter = balanceBefore + amount`.
- `ledger_chain_gap`: a student's next row does not continue from the prior `balanceAfter`.
- `current_balance_mismatch`: current `Student.gold` does not match latest ledger `balanceAfter`.
- `missing_ledger`: student has gold but no classroom ledger rows.

## Verification

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd prisma validate`
- `node .\node_modules\vitest\vitest.mjs run src\__tests__\battle-read-auth-routes.test.ts src\__tests__\economy-ledger-idempotency.test.ts src\__tests__\classroom-economy-reconciliation-route.test.ts src\__tests__\classroom-economy-ledger-route.test.ts src\__tests__\classroom-economy-ledger-export-route.test.ts src\__tests__\classroom-economy-analytics-route.test.ts src\__tests__\classroom-economy-adjust-route.test.ts src\__tests__\battle-reward-ledger.test.ts src\__tests__\battle-reward-policy.test.ts src\__tests__\student-shop-ledger.test.ts src\__tests__\student-passive-gold-route.test.ts src\__tests__\student-checkin-route.test.ts src\__tests__\student-quest-ledger.test.ts src\lib\__tests__\battle-loadout-and-gold.test.ts src\lib\__tests__\negamon-battle-balance.test.ts --config vitest.config.mts --pool threads`
