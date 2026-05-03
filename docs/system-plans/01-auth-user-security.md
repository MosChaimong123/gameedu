# System Plan 01: Auth / User / Security

Last updated: 2026-05-03

## Scope

- Login, register, session, role, profile, settings
- API auth guard, RBAC, resource ownership, abuse/rate limit

## Key Files

- `src/app/login`
- `src/app/register`
- `src/app/api/auth/[...nextauth]`
- `src/app/api/register`
- `src/app/api/user/profile`
- `src/app/api/user/settings`
- `src/lib/authorization`
- `src/lib/security`
- Prisma: `User`, `Account`, `Session`, `VerificationToken`

## Problem Analysis Checklist

- [~] Verify that protected routes truly require auth
- [ ] Verify admin/teacher/student role separation
- [x] Verify ownership for `user/profile/settings`
- [~] Verify register/login errors do not leak raw backend strings to the UI
- [x] Verify rate limit and repeated failure behavior
- [ ] Verify redirect behavior after login/register/logout
- [~] Verify session expiration and unauthorized response format

## Improvement Plan

1. Create a route inventory for auth-required routes
2. Consolidate helper usage for auth/role/ownership so routes follow a shared pattern
3. Add route tests for forbidden/unauthorized/not-found cases
4. Standardize the structured error contract and i18n mapping
5. Run manual QA for login/register in both Thai and English

## Validation

- `npm.cmd run check:auth`
- `npm.cmd run test:auth`
- `npm.cmd test -- src/__tests__/register-route.test.ts src/__tests__/rate-limit.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts`
- `npm.cmd test -- src/lib/authorization/__tests__/resource-access.test.ts`
- `npm.cmd run lint`
- `npm.cmd run predev`
- `npm.cmd run build`

## Exit Criteria

- No important route relies only on client-side hiding
- Auth/role/ownership tests cover happy path and forbidden path
- User-facing errors can be localized

## Progress Note 1

Completed on 2026-05-03:

- Normalized `src/app/api/user/profile/route.ts` to return structured `AUTH_REQUIRED` and `NOT_FOUND` errors instead of plain-text unauthorized responses
- Expanded auth regression coverage in:
  - `src/__tests__/profile-route.test.ts`
  - `src/__tests__/user-settings-route.test.ts`
  - `src/__tests__/register-route.test.ts`
- Refreshed register-route mocks to cover verification-token creation and verification-email sending so tests match the current registration flow
- Fixed an auth-scope lint issue in `src/app/register/signup-wizard.tsx` by replacing in-app anchor navigation with `next/link`
- Validation passed:
  - `npm.cmd test -- src/__tests__/register-route.test.ts src/__tests__/rate-limit.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Protected-route inventory snapshot:

- `user/profile` and `user/settings` now follow the structured auth error pattern
- Legacy plain-text `401` responses still exist in older route groups such as `classrooms`, `folders`, `notifications`, `omr`, `sets`, and `user/upgrade`
- Next pass should standardize those route families and add unauthorized/forbidden/not-found regression tests alongside each conversion

## Progress Note 2

Completed on 2026-05-03:

- Standardized auth/error responses in:
  - `src/app/api/folders/route.ts`
  - `src/app/api/folders/[folderId]/route.ts`
  - `src/app/api/user/upgrade/route.ts`
- Added regression coverage in:
  - `src/__tests__/folders-route-auth.test.ts`
  - `src/__tests__/user-upgrade-route.test.ts`
- `folders` routes now return structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, `NOT_FOUND`, and `INTERNAL_ERROR` responses where appropriate
- `user/upgrade` now behaves as a structured removed endpoint and returns `ENDPOINT_NO_LONGER_AVAILABLE` with HTTP `410`
- Validation passed:
  - `npm.cmd test -- src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Updated protected-route inventory snapshot:

- `user/profile`, `user/settings`, `folders`, and `user/upgrade` now follow the structured auth/error contract
- Highest-value legacy route families still using plain-text auth responses include `classrooms`, `notifications`, `omr`, and `sets`
- Recommended next pass: normalize `sets` + `notifications` together because both feed teacher-facing dashboard workflows and already use localized fetch error handling on the client

## Progress Note 3

Completed on 2026-05-03:

- Standardized auth/error responses in:
  - `src/app/api/sets/route.ts`
  - `src/app/api/sets/[id]/route.ts`
  - `src/app/api/notifications/route.ts`
- Added regression coverage in:
  - `src/__tests__/sets-route-auth.test.ts`
  - `src/__tests__/notifications-route.test.ts`
- `sets` routes now return structured `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `PLAN_LIMIT_*`, and `INTERNAL_ERROR` responses instead of mixing plain-text `401/403/404/500`
- `notifications` route now returns structured `AUTH_REQUIRED`, `INVALID_PAYLOAD`, `NOT_FOUND`, and `INTERNAL_ERROR` responses
- Validation passed:
  - `npm.cmd test -- src/__tests__/sets-route-auth.test.ts src/__tests__/notifications-route.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Updated protected-route inventory snapshot:

- `user/profile`, `user/settings`, `folders`, `user/upgrade`, `sets`, and `notifications` now follow the structured auth/error contract
- Highest-value legacy route families still using plain-text auth responses are now concentrated in older `classrooms` and `omr` route groups
- Recommended next pass: normalize `classrooms` first, then `omr`, because both still contain repeated plain-text unauthorized/forbidden/not-found branches across multiple handlers

## Progress Note 4

Completed on 2026-05-03:

- Standardized auth/error responses in:
  - `src/app/api/classrooms/route.ts`
  - `src/app/api/classrooms/[id]/route.ts`
- Added regression coverage in:
  - `src/__tests__/classrooms-route-auth.test.ts`
- `classrooms` root routes now return structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, `PLAN_LIMIT_CLASSROOMS`, and `INTERNAL_ERROR` responses
- `classrooms/[id]` now enforces teacher/admin role checks consistently and returns structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, `NOT_FOUND`, and `INTERNAL_ERROR` responses
- Validation passed:
  - `npm.cmd test -- src/__tests__/classrooms-route-auth.test.ts src/__tests__/sets-route-auth.test.ts src/__tests__/notifications-route.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Updated protected-route inventory snapshot:

- `user/profile`, `user/settings`, `folders`, `user/upgrade`, `sets`, `notifications`, `classrooms`, and `classrooms/[id]` now follow the structured auth/error contract
- Remaining legacy auth/error hotspots are now concentrated in classroom subroutes such as `assignments`, `groups`, `students`, `skills`, and in the older `omr` route family
- Recommended next pass: finish the highest-traffic classroom subroutes before moving to `omr`, so the teacher-facing API surface becomes internally consistent end to end

## Progress Note 5

Completed on 2026-05-03:

- Standardized auth/error responses in:
  - `src/app/api/classrooms/[id]/groups/route.ts`
  - `src/app/api/classrooms/[id]/groups/[groupId]/route.ts`
  - `src/app/api/classrooms/[id]/skills/route.ts`
  - `src/app/api/classrooms/[id]/skills/[skillId]/route.ts`
- Added regression coverage in:
  - `src/__tests__/classroom-groups-skills-auth.test.ts`
- `groups` routes now enforce teacher/admin role checks consistently and return structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, `NOT_FOUND`, and `INTERNAL_ERROR` responses
- `skills` routes now enforce teacher/admin role checks consistently and return structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, `NOT_FOUND`, and `INTERNAL_ERROR` responses
- Validation passed:
  - `npm.cmd test -- src/__tests__/classroom-groups-skills-auth.test.ts src/__tests__/classrooms-route-auth.test.ts src/__tests__/sets-route-auth.test.ts src/__tests__/notifications-route.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Updated protected-route inventory snapshot:

- `user/profile`, `user/settings`, `folders`, `user/upgrade`, `sets`, `notifications`, `classrooms`, `classrooms/[id]`, `classrooms/[id]/groups`, and `classrooms/[id]/skills` now follow the structured auth/error contract
- Remaining legacy auth/error hotspots are narrowing to classroom subroutes such as `assignments` and `students`, plus the older `omr` route family
- Recommended next pass: normalize `students` and `assignments` next, then use `omr` as the final legacy auth/error cleanup batch for this system plan

## Progress Note 6

Completed on 2026-05-03:

- Standardized auth/error responses in:
  - `src/app/api/classrooms/[id]/students/route.ts`
  - `src/app/api/classrooms/[id]/students/[studentId]/route.ts`
  - `src/app/api/classrooms/[id]/assignments/route.ts`
  - `src/app/api/classrooms/[id]/assignments/[assignmentId]/route.ts`
- Added regression coverage in:
  - `src/__tests__/classroom-students-assignments-auth.test.ts`
