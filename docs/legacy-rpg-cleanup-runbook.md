# Legacy RPG Cleanup Runbook

This runbook is for safely removing legacy RPG-era collections and fields that are no longer part of the current GameEdu data model.

## Scope

The cleanup script targets:

- MongoDB collections:
  - `StudentItem`
  - `Material`
  - `StudentBattle`
  - `Item`
- Legacy fields on `Student` documents:
  - `gameStats`
  - `questProgress`
  - `jobClass`
  - `jobTier`
  - `advanceClass`
  - `jobSkills`
  - `jobSelectedAt`
  - `stamina`
  - `maxStamina`
  - `mana`
  - `lastStaminaRefill`
  - `lastSyncTime`

Script path:

- [cleanup-rpg-data.mjs](/C:/Users/IHCK/GAMEEDU/gamedu/scripts/cleanup-rpg-data.mjs)

## Safety Rules

1. Always run the dry-run first.
2. Always take a production backup before the real cleanup.
3. Run during a maintenance window or a low-traffic period.
4. Do not combine this with unrelated schema or seed changes in the same deploy window.
5. Keep the output log from both dry-run and real execution.

## Prerequisites

Before running the cleanup:

1. Confirm the app version with farming/RPG removal is already deployed.
2. Confirm `DATABASE_URL` points to the intended environment.
3. Confirm you have a current database backup or snapshot.
4. Confirm `npx tsc --noEmit`, `npm test`, and `npx next build` are green on the release you plan to deploy.

## Dry-Run

Run the dry-run first:

```powershell
npm run db:cleanup-rpg:dry-run
```

Expected output shape:

- `StudentItem: would delete N document(s)`
- `Material: would delete N document(s)`
- `StudentBattle: would delete N document(s)`
- `Item: would delete N document(s)`
- `Student: would unset legacy RPG fields on N document(s)`

## Backup

Take a production backup before the real run.

Minimum requirement:

1. Database snapshot or dump created successfully
2. Timestamp recorded
3. Operator recorded
4. Environment recorded

Suggested checklist:

- Environment: production / staging
- Backup completed at:
- Backup location:
- Operator:
- Release / commit:

## Execute Cleanup

After a successful dry-run and backup:

```powershell
npm run db:cleanup-rpg
```

Expected output shape:

- `StudentItem: deleted N document(s)`
- `Material: deleted N document(s)`
- `StudentBattle: deleted N document(s)`
- `Item: deleted N document(s)`
- `Student: unset legacy RPG fields on N document(s)`

If the script reports `Student: no legacy RPG fields found`, that is acceptable.

## Post-Run Verification

After execution, verify:

1. The app still starts and key pages load.
2. Student dashboard pages still open for linked and code-based student access.
3. Classroom dashboard pages still open.
4. No server errors appear for student/profile/classroom routes.

Recommended verification commands:

```powershell
npx tsc --noEmit
npm test
npx next build
```

## Database Verification

Verify that the legacy collections are empty or gone, and the student fields no longer exist.

Examples of what to confirm in MongoDB:

1. `StudentItem`, `Material`, `StudentBattle`, and `Item` contain `0` documents.
2. No `Student` documents still contain:
   - `gameStats`
   - `questProgress`
   - `jobClass`
   - `jobTier`
   - `advanceClass`
   - `jobSkills`
   - `jobSelectedAt`
   - `stamina`
   - `maxStamina`
   - `mana`
   - `lastStaminaRefill`
   - `lastSyncTime`

## Rollback Plan

If anything unexpected happens:

1. Stop further data-changing scripts.
2. Record the exact console output from the cleanup run.
3. Restore from the backup or snapshot taken before execution.
4. Redeploy the last known-good application build if needed.

## Change Log Template

Use this template for the maintenance record:

- Environment:
- Release / commit:
- Operator:
- Dry-run completed:
- Backup completed:
- Real cleanup completed:
- Collections deleted:
- Student docs updated:
- Post-run verification:
- Notes / issues:
