# Negamon Economy Phase H: Teacher Economy Controls

Phase H expands teacher-facing economy controls while keeping all gold mutations ledger-backed.

## What changed

- `POST /api/classrooms/[id]/economy/adjust` now supports:
  - one student via `studentId`,
  - selected students via `studentIds`,
  - the whole class via `scope: "all"`.
- Bulk adjustments run in a single transaction.
- The route preflights every target student before writing, so an adjustment that would make any balance negative rejects without partial writes.
- Every affected student still receives an `EconomyTransaction` row with:
  - `source: "admin_adjustment"`,
  - `type: "adjust"`,
  - balance before/after,
  - teacher id, reason, operation id, scope, and student count in metadata.
- The classroom Economy tab now includes teacher controls for one student, selected students, or all students.

## Verification

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd prisma validate`
- `node .\node_modules\vitest\vitest.mjs run src\__tests__\battle-read-auth-routes.test.ts src\__tests__\economy-ledger-idempotency.test.ts src\__tests__\classroom-economy-reconciliation-route.test.ts src\__tests__\classroom-economy-ledger-route.test.ts src\__tests__\classroom-economy-ledger-export-route.test.ts src\__tests__\classroom-economy-analytics-route.test.ts src\__tests__\classroom-economy-adjust-route.test.ts src\__tests__\battle-reward-ledger.test.ts src\__tests__\battle-reward-policy.test.ts src\__tests__\student-shop-ledger.test.ts src\__tests__\student-passive-gold-route.test.ts src\__tests__\student-checkin-route.test.ts src\__tests__\student-quest-ledger.test.ts src\lib\__tests__\battle-loadout-and-gold.test.ts src\lib\__tests__\negamon-battle-balance.test.ts --config vitest.config.mts --pool threads`