- `students` routes now enforce teacher/admin role checks consistently and return structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, `NOT_FOUND`, and `INTERNAL_ERROR` responses
- `assignments` routes now enforce teacher/admin role checks consistently and return structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, `NOT_FOUND`, and `INTERNAL_ERROR` responses
- Validation passed:
  - `npm.cmd test -- src/__tests__/classroom-students-assignments-auth.test.ts src/__tests__/classroom-groups-skills-auth.test.ts src/__tests__/classrooms-route-auth.test.ts src/__tests__/sets-route-auth.test.ts src/__tests__/notifications-route.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Updated protected-route inventory snapshot:

- `user/profile`, `user/settings`, `folders`, `user/upgrade`, `sets`, `notifications`, `classrooms`, `classrooms/[id]`, `classrooms/[id]/groups`, `classrooms/[id]/skills`, `classrooms/[id]/students`, and `classrooms/[id]/assignments` now follow the structured auth/error contract
- Remaining legacy auth/error cleanup in this plan is now concentrated primarily in the older `omr` route family plus a smaller tail of classroom-adjacent routes such as `attendance history`, `duplicate`, and a few per-resource handlers that still return plain-text auth failures
- Recommended next pass: treat `omr` as the final major auth/error normalization batch, then do a short tail-cleanup pass for the remaining classroom-adjacent legacy handlers

## Progress Note 7

Completed on 2026-05-03:

- Standardized auth/error responses in:
  - `src/app/api/omr/quizzes/route.ts`
  - `src/app/api/omr/quizzes/[quizId]/route.ts`
  - `src/app/api/omr/quizzes/[quizId]/results/route.ts`
- Added regression coverage in:
  - `src/__tests__/omr-route-auth.test.ts`
- `omr/quizzes` now returns structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, and `INTERNAL_ERROR` responses
- `omr/quizzes/[quizId]` now consistently uses structured `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, and `INTERNAL_ERROR` responses with shared error constants
- `omr/quizzes/[quizId]/results` now returns structured `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `PLAN_LIMIT_OMR_MONTHLY`, and `INTERNAL_ERROR` responses
- Validation passed:
  - `npm.cmd test -- src/__tests__/omr-route-auth.test.ts src/__tests__/classroom-students-assignments-auth.test.ts src/__tests__/classroom-groups-skills-auth.test.ts src/__tests__/classrooms-route-auth.test.ts src/__tests__/sets-route-auth.test.ts src/__tests__/notifications-route.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Updated protected-route inventory snapshot:

- Major Auth/User/Security route families now following the structured auth/error contract include `user`, `folders`, `sets`, `notifications`, `classrooms`, classroom subroutes, and the core `omr` quiz routes
- Remaining cleanup is now a tail pass over smaller legacy handlers such as `classrooms/[id]/attendance/history/[recordId]`, `classrooms/[id]/duplicate`, selected per-resource classroom routes, and any leftover plain-text auth failures found by route inventory
- Recommended next pass: finish the tail cleanup and then mark the automated Auth/User/Security normalization phase complete, leaving only manual QA for login/register/session-expiry flows

## Progress Note 8

Completed on 2026-05-03:

- Standardized auth/error responses in:
  - `src/app/api/classrooms/[id]/analytics/route.ts`
  - `src/app/api/classrooms/[id]/attendance/history/[recordId]/route.ts`
  - `src/app/api/classrooms/[id]/duplicate/route.ts`
- Expanded regression coverage in:
  - `src/__tests__/classroom-analytics-route.test.ts`
  - `src/__tests__/classroom-tail-auth.test.ts`
