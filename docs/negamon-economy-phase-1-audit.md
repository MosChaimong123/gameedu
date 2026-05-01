# Negamon Economy Phase 1 Audit

This document defines the first stabilization phase for the Negamon / Battle / Economy system.
Phase 1 focuses on auditability and data foundations before changing reward rules or battle
authority.

## Current Scope

Negamon economy state is currently stored primarily on `Student`:

- `gold`: spendable balance.
- `lastGoldAt`: passive gold accrual checkpoint.
- `lastCheckIn` and `streak`: daily check-in state.
- `inventory`: owned frame and battle item ids. Battle items are stackable by repeated ids.
- `battleLoadout`: selected battle item ids.
- `equippedFrame`: active cosmetic frame, also used for passive gold multiplier.
- `dailyQuestsClaimed`, `weeklyQuestsClaimed`, `challengeQuestsClaimed`: quest claim state.
- `behaviorPoints`: Negamon rank/progression input.

Battle rewards are written through `BattleSession`, while shop/check-in/passive gold currently
mutate `Student.gold` directly.

## Gold Sources

| Source | Current entry point | Notes |
| --- | --- | --- |
| Passive gold | `claimPassiveGold` | Based on academic total, rank gold rate, frame multiplier, active event multiplier, capped to 72 hours. |
| Daily check-in | `checkInStudent` | Based on streak reward and active event multiplier. |
| Quest rewards | daily/weekly/challenge quest routes | Claim state exists on `Student`; reward writes should become ledger-backed. |
| Battle rewards | classroom battle route | Winner receives battle gold; interactive save currently trusts client winner with server-side gold cap. |
| Achievements/events | custom achievement and gamified settings flows | Must record explicit reason and metadata when awarding gold. |
| Admin/manual migration | future admin tools or scripts | Must be auditable because it changes balances outside normal gameplay. |

## Gold Sinks

| Sink | Current entry point | Notes |
| --- | --- | --- |
| Shop frame purchase | `buyStudentShopItem` | Frame ids are unique ownership items. |
| Shop battle item purchase | `buyStudentShopItem` | Battle items are consumable stack entries in `inventory`. |
| Battle item consumption | classroom battle route | Attack and defender loadout items can be removed after battle. |
| Future upgrades | not implemented | Skill unlocks, cosmetics, event entries, or rerolls should all use the ledger. |
| Admin/manual migration | future admin tools or scripts | Negative adjustments must include reason metadata. |

## Ledger Contract

`EconomyTransaction` is append-only. New economy code should write a transaction whenever
`Student.gold` changes.

Required fields:

- `studentId`: owner of the balance change.
- `classId`: classroom context when available.
- `type`: `earn`, `spend`, or `adjust`.
- `source`: one stable source id such as `passive_gold`, `checkin`, `quest`, `battle`, `shop`, `admin_adjustment`, or `migration`.
- `amount`: signed integer. Positive values increase balance; negative values decrease it.
- `balanceBefore`: balance immediately before the mutation.
- `balanceAfter`: balance immediately after the mutation.
- `sourceRefId`: optional ObjectId reference to a battle session, assignment, quest claim, or related entity.
- `idempotencyKey`: optional stable key for replay-prone flows.
- `metadata`: JSON snapshot for source-specific details.

Rules:

- Never edit or delete ledger entries during normal app behavior.
- `balanceAfter` must equal `balanceBefore + amount`.
- Gold mutations and ledger writes should happen in the same transaction where possible.
- Replayed requests should either return the previous result or produce no additional ledger row.
- Manual adjustments must include an operator/user id and reason in `metadata`.

## Phase 1 Risks Found

1. Shop purchase reads `gold` and then decrements in a later update. Concurrent requests can race.
2. Passive gold claim reads `lastGoldAt` and then updates later. Concurrent claims can double-award.
3. Check-in uses local server date comparison; timezone rules should be made explicit for Bangkok classroom usage.
4. Quest rewards need a common claim/write pattern so daily, weekly, and challenge claims cannot double-pay.
5. Interactive battle finalization accepts client-provided winner and gold, then clamps only gold. This belongs to Phase 3, but the ledger should still make battle payouts traceable.
6. Defender battle loadout can be consumed when challenged. This belongs to Phase 4, but ledger metadata should reveal item consumption once implemented.

## Phase 1 Implementation Checklist

- [x] Add `EconomyTransaction` to Prisma schema.
- [x] Document current gold sources and sinks.
- [x] Define ledger write contract.
- [x] Add a shared economy ledger helper.
- [x] Convert shop purchase to atomic spend plus ledger row.
- [x] Convert passive gold claim to atomic earn plus ledger row.
- [x] Convert check-in reward to atomic earn plus ledger row.
- [x] Convert quest claims to idempotent earn plus ledger row.
- [x] Add tests for balance race-sensitive flows.
- [x] Run Prisma validation and Prisma Client generation after schema adoption.
- [x] Clear full-repo TypeScript check blockers outside the Phase 1 ledger scope.

## Phase 1 Verification Status

- Prisma schema validation passes.
- Prisma Client generation has been run after adding `EconomyTransaction`.
- Focused ledger tests pass for shop purchase, passive gold, check-in, and daily quest claim.
- Full `tsc --noEmit` passes after clearing existing page export, `BattleArena.tsx`, and app error code definition blockers.

## Suggested Source Metadata

`passive_gold`

```json
{
  "goldRate": 12,
  "hoursSince": 5.5,
  "frameMultiplier": 1.1,
  "eventMultiplier": 2,
  "lastGoldAt": "2026-04-29T00:00:00.000Z"
}
```

`shop`

```json
{
  "itemId": "frame_gold",
  "itemType": "frame",
  "price": 1000
}
```

`battle`

```json
{
  "battleSessionId": "507f1f77bcf86cd799439011",
  "winnerId": "507f1f77bcf86cd799439012",
  "challengerId": "507f1f77bcf86cd799439013",
  "defenderId": "507f1f77bcf86cd799439014",
  "itemsConsumed": ["item_lucky_coin"]
}
```
