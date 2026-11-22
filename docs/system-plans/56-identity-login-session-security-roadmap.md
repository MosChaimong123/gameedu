# System Plan 56: Identity, Login, Session, and Student Access Security

Last updated: 2026-08-03

Status: In progress — Phase 8F local implementation and automated QA completed; staging/production rollout pending

## Purpose

ยกระดับระบบยืนยันตัวตนของ GameEdu ให้ครอบคลุมวงจรชีวิตบัญชีทั้งหมด ไม่จำกัดเฉพาะ Login หรือ Forgot Password โดยรวม:

- Email/password และ Google OAuth
- สมัครสมาชิกและยืนยันอีเมลด้วย OTP
- Forgot/Reset Password
- การเปลี่ยนรหัสผ่านโดยผู้ใช้และ Admin
- Session, device, logout และ revoke
- Role/RBAC และการลดสิทธิ์
- MFA, recovery codes และ Passkeys
- การเชื่อม/ยกเลิก Login provider
- Student Login Code และการเชื่อมบัญชีนักเรียน
- Audit, alerting, support operations และ production QA

แผนนี้ต่อยอดจาก:

- [System Plan 01: Auth / User / Security](./01-auth-user-security.md)
- [System Plan 54: Auth Password Recovery And Email Delivery Hardening](./54-auth-password-recovery-email-delivery-hardening.md)
- [Auth Manual QA Checklist](../auth-manual-qa-checklist.md)
- [Security PR Review Checklist](../security-pr-review-checklist.md)

## Current Automated Baseline

ตรวจเมื่อ 2026-08-03:

- `npm.cmd run check:auth` ผ่าน
- Auth tests: 40 files / 263 tests, Phase 8B tests 2 files / 8 tests และ Phase 8C tests 2 files / 10 tests
- Auth recovery security guard ผ่าน
- Prisma schema validation ผ่าน
- Server TypeScript ผ่าน

หมายเหตุ: baseline ที่ผ่านไม่ได้แปลว่าปัญหาด้านความปลอดภัยทั้งหมดถูกปิด เพราะ test บางชุดกำลังรับรอง behavior เดิมที่ต้องเปลี่ยน เช่น JWT fail-open และ public verification-state response

## Security Invariants

ทุก phase ต้องรักษาข้อกำหนดต่อไปนี้:

1. Redirect หลัง Login/OAuth ต้องอยู่ same-origin หลัง parse และ canonicalize แล้วเท่านั้น
2. Public auth response ต้องไม่เปิดเผยว่าบัญชีมีอยู่, ใช้ provider ใด, verified หรือ pending หรือไม่
3. OTP/password/session token/recovery code ห้ามอยู่ใน logs, audit metadata, analytics หรือ production response
4. OTP attempt, consume, resend และ activation ต้อง atomic และสำเร็จได้สูงสุดหนึ่งครั้ง
5. สร้าง OTP ใหม่แล้วส่งล้มเหลวต้องไม่ทำลาย credential เดิมที่ยังใช้ได้
6. Password/role/MFA/account-status change ต้อง revoke session ตาม policy เดียวกันทุกช่องทาง
7. ADMIN และ security-sensitive action ต้อง fail closed เมื่อยืนยันสถานะบัญชีล่าสุดไม่ได้
8. Rate limit ต้องใช้ counter แบบ atomic และใช้ทั้ง per-IP, per-account digest และ global abuse signal
9. ห้ามใช้ raw email, Student Code หรือ IP เป็น persistent rate-limit/audit key
10. Student Code ต้องถูกปฏิบัติเป็น secret และไม่เป็น long-lived bearer credential ใน URL
11. UI และ error contract ต้องรองรับภาษาไทย/อังกฤษ, keyboard, screen reader, paste และ password manager
12. Rollback ห้ามย้อนกลับไปเก็บ OTP/password/session secret แบบ plaintext

## Audit Findings and Priority

| Priority | Finding | Evidence | Required outcome |
|---|---|---|---|
| P0 | Callback path เช่น `/\\evil.com` ผ่าน validation และอาจ resolve ไป external origin | `src/lib/auth/callback-url.ts`, OAuth completion, credentials redirect | Parse ทุก input ด้วย `new URL`, reject backslash/control chars และยืนยัน origin ก่อน redirect |
| P1 | `verification-pending` เปิดเผย pending state, reference code และ expiry จาก email | `src/app/api/auth/verification-pending/route.ts` | ลบ public lookup หรือใช้ opaque, short-lived, signed request handle |
| P1 | Resend verification มี response/timing/status ต่างกันตาม account state | `src/app/api/auth/resend-verification/route.ts` | Neutral 202 response และ minimum response time ที่เหมือนกัน |
| P1 | Resend verification ลบรหัสเดิมก่อน provider ยอมรับรหัสใหม่ | route เดียวกัน | ใช้ PENDING -> provider accepted -> ACTIVE แล้ว consume code เดิมใน transaction |
| P1 | Signup OTP attempts เป็น read-then-write และ route ไม่มี layered rate limit | `src/app/api/auth/verify-email-code/route.ts` | CAS/atomic increment, max-attempt lock และ per-IP/per-challenge buckets |
| P1 | Admin reset password ไม่ increment `authVersion` และไม่ revoke sessions | `src/app/admin/admin-actions.ts` | ใช้ shared password-change transaction และบังคับ minimum policy เดียวกัน |
| P1 | JWT DB refresh error แล้วคง role/session เดิม | `src/auth.ts` และ test ปัจจุบัน | ADMIN/sensitive routes fail closed; ออกแบบ bounded freshness สำหรับ session ปกติ |
| P1 | Mongo rate limiter ใช้ find-then-update และเชื่อค่าแรกของ `x-forwarded-for` | `src/lib/security/rate-limit.ts` | Atomic counter และ trusted-proxy client identifier |
| P1 | Student Code ใช้เป็น bearer credential ใน URL; รองรับ legacy 6 หลัก; account linking ไม่มี rate limit | Student portal routes/actions | Exchange code เป็น scoped HttpOnly session, rotate/expire/revoke และปิด legacy code |
| P2 | Register/Login/Admin ใช้ขั้นต่ำ 6 แต่ Reset ใช้ 8 | auth routes/forms/admin action | Shared password policy พร้อม migration สำหรับบัญชีเดิม |
| P2 | Signup verification sender ไม่มี readiness/domain/message-ID lifecycle เท่า reset sender | `src/lib/email/send-verification-email.ts` | ใช้ sender/delivery contract กลางและ verified production sender |
| P2 | Login/reset-success/forgot-password UI ยังมี hardcoded Thai และ accessibility gaps | `src/app/login/login-form.tsx` | Shared translations, autocomplete และ accessible controls |
| P2 | ไม่มี self-service password/email change, device list, logout-all, MFA หรือ passkeys | schema/profile/settings inventory | เพิ่ม Account Security Center เป็น phase แยก |

## Target Architecture

```text
Public Auth UI
  -> Auth Input Validation
  -> Neutral Response + Abuse Controls
  -> Identity Service
       |- Password Policy / Hashing
       |- Provider Linking Policy
       |- Verification Challenge Lifecycle
       |- Session Registry / Revocation
       |- Role and Account Status Policy
       |- MFA / Passkey Policy
       `- Audit + Security Notifications

Student Code
  -> Rate-limited Code Exchange
  -> Scoped HttpOnly Student Access Session
  -> Student Resource Authorization
```

หลีกเลี่ยงการกระจาย password/OTP/session logic ใน route และ server action หลายแห่ง แต่รวม logic สำคัญไว้ใน shared domain services แล้วให้ route ทำหน้าที่ parse input, authorize และ map response

## Phase 8A — Emergency Auth Security Remediation

Goal: ปิดช่องโหว่ที่ใช้โจมตีได้ก่อนเพิ่ม feature ใหม่

### 8A.1 Safe redirect contract

- [x] เปลี่ยน `getSafeAuthCallbackPath` ให้ parse relative และ absolute URL ด้วย base origin เสมอ
- [x] reject `\\`, encoded control characters, credentials-in-URL, protocol-relative URL และ non-HTTP(S)
- [x] allowlist destination route families หากเป็น callback หลัง auth
- [x] validate ซ้ำที่ credentials redirect และ OAuth completion boundary
- [x] เพิ่ม tests สำหรับ `/\\evil.com`, encoded slash/backslash, CRLF, external origin และ malformed URLs

Completion evidence (2026-08-02):

- ใช้ `getSafeSameOriginPath` เป็น canonical same-origin validator และจำกัด callback หลัง auth ไว้ที่ `/dashboard`, `/admin` และ `/student/home` route families
- Credentials login และ OAuth completion ตรวจ destination ซ้ำก่อน redirect
- `npm.cmd run check:auth` ผ่าน: 36 test files / 239 tests, auth security guard, Prisma validation และ server TypeScript

### 8A.2 Stop verification enumeration

- [x] หยุด public email lookup ใน `verification-pending`
- [x] ออก signed opaque verification handle ตอน register เฉพาะ browser ที่เริ่ม flow
- [x] resend verification คืน neutral `202` shape เดียวกันสำหรับ unknown, verified, Google-only และ pending accounts
- [x] ใช้ minimum response time และไม่คืน `sent`, `referenceCode`, provider state หรือ account state ใน production
- [x] reference code ต้องมาจากอีเมลหรือ authenticated/opaque flow เท่านั้น

Completion evidence (2026-08-02):

- Register ออก encrypted/authenticated, expiring handle ผ่าน HttpOnly `SameSite=Lax` cookie และไม่ส่ง handle หรือ email ผ่าน URL
- `verification-pending` ไม่รับ email เป็น lookup key; คืน email/reference เฉพาะเมื่อ cookie handle ถูกต้องและผูกกับ pending record เดียวกัน
- Resend ใช้ neutral no-store `202 { ok: true }` พร้อม response-time floor สำหรับ unknown, verified, Google-only, cooldown, provider failure และ success
- `npm.cmd run check:auth` ผ่าน: 36 test files / 243 tests, auth security guard, Prisma validation และ server TypeScript; `npx.cmd tsc --noEmit` ผ่าน

### 8A.3 Atomic verification lifecycle

- [x] เพิ่ม `PENDING`, `ACTIVE`, `CONSUMED`, `FAILED`, `EXPIRED` lifecycle ให้ signup OTP เหมือน password reset
- [x] ส่ง email สำเร็จก่อน activate รหัสใหม่และ consume รหัสเดิม
- [x] ใช้ CAS/atomic increment สำหรับ wrong attempts
- [x] successful verify claim challenge และ update `emailVerified` ใน transaction เดียวกัน
- [x] concurrent valid OTP requests สำเร็จสูงสุดหนึ่ง request

Completion evidence (2026-08-02):

- Register และ Resend สร้าง code เป็น `PENDING`; provider accepted แล้วจึง consume code เดิมและ activate code ใหม่ใน transaction
- Provider/activation failure เปลี่ยนเฉพาะ pending code ใหม่เป็น `FAILED` โดยไม่ลบ active code เดิม
- Wrong attempt ใช้ compare-and-set จาก `id + attempts + ACTIVE + unexpired`; max-attempt และ expiry เปลี่ยนเป็น `FAILED`/`EXPIRED`
- Verify claim code เป็น `CONSUMED` และ update `emailVerified` ใน transaction เดียวกัน; regression test ยืนยัน concurrent valid requests สำเร็จหนึ่ง request
- `npm.cmd run check:auth` ผ่าน: 36 test files / 245 tests, auth security guard, Prisma validation และ server TypeScript; `npx.cmd tsc --noEmit` ผ่าน

### 8A.4 Password and privilege revocation

- [x] สร้าง shared `changeUserPassword()` service
- [x] ใช้ service เดียวกันใน self-service reset และ Admin reset
- [x] update password, increment `authVersion`, consume challenges และ revoke sessions ใน transaction
- [x] role change increment `authVersion` และ revoke sessions ผ่าน shared security mutation boundary
- [x] ตรวจ inventory แล้วไม่พบ account-disable/MFA-reset mutation ในระบบปัจจุบัน; ช่องทางเหล่านี้ต้องใช้ shared security mutation boundary เมื่อเพิ่มใน Phase 8C/8D
- [x] Admin reset UI ใช้ shared password policy

Completion evidence (2026-08-02):

- Forgot Password และ Admin Reset เรียก `changeUserPassword()` ตัวเดียวกัน ซึ่ง claim OTP (ถ้ามี), consume recovery challenges, update password, increment `authVersion` และลบ database sessions ภายใน transaction เดียว
- Admin role change ใช้ `mutateUserSecurityState()` เพื่อ update role, increment `authVersion` และลบ sessions ภายใน transaction เดียว; audit metadata เก็บเฉพาะจำนวน session ที่ถอน
- เพิ่ม shared emergency password-change policy ขั้นต่ำ 8 ตัวอักษรสำหรับ recovery/Admin UI โดยไม่ trim/normalize; การรวม Register/Login และยกระดับเป็น 12 ตัวอักษรยังอยู่ Phase 8B
- `npm.cmd run check:auth` ผ่าน: 38 test files / 252 tests, auth security guard, Prisma validation และ server TypeScript; `npx.cmd tsc --noEmit` ผ่าน

### 8A.5 Rate-limit correctness

- [x] แยก login buckets เป็น per-IP, per-account digest และ per-IP+account
- [x] ทำ Mongo counter เป็น atomic conditional update
- [x] กำหนด trusted proxy hops/headers สำหรับ Render แทนการเชื่อ X-Forwarded-For ค่าแรกโดยตรง
- [x] เพิ่ม verification/resend/register/OAuth-intent/Student-Code buckets
- [x] เพิ่ม exponential backoff และ structured Retry-After
- [x] เพิ่ม concurrency tests สำหรับ distributed counter

Completion evidence (2026-08-02):

- Credentials Login ใช้สาม bucket แยกกัน: client digest, account digest และ client+account; Forgot/Reset, Verify/Resend และ Register ใช้ layered identifiers รูปแบบเดียวกัน
- Mongo store ใช้ atomic aggregation-pipeline `findOneAndUpdate` พร้อม upsert และอ่าน counter หลัง increment จาก operation เดียว จึงไม่มีช่องว่างแบบ find-then-update
- `TRUSTED_PROXY_HOPS=1` ถูกกำหนดสำหรับ Render; resolver เดินจากขวาตาม trusted hops, ตรวจรูปแบบ IPv4/IPv6 และเปลี่ยน client address เป็น HMAC digest ก่อนใช้เป็น persistent key
- OAuth intent มี per-client/global signal และ Student Code account linking มี account/code/account+code buckets; bearer Student Code URL ยังอยู่ใน Phase 8E
- Blocked attempts เพิ่ม bounded exponential backoff; response `429` ส่ง `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` และ `retryAfterSeconds`
- Concurrency regression test ยิง Mongo counter เดียวกัน 25 ครั้งพร้อมกันที่ limit 10 และยืนยันว่า allowed 10 / blocked 15
- `npm.cmd run check:auth` ผ่าน: 40 test files / 259 tests, auth security guard, Prisma validation และ server TypeScript; `npx.cmd tsc --noEmit` ผ่าน

Exit criteria:

- [x] Open redirect payloads ทั้งหมดถูก reject
- [ ] public auth responses เทียบ account existence ไม่ได้จาก body/status/header
- [x] Signup OTP lifecycle failure-safe และ atomic
- [x] Admin password/role change revoke session เดิม
- [x] Rate limit ทน concurrent multi-instance requests

## Phase 8B — Unified Identity Lifecycle

Goal: ใช้นโยบายเดียวกันทุกช่องทางสมัคร, Login, verification และ credential change

### Password policy

- [x] สร้าง `src/lib/auth/password-policy.ts` ใช้ทั้ง server/client/admin/tests
- [x] ค่าแนะนำ: minimum 12 characters, รองรับ passphrase อย่างน้อย 64 characters
- [x] ไม่ trim หรือ normalize password โดยไม่ตั้งใจ
- [x] block password ที่พบบ่อยหรือเคยรั่วผ่าน privacy-preserving check
- [x] ไม่บังคับ periodic rotation; บังคับเปลี่ยนเมื่อ compromise/admin reset เท่านั้น
- [x] บัญชีเดิมที่ต่ำกว่า policy ยัง Login ได้ แต่ถูกแจ้ง/บังคับ upgrade ตาม rollout policy
- [x] ป้องกัน reuse ของรหัสเดิมอย่างน้อยใน password reset/change transaction

### Email lifecycle

- [x] Change Email ต้อง reauthenticate
- [x] ส่ง notification ไปอีเมลเดิมและ OTP ไปอีเมลใหม่
- [x] เปลี่ยน email หลัง OTP ใหม่ถูก consume แบบ atomic เท่านั้น
- [x] revoke session อื่นหลัง email change
- [x] ทำ sender readiness, message ID, webhook และ delivery state ให้ signup/change-email เท่ากับ password reset

### Provider lifecycle

- [x] แสดง provider ที่เชื่อมอยู่: Password, Google, Passkey
- [x] รองรับ secure link/unlink หลัง reauthentication
- [x] ห้าม unlink วิธี Login สุดท้ายหากยังไม่มี recovery method
- [x] Google-only account ต้องได้ UX ที่ชัดเจนโดยไม่เปิดเผย provider ต่อ public forgot-password request
- [x] กำหนด policy สำหรับ same-email provider linking อย่างชัดเจน

Exit criteria:

- [x] Password policy ไม่ต่างกันระหว่าง Register/Login/Reset/Admin
- [x] Email/provider change ต้อง reauthenticate และมี audit
- [x] ไม่มี flow ใดทำให้บัญชีเหลือศูนย์วิธี Login

Implementation evidence (2026-08-03):

- Password ใหม่ใช้ policy กลางขั้นต่ำ 12/สูงสุด 128 ตัวอักษร, ไม่ trim/normalize, block common password และตรวจ HIBP แบบ k-anonymity; hash ใหม่ pre-hash ก่อน bcrypt เพื่อรองรับ passphrase ยาว ขณะที่ legacy bcrypt ยัง Login ได้
- Session มี `passwordUpgradeRequired` สำหรับบัญชี legacy ที่ต่ำกว่า policy และแสดง notice ให้ reset เป็น passphrase ใหม่ โดยไม่ block การ Login ระหว่าง rollout
- Change Email ใช้ authenticated request + current-password reauthentication, OTP purpose `EMAIL_CHANGE`, provider acceptance ก่อน activate, atomic OTP claim/email update/authVersion/session revoke และ audit ที่ไม่บันทึก raw email
- Resend webhook จับคู่ delivery ด้วย provider message ID ครบ `PASSWORD_RESET`, `SIGNUP_VERIFY` และ `EMAIL_CHANGE`
- Provider API แสดง Password/Google/Passkey readiness; Google link ต้องมี signed short-lived reauth intent ที่บังคับใน Auth.js adapter และ unlink ต้องเหลือ password พร้อม revoke session
- Same-email policy เป็น explicit link หลัง signed-in reauthentication เท่านั้น; `allowDangerousEmailAccountLinking` ปิดไว้
- Gate: `npm.cmd run check:auth` ผ่าน (40 files / 262 tests + Phase 8B 2 files / 8 tests, security guard, Prisma validate และ server TypeScript)

## Phase 8C — Account Security Center and Session Management

Goal: ผู้ใช้ควบคุมบัญชีและ session ของตนเองได้

- [x] เพิ่มหน้า `/dashboard/settings/security`
- [x] Change Password โดยตรวจ current password หรือ recent MFA/passkey assertion
- [x] แสดง active sessions/devices แบบไม่เก็บ raw IP/user-agent เกินจำเป็น
- [x] revoke session รายเครื่อง
- [x] Logout all other devices
- [x] กำหนด explicit absolute/idle session lifetime แยกตาม risk/role
- [x] high-risk actions ต้อง recent authentication
- [x] แสดง security activity: login, password/email/provider/MFA/session changes
- [x] แจ้งเตือน new-device login และ credential/security changes
- [x] เพิ่ม account disable/suspend status และ Admin revoke-all

Schema direction ที่ต้องตัดสินใจก่อน implement:

```text
UserAuthSession
  id / sessionIdHash
  userId
  createdAt / lastSeenAt / expiresAt / revokedAt
  deviceLabel
  ipDigest / userAgentDigest
  authMethod / mfaLevel

User
  authVersion
  passwordChangedAt
  disabledAt / disabledReason
  lastLoginAt
```

Exit criteria:

- [x] ผู้ใช้เห็นและ revoke session ได้
- [x] Password/email/role/disable/MFA change revoke ตาม policy
- [x] Admin access ไม่พึ่ง JWT role ที่ stale เมื่อ DB/status check ล้มเหลว

Implementation evidence (2026-08-03):

- เพิ่ม `UserAuthSession` registry สำหรับ JWT strategy โดยเก็บ `sessionIdHash`, device label และ HMAC digest ของ IP/User-Agent เท่านั้น พร้อม absolute/idle expiry, revoke reason, auth method และ MFA level
- JWT callback ลงทะเบียน session ใหม่, touch แบบมีช่วงเวลา, ตรวจ revoke/expiry/disabled status ทุกครั้ง และ fail closed สำหรับ registry session รวมถึง ADMIN เมื่อ database/status check ล้มเหลว
- Lifetime policy: ADMIN 8 ชั่วโมง/idle 30 นาที, TEACHER/USER 7 วัน/idle 24 ชั่วโมง, STUDENT 30 วัน/idle 7 วัน; recent-auth window 10 นาที
- หน้า `/dashboard/settings/security` รองรับเปลี่ยนรหัสผ่าน, แสดง Password/Google/Passkey, ดู/revoke session, logout อุปกรณ์อื่น และดู auth audit activity โดยมี i18n ไทย/อังกฤษ
- Password/email/provider/role/account-status mutation revoke ทั้ง Auth.js database sessions และ JWT registry sessions; sign-out ปกติ mark registry record เป็น revoked
- เพิ่ม Admin API สำหรับ disable/enable/revoke-all พร้อม role guard, recent-auth/current-password fallback, transaction, authVersion increment และ audit
- ส่ง security notification เมื่อพบ new device และเมื่อ password/provider/account security เปลี่ยน โดยไม่ทำให้ provider outage เปิดทาง bypass การยืนยันตัวตน
- Gate: `npm.cmd run check:auth` ผ่าน (40 files / 263 tests + Phase 8B 8 tests + Phase 8C 10 tests, security guard, Prisma validate และ server TypeScript); targeted ESLint ผ่าน และ `check:i18n` ผ่านโดยไม่มี finding ใหม่จาก Phase 8C
- Deployment note: ต้องรัน Prisma schema deployment เพื่อสร้าง `UserAuthSession` indexes และ User security fields ก่อนเปิด Phase 8C ใน production

## Phase 8D — MFA, Recovery Codes, and Passkeys

Goal: ลดการพึ่ง password/OTP email และยกระดับบัญชีสิทธิ์สูง

### MFA

- [x] TOTP enrollment พร้อม QR/manual key
- [x] ยืนยัน TOTP ก่อนเปิดใช้งาน
- [x] recovery codes แบบ hash, single-use และ regenerate ได้หลัง reauthentication
- [x] บังคับ MFA สำหรับ ADMIN
- [x] เปิด opt-in แล้ว staged enforcement สำหรับ TEACHER
- [x] MFA reset เป็น high-risk Admin action พร้อม audit และ session revocation
- [x] rate limit MFA challenge และป้องกัน replay

### Passkeys

- [x] WebAuthn/Passkey registration หลัง recent authentication
- [x] รองรับหลาย passkeys ต่อบัญชีและตั้งชื่อ device
- [x] sign-in challenge single-use, origin/RP ID ถูกต้อง และ counter policy ชัดเจน
- [x] revoke passkey รายตัว
- [x] account recovery ห้าม bypass MFA/passkey โดยอัตโนมัติ

Schema direction:

```text
MfaAuthenticator
MfaRecoveryCode
PasskeyCredential
AuthChallenge
```

Exit criteria:

- [x] ADMIN ไม่มี password-only access
- [x] Recovery code ใช้ได้ครั้งเดียวและไม่เก็บ plaintext
- [x] Passkey origin/RP ID และ replay tests ผ่าน

Implementation evidence (2026-08-03):

- ปรับ MFA Setup จากการ์ดขนาดเล็กกลางจอเป็น responsive three-step security workspace สำหรับยืนยันตัวตน เชื่อมต่อ Authenticator และเก็บ Recovery Codes; เพิ่ม visible labels, form/Enter semantics, password visibility, busy/error states, manual-key/recovery-code copy, recovery acknowledgement และทางออกจากระบบ พร้อมคำแปลไทย/อังกฤษครบ
- เพิ่ม `MfaAuthenticator`, `MfaRecoveryCode`, `PasskeyCredential` และ `AuthChallenge`; TOTP secret เข้ารหัส AES-256-GCM, recovery code เก็บเฉพาะ keyed hash และ challenge เก็บเฉพาะ SHA-256 hash พร้อม expiry/atomic consume
- เพิ่ม TOTP setup/activation/challenge, recovery-code regeneration หลัง reauthentication และ MFA challenge แบบ rate-limited/replay-safe; ADMIN ต้อง enroll และยืนยัน MFA ก่อนเข้า admin ส่วน TEACHER เปิด opt-in และบังคับ challenge เฉพาะบัญชีที่ enroll ใน rollout ระยะแรก
- เพิ่ม high-risk Admin MFA reset ที่ต้องเป็น recent MFA session, audit ทั้ง denied/succeeded และใช้ security-state transaction เพื่อเพิ่ม `authVersion` พร้อม revoke database/security sessions
- เพิ่ม WebAuthn registration/sign-in/MFA ด้วย origin, RP ID, user verification และ authenticator counter verification; รองรับหลาย credential, ชื่ออุปกรณ์, revoke รายตัว และ password reset ไม่ล้าง MFA enrollment โดยอัตโนมัติ
- เพิ่ม Security Center UI, MFA setup/challenge UI และ passkey sign-in; production config ระบุ `AUTH_WEBAUTHN_ORIGIN`/`AUTH_WEBAUTHN_RP_ID` ใน `.env.example`, `render.yaml` และ deployment guide
- [x] แก้ Passkey UX จาก Windows Security error: credential ที่ลงทะเบียนใหม่บังคับเป็น discoverable สำหรับ username-less sign-in, หน้า MFA ซ่อนปุ่ม Passkey เมื่อบัญชียังไม่มี credential และ client แยกคำแนะนำกรณี Windows Hello/อุปกรณ์ไม่พร้อม, ลงทะเบียนซ้ำ หรือ RP domain ไม่ตรง โดยไม่เปิดเผยว่าบัญชีใดมี Passkey
- [x] แก้ Google OAuth `ClientFetchError` จาก custom Security Center route ที่ชน endpoint สงวน `/api/auth/providers` ของ Auth.js โดยย้าย provider lifecycle ไป `/api/auth/account-providers` และเพิ่ม regression test ป้องกัน route shadowing
- Verification Google OAuth fix (2026-08-03): Auth.js provider discovery ตอบ `200` และมี Google provider, OAuth sign-in handshake ตอบ `200` พร้อม redirect ไป `accounts.google.com`; `test:auth-phase8b` ผ่าน 9 tests และ `check:auth` ผ่านรวม 312 tests
- [x] ปรับ MFA activation หลัง real-device QA: แสดง error code จาก API จริงแทนการเหมารวมทุก 401/429/500 เป็นรหัสผิด, เพิ่ม bounded clock-drift tolerance ±60 วินาทีเฉพาะ enrollment และเพิ่ม activation/recovery-code integration test โดยคง MFA login challenge ที่ ±30 วินาที; `check:auth` ผ่านรวม 313 tests
- [x] แก้ concurrent MFA enrollment race: client ใช้ synchronous submit lock, server เก็บ pending enrollment แต่ละชุดได้ 10 นาทีแทนการลบชุดล่าสุดของคำขออื่น และล้าง pending ทั้งหมดหลัง activation สำเร็จ เพื่อให้ QR/`authenticatorId` ไม่หลุดจากกันเมื่อ double-click, refresh หรือเปิดหลายแท็บ
- [x] แก้ stale MFA enrollment reference: activation ตรวจรหัสกับ pending enrollment ที่ยังไม่หมดอายุทั้งหมดของผู้ใช้คนเดียวกัน โดยให้ชุดที่ browser อ้างอิงมาก่อน และเปิดใช้เฉพาะชุดที่พิสูจน์รหัส TOTP ได้จริง เพื่อให้ QR ล่าสุดยังยืนยันได้เมื่อหลายคำขอวิ่งสลับกันโดยไม่ยอมรับข้ามบัญชี
- [x] แก้ MFA setup reauthentication UX: server page ระบุว่ารหัสผ่านจำเป็นตาม recent-auth window, browser ไม่ส่งฟอร์มว่างเมื่อจำเป็น และ UI แยกข้อความจาก API สำหรับ reauthentication/rate limit/internal failure แทนการเหมารวมว่าเริ่มตั้งค่าไม่ได้
- Verification เพิ่มเติม (2026-08-03): `test:auth-phase8d` ผ่าน 3 files / 10 tests, `check:i18n:auth`, TypeScript และ targeted ESLint ผ่าน; `check:auth` ผ่านรวม 311 tests พร้อม security guard, Prisma validation และ server TypeScript
- Verification: `test:auth-phase8d` ผ่าน 3 test files / 8 tests; `check:auth` ผ่าน auth suites รวม 293 tests, security guard, Prisma validation และ server TypeScript; targeted ESLint ผ่าน

## Phase 8E — Student Access Code Security

Goal: รักษา UX เข้าง่ายสำหรับนักเรียนโดยไม่ใช้ code เป็น permanent bearer credential

- [x] สร้าง rate-limited `Student Code Exchange` endpoint
- [x] code ถูกแลกเป็น scoped, HttpOnly, Secure, SameSite student-access session
- [x] redirect ไป URL ที่ไม่มี Student Code
- [x] session จำกัด studentId/classId/scope และหมดอายุชัดเจน
- [x] mutation routes ใช้ scoped session แทน code ใน path/body
- [x] Teacher rotate/revoke code รายคนหรือทั้งห้องได้
- [x] แสดง last-used/linked state แบบไม่เปิดเผย secret
- [x] account linking ต้อง rate limit และใช้ atomic claim; พิจารณา Teacher approval
- [ ] migrate legacy 6-character codes เป็น 12-character codes
- [ ] กำหนดวันปิดรับ legacy code และแจ้ง Teacher ก่อน rollout
- [ ] redact Student Code จาก logs, analytics, referrer และ support screenshots

Exit criteria:

- [x] Student Code ไม่อยู่ใน URL หลัง exchange
- [x] brute-force และ concurrent account-link claims ถูกป้องกัน
- [ ] legacy 6-character code ใช้งานไม่ได้หลัง migration window
- [x] Teacher revoke แล้ว session/code เก่าใช้งานไม่ได้

Implementation evidence (2026-08-03):

- เพิ่ม `/api/student/access/exchange` พร้อม atomic layered rate limits ต่อ client/code/client+code; รับเฉพาะ code รูปแบบปัจจุบัน 12 ตัว และไม่ echo secret ใน response/audit
- code ถูกแลกเป็น random-token session ที่เก็บเฉพาะ SHA-256 token hash ใน `StudentAccessSession`; cookie เป็น HttpOnly, SameSite=Lax, Secure ใน production และมีอายุ 12 ชั่วโมง
- canonical UI/API ใช้ `/student/access`; proxy ปิด direct bearer API และ nested URL ที่มี Student Code ขณะที่หน้า code entry ทำหน้าที่ exchange แล้ว `replace` URL เท่านั้น
- session ตรวจ `studentId`, `classId`, scopes, expiry และ `loginCodeVersion`; rotate/revoke เพิ่ม version และ revoke active sessions ทำให้ cookie/code เดิมใช้ไม่ได้ทันที
- Teacher API/UI รองรับ rotate/revoke รายคน และ API รองรับทั้งห้อง พร้อม redacted linked/last-used/session state; account linking ใช้ rate limits เดิมร่วมกับ atomic `updateMany where userId = null`
- เพิ่ม `db:migrate-student-codes:dry-run` และ `db:migrate-student-codes` สำหรับหมุน legacy/non-policy codes โดยไม่พิมพ์ secret; ต้องรัน production dry-run/apply และแจ้ง Teacher ก่อนจึงจะเช็ก migration/rollout items ได้
- Verification: `npm.cmd run check:student-dashboard` ผ่าน 19 test files / 47 tests, `npm.cmd run check:auth` ผ่าน auth suites (รวม Phase 8E), security guard, Prisma validation และ server TypeScript; targeted ESLint ผ่าน

## Phase 8F — UX, Observability, QA, and Controlled Rollout

Goal: ปิดงานด้วยหลักฐาน production ไม่ใช่เพียง unit tests

### UX and accessibility

- [x] Login/Register/Verify/Recovery/Security Center ครบไทยและอังกฤษ
- [x] ไม่มี hardcoded user-facing auth strings
- [x] `autocomplete`: email, current-password, new-password, one-time-code, WebAuthn ตาม flow
- [x] password visibility controls มี accessible name
- [ ] keyboard, paste, mobile, screen reader และ password manager QA
- [x] error ไม่เปิดเผย account state และมี recovery action ที่ชัดเจน

### Audit and metrics

- [x] audit login success/failure/rate-limit โดยไม่เก็บ password/raw email/raw IP
- [x] metrics: sign-in success, verification completion, reset completion, provider failure, MFA challenge, session revoke
- [x] alerts: brute-force spike, verification failure, OAuth config failure, delivery suppression และ Admin MFA bypass attempt
- [x] retention policy สำหรับ auth activity/session/device metadata
- [ ] support lookup ใช้ opaque reference ไม่ใช้ email/OTP

### Test matrix

- [x] Credentials: valid/invalid/unverified/disabled/rate-limited
- [x] Google: new/existing/link conflict/provider unavailable/callback attack
- [x] Verification: unknown/verified/pending/expired/max attempts/concurrent/resend failure
- [x] Password: register/change/forgot/admin reset/policy/reuse/session revoke
- [x] Session: expiry/revoke one/revoke all/role downgrade/account disable/DB outage
- [x] MFA/Passkey: enrollment/login/replay/recovery/reset/revoke
- [ ] Student Code: brute force/exchange/expiry/rotation/link race/legacy cutoff
- [ ] Thai/English, mobile/desktop, accessibility และ password manager

### Rollout

- [ ] Deploy staging พร้อม controlled accounts ทุก role/provider
- [ ] ใช้ mailbox จริงอย่างน้อยสอง provider
- [ ] shadow metrics ก่อน enforce MFA/password migration
- [x] Incident rollback: ปิดการบังคับ MFA ที่ login ด้วย `AUTH_MFA_ENFORCEMENT=off` เป็นค่าเริ่มต้น ให้ password/Google login เดิมเข้า ADMIN/TEACHER ได้ตามปกติ และเปิด enforcement ได้เฉพาะหลัง real-device staging ผ่านโดยตั้งค่าเป็น `enforce`
- [ ] rollout เป็น cohort: Admin -> internal Teacher -> controlled users -> all users
- [ ] monitored production rollout พร้อม rollback triggers
- [ ] rollback ใช้ feature flags และ schema แบบ backward-compatible
- [ ] rollback ห้ามเปิด enumeration, plaintext secret หรือ legacy insecure session กลับมา

Exit criteria:

- [ ] QA matrix ผ่าน staging และ controlled production
- [ ] ไม่มี P0/P1 auth findings ค้าง
- [ ] ไม่มี regression ใน Login/Register/Google OAuth/Student Portal
- [ ] Security metrics และ alerts ทำงานอย่างน้อยหนึ่งรอบจริง

Implementation evidence (2026-08-03):

- [x] Fixed the local P1 web-entry regression caused by exporting the Promise returned from lazy `auth(callback)` as the Next.js proxy. The proxy now exports a synchronously callable function that awaits the authenticated handler internally; the new proxy contract and Student Code boundary regression suite passes 4/4, `check:auth` passes, and browser smoke testing confirms Login/Recovery/Student entry points render without runtime errors.
- [x] Production `/api/ready` returned HTTP 200 with `checks.emailDelivery: "configured"` on 2026-08-03. The production readiness contract now also requires `RESEND_WEBHOOK_SECRET` so accepted/delivered/bounced/suppressed evidence cannot silently run without signed webhook verification after the next deployment.
- ย้ายข้อความ Login/MFA/Passkey ไป translation pack ไทย/อังกฤษ เพิ่ม `username webauthn`, `current-password`, `one-time-code`, accessible password visibility control, labelled inputs และ live-region errors; `check:i18n:auth` ผ่านแบบ zero findings
- audit credential success/failure/rate-limit, OAuth failure, verification completion และ MFA success/failure/rate-limit โดย failed public sign-in ไม่เก็บ raw email, IP หรือ password
- เพิ่ม aggregate metrics/alerts ที่ `/api/admin/security/auth-health` ซึ่งต้องเป็น MFA-authenticated ADMIN และคืนเฉพาะ counters สำหรับ sign-in, verification, reset, provider, MFA, session revoke, delivery suppression และ Admin MFA bypass
- เพิ่ม retention dry-run/apply `db:prune-auth-security`, production thresholds/config และ [controlled rollout runbook](../identity-security-rollout-runbook.md) พร้อม controlled accounts, two-mailbox matrix, cohorts, observation windows และ rollback triggers ที่ห้ามคืน insecure behavior
- แก้ full-suite regression tests 18 รายการให้ใช้ scoped Student Access session แทน Student Code bearer และแก้ `withStudentAccess` generic เพื่อไม่ให้ canonical route ต้องรับ `[code]` จาก URL
- Verification: `check:identity-security` ผ่าน; auth suites รวม 299 tests และ student checks 47 tests ผ่าน; full unit suite ผ่าน 307 files / 1,552 tests; full lint ผ่านด้วย baseline warnings 58 รายการ; client/server TypeScript, Prisma validation, security guard และ production build 119 static pages ผ่าน
- Repository-wide `check:i18n:strict` ยังไม่ผ่านจาก baseline 315 findings นอก auth scope จึงยังไม่เช็ก manual accessibility, global i18n, staging, mailbox, production cohort และ real alert-cycle items

## Test Files to Add or Extend

- `src/lib/auth/__tests__/callback-url.test.ts`
- `src/__tests__/complete-oauth-route.test.ts`
- `src/__tests__/verification-pending-route.test.ts`
- `src/__tests__/resend-verification-route.test.ts`
- `src/__tests__/verify-email-code-route.test.ts`
- `src/__tests__/auth-credentials-authorize.test.ts`
- `src/__tests__/auth-core-callbacks.test.ts`
- `src/__tests__/admin-auth-security-actions.test.ts`
- `src/__tests__/password-policy.test.ts`
- `src/__tests__/auth-session-management.test.ts`
- `src/__tests__/mfa-authentication.test.ts`
- `src/__tests__/passkey-authentication.test.ts`
- `src/__tests__/student-code-exchange.test.ts`
- `src/__tests__/auth-security-ui-contract.test.ts`
- `e2e/auth-identity-lifecycle.spec.ts`

ทุก defect ต้องมี test ที่แดงก่อนแก้ และ architecture/security guard ต้องตรวจ invariant ที่สำคัญ เช่น callback normalization, neutral public response, password-change revocation และ secret persistence

## Files Expected to Change

Core auth:

- `src/auth.ts`
- `src/auth.config.ts`
- `src/lib/auth/`
- `src/lib/security/rate-limit.ts`
- `src/lib/security/audit-log.ts`
- `src/lib/auth-guards.ts`

Public auth routes/UI:

- `src/app/login/`
- `src/app/register/`
- `src/app/verify-email/`
- `src/app/forgot-password/`
- `src/app/api/auth/`
- `src/app/auth/complete-oauth/route.ts`

Account/Admin:

- `src/app/dashboard/settings/`
- `src/app/api/user/`
- `src/app/admin/admin-actions.ts`
- `src/app/admin/users/`

Student access:

- `src/app/student/`
- `src/app/api/student/`
- `src/lib/student-login-code.ts`
- shared student authorization services

Data/deployment:

- `prisma/schema.prisma`
- `.env.example`
- `render.yaml`
- readiness/health endpoints
- retention/cleanup scripts

## Validation Commands

ระหว่างพัฒนา:

```powershell
npm.cmd test -- <targeted-auth-tests>
npm.cmd run check:auth
npm.cmd run check:student-dashboard
npm.cmd run check:i18n
npm.cmd run predev
```

ก่อน merge/deploy:

```powershell
npm.cmd run lint
npm.cmd run check:i18n:strict
npm.cmd run check:auth
npm.cmd run check:student-dashboard
npm.cmd run build
```

เพิ่ม dedicated CI gate เมื่อ Phase 8A เริ่ม:

```text
check:identity-security
  -> callback/open-redirect guard
  -> public-response enumeration guard
  -> password/session revocation tests
  -> OTP atomicity/concurrency tests
  -> Student Code security tests