- `analytics` now returns structured `AUTH_REQUIRED`, `NOT_FOUND`, and `INTERNAL_ERROR` responses instead of mixing plain-text route failures
- `attendance/history/[recordId]` now enforces teacher/admin role checks consistently and returns structured `AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_PAYLOAD`, `NOT_FOUND`, and `INTERNAL_ERROR` responses
- `duplicate` now enforces teacher/admin role checks consistently and returns structured `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, and `INTERNAL_ERROR` responses while preserving audit logging behavior
- Validation passed:
  - `npm.cmd test -- src/__tests__/classroom-tail-auth.test.ts src/__tests__/classroom-analytics-route.test.ts src/__tests__/omr-route-auth.test.ts src/__tests__/classroom-students-assignments-auth.test.ts src/__tests__/classroom-groups-skills-auth.test.ts src/__tests__/classrooms-route-auth.test.ts src/__tests__/sets-route-auth.test.ts src/__tests__/notifications-route.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`  
    Note: the first retry hit a transient `next/font` Google Fonts fetch failure; the immediate rerun passed with no code changes.

Updated protected-route inventory snapshot:

- Major Auth/User/Security route families plus the highest-value classroom tail routes now follow the structured auth/error contract
- Remaining automated cleanup is now a small tail of legacy handlers discovered by route inventory, rather than any large auth surface area
- The system plan is effectively at the final polish stage for automated auth normalization, with the next meaningful step being a short inventory sweep plus manual QA for login/register/session-expiry flows

## Progress Note 9

Completed on 2026-05-03:

- Applied final contract-polish updates in:
  - `src/app/api/classrooms/[id]/attendance/history/route.ts`
  - `src/app/api/classrooms/[id]/assignments/[assignmentId]/manual-scores/route.ts`
  - `src/app/api/classrooms/[id]/students/[studentId]/history/route.ts`
  - `src/app/api/classrooms/[id]/students/[studentId]/avatar/route.ts`
  - `src/app/api/classrooms/[id]/custom-achievements/route.ts`
  - `src/app/api/classrooms/[id]/events/route.ts`
  - `src/app/api/classrooms/[id]/gamification-settings/route.ts`
  - `src/app/api/classrooms/[id]/points/reset/route.ts`
  - `src/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route.ts`
- Strengthened consistency by:
  - replacing remaining inline `"Not found"` / `"Internal Error"` response strings with shared error constants where appropriate
  - adding explicit teacher/admin role enforcement to selected classroom handlers that previously relied only on ownership checks
  - keeping the structured `AUTH_REQUIRED` / `FORBIDDEN` / `NOT_FOUND` / `INTERNAL_ERROR` contract aligned across the main classroom surface
- Validation passed:
  - `npm.cmd test -- src/__tests__/classroom-tail-auth.test.ts src/__tests__/classroom-analytics-route.test.ts src/__tests__/omr-route-auth.test.ts src/__tests__/classroom-students-assignments-auth.test.ts src/__tests__/classroom-groups-skills-auth.test.ts src/__tests__/classrooms-route-auth.test.ts src/__tests__/sets-route-auth.test.ts src/__tests__/notifications-route.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Updated protected-route inventory snapshot:

- The automated Auth/User/Security normalization pass is effectively complete for the highest-value route families and the major teacher-facing API surface
- Remaining work in this plan is now best treated as:
  - a lightweight route-inventory verification sweep for any obscure leftover plain-text auth failures
  - manual QA for login, register, logout, role redirects, and session-expiry UX in Thai and English
- Practical status: the plan has moved from broad remediation into final verification

## Progress Note 10

Completed on 2026-05-03:

- Finalized the automated phase by:
  - cleaning up `src/app/api/admin/register/route.ts` so the existing-admin gate returns structured `FORBIDDEN` instead of a mismatched plain-text unauthorized response
  - adding regression coverage in `src/__tests__/admin-register-route.test.ts`
  - completing a final inventory/polish sweep across remaining classroom-adjacent handlers to standardize shared error constants and role checks
- Added the manual verification artifact:
  - `docs/auth-manual-qa-checklist.md`
- Final validation passed:
  - `npm.cmd test -- src/__tests__/admin-register-route.test.ts src/__tests__/classroom-tail-auth.test.ts src/__tests__/classroom-analytics-route.test.ts src/__tests__/omr-route-auth.test.ts src/__tests__/classroom-students-assignments-auth.test.ts src/__tests__/classroom-groups-skills-auth.test.ts src/__tests__/classrooms-route-auth.test.ts src/__tests__/sets-route-auth.test.ts src/__tests__/notifications-route.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/user-upgrade-route.test.ts src/__tests__/register-route.test.ts src/__tests__/profile-route.test.ts src/__tests__/user-settings-route.test.ts src/__tests__/rate-limit.test.ts src/lib/authorization/__tests__/resource-access.test.ts`
  - `npm.cmd run lint` (warnings only)
  - `npm.cmd run predev`
  - `npm.cmd run build`

Final status for this system plan:

- Automated Auth/User/Security normalization: complete
- Route regression baseline for the highest-value auth surface: in place
- Remaining work: browser/manual QA only, using `docs/auth-manual-qa-checklist.md`

## Progress Note 11

Completed on 2026-05-03:

- Ran a final route-inventory sweep across the main auth-sensitive API surface
- Confirmed the remaining hits are no longer broad Auth/User/Security remediation work; they are isolated wording/policy follow-ups or adjacent systems outside the core auth-normalization batch
- Prepared the manual QA handoff:
  - checklist: `docs/auth-manual-qa-checklist.md`
  - local dev server ready for browser testing at `http://localhost:3000`

Plan status:

- Automated phase: complete
- Manual QA phase: ready to execute on dev/staging

## Progress Note 12

Completed on 2026-05-03:

- Executed the first browser/manual QA pass on local dev using the auth checklist in `docs/auth-manual-qa-checklist.md`
- Verified unauthenticated access to `/dashboard` redirects to `/login?callbackUrl=...`
- Verified student portal copy renders correctly in both English and Thai
- Verified the register entry UI only exposes `Student` and `Teacher` role choices, so privileged role escalation is not available from the client picker
- Logged a real UX issue from dev manual QA:
  - invalid student codes currently fall through to the generic Next.js `404 / This page could not be found.` page at `/student/[code]`
  - this does not meet the plan goal for localized, user-facing auth/access failures

Manual QA status after this pass:

- Dev manual QA: partial
- Staging manual QA: blocked pending staging URL/credentials
- Remaining dev checks blocked pending test teacher/student/admin accounts and an expired-session scenario
- Follow-up work should move the invalid student-code handling into the Student system plan unless we want to hotfix it immediately as part of Auth polish

## Progress Note 13

Completed on 2026-05-03:

- Hotfixed the invalid student-code browser UX:
  - `src/app/student/[code]/page.tsx` now redirects missing codes to `/student?error=invalid_code`
  - `src/components/student/student-login-form.tsx` now renders a localized inline error banner for that state
- Added regression coverage in `src/__tests__/student-dashboard-page.test.ts`
- Revalidated related behavior:
  - `npm.cmd test -- src/__tests__/student-dashboard-page.test.ts` passed `2/2`
  - `npm.cmd test -- src/__tests__/join-classroom-action.test.ts` passed `3/3`
  - browser check confirmed `/student/ABCDEF` now lands on `/student?error=invalid_code` with localized Thai UX instead of generic Next.js `404`

## Progress Note 14

Completed on 2026-05-03:

- Fixed auth callback preservation across the login role-picker flow:
  - `src/components/auth/unified-auth-flow.tsx` now preserves `callbackUrl` when switching between role selection, teacher/student login, and register entry
  - `src/components/auth/auth-split-layout.tsx` now supports preserving the login link target when returning from register
  - `src/app/login/login-form.tsx` now prefers a validated `callbackUrl` after successful credential login before falling back to role-based defaults
  - `src/lib/auth/google-sign-in-client.ts` and `src/app/auth/complete-oauth/route.ts` now carry the validated callback path through the Google auth completion flow
- Added shared safety helpers and regression coverage:
  - `src/lib/auth/callback-url.ts`
  - `src/lib/auth/__tests__/callback-url.test.ts`
- Revalidated related behavior:
  - `npm.cmd test -- src/lib/auth/__tests__/callback-url.test.ts src/__tests__/student-dashboard-page.test.ts` passed `6/6`
  - `npm.cmd test -- src/__tests__/join-classroom-action.test.ts` passed `3/3`
  - browser check confirmed `/dashboard` redirects to `/login?callbackUrl=...` and selecting the teacher path preserves that callback in `/login?audience=teacher&callbackUrl=...`
- Validation note:
  - `npm.cmd run predev` passed
  - full `npm.cmd run build` is currently blocked by a local Prisma engine file lock during `prisma generate`, not by an auth compile/type failure observed in this change set

## Progress Note 15

Completed on 2026-05-03:

- Extended callback preservation into the register flow in `src/app/register/signup-wizard.tsx`
  - preserves `callbackUrl` when returning to the shared login/register entry
  - preserves `callbackUrl` when redirecting to `pendingVerify`
  - passes `callbackUrl` through the Google sign-up handoff
- Revalidated the shared callback helper contract:
  - `npm.cmd test -- src/lib/auth/__tests__/callback-url.test.ts` passed `4/4`
  - `npm.cmd run predev` passed
- Manual QA note:
  - the dev server had to be restarted after a `.next` cleanup disrupted the previous running process
  - the final browser confirmation for the register callback path should be rerun in a fresh dev session, but the code path is now aligned with the already-verified login callback flow

## Progress Note 16

Completed on 2026-05-03:

- Added focused regression coverage for the OAuth completion callback flow in `src/__tests__/complete-oauth-route.test.ts`
- Locked the following behaviors in tests:
  - unauthenticated `/auth/complete-oauth` requests redirect back to `/login`
  - a validated same-origin `callbackUrl` wins over role-based defaults
  - cross-origin `callbackUrl` values are rejected and fall back to safe role-based destinations
  - the OAuth intent cookie is cleared on exit paths
  - missing user records redirect cleanly back to `/login`
- Validation passed:
  - `npm.cmd test -- src/__tests__/complete-oauth-route.test.ts src/lib/auth/__tests__/callback-url.test.ts` passed `8/8`
  - `npm.cmd run predev` passed

Current status:

- The callback-preservation work inside Auth/User/Security now has route-level regression coverage for both helper logic and OAuth completion behavior
- The remaining meaningful work in this system plan is still browser/manual QA with real test accounts and a stable dev/staging session

