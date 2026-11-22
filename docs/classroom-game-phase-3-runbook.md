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
6. Rehearse the apply command against a newly restored local database. It must
   report zero failed documents, remove only the manifest candidates and show
   unchanged counts for all preserved collections.
7. Only after explicit approval of that manifest may the apply command run against
   production. It requires `--apply`, an exact `--expected-database`, a manifest
   path and `CLASSROOM_GAME_RETIREMENT_CONFIRM=REMOVE_CLASSROOM_GAME_DATA_FROM:<db>`.

## Restore Rehearsal

After restoring the backup to staging, verify `/api/ready`, teacher sign-in,
classroom details, assignments, OMR, reports and LINE readiness. Do not use the
staging cluster as a cleanup target until the rehearsal has passed.

## Evidence: 2026-11-20

- Production target verified from Render: Atlas `cluster0.dimivmf.mongodb.net`,
  database `gameedu`.
- Full archive: `gameedu-production-20261120-192500.archive.gz`, 1,617,521 bytes.
- Archive dry-run completed and exposed all expected namespaces.
- Restore rehearsal database: `gameedu_restore_20261120_192500`.
- Restore result: 18,227 documents restored, 0 failed.
- Cleanup manifest: `docs/classroom-game-phase-3-manifest-2026-11-20.json`.
- Cleanup rehearsal removed 199 Student legacy-field sets, 10 Classroom legacy-field
  sets, 6 BattleSession documents, 601 EconomyTransaction documents and 3
  NegamonLiveBattleRewardClaim documents.
- Post-cleanup dry-run reported zero legacy fields and zero legacy documents.
- Preserved collection counts remained unchanged: ActiveGame 0, GameHistory 47,
  AssignmentSubmission 220 and PointHistory 10.
- Preserved Student state remained unchanged: 206 documents and a behavior-point
  total of 16.
- A second apply attempt was rejected before mutation because the target no longer
  matched the approved manifest.
- MongoDB emitted a cross-version rehearsal warning because production is 8.0.39
  and local MongoDB is 8.2.3. Production cleanup does not perform a restore.

## Production Completion

- Cleanup completed against `gameedu` at 2026-11-20 19:39 ICT.
- Removed 199 Student legacy-field sets and 10 Classroom legacy-field sets.
- Removed 6 BattleSession, 601 EconomyTransaction and 3
  NegamonLiveBattleRewardClaim documents.
- The post-cleanup report returned zero for every legacy field and collection.
- Preserved state remained unchanged: 206 Student documents, behavior-point total
  16, ActiveGame 0, GameHistory 47, AssignmentSubmission 220 and PointHistory 10.
- Production `/api/health` and `/api/ready` both returned HTTP 200 after cleanup.
