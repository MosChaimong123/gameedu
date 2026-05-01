# Negamon Battle Phase 3 Server Authority

Phase 3 moves interactive battle resolution away from the browser. The server is now the source of
truth for turn resolution, final winner, battle reward, item consumption, and ledger writes.

## Completed In This Step

- `beginInteractive` now stores a server-owned battle snapshot in `BattleSession.result`.
- Added `turnInteractive` mode for resolving one interactive turn on the server.
- The client sends only `moveId` / actor side for the next turn; it no longer computes the final
  winner or gold reward locally.
- `saveInteractive` now returns `410 SERVER_AUTHORITATIVE_REQUIRED`, closing the old client-reported
  winner/gold path.
- Added a regression test proving legacy client-reported saves are rejected.
- Added focused route tests for `turnInteractive` finalization and stale-session expiry.
- Abandoned interactive sessions expire after 45 minutes, are marked non-pending, and cannot resolve
  another turn.
- The client now shows a short battle-log message when Phase 2 cap/cooldown policy blocks gold.
- Server turn resolution updates fighter HP/status/energy in the session snapshot.
- When a turn ends the battle, the server:
  - computes the winner,
  - computes requested gold,
  - applies Phase 2 reward cap/cooldown policy,
  - consumes challenger battle items,
  - leaves defender inventory intact,
  - updates `BattleSession`,
  - awards gold,
  - writes `EconomyTransaction`.

## Current Server State Shape

`BattleSession.result` for active interactive battles uses:

```json
{
  "mode": "interactive_server",
  "seed": 123,
  "rngCursor": 0,
  "player": {},
  "opponent": {},
  "turns": [],
  "totalTurns": 0,
  "status": "active"
}
```

Finished sessions add:

```json
{
  "status": "finished",
  "winnerId": "student_id",
  "requestedGoldReward": 30,
  "goldReward": 30,
  "rewardBlockedReason": null,
  "rewardPolicy": {}
}
```

## Phase 3 Status

Phase 3 is complete for the current scope. A future cleanup can move the server turn-state helpers
out of the route file if the battle API keeps growing, but that is not required for the Phase 3
server-authority guarantees.

## Verification

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd prisma validate`
- `node .\node_modules\vitest\vitest.mjs run src\__tests__\battle-reward-policy.test.ts src\__tests__\battle-reward-ledger.test.ts src\__tests__\student-shop-ledger.test.ts src\__tests__\student-passive-gold-route.test.ts src\__tests__\student-checkin-route.test.ts src\__tests__\student-quest-ledger.test.ts src\__tests__\dashboard-classroom-page.test.ts --config vitest.config.mts --pool threads`
