# Staging Release Readiness — 2026-08-09

สถานะ: **Foundation commit created; remaining identity changes unstaged; not pushed, not deployed**

Branch: `codex/staging-release-readiness`

เป้าหมายของเอกสารนี้คือแยกงานจำนวนมากออกจาก `main` และกำหนดขอบเขต release ก่อนสร้าง commit หรือเปลี่ยนฐานข้อมูลจริง

## Baseline evidence

- [x] สร้าง release branch แยกจาก `main` โดยเก็บ working tree เดิมครบ
- [x] `npm.cmd run check:identity-security` ผ่าน
- [x] `npm.cmd test` ผ่าน 310 test files / 1,588 tests
- [x] `npm.cmd run build` ผ่าน
- [x] `npm.cmd run lint` ผ่านแบบไม่มี error; มี 57 warnings
- [x] `check:i18n:auth` ผ่าน
- [ ] `check:i18n:strict` ทั้ง repository ยังพบ legacy findings 310 รายการ ต้องแก้หรือบันทึก approved baseline
- [x] Production `/api/ready` ตอบ HTTP 200 และรายงาน MongoDB, Prisma, LINE, R2, Stripe และ Email Delivery เป็น `configured`

## Working tree inventory

รวม 177 รายการ ณ เวลาสร้าง inventory:

| กลุ่ม | จำนวน | ขอบเขตโดยย่อ |
|---|---:|---|
| Auth and security | 95 | Login, Register, OAuth, OTP, password lifecycle, sessions, MFA, Passkeys, rate limits, observability |
| Student access | 20 | Student Code, scoped session, student portal access |
| Dashboard and UI | 20 | Dashboard navigation/redesign และ shared UI |
| Classroom and assignments | 13 | Authorization hardening และ route behavior |
| Infrastructure and docs | 9 | Prisma, Render, package scripts, environment documentation |
| Other cross-domain changes | 20 | Admin, email readiness, translations, Negamon/LINE reward hardening |

หมายเหตุ: การจัดกลุ่มนี้ใช้ path-based inventory เพื่อหา release boundary; ต้อง review diff จริงก่อน stage

## High-risk files to review first

- [x] `prisma/schema.prisma` — additive MongoDB models/fields validated; no destructive removal found
- [x] `render.yaml` — parsed successfully, no duplicate env keys; MFA remains off and breach check starts in `enabled`
- [x] `.env.example` — production-required keys reviewed; no real secret found in tracked diff
- [x] `src/auth.ts` และ `src/auth.config.ts` — Login/OAuth/session/MFA enforcement reviewed; critical MFA update trust issue fixed
- [ ] `src/proxy.ts` — public/protected route boundary
- [ ] `src/lib/security/rate-limit.ts` — production atomic store และ trusted proxy behavior
- [x] `src/lib/student-login-code.ts` และ migration script — local dry run: 38 scanned, 14 legacy, 38 missing version; no mutation
- [ ] recovery/verification routes — neutral response, OTP lifecycle และ session revocation

## Proposed commit boundaries

ยังไม่ stage จนกว่าแต่ละ boundary จะผ่าน diff review:

1. [x] **Schema and migration foundation** — commit `0c4f0d9`; additive Prisma models, Student Code dry-run migration, auth metadata dry-run pruning, Prisma build fail-closed
   - Remaining deployment configuration (`.env.example`, `render.yaml`, package scripts) stays unstaged until it can be reviewed with the identity code that consumes it.
2. **Identity core** — Auth.js callbacks, credentials, OAuth, password/email/provider lifecycle
3. **Recovery and verification** — signup OTP, forgot/reset, delivery readiness/webhook
4. **Sessions and Security Center** — session registry, activity, revoke one/all
5. **MFA and Passkeys** — enrollment, challenge, recovery, Admin reset; enforcement remains off
6. **Student access security** — scoped Student Code sessions and migration tooling
7. **Cross-domain authorization hardening** — Classroom/Admin/Student route guards
8. **UI, localization, tests and runbooks** — user-facing flows and release evidence

## Gates before the first commit

- [x] Review `git diff -- prisma/schema.prisma render.yaml .env.example package.json`
- [x] Confirm no `.env`, credentials, OTP, recovery code, raw Student Code or private key is tracked
- [ ] Confirm every untracked source file belongs to an implemented and tested phase
- [ ] Separate unrelated Dashboard/Negamon/LINE work if it is not required by the identity release
- [ ] Decide how to handle the 310 repository-wide i18n findings

## Gates before staging deploy

- [ ] Record staging URL and staging database target
- [ ] Run `npm.cmd run db:print-target` and confirm it is **not production**
- [x] Review Student Code migration dry run on local `gamedu`; do not use `--apply`
- [x] Review auth metadata prune dry run on local `gamedu`; all three prune counts are 0
- [ ] Deploy Prisma schema to staging before app rollout
- [ ] Configure controlled accounts and two mailbox providers
- [ ] Keep `AUTH_MFA_ENFORCEMENT=off` until staged MFA/passkey QA passes

## Stop conditions

Do not commit/push/deploy when any of these is true:

- Diff scope is not understood or unrelated work is mixed into the release
- Staging database target is unknown
- A secret or OTP appears in Git diff/logs
- Login/Register/Google OAuth regression exists
- Schema change is destructive or rollback-incompatible
- Production-only configuration cannot be verified without exposing secrets

## Next review action

Review and create the **Identity core** commit boundary: Auth.js callbacks, credentials/OAuth lifecycle, shared password policy, rate limiting, environment contract, and their tests. Keep Dashboard redesign, Negamon, LINE, and unrelated classroom work unstaged. After the identity commits are complete, provision an isolated staging URL/database. No production deployment is authorized by this document.

## Deployment/schema audit evidence — 2026-08-09

- Commit `0c4f0d9` contains only four reviewed foundation files. `git diff --cached --check`, Prisma validation, Student Code dry run, and auth metadata prune dry run passed before commit; no migration was applied.
- Prisma Client regenerated successfully after stopping the exact Node process that held the project engine DLL.
- Fixed auth metadata pruning to use `absoluteExpiresAt` and `idleExpiresAt`; dry run now completes without mutation.
- Prisma generation during build now fails closed if the Windows engine remains locked; it no longer accepts a client based on file timestamp or mere presence.
- Student migration now detects and reports documents missing `loginCodeVersion` before any apply. Apply mode backfills version 1 before rotating legacy codes, which increments those records to version 2 and revokes their active student sessions.
- Production rollout keeps `AUTH_MFA_ENFORCEMENT=off` and starts `PASSWORD_BREACH_CHECK=enabled`; `enforce` remains a later promotion after staging availability evidence.

## Identity Core audit evidence — 2026-08-09

- Reviewed credentials login, OAuth intent/completion, JWT/session callbacks, security-session registry, provider lifecycle, MFA elevation, Passkey sign-in, callback URL validation, role semantics, and structured errors.
- Fixed a critical trust-boundary issue where a browser-controlled `session.update()` payload could set `mfaLevel` and `mfaVerifiedAt`. MFA elevation now requires a 60-second HMAC proof bound to the user and active security-session record.
- MFA verification now rejects missing or revoked security sessions instead of updating the JWT after a zero-row database update.
- Added layered IP/global rate limiting before the public Passkey authentication-options endpoint creates a database challenge.
- Malformed or invalid Passkey assertions now return an authentication miss instead of surfacing an unexpected server error; oversized credential payloads are rejected.
- Regression coverage proves forged MFA session-update fields are ignored, valid signed proof is accepted only for its bound session, Passkey challenge creation is rate-limited, and invalid WebAuthn evidence fails safely.
- `npm.cmd run check:auth` passed after the fixes: core auth 275 tests, Phase 8B 9, Phase 8C 10, Phase 8D 14, Phase 8E 7, Phase 8F 11; schema validation and server TypeScript compilation passed.
- `npm.cmd run build` passed after the fixes with Prisma Client regeneration and 119 static pages generated.

## Local browser auth smoke evidence — 2026-08-09

- [x] Disposable local teacher account signed in with credentials and reached `/dashboard`.
- [x] Invalid password stayed on login and showed a neutral localized error without account enumeration.
- [x] MFA enrollment QR/TOTP activation completed and recovery-code acknowledgement forced a fresh login.
- [x] MFA challenge accepted a fresh TOTP and elevated the bound security session before returning to `/dashboard`.
- [x] Security Center listed the current Chrome/Windows session and MFA status after the fix.
- [x] Login form now uses `method="post"`, preventing pre-hydration native submission from placing credentials in the URL query string.
- [x] MongoDB optional-field handling was corrected for MFA authenticators, recovery codes, and user security sessions. Active-session filters accept both explicit `null` and legacy missing fields; new rows write explicit nulls.
- [x] `npm.cmd run check:auth` passed: 275 core auth tests plus Phase 8B–8F suites, security guard, Prisma validation, and server TypeScript.
- [x] `npm.cmd run build` passed with 119 static pages generated.
- [ ] Google OAuth completion requires a controlled Google staging account; no user Google session was used.
- [ ] Passkey registration/sign-in requires a controlled authenticator/device ceremony; no OS credential prompt was accepted in this automated run.
- [ ] Real OTP email delivery remains blocked locally because `/api/ready` reports email delivery as not configured.
- [x] Disposable QA account and its auth metadata were removed after the run.
