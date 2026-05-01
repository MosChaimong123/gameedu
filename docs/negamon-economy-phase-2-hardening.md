# Negamon Economy Phase 2 Hardening

Phase 2 starts from the Phase 1 ledger foundation and tightens high-risk economy writes.

## Completed In This Step

- Battle rewards now write `EconomyTransaction` rows with source `battle`.
- Auto-resolved battles record the winner payout after the `BattleSession` is created.
- Interactive battle finalization records the payout after the pending session is closed.
- Battle ledger metadata includes mode, winner, participants, reward, turns, and battle items.
- Focused test coverage now includes a battle reward ledger regression test.
- Battle rewards are now capped to 5 rewarded wins per student per Bangkok day.
- Repeated battles between the same pair now have a 6-hour reward cooldown.
- Defender preset battle items are no longer consumed when another student challenges them.

## Current Battle Ledger Contract

Battle reward rows use:

- `type`: `earn`
- `source`: `battle`
- `amount`: awarded gold
- `balanceBefore`: winner balance before payout
- `balanceAfter`: winner balance after payout
- `sourceRefId`: `BattleSession.id`
- `idempotencyKey`: `battle:{battleSessionId}:reward`

Metadata:

```json
{
  "mode": "auto",
  "winnerId": "student_id",
  "challengerId": "student_id",
  "defenderId": "student_id",
  "goldReward": 30,
  "requestedGoldReward": 30,
  "totalTurns": 2,
  "rewardBlockedReason": null,
  "rewardPolicy": {
    "goldReward": 30,
    "rewardBlockedReason": null,
    "dailyRewardCount": 1,
    "dailyRewardCap": 5,
    "pairCooldownHours": 6,
    "pairCooldownUntil": null
  },
  "challengerBattleItems": [],
  "defenderBattleItems": []
}
```

## Reward Farming Controls

- Daily cap: after 5 rewarded battle wins in the same Bangkok day, further wins save with `goldReward: 0`.
- Pair cooldown: if the same two students have a rewarded battle within the last 6 hours, further battles between them save with `goldReward: 0`.
- Battles are still saved in history even when reward is blocked, so students can keep playing without creating gold inflation.
- Defender loadouts can still affect defense, but defender inventory is not decremented by an incoming challenge.

## Phase 2 Verification Status

- Prisma schema validation passes.
- Full `tsc --noEmit` passes.
- Focused tests pass for battle reward policy, battle reward ledger, and Phase 1 economy ledgers.

## Deferred To Later Phases

- Move interactive battle authority fully server-side so clients cannot decide winner. This is a Phase 3 battle-security change, not an economy-ledger change.
- Add admin/teacher economy views over `EconomyTransaction`.
- Add optional unique enforcement for idempotency keys after deciding how MongoDB should handle null keys in production.