## Progress Note 17

Completed on 2026-05-03:

- Tightened the OAuth completion fallback behavior in `src/app/auth/complete-oauth/route.ts`
  - when the OAuth return arrives without a live session, `/login` now preserves the validated callback destination
  - when the signed-in user record no longer exists, the same safe login fallback preserves `callbackUrl` and still clears the intent cookie
- Revalidated with focused regression coverage:
  - `npm.cmd test -- src/__tests__/complete-oauth-route.test.ts src/lib/auth/__tests__/callback-url.test.ts` passed `8/8`
  - `npm.cmd run predev` passed

Practical status:

- Callback preservation is now covered across credentials login, register entry, Google OAuth completion, and login-fallback edge cases
- The plan remains code-complete for auth flow hardening; remaining work is manual verification with real accounts and stable dev/staging sessions

## Progress Note 18

Completed on 2026-05-03:

- Centralized post-auth redirect policy into `src/lib/auth/post-auth-destination.ts`
  - shared default destinations now live in one helper instead of being re-expressed separately in login and OAuth completion flows
  - credentials login in `src/app/login/login-form.tsx` now uses the shared resolver
  - OAuth completion in `src/app/auth/complete-oauth/route.ts` now uses the shared default-path helper
- Added focused regression coverage in `src/lib/auth/__tests__/post-auth-destination.test.ts`
- Validation passed:
  - `npm.cmd test -- src/lib/auth/__tests__/post-auth-destination.test.ts src/__tests__/complete-oauth-route.test.ts src/lib/auth/__tests__/callback-url.test.ts` passed `11/11`
  - `npm.cmd run predev` passed

Practical effect:

- Post-login redirect behavior is now easier to reason about, less likely to drift between credentials and OAuth flows, and better protected by narrow regression tests

## Progress Note 19

Completed on 2026-05-03:

- Added focused auth API regression coverage for:
  - `src/__tests__/oauth-intent-route.test.ts`
  - `src/__tests__/resend-verification-route.test.ts`
- Locked key behaviors around the login/register edge surface:
  - `oauth-intent` rejects invalid roles, fails cleanly when auth secret is missing, and sets the signed HttpOnly intent cookie on success
  - `resend-verification` returns structured invalid-payload and rate-limit responses, avoids leaking account existence for unknown emails, and records masked audit metadata on delivery failures
- Validation passed:
  - `npm.cmd test -- src/__tests__/oauth-intent-route.test.ts src/__tests__/resend-verification-route.test.ts src/__tests__/complete-oauth-route.test.ts src/lib/auth/__tests__/callback-url.test.ts src/lib/auth/__tests__/post-auth-destination.test.ts` passed `18/18`
  - `npm.cmd run predev` passed

Practical status:

- The auth plan now has regression coverage not only for route guards and callback flows, but also for the OAuth intent bootstrap and verification-email resend surface that sits directly in the login/register UX

## Progress Note 20

Completed on 2026-05-03:

- Added direct regression coverage for the core NextAuth authorization gate in `src/__tests__/auth-config-authorized.test.ts`
- Locked the shared `authorized()` policy in `src/auth.config.ts` for:
  - unauthenticated access to `/dashboard` and `/student/home`
  - non-admin access to `/admin`
  - student access to `/dashboard`
  - allowed happy paths for admin, teacher, and student users on their expected route families
- Validation passed:
  - `npm.cmd test -- src/__tests__/auth-config-authorized.test.ts src/__tests__/oauth-intent-route.test.ts src/__tests__/resend-verification-route.test.ts src/__tests__/complete-oauth-route.test.ts src/lib/auth/__tests__/callback-url.test.ts src/lib/auth/__tests__/post-auth-destination.test.ts` passed `22/22`
  - `npm.cmd run predev` passed

Practical status:

- The auth plan now has regression coverage across the central authorization gate, login/register support routes, callback preservation helpers, and OAuth completion redirects
- Remaining work in this plan is overwhelmingly manual/browser validation with real accounts rather than additional auth hardening code

## Progress Note 21

Completed on 2026-05-03:

- Added direct regression coverage for the verification-link completion route in `src/__tests__/verify-email-route.test.ts`
- Locked the email verification flow for:
  - missing token -> redirect to `/login?verifyError=missing_token`
  - unknown or expired token -> redirect to `/login?verifyError=invalid_or_expired`
  - valid token -> verify matching unverified users, clear verification tokens for the email, and redirect to `/login?verified=1`
