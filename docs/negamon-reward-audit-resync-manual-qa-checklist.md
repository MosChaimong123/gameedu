# Negamon Reward Audit / Resync Manual QA Checklist

Manual QA checklist for Plan 09 after the reward audit, remediation, export, and re-sync hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:negamon-reward-audit`

Expected result:

- [x] `test:negamon-reward-audit` passes
- [x] `predev` passes

## Dev QA

- [x] Teacher-only reward audit, export, remediation, effectiveness, and re-sync routes reject unauthenticated access
- [x] Focused `gamePin` filter narrows audit and export output to one reward run
- [x] Reward export returns CSV-safe values and does not leak rows from another classroom
- [x] Re-sync on an already-awarded or already-remediated `gamePin` stays idempotent and does not add duplicate reward history
- [x] A skipped reward can be followed by a remediation profile update and the effectiveness report reflects that follow-up

## Staging QA

- [x] Real teacher session can create a temporary Negamon reward-audit classroom fixture
- [x] Real Negamon live-game reward event appears in reward audit and can be filtered by `gamePin`
- [x] Real skipped reward event can be remediated, then re-synced without double-paying on repeat calls
- [x] Real remediation and effectiveness endpoints summarize the same `gamePin` follow-up correctly
- [x] Temporary staging fixture is deleted after verification

## Notes

- Reuse [negamon-reward-resync-qa.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/negamon-reward-resync-qa.md) for the Playwright deep-link smoke when a classroom id and reward pin are available.
- Record the staging classroom id, student ids, student codes, applied `gamePin`, skipped `gamePin`, and the re-sync response reason from the second retry.
- Latest staging smoke on `2026-05-06` used temporary classroom `69fb6e65e54a592327ff178c`, student `69fb6e65e54a592327ff1793`, and login code `F9SLCDW69DPH`. Applied reward pin `223706` produced `recipientCount: 1` and `totalExp: 200`. Skipped reward pin `834812` produced `skippedNoMatchCount: 1`, exported the formula-like nickname as `'=Ghost Reward QA`, then was remediated via student profile update and re-synced with `appliedCount: 1`.
- Repeating re-sync after the remediation pass did not double-pay. The retry returned `reason: "snapshot_missing"` with `appliedCount: 0`, which is acceptable here because the endpoint only reconstructs reward rows from skipped-player snapshots.
- The temporary classroom was deleted after verification and returned `deleteStatus: 200`.
