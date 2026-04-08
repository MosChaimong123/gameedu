# Backup And Restore Runbook

Use this runbook when preparing a production backup or validating a restore plan for GameEdu.

## Primary Data

Critical production data includes:

- users and sessions
- classrooms and students
- assignments, submissions, attendance, notifications
- question sets and folders
- OMR quizzes and results
- boards and reactions
- active games and game history
- operational collections such as `appAuditLogs`

## Before Backup

1. Verify the deployment is healthy with:
   - `/api/health`
   - `/api/ready`
2. Record the current release or commit SHA.
3. Record current environment mode for:
   - `RATE_LIMIT_STORE`
   - `AUDIT_LOG_SINK`
4. If a legacy cleanup or bulk migration is planned, run a backup first.

## Backup Strategy

Preferred:

- database-native snapshot or dump of the Mongo deployment

At minimum, capture:

- application data collections
- operational collections:
  - `appAuditLogs`
  - `appRateLimits` (optional for restore, not critical business data)

## Restore Validation

After restoring to staging or recovery target:

1. Start the app with production-like env vars.
2. Verify `/api/ready` returns success.
3. Verify login works.
4. Verify classroom detail pages load.
5. Verify a teacher can access sets, reports, and OMR tools.
6. Verify audit log writes still succeed.

## Notes

- `appRateLimits` is disposable and can be dropped during recovery if needed.
- `appAuditLogs` is useful for investigations and should usually be preserved.
- Always run [legacy-rpg-cleanup-runbook.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/legacy-rpg-cleanup-runbook.md) only after a safe backup exists.