- Validation passed:
  - `npm.cmd test -- src/__tests__/verify-email-route.test.ts src/__tests__/auth-config-authorized.test.ts src/__tests__/oauth-intent-route.test.ts src/__tests__/resend-verification-route.test.ts src/__tests__/complete-oauth-route.test.ts src/lib/auth/__tests__/callback-url.test.ts src/lib/auth/__tests__/post-auth-destination.test.ts` passed `26/26`
  - `npm.cmd run predev` passed

Practical status:

- The login/register/auth-support surface now has regression coverage across sign-in routing policy, OAuth intent bootstrap, OAuth completion, resend verification, and verify-email completion
- Remaining value in this plan is almost entirely in browser/manual QA with real accounts and stable environment access

## Progress Note 22

Completed on 2026-05-03:

- Added direct regression coverage for the core NextAuth callback layer in `src/__tests__/auth-core-callbacks.test.ts`
- Locked the following `src/auth.ts` behaviors:
  - jwt callback hydrates token fields from the initial user payload and refreshes them from the database
  - invalid roles are normalized back to `USER`
  - session callback projects role, school, settings, plan, and plan status into `session.user`
  - jwt refresh failures keep the existing token shape instead of breaking the auth session path
- Validation passed:
  - `npm.cmd test -- src/__tests__/auth-core-callbacks.test.ts src/__tests__/verify-email-route.test.ts src/__tests__/auth-config-authorized.test.ts src/__tests__/oauth-intent-route.test.ts src/__tests__/resend-verification-route.test.ts src/__tests__/complete-oauth-route.test.ts src/lib/auth/__tests__/callback-url.test.ts src/lib/auth/__tests__/post-auth-destination.test.ts` passed `29/29`
  - `npm.cmd run predev` passed

Practical status:

- The Auth/User/Security plan now has regression coverage across the central authorization gate, session/jwt callback layer, and the major login/register support routes
- Remaining work is now dominated by browser/manual validation rather than missing auth hardening code paths

## Progress Note 23

Completed on 2026-05-03:

- Added direct regression coverage for the credentials authorize path in `src/__tests__/auth-credentials-authorize.test.ts`
- Locked the core email/password auth behavior in `src/auth.ts` for:
  - missing credentials -> `null`
  - rate-limited credential attempts -> `RATE_LIMITED`
  - unknown user / invalid password -> `null`
  - valid password but unverified email -> `email_not_verified`
  - successful auth -> normalized app user payload with role fallback to `USER`
- Validation passed:
  - `npm.cmd test -- src/__tests__/auth-credentials-authorize.test.ts src/__tests__/auth-core-callbacks.test.ts src/__tests__/verify-email-route.test.ts src/__tests__/auth-config-authorized.test.ts src/__tests__/oauth-intent-route.test.ts src/__tests__/resend-verification-route.test.ts src/__tests__/complete-oauth-route.test.ts src/lib/auth/__tests__/callback-url.test.ts src/lib/auth/__tests__/post-auth-destination.test.ts` passed `34/34`
  - `npm.cmd run predev` passed

Practical status:

- The Auth/User/Security plan now has regression coverage across the credentials authorize path, NextAuth policy/callback core, and the login/register support routes around it
- Remaining work is almost entirely manual/browser verification with real test accounts and stable environment access

## Progress Note 24

Completed on 2026-05-03:

- Added a dedicated auth regression runner in `package.json`:
  - `npm.cmd run test:auth`
- The script bundles the current Auth/User/Security regression suite across:
  - credentials authorize
  - NextAuth authorized/jwt/session policy
  - login/register support routes
  - classroom/sets/folders/notifications/OMR auth route contracts
  - shared authorization resource-access tests
- This gives the plan a single repeatable command for pre-merge and post-manual-QA verification
- Validation passed:
  - `npm.cmd run test:auth` passed `121/121`
  - `npm.cmd run predev` passed

## Progress Note 25

Completed on 2026-05-03:

- Added a one-command auth preflight in `package.json`:
  - `npm.cmd run check:auth`
- The command now runs:
  - `npm.cmd run test:auth`
  - `npm.cmd run predev`
- Validation passed:
  - `npm.cmd run check:auth` completed successfully

Practical status:

- The Auth/User/Security plan now has a repeatable one-line automated preflight to run before or after manual QA, before merge, or before handing the system plan off to the next phase

## Progress Note 26

Completed on 2026-05-03:

