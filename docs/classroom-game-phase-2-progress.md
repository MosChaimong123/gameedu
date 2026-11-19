# Classroom Game Removal: Progress

Date: 2026-11-19 (Asia/Bangkok)

## Release Scope

Branch: `codex/remove-classroom-games-phase-2`

Production base: `0157b50`. Phase 2 commits remain local and have not
been deployed. Production must not be assumed to include these removals.

- Removed student game routes, shop/quest UI and student economy command services.
- Removed classroom battle commands, achievements, events, gamification settings,
  leaderboard and orphan Negamon classroom controls.
- Removed game payload, rank calculation and shop frame query from student dashboard.
- Removed quiz EXP previews and assessment reward presentation.
- Removed worksheet EXP awards, LINE submission Gold awards and rank-up notifications
  from teacher behavior-point updates. Quiz and worksheet responses no longer expose
  legacy EXP fields.
- Classroom creation and duplication no longer initialize or copy game configuration;
  classroom dashboard queries no longer load legacy player inventories, balances or
  loadouts.
- Removed classroom Economy/Negamon report, ledger and balance routes plus their
  dashboard panel. Historical collections remain untouched pending Phase 3 backup
  and scoped cleanup.
- Preserved teacher behavior points, scores, submissions, attendance, certificates,
  LINE and Host/Play PIN game infrastructure.
- Retained historical battle/economy audit reads and shared game engine code.
- No database cleanup, backup, restore rehearsal or schema removal has occurred.

## Latest Verification

- Student dashboard: 22 tests passed.
- Focused learning-surface/helper/page checks: 6 tests passed (page tests overlap).
- TypeScript and production build passed.
- ESLint: no errors; existing useEffect dependency warning in assessment panel.
- New contract checks reject game queries and reward previews on learning surfaces.

## Remaining Gates

- Audit shared gamification helpers, reward writers and socket dependencies before
  further deletion; some legacy code is disabled rather than removed.
- Review historical audit retention before deleting audit routes or collections.
- Run complete domain regression and authenticated desktop/mobile manual QA.
- Diagnose the prior socket integration websocket failures; do not call them resolved.
- Deploy and verify Phase 2 before any field/schema cleanup.
- Phase 3 requires verified target, scoped dry-run, restricted backup and restore
  rehearsal. Preserve ambiguous PointHistory/behavior points.
