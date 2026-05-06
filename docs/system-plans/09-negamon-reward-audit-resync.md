# System Plan 09: Negamon Reward Audit / Resync

Last updated: 2026-05-06

## Scope

- Reward audit, skipped players, remediation, effectiveness, re-sync, reward export

## Key Files

- `src/app/api/classrooms/[id]/negamon/reward-audit`
- `src/app/api/classrooms/[id]/negamon/reward-audit/export`
- `src/app/api/classrooms/[id]/negamon/reward-remediation`
- `src/app/api/classrooms/[id]/negamon/reward-effectiveness`
- `src/app/api/classrooms/[id]/negamon/reward-resync`
- `src/lib/negamon/sync-negamon-battle-rewards.ts`
- Prisma: `NegamonLiveBattleRewardClaim`, `EconomyTransaction`, `Student`

## Problem Analysis Checklist

- [x] Check re-sync idempotency
- [x] Check ambiguous, no-match, duplicate-student, and invalid-student reward handling
- [x] Check reward audit export authorization and CSV-safe output
- [x] Check remediation events improve the effectiveness report for the same `gamePin`
- [x] Check applied, skipped, and unresolved counts stay consistent across audit and re-sync
- [x] Check behavior-point reward history stays consistent after re-sync attempts
- [x] Check focused `gamePin` filtering across audit, export, remediation, and effectiveness flows

## Improvement Plan

- [x] Add one-command preflight for reward audit / re-sync coverage
- [x] Keep skipped-reason, export, and report tests in the focused suite
- [x] Add a dedicated manual QA checklist for reward audit / re-sync
- [x] Verify staging with both an applied reward run and a remediated skipped reward run
- [x] Delete temporary staging fixtures after the pass

## Validation

- `npm.cmd run check:negamon-reward-audit`
- `npm.cmd run lint`
- `npm.cmd run build`
- Manual: `docs/negamon-reward-audit-resync-manual-qa-checklist.md`
- Deep-link smoke helper: `docs/negamon-reward-resync-qa.md`

## Exit Criteria

- Re-sync does not double-pay reward history or behavior points
- Teacher can see why rewards were skipped and whether remediation improved the outcome

## Progress Note 1

- Added one-command Negamon reward audit preflight in [package.json](/C:/Users/IHCK/GAMEEDU/gamedu/package.json): `npm.cmd run test:negamon-reward-audit` and `npm.cmd run check:negamon-reward-audit`.
- Added dedicated handoff checklist in [negamon-reward-audit-resync-manual-qa-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/negamon-reward-audit-resync-manual-qa-checklist.md).
- Rewrote the unreadable checklist block into a live analysis checklist so the remaining reward-audit work can be closed against concrete evidence instead of mojibake notes.

## Progress Note 2

- `npm.cmd run check:negamon-reward-audit` passed on `2026-05-06` with `11 files / 34 tests`.
- Staging smoke on [teachplayedu.com](https://www.teachplayedu.com/) passed with a temporary classroom fixture:
  - temporary classroom `69fb6e65e54a592327ff178c`
  - student `69fb6e65e54a592327ff1793`
  - student code `F9SLCDW69DPH`
  - applied reward pin `223706`
  - skipped reward pin `834812`
- Verified on staging:
  - unauthenticated reward audit and export returned `401`
  - applied reward audit filtered correctly to one `gamePin` with `recipientCount: 1` and `totalExp: 200`
  - skipped reward audit filtered correctly to one `gamePin` with `skippedNoMatchCount: 1`
  - reward export sanitized the formula-like nickname `=Ghost Reward QA` as `'=Ghost Reward QA`
  - remediation profile update logged `source: "negamon_reward_audit"` with the same skipped `gamePin`
  - re-sync after remediation applied exactly one reward row and the follow-up retry did not double-pay
  - effectiveness report showed `pinsNeedingFollowUp: 0` and `resolvedSkippedCount: 1` for the remediated skipped pin
- The temporary staging classroom was deleted after verification, so the teacher account did not keep a leftover fixture.
