# Classroom Game Retirement: Phase 3 Runbook

Phase 3 removes legacy classroom-game data only after the application retirement
release is live and a recoverable backup has been validated. The cleanup scope is
deliberately narrower than an entire database purge.

## Preserved Data

- `Student.points` (`behaviorPoints`), attendance, point history, assignments and submissions
- certificates, lesson/course progress, OMR, LINE data and classroom skills
- `ActiveGame` and `GameHistory`, which support the separate Host/Play PIN flow

## Candidate Legacy Data

- Student fields: `gold`, `lastGoldAt`, `lastCheckIn`, `streak`, `inventory`,
  `battleLoadout`, `equippedFrame`, Negamon skills and quest-claim fields
- Classroom fields: `levelConfig`, `gamifiedSettings`
- Collections: `BattleSession`, `EconomyTransaction`, `StudentAchievement`,
  `NegamonLiveBattleRewardClaim`, `ArQuestRewardClaim`

## Required Gates

1. Confirm the running release is healthy and records the deployed commit.
2. In the secure deployment environment, run `npm run db:print-target` and verify
   the Atlas host and database name. Do not paste a connection string into chat.
3. Create a full database dump or Atlas snapshot, record its timestamp and location,
   and verify it can restore into a non-production target.
4. Run `npm run db:classroom-game-retirement:dry-run` using the same target. Save
   its JSON output as the cleanup manifest.
5. Review the manifest: `Student.points`, `PointHistory`, `ActiveGame`, and
   `GameHistory` must appear only in the preserved section.
6. Only after explicit approval of that manifest may an apply script be introduced
   and run. There is intentionally no apply command in this phase yet.

## Restore Rehearsal

After restoring the backup to staging, verify `/api/ready`, teacher sign-in,
classroom details, assignments, OMR, reports and LINE readiness. Do not use the
staging cluster as a cleanup target until the rehearsal has passed.