- Finished a substantial local-dev manual QA pass for the auth surface using prepared teacher, student, admin, and pending-verification accounts plus a seeded classroom/student-code fixture
- Verified in a real browser flow on `http://localhost:3000`:
  - unauthenticated `/dashboard` -> `/login?callbackUrl=...`
  - teacher credentials login -> `/dashboard`
  - student credentials login -> `/student/home`
  - valid student class code -> student classroom page
  - logout -> `/login`, and protected route revisit redirects cleanly
  - non-admin sessions are redirected away from `/admin`
  - `pendingVerify=1` and unverified-email login surfaces show the expected verification-required UX
  - duplicate email and duplicate generated-username collisions show localized register errors
  - teacher and student registration both succeed and return to the expected pending-verification login route
  - `/dashboard/my-sets`, `/dashboard/classrooms`, and `/dashboard/omr` load without leaking raw auth contract strings into the visible UI
- Updated `docs/auth-manual-qa-checklist.md` with the completed items and the remaining blockers/findings

Remaining findings from the browser pass:

- The login rate-limit path still did not surface a distinct localized rate-limit message in the browser pass; repeated failed attempts continued to show the generic invalid-password copy
- A true expired-session browser scenario is still unverified because there is no dedicated expired-session fixture yet
- Unauthorized API-driven UI handling is still not fully closed for notification/folder/OMR fetch surfaces from a live non-privileged session
- Staging manual QA remains blocked until a staging URL and staging credentials are available
- `npm.cmd run build` is still intermittently blocked locally by a Prisma engine file lock during `prisma generate`, although `npm.cmd run predev` and `npm.cmd run check:auth` continue to pass

Practical status:

- The automated Auth/User/Security phase remains complete
- Dev manual QA is now mostly covered, with the remaining work reduced to a short list of targeted follow-ups rather than a wide exploratory pass

## Progress Note 27

Completed on 2026-05-03:

- Closed the login rate-limit UX gap that showed up during the dev manual QA pass
- Updated the credentials auth flow in `src/auth.ts` to throw a dedicated `CredentialsSignin` subclass for rate-limited sign-in attempts instead of a generic error
- Updated `src/app/login/login-form.tsx` to read NextAuth callback result codes from both `result.code` and the `code=...` query parameter embedded in `result.url`
- Added focused regression coverage in:
  - `src/__tests__/auth-credentials-authorize.test.ts`
  - `src/__tests__/ui-error-messages.test.ts`
  - `src/lib/auth/__tests__/next-auth-result.test.ts`
- Validation passed:
  - `npm.cmd test -- src/__tests__/auth-credentials-authorize.test.ts src/__tests__/ui-error-messages.test.ts src/lib/auth/__tests__/next-auth-result.test.ts` passed `17/17`
- Re-ran the local browser QA path and confirmed repeated failed sign-in attempts now surface:
  - `Too many sign-in attempts. Please wait a moment and try again.`

Practical status:

- The rate-limit UX item in `docs/auth-manual-qa-checklist.md` is now closed
- Remaining auth manual QA work is narrowed further to expired-session coverage and a few unauthorized API-driven UI surfaces, plus staging validation when access is available

## Progress Note 28

Completed on 2026-05-03:

- Closed the remaining dev-local expired-session and unauthorized API-driven UI follow-ups for the main teacher dashboard surfaces
- Added client-side dashboard session synchronization:
  - new `src/components/auth/dashboard-auth-sync.tsx`
  - mounted from `src/app/dashboard/layout.tsx`
  - when the dashboard session becomes unauthenticated, the client now redirects back to `/login?callbackUrl=...`
  - if a student somehow lands inside the dashboard shell client-side, the sync component redirects back to `/student/home`
- Hardened `src/components/dashboard/notification-tray.tsx` so auth loss no longer fails silently:
  - non-OK notification fetch responses now map through localized app-error handling
  - auth failures pause background polling instead of quietly retrying forever
  - mark-as-read and delete actions now surface readable localized errors on auth failure
- Validation passed:
  - `npm.cmd run predev` passed
- Browser QA confirmed on local dev:
  - clearing auth cookies on `/dashboard/my-sets` and reloading redirects back to `/login?callbackUrl=...`
  - clearing auth cookies mid-session then using notification tray actions surfaces a sign-in-required message instead of silent failure
  - clearing auth cookies mid-session then creating a folder in My Sets surfaces a readable sign-in-required banner
  - clearing auth cookies mid-session then creating an OMR quiz surfaces a readable sign-in-required message

Practical status:

- The `Expired session does not leave broken loading states` checklist item is now closed for dev-local QA
- The `Unauthorized API-driven UI surfaces a readable localized error` checklist item is now closed for the main notification, My Sets, and OMR surfaces
- Remaining auth manual QA is now mostly staging access plus a narrower proof for teacher/admin-only API calls from a live non-privileged session
