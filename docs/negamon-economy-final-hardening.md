# Negamon Economy Final Hardening

This closes the remaining practical work after the ledger UI:

- economy analytics API for trends and source/student breakdowns,
- teacher manual gold adjustment with ledger rows,
- classroom Economy tab integration for charts, top movement, ledger, CSV export, and adjustment.

## Completed

- Added `GET /api/classrooms/[id]/economy/analytics`.
  - Teacher scoped.
  - Supports `days=7|30|90`.
  - Returns totals, daily earned/spent/net, source totals, type totals, and top student movement.
- Added `POST /api/classrooms/[id]/economy/adjust`.
  - Teacher scoped.
  - Validates non-zero bounded integer adjustments.
  - Blocks negative resulting balances.
  - Writes `EconomyTransaction` with `source: "admin_adjustment"`.
- Expanded the classroom Economy tab.
  - Shows 30-day earned/spent trend.
  - Shows top student gold movement.
  - Keeps ledger filters and CSV export.
  - Adds manual adjustment form with classroom student picker.
- Added focused tests for analytics and adjustment routes.

## Verification

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd prisma validate`
- `node .\node_modules\vitest\vitest.mjs run src\__tests__\classroom-economy-ledger-route.test.ts src\__tests__\classroom-economy-ledger-export-route.test.ts src\__tests__\classroom-economy-analytics-route.test.ts src\__tests__\classroom-economy-adjust-route.test.ts src\__tests__\dashboard-classroom-page.test.ts src\__tests__\battle-reward-ledger.test.ts src\__tests__\student-shop-ledger.test.ts src\__tests__\student-passive-gold-route.test.ts src\__tests__\student-checkin-route.test.ts src\__tests__\student-quest-ledger.test.ts --config vitest.config.mts --pool threads`
