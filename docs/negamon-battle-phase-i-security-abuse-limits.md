# Negamon Battle Phase I: Security + Abuse Limits

Phase I adds battle start abuse limits on top of the server-owned battle flow.

## What changed

- Battle start rate limit:
  - A student can start at most 8 battle sessions per 60 seconds in one classroom.
  - Applies to both auto battles and `beginInteractive`.
  - Returns `429 BATTLE_RATE_LIMITED` with `Retry-After`.
- Interactive pending session limit:
  - A student can keep at most 3 active interactive sessions within the interactive session TTL.
  - Returns `429 INTERACTIVE_SESSION_LIMIT`.
- Limits are checked before battle sessions, inventory consumption, gold payouts, or ledger rows are written.

## Existing Protections This Builds On

- Student actions require matching `studentCode`.
- Interactive turns use optimistic `stateVersion` guards.
- Interactive finalization is server-owned and writes battle rewards through ledger idempotency.
- Battle history/opponent reads are teacher- or student-authorized.

## Verification

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd prisma validate`
- `node .\node_modules\vitest\vitest.mjs run src\__tests__\battle-read-auth-routes.test.ts src\__tests__\economy-ledger-idempotency.test.ts src\__tests__\classroom-economy-reconciliation-route.test.ts src\__tests__\classroom-economy-ledger-route.test.ts src\__tests__\classroom-economy-ledger-export-route.test.ts src\__tests__\classroom-economy-analytics-route.test.ts src\__tests__\classroom-economy-adjust-route.test.ts src\__tests__\battle-reward-ledger.test.ts src\__tests__\battle-reward-policy.test.ts src\__tests__\student-shop-ledger.test.ts src\__tests__\student-passive-gold-route.test.ts src\__tests__\student-checkin-route.test.ts src\__tests__\student-quest-ledger.test.ts src\lib\__tests__\battle-loadout-and-gold.test.ts src\lib\__tests__\negamon-battle-balance.test.ts --config vitest.config.mts --pool threads`
