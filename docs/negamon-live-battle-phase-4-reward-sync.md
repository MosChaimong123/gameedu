# Negamon Live Battle Phase 4 Reward Sync

Phase 4 hardens the live-hosted `NEGAMON_BATTLE` reward sync path. The goal is to keep classroom
EXP rewards useful while making repeated sync calls harmless.

## Completed

- Added a v2 encoded `PointHistory.reason` for live battle rewards:
  - shape: `negamon-live-v2|{gamePin}|{rank}|{finalScore}|{startHp}`
  - display formatting still shows the same localized live battle message.
- `syncNegamonBattleRewardsToClassroom` now checks existing `PointHistory` rows before applying EXP.
- Duplicate student/game reward rows are skipped before the transaction, so behavior points are not
  incremented twice for the same live game.
- Audit metadata now includes `skippedDuplicateCount`.
- Added tests for:
  - v2 point-history reason decoding,
  - live battle EXP write with the v2 idempotency reason,
  - duplicate live battle reward skip.

## Verification

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd prisma validate`
- `node .\node_modules\vitest\vitest.mjs run src\__tests__\negamon-live-reward-sync.test.ts src\__tests__\point-history-reason.test.ts src\lib\game-engine\__tests__\negamon-battle-engine.test.ts src\__tests__\battle-reward-policy.test.ts src\__tests__\battle-reward-ledger.test.ts --config vitest.config.mts --pool threads`

## Future Follow-Up

A database-level unique constraint would be stronger than reason-based idempotency, but Prisma/Mongo
would need a dedicated reward-sync model or explicit idempotency field to do that cleanly.
