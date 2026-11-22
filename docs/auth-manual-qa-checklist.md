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
- [x] One account with expired/invalid session scenario available

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
- [x] Teacher/admin-only API calls fail with stable UX when called from a non-privileged session

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

## Password Recovery

Local/pre-deploy:

- [x] Forgot-password success copy remains neutral for existing and nonexistent accounts
- [x] Reset-password copy is available in Thai and English through shared translations
- [x] OTP input supports numeric entry, paste, and `autocomplete="one-time-code"`
- [x] New-password and confirmation inputs expose `autocomplete="new-password"`
- [x] Forgot-password form has no horizontal overflow at 390 px and desktop widths
- [x] Auth recovery regression suite and security guard pass

Controlled rollout:

- [x] Deployed `/api/ready` reports `checks.emailDelivery: "configured"`
- [ ] Controlled credentials mailbox receives OTP from the verified sender domain
- [ ] Controlled Google-only account receives neutral provider guidance
- [ ] OTP works once; reuse, expiry, attempt-limit, and concurrent reuse fail safely
- [ ] Old password and pre-reset sessions fail after a successful reset
- [ ] New password succeeds and Login/Register/Google OAuth remain healthy
- [ ] Real mailbox delivery succeeds with at least two providers

## Exit Condition

- [x] Dev manual QA complete
- [ ] Staging manual QA complete
- [x] Any remaining issues logged back into the relevant system plan

## Current Findings

Completed on 2026-05-03 (dev local only):

- Re-tested the local web entry points on 2026-08-03 after fixing the lazy Auth.js proxy contract: `/`, `/login`, `/forgot-password`, `/forgot-password/reset`, and `/student` render successfully; `/register` redirects to the canonical `/login?mode=register` flow.
- Verified the forgot-password flow with a synthetic nonexistent `.invalid` address: the UI returns neutral success copy, does not confirm account existence, links to the OTP reset form, and applies `one-time-code`, numeric input, and `new-password` autocomplete contracts.
- Verified the Student Code boundary in the running app: a legacy direct Student API path returns HTTP 410 and a nested legacy Student Code URL redirects to `/student` without retaining the code. Browser console inspection showed no runtime errors after the proxy fix.
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
- Verified teacher/admin-only API proof from a live non-privileged session:
  - logged in as a real student session on `/student/home`
  - `GET /api/folders` returned `403` with structured `{ error: { code: "FORBIDDEN" } }`
  - `POST /api/omr/quizzes` returned `403` with structured `{ error: { code: "FORBIDDEN" } }`
  - `POST /api/admin/register` returned `403` with structured `{ error: { code: "FORBIDDEN" } }`
  - these responses are stable and localizable by the existing UI error-handling path

Open findings / remaining blockers:

- Production `/api/ready` returned HTTP 200 with `checks.emailDelivery: "configured"` on 2026-08-03. After deploying the strengthened readiness contract, re-check that the status remains configured; production will then also prove that `RESEND_WEBHOOK_SECRET` is present.
- Local `/api/ready` reports `checks.emailDelivery: "not_configured"`; real forgot-password OTP delivery cannot be verified in this environment until a controlled email provider/sender is configured.
- Staging manual QA is blocked because no staging URL or staging credentials were provided.
- Local production build verification now passes; the repository unlock script safely recovered the Windows Prisma engine lock before regeneration.
- Production check on 2026-07-14 returned HTTP 200 from `/api/ready`, but the response did not contain `checks.emailDelivery`; the Phase 0-7 recovery revision is therefore not yet verifiable on production.
- The currently deployed reset page still showed a 6-character password placeholder and omitted `autocomplete="new-password"`. Local code now uses an 8-character minimum, localized Thai/English copy, and password-manager attributes; deployment is required before retesting.
- Controlled staging URL/account credentials and two controlled mailbox providers were not available in this QA run, so no OTP or password was submitted.

Local browser auth pass on 2026-08-09:

- Credentials login, logout, and neutral invalid-password UX passed with a disposable local teacher account.
- MFA enrollment and a subsequent TOTP challenge passed end-to-end.
- Fixed MongoDB missing-vs-null handling that previously made a correct OTP look invalid after it was consumed because the bound security session could not be elevated.
- Security Center now lists current and prior active device sessions.
- Fixed the login form's pre-hydration fallback to POST so credentials cannot be serialized into the URL.
- Google OAuth completion, real Passkey ceremonies, and mailbox delivery remain controlled staging checks.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:auth`
- `npm.cmd run test:auth`
- `npm.cmd run predev`