```

## Rollback and Incident Rules

- หากพบ open redirect/account enumeration ให้ disable affected entry point หรือ force safe default destination ทันที
- หาก OTP provider ล้ม ให้คงรหัสเดิมที่ active และแสดง neutral retry UX
- หาก session registry/status store ล้ม ให้ ADMIN และ high-risk actions fail closed
- หาก rate-limit store ล้ม ให้ใช้ documented degraded policy; ห้าม silently ปิด abuse protection
- หาก Student Code exchange มีปัญหา ให้ rollback เฉพาะ exchange feature โดยไม่เปิด legacy 6-character code ให้ผู้ใช้ใหม่
- ทุก incident ต้องบันทึก timestamp, revision, affected flow และ non-secret evidence

## Product Decisions Required

- [x] Password minimum: แนะนำ 12 characters พร้อม migration ไม่ block บัญชีเดิมทันที
- [x] Session lifetime แยก ADMIN/TEACHER/STUDENT และ recent-auth window
- [ ] MFA enforcement date สำหรับ ADMIN และ TEACHER
- [ ] CAPTCHA/risk provider หรือ first-party challenge policy
- [x] Google same-email linking policy
- [ ] Student Code session lifetime และ Teacher approval สำหรับ account linking
- [x] Security activity/device metadata retention
- [ ] Staging URL และ controlled QA accounts/mailboxes

## Recommended Execution Order

1. Phase 8A.1 — Open redirect
2. Phase 8A.2 — Verification enumeration
3. Phase 8A.3 — Atomic OTP lifecycle
4. Phase 8A.4 — Password/role/session revocation
5. Phase 8A.5 — Atomic layered rate limiting
6. Phase 8B — Unified password/email/provider lifecycle
7. Phase 8C — Account Security Center and sessions
8. Phase 8E — Student Code security
9. Phase 8D — MFA and Passkeys
10. Phase 8F — Full QA and controlled rollout

เหตุผลที่ทำ Student Code ก่อน MFA rollout เต็มรูปแบบ: Student Code เป็นช่องทางเข้าถึงข้อมูล/การกระทำที่ใช้งานจริงและไม่ได้รับประโยชน์จาก MFA ของ Teacher จึงต้องถูกยกระดับแยกต่างหาก

## Definition of Done

- [x] Callback redirect ทุกเส้นทางเป็น same-origin หลัง canonicalization
- [x] Public auth API ไม่เปิดเผย account/provider/verification state
- [x] Verification และ recovery challenges atomic, single-use และ failure-safe
- [x] Password policy กลางใช้ครบ Register/Login/Change/Reset/Admin
- [x] Password/role/account/MFA changes revoke session ตาม policy
- [x] ADMIN ใช้ MFA และ sensitive authorization fail closed
- [x] ผู้ใช้ดู/revoke sessions และตรวจ security activity ได้
- [x] Provider linking/unlinking ไม่ทำให้บัญชี lockout
- [ ] Student Code ถูกแลกเป็น scoped session และ legacy 6-character code ถูกยกเลิก
- [ ] ไม่มี auth secrets หรือ identifiers ที่ไม่จำเป็นใน logs/audit/analytics
- [ ] Thai/English, accessibility, mobile และ password-manager QA ผ่าน
- [ ] `check:identity-security`, `check:auth`, student checks, lint, i18n, type-check และ build ผ่าน
- [ ] Staging และ controlled production rollout ผ่านพร้อม metrics/alerts/rollback evidence
