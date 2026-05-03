# Auth Manual QA Checklist

Last updated: 2026-05-03

## Scope

- Login
- Register
- Logout
- Role redirects
- Session expiry / unauthorized UX
- Thai / English copy

## Environments

- Dev
- Staging

## Preconditions

- [x] Test teacher account
- [x] Test student account
- [x] Test admin account
- [x] One classroom with at least one student
- [ ] One account with expired/invalid session scenario available

## Login

- [x] Teacher can log in with email/password
- [x] Student can access student flow with login code
- [x] Invalid password shows localized user-facing error
- [x] Invalid login code shows localized user-facing error
- [x] Rate-limited login attempt shows stable error messaging
- [x] Thai copy looks correct
- [x] English copy looks correct

## Register

- [x] Teacher registration succeeds
- [x] Student registration succeeds
- [x] Privileged role escalation from client is rejected
- [x] Duplicate email shows localized user-facing error
- [x] Duplicate username shows localized user-facing error
- [x] Verification-email-required path shows expected UX
- [x] Thai copy looks correct
- [x] English copy looks correct

## Session / Logout

- [x] Logout returns user to the expected public route
- [x] Protected dashboard routes redirect or fail gracefully after logout
- [x] Expired session does not leave broken loading states
- [x] Unauthorized API-driven UI surfaces a readable localized error

## Role Redirects

- [x] Teacher lands on teacher-facing dashboard routes
- [x] Student does not gain access to teacher-only pages
- [x] Admin-only flows reject non-admin sessions cleanly
- [ ] Teacher/admin-only API calls fail with stable UX when called from a non-privileged session

## Teacher Flows

- [x] My Sets page loads without raw auth/error strings
- [x] Folders CRUD shows stable UX on unauthorized/forbidden/not-found states
- [x] Classroom pages load without raw auth/error strings
- [x] Notifications tray behaves cleanly on auth failures
- [x] OMR pages fail gracefully when access is invalid

## Browser Checks

- [x] No raw `Unauthorized`, `Forbidden`, `Not Found`, or `Internal Error` strings leak to visible UX where localization is expected
- [x] No stale session loop or repeated toast spam after auth failure
- [x] No infinite retry behavior from protected pages after auth failure

## Exit Condition

- [ ] Dev manual QA complete
- [ ] Staging manual QA complete
- [x] Any remaining issues logged back into the relevant system plan

## Current Findings

Completed on 2026-05-03 (dev local only):

- Verified unauthenticated access to `/dashboard` redirects to `/login?callbackUrl=...` instead of exposing protected content.
- Verified role selection on the login entry screen preserves `callbackUrl` (for example `/dashboard` -> `/login?callbackUrl=...` -> `/login?audience=teacher&callbackUrl=...`).
- Verified teacher email/password login lands on `/dashboard`.
- Verified student email/password login lands on `/student/home`.
- Verified student class-code flow with a valid code lands on the student classroom page.
- Verified logout returns the user to `/login`, and revisiting `/dashboard` after logout redirects back to the public login surface.
- Verified non-admin sessions are redirected away from `/admin` cleanly:
  - teacher -> `/dashboard`
  - student -> `/student/home`
- Verified `/dashboard/my-sets`, `/dashboard/classrooms`, and `/dashboard/omr` load without leaking raw auth/error contract strings in the visible UI.
- Verified student login page renders correctly in both English and Thai.
- Verified register entry only exposes `Student` and `Teacher` role choices in the client UI; no privileged role option is exposed.
- Verified invalid student codes now redirect back to `/student?error=invalid_code` and show a localized student-facing error instead of the generic Next.js 404 page.
- Verified invalid password shows a localized user-facing message instead of a raw auth code.
- Verified repeated failed login attempts now switch to a localized rate-limit message instead of remaining stuck on the generic invalid-password copy.
- Verified unverified-email login stays on the login screen and shows the verification-required banner plus resend action.
- Verified teacher registration and student registration both redirect to `pendingVerify=1` with the expected audience preserved.
- Verified duplicate email and duplicate generated-username collisions show localized user-facing register errors.
- Verified expired-session behavior by clearing auth cookies on a protected dashboard page and reloading:
  - `/dashboard/my-sets` redirected back to `/login?callbackUrl=...`
  - no broken spinner or half-rendered protected shell remained on screen
- Verified unauthorized API-driven UI states after clearing auth cookies mid-session:
  - notifications tray now surfaces a readable sign-in-required message instead of failing silently
  - My Sets folder creation shows a readable sign-in-required banner
  - OMR create flow shows a readable sign-in-required message instead of leaking raw auth response text

Open findings / remaining blockers:

- Teacher/admin-only API calls from a live non-privileged session still are not closed as a separate dedicated browser proof; this pass focused on expired-session and unauthenticated auth loss.
- Staging manual QA is blocked because no staging URL or staging credentials were provided.
- Full production build verification for the latest auth callback fix is currently blocked by a local Prisma engine file lock during `prisma generate`, while `npm.cmd run predev` still passes.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:auth`
- `npm.cmd run test:auth`
- `npm.cmd run predev`
