# Negamon Reward Re-sync QA

This smoke suite checks the teacher-only reward audit/re-sync endpoints and, when a classroom fixture is provided, verifies that the Economy tab deep-link preserves a focused Negamon reward game pin.

## Quick Run

```bash
npm run test:e2e:negamon-reward
```

Without fixture env vars, the suite still verifies unauthenticated API protection and skips the classroom deep-link check.
With `ASN_E2E_CLASS_ID` but without `PLAYWRIGHT_STORAGE_STATE`, it also verifies that the auth gate preserves the Economy reward pin in the login callback URL.

## Full Classroom Deep-link Check

Set these env vars before running the command:

```bash
ASN_E2E_CLASS_ID=<classroom id>
ASN_E2E_REWARD_GAME_PIN=<game pin with reward audit data>
PLAYWRIGHT_STORAGE_STATE=<path to teacher-auth storage state json>
npm run test:e2e:negamon-reward
```

Expected result:

- unauthenticated reward audit/effectiveness/re-sync requests return `401`
- `/dashboard/classrooms/:id?tab=economy&rewardGamePin=:pin` keeps both query values
- with a real teacher storage state, the Economy tab can be opened directly for follow-up manual QA on the re-sync panel
