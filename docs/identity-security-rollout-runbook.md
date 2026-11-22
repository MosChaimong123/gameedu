# Identity Security Controlled Rollout Runbook

Last updated: 2026-08-03

This runbook is the production evidence record for System Plan 56 Phase 8F. Never mark a rollout checkbox complete from unit tests alone.

## Release gates

Record the revision and attach command output before staging:

- [ ] `npm.cmd run check:identity-security`
- [ ] `npm.cmd run lint`
- [ ] `npm.cmd run check:i18n:strict` — repository-wide legacy findings must be triaged; the auth-only zero-finding gate is `check:i18n:auth`
- [ ] `npm.cmd test`
- [ ] `npm.cmd run build`
- [ ] `npm.cmd run db:print-target` confirms the staging database
- [ ] Prisma schema deployment completes before application rollout
- [ ] `npm.cmd run db:migrate-student-codes:dry-run` reviewed before any `--apply`
- [ ] `npm.cmd run db:prune-auth-security` dry run reviewed before scheduling retention cleanup

Evidence:

| Field | Value |
|---|---|
| Revision | Pending |
| Operator | Pending |
| Staging URL | Pending |
| Started at | Pending |
| Completed at | Pending |

## Controlled accounts and mailboxes

Use synthetic data only. Do not put passwords, OTPs, recovery codes, Student Codes, raw email addresses, or raw IP addresses in this document.

- [ ] ADMIN credentials + TOTP + recovery code + passkey
- [ ] Internal TEACHER credentials + Google + optional MFA
- [ ] STUDENT credentials account
- [ ] Student Code-only profile
- [ ] Disabled account
- [ ] Unverified account
- [ ] Mailbox provider A receives verification and reset messages
- [ ] Mailbox provider B receives verification and reset messages

Store account identifiers in the approved secret manager. Evidence should use an opaque support/reference ID only.

## Staging matrix

### Credentials and verification

- [ ] Valid, invalid, unverified, disabled, and rate-limited credential sign-in
- [ ] Unknown, verified, pending, expired, max-attempt, concurrent-consume, and resend-provider-failure verification
- [ ] Neutral forgot/resend responses have no observable account-state difference
- [ ] Register/change/forgot/Admin reset share password policy and revoke sessions as specified

### OAuth, sessions, and MFA

- [ ] Google new/existing/link conflict/provider unavailable/callback attack
- [ ] Session absolute expiry, idle expiry, revoke one, revoke all, role downgrade, account disable, and DB outage
- [ ] MFA enrollment/login/replay/recovery/Admin reset and passkey register/login/revoke
- [ ] ADMIN cannot reach privileged pages with password-only authentication

### Student access and UX

- [ ] Student Code brute force, exchange, expiry, rotation, link race, and legacy cutoff
- [ ] Thai/English on mobile and desktop
- [ ] Keyboard-only navigation, focus visibility, paste, screen reader announcements, and password-manager autofill
- [ ] Recovery codes and Student Codes do not appear in URL, referrer, logs, analytics, or screenshots

## Cohort rollout

Advance one cohort at a time. Keep each cohort for at least one full observation window with no unresolved P0/P1 issue.

| Cohort | Entry condition | Evidence | Status |
|---|---|---|---|
| ADMIN | Staging matrix passed; MFA enrollment support ready | Pending | Not started |
| Internal Teacher | ADMIN stable; provider and delivery alerts quiet | Pending | Not started |
| Controlled users | Internal Teacher stable; support playbook exercised | Pending | Not started |
| All users | Controlled cohort stable; product owner approval | Pending | Not started |

## Metrics and alerts

The MFA-authenticated Admin endpoint `GET /api/admin/security/auth-health?windowMinutes=15` returns aggregate counts only. It must not return raw email, IP, password, OTP, recovery code, or Student Code.

- [ ] Sign-in success/failure/rate-limit counters move during controlled tests
- [ ] Verification and password-reset completion counters move
- [ ] Provider failure, MFA challenge, and session revoke counters move
- [ ] Brute-force alert fires at the configured threshold
- [ ] Verification failure alert fires at the configured threshold
- [ ] OAuth failure alert fires at the configured threshold
- [ ] Delivery suppression alert fires at the configured threshold
- [ ] Admin MFA bypass alert fires at the configured threshold
- [ ] Alert delivery reaches the on-call channel and is acknowledged

## Rollback triggers

Rollback or contain immediately when any condition is observed:

- Open redirect, account enumeration, plaintext secret persistence, authorization bypass, or insecure legacy session: immediate P0 containment
- ADMIN or high-risk authorization fails open during database/session-registry outage
- Password/MFA/role/account changes fail to revoke sessions
- OTP replacement destroys the previous usable challenge when delivery fails
- Error rate exceeds 5% or sign-in success drops more than 10 percentage points from the shadow baseline for 15 minutes
- Delivery suppression exceeds the configured threshold

Rollback may disable the affected entry point or cohort enforcement. It must never restore plaintext secrets, account enumeration, legacy six-character Student Codes, or password-only ADMIN access. Database changes remain backward-compatible; do not destructively remove new security fields during rollback.

## Production completion record

- [ ] All four cohorts completed
- [ ] Metrics and alerts observed for at least one real production cycle
- [ ] No open P0/P1 auth finding
- [ ] Support and rollback drill completed
- [ ] Final approver recorded

Final evidence/incident links: Pending
