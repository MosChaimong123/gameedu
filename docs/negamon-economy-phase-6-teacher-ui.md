# Negamon Economy Phase 6 Teacher UI

Phase 6 adds a teacher-facing Economy tab inside the classroom page so ledger data is usable without
calling APIs manually.

## Completed

- Added classroom tab: `economy`.
- Added UI panel component for ledger inspection:
  - file: `src/components/classroom/classroom-economy-ledger-tab.tsx`
  - supports filters: `studentId`, `source`, `type`, `limit`
  - shows summary cards: row count, earned, spent, net
  - shows transaction table with amount and balance-before/after
  - supports CSV export via the existing export API
- Updated classroom query normalization to allow `?tab=economy`.
- Added/updated translations for economy tab and ledger UI labels in EN/TH.

## Verification

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd prisma validate`
- `node .\node_modules\vitest\vitest.mjs run src\__tests__\dashboard-classroom-page.test.ts src\__tests__\classroom-economy-ledger-route.test.ts src\__tests__\classroom-economy-ledger-export-route.test.ts --config vitest.config.mts --pool threads`
