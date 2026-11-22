# System Plan 54: Auth Password Recovery and Email Delivery Hardening

Last updated: 2026-07-13

Status: Draft — ready for implementation

## Objective

ทำให้ Login และ Forgot Password ของ GameEdu กู้คืนบัญชีได้จริง ปลอดภัย ตรวจสอบสถานะการส่งอีเมลได้ และไม่ทำให้ผู้ใช้เข้าใจผิดว่า OTP ถูกส่งแล้ว ทั้งยังคงป้องกัน account enumeration และการ brute force

## Incident Summary

อาการที่ผู้ใช้รายงาน:

- กด "ลืมรหัสผ่าน"
- ระบบพาไปหน้ากรอก OTP
- ไม่มี OTP ส่งเข้าอีเมล

ผลตรวจเมื่อ 2026-07-13:

- Production health endpoint ตอบ `200` และรายงานสถานะ healthy
- `npm.cmd run check:auth` ผ่าน 27 test files / 149 tests
- ชุด `check:auth` ยังไม่รวม test ของ Forgot Password, Reset Password หรือ password-reset email sender
- Production Forgot Password ตอบ `200 {"ok":true}` สำหรับอีเมลที่ไม่มีบัญชี โดย UI พาไปหน้า OTP ต่อ
- Local `.env` และ `.env.local` ไม่มี `RESEND_API_KEY` และ `EMAIL_FROM`; ส่วน `render.yaml` ประกาศสองค่านี้เป็น `sync: false` จึงต้องยืนยันค่าจริงใน Render Dashboard

## Confirmed Problems

### P0 — Silent no-op looks like successful delivery

`POST /api/auth/forgot-password` ตอบ `{ ok: true }` ทันทีเมื่อ:

- ไม่พบบัญชีจากอีเมล
- พบบัญชีแต่ไม่มี password เช่น Google-only account

พฤติกรรมตอบแบบกลางช่วยป้องกัน account enumeration แต่ client ตีความว่า OTP ถูกส่งสำเร็จและ redirect ไปหน้า reset ทันที จึงเกิด false-success UX

### P0 — Production email configuration is not fail-fast

- `RESEND_API_KEY` และ `EMAIL_FROM` ต้องตั้งด้วยมือใน Render
- หากไม่มี API key production จะล้มตอนผู้ใช้ขอ OTP
- หากไม่มี `EMAIL_FROM` ระบบ fallback ไป `onboarding@resend.dev`
- sender ของ `resend.dev` ใช้ทดสอบและไม่ควรเป็น production sender สำหรับผู้ใช้ทั่วไป
- health/readiness endpoint ปัจจุบันไม่ยืนยัน email provider readiness

### P1 — Failed delivery invalidates the previous recovery code

route ลบ OTP เดิมและสร้าง OTP ใหม่ก่อนเรียก Resend เมื่อการส่งล้มเหลว:

- OTP เดิมที่ผู้ใช้อาจยังมีอยู่ใช้ไม่ได้
- OTP ใหม่ค้างในฐานข้อมูลทั้งที่ผู้ใช้ไม่ได้รับ
- การขอใหม่อาจติด cooldown จาก `lastSentAt` ของรายการที่ส่งไม่สำเร็จ

### P1 — Delivery acceptance is treated as delivery success

ระบบบันทึก `auth.password_reset.otp_sent` หลัง Resend API รับคำขอ แต่ยังไม่แยกสถานะ:

- accepted
- delivered
- bounced
- complained
- suppressed
- failed

ไม่มี provider message ID หรือ webhook event ที่ใช้ตามสืบรายอีเมลได้โดยไม่เปิดเผย OTP

### P1 — OTP is stored in plaintext

`EmailVerificationCode.codePlain` เก็บ OTP 6 หลักควบคู่กับ `codeHash` และถูกล้างเมื่อใช้สำเร็จ การรั่วของฐานข้อมูลก่อน OTP หมดอายุจึงเปิดเผย recovery credential ได้ทันที

### P1 — Recovery endpoints need stronger abuse controls

- Forgot Password มี cooldown ต่อ record แต่ยังไม่มี rate limit แบบ IP + normalized email
- Reset Password ไม่มี request-level rate limit แบบ IP + account/reference
- attempt increment และ consume ไม่ได้ออกแบบเป็น atomic compare-and-set ชัดเจน จึงต้องทดสอบ concurrent attempts
- password policy ขั้นต่ำ 6 ตัวอักษรอ่อนกว่ามาตรฐานที่ควรใช้กับบัญชีครู/ผู้ดูแล

### P1 — Password reset does not revoke existing sessions

ระบบใช้ JWT session การเปลี่ยน password อย่างเดียวไม่ทำให้ session ที่ถูกขโมยหมดอายุทันที ต้องมี session/auth version หรือ `passwordChangedAt` ที่ตรวจระหว่างสร้าง session/token

### P2 — Recovery UI bypasses shared error/i18n conventions

หน้า Forgot/Reset Password มีข้อความภาษาไทยและ error map ภายใน component โดยตรง ทำให้:

- ภาษาอังกฤษไม่ครบ
- error contract กระจายหลายจุด
- maintenance ต่างจาก Login/Register ที่ใช้ shared helpers

## Scope

### In scope

- Credentials Login ที่เกี่ยวข้องกับ email verification และ password recovery
- Forgot Password request flow
- OTP generation, persistence, validation, consumption และ expiry
- Password update และ session revocation
- Resend configuration, sender domain, delivery tracking และ operational alert
- Thai/English UX สำหรับ password recovery
- Unit, route, integration และ manual production QA

### Out of scope

- เปลี่ยน NextAuth/Auth.js provider ทั้งระบบ
- เปลี่ยน Google OAuth consent/configuration ที่ไม่เกี่ยวกับ recovery
- redesign หน้า Login ทั้งหน้า
- recovery ผ่าน SMS หรือ LINE
- recovery ของ student login code ซึ่งเป็นอีก credential model

## Product and Security Decisions

ก่อนเริ่ม implementation ให้ยึด decisions ต่อไปนี้:

1. API response สำหรับ valid email syntax ต้องไม่เปิดเผยว่ามีบัญชีหรือ provider ใด
2. UI ต้องใช้ข้อความกลาง เช่น "หากอีเมลนี้เชื่อมกับบัญชี เราจะส่งคำแนะนำให้ภายในไม่กี่นาที"
3. ห้ามแสดงข้อความ "ส่ง OTP แล้ว" จนกว่าจะมีความหมายที่กำหนดชัดเจนว่าเป็น provider accepted ไม่ใช่ delivered
4. Google-only account ต้องไม่สร้าง password credential โดยอัตโนมัติ
5. Recommended: หากเป็น Google-only account ให้ส่งอีเมลคำแนะนำให้เข้าสู่ระบบด้วย Google โดย API ยังตอบรูปแบบเดียวกับ credentials account
6. OTP production เก็บเฉพาะ hash; plaintext อยู่ใน memory ระหว่างส่งเท่านั้น
7. Dev OTP เปิดได้เฉพาะ non-production และ explicit dev flag ห้ามอาศัย `NODE_ENV` อย่างเดียว
8. การส่ง OTP ใหม่ต้องไม่ทำลาย code เดิมจนกว่า provider จะรับคำขอใหม่สำเร็จ
9. Password reset สำเร็จต้อง revoke session เดิมทุกอุปกรณ์

## Target Flow

```text
Forgot Password form
  -> normalize + validate email
  -> public rate limit (IP + email digest)
  -> always return neutral accepted response for valid syntax
     -> no account: timing-balanced no-op + audit aggregate
     -> Google-only: send provider guidance email
     -> credentials account:
          create pending hashed OTP
          send through verified production sender
          provider rejected -> remove pending code, preserve previous active code
          provider accepted -> mark new code active, retire previous code
          webhook -> update delivered/bounced/suppressed status

Reset Password form
  -> request rate limit (IP + email digest + reference)
  -> atomically validate active OTP and increment attempt on failure
  -> atomically consume OTP on success
  -> bcrypt hash new password
  -> increment auth/session version
  -> revoke existing sessions
  -> audit without email, password, or OTP plaintext
```

## Implementation Phases

## Phase 0 — Production Configuration and Evidence

Goal: แยก config incident ออกจาก code defect และหยุดใช้ test sender ใน production

- [x] ตรวจ Render Environment ว่ามีค่าจริงสำหรับ:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXTAUTH_URL`
- [x] ตรวจว่า `EMAIL_FROM` ใช้โดเมนที่ verified ใน Resend
- [x] ตรวจ DNS ของ sending domain: SPF, DKIM และ DMARC
- [x] ตรวจ Resend Logs ของเหตุการณ์จริง: accepted, bounced, suppressed หรือ rejected
- [x] เพิ่ม startup/readiness validation ใน production:
  - API key ต้องมีค่า
  - `EMAIL_FROM` ต้องมีค่าและห้ามลงท้าย `@resend.dev`
  - public origin ต้องเป็น HTTPS และไม่ใช่ localhost
- [x] เพิ่ม email readiness ลง `/api/ready` แบบไม่เปิดเผย secret
- [x] เพิ่ม deployment runbook สำหรับทดสอบด้วยบัญชี QA ที่ควบคุมได้

Evidence captured on 2026-07-13:

- Production `/api/ready` baseline returned `200 ready` with MongoDB, Prisma, LINE, R2, and Stripe checks but no email-delivery check.
- Public DNS contains Resend DKIM at `resend._domainkey.teachplayedu.com`.
- `send.teachplayedu.com` contains Amazon SES SPF and MX records.
- `_dmarc.teachplayedu.com` exists with `v=DMARC1; p=none`.
- Local code now rejects missing production API key/from address, `@resend.dev`, non-HTTPS origin, and local/bind origins.
- Render service `teach-play-edu` has non-empty masked values for `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`, and `NEXTAUTH_URL`.
- Resend Dashboard reports `teachplayedu.com` as `verified`; production password-reset mail uses `noreply@teachplayedu.com`.
- Two recent password-reset messages were accepted and marked `delivered`; the corresponding Render audit events show `otp_sent` followed by `completed`.
- No `[forgot-password]` matching error was found in Render application logs for the same 24-hour window.

Phase 0 conclusion:

- Production mail configuration and provider delivery are healthy.
- The reported no-OTP case is therefore most consistent with the confirmed silent no-op path for nonexistent or Google-only accounts, or mailbox-side placement such as spam/quarantine.
- Phase 0 code and evidence collection are complete locally. Post-deploy verification of the new `emailDelivery` readiness check remains required after these changes are published.

Exit criteria:

- Production ไม่สามารถขึ้น ready หาก password recovery email config ไม่พร้อม
- QA email ได้รับอีเมลจาก verified TeachPlayEdu domain

## Phase 1 — Fix False-Success UX Without Account Enumeration (complete locally 2026-07-13)

Goal: ผู้ใช้ไม่ถูกหลอกว่าอีเมลถูกส่งแน่นอน และ API ไม่เปิดเผยสถานะบัญชี

- [ ] กำหนด public response contract เดียวสำหรับ valid email syntax เช่น HTTP `202`
- [ ] response ภายนอกต้องเหมือนกันทั้ง nonexistent, Google-only และ credentials account
- [ ] เปลี่ยนหน้า Forgot Password ให้แสดง neutral confirmation state ก่อน
- [ ] ใช้ข้อความ "หากมีบัญชี..." แทน "ส่ง OTP แล้ว"
- [ ] เพิ่ม action:
  - เปิดหน้ากรอก OTP
  - กลับ Login
  - เข้าสู่ระบบด้วย Google
  - ขอส่งใหม่หลัง cooldown
- [ ] ไม่ redirect ไปหน้า OTP อัตโนมัติสำหรับทุก `200/202`
- [ ] ทำ timing normalization ระหว่าง account-found และ account-not-found path เท่าที่เหมาะสม
- [ ] เพิ่ม shared Thai/English strings และใช้ shared API error helper

Exit criteria:

- อีเมลที่ไม่มีบัญชีไม่เห็น false confirmation ว่า OTP ส่งแล้ว
- response shape/status ไม่สามารถใช้ enumerate บัญชีได้
- Credentials account ยังเข้าหน้า OTP ได้โดยขั้นตอนชัดเจน

Phase 1 implementation evidence:

- Production-valid requests now return HTTP `202` with the same `{ ok, requestAccepted, cooldownSeconds }` body for nonexistent, Google-only, credentials, active-cooldown, and provider-failure paths.
- Production responses no longer expose `sent`, `referenceCode`, `devCode`, per-account cooldown headers, or provider state. Development-only OTP metadata remains available for local testing.
- Valid requests use a 350 ms minimum response window to reduce trivial timing differences; invalid email syntax still returns a structured `400` response.
- Forgot Password now stops at a neutral confirmation screen instead of redirecting automatically or claiming that an OTP was sent.
- The confirmation screen provides explicit actions to open the OTP form, request again after the neutral cooldown, use another email, return to login, and follow Google sign-in guidance when Google is enabled.
- Thai and English copy is served through the shared translation provider, while API and network failures use shared error-localization helpers.
- Regression coverage verifies invalid input plus all production response-equivalence paths and development-only OTP metadata.
- Local verification: `check:auth` passed 30 files / 164 tests, server TypeScript passed, changed-file ESLint passed, the production build passed, and `check:i18n` reported no new finding in the forgot-password request form.

## Phase 2 — Make OTP Lifecycle Failure-Safe (complete locally 2026-07-14)

Goal: การส่งล้มเหลวไม่ทำให้ recovery code เดิมเสียและไม่มี ghost cooldown

- [ ] แยกสถานะ code อย่างน้อย `PENDING`, `ACTIVE`, `CONSUMED`, `FAILED`, `EXPIRED`
- [ ] สร้าง code ใหม่เป็น `PENDING`
- [ ] ส่งอีเมลโดย code plaintext อยู่เฉพาะ memory
- [ ] เมื่อ provider accepted:
  - mark code ใหม่ `ACTIVE`
  - retire code เดิม
  - เริ่ม cooldown จากเวลาที่ accepted
- [ ] เมื่อ provider rejected/throws:
  - mark/delete pending code ใหม่
  - รักษา active code เดิม
  - ไม่เริ่ม sent cooldown
- [ ] ป้องกัน double-send และ concurrent resend ด้วย idempotency key หรือ unique request token
- [ ] ใช้ reference code ที่ unique และ index เหมาะสม
- [ ] แยก purpose `PASSWORD_RESET` ออกจาก `SIGNUP_VERIFY` ต่อไปอย่างเข้มงวด

Exit criteria:

- Provider failure ไม่ทำลาย active code เดิม
- ไม่มี active OTP ที่ถูก audit ว่าส่งแล้วเมื่อ provider ปฏิเสธ
- Concurrent resend เหลือ active code ที่ถูกต้องเพียงรายการเดียว

Phase 2 implementation evidence:

- `EmailVerificationCode.status` now models `PENDING`, `ACTIVE`, `CONSUMED`, `FAILED`, and `EXPIRED`; records created before deployment remain compatible as legacy active records when status is absent.
- A new `PasswordResetIssuanceLock` collection uses unique `userId` and `requestToken` indexes to allow only one in-flight resend per account.
- New password-reset codes are persisted as `PENDING` without deleting or consuming the previous active code.
- Provider acceptance activates the pending code, consumes the previous active code, and starts cooldown from the accepted timestamp in one MongoDB transaction.
- Provider throw, rejection, or a production `{ sent: false }` result marks only the pending code `FAILED`, clears its plaintext field, releases the issuance lock, preserves the previous active code, and never emits `otp_sent` audit success.
- Production no longer writes plaintext for newly issued password-reset OTPs; local development retains it only to support the existing development harness. Phase 3 still owns peppered hashing and removal of all remaining legacy/signup plaintext paths.
- Reset verification queries only `ACTIVE` or pre-migration status-less records. Terminal results are persisted as `CONSUMED`, `FAILED`, or `EXPIRED`.
- Schema deployment requires the existing Render pre-deploy `prisma db push` step before the new application version receives traffic. No database push was performed from the local development session.
- Regression coverage includes provider rejection, old-code preservation, production non-acceptance, concurrent lock contention, pending-code rejection, legacy compatibility, expiration, activation, and terminal consumption.
- Local verification: Prisma schema validation and client generation passed; `check:auth` passed 31 files / 170 tests; changed-file ESLint and server TypeScript passed; production build passed after network access was enabled for the existing Google Fonts dependency.

## Phase 3 — Remove Plaintext OTP and Harden Verification (implemented locally; production cutover pending)

Goal: ลดผลกระทบจากฐานข้อมูลรั่วและปิดทาง brute-force/concurrency bypass

- [ ] หยุดเขียน `codePlain` ใน production ทุก flow
- [ ] ใช้ keyed HMAC/peppered hash สำหรับ OTP เพื่อป้องกัน offline brute force จาก hash 6 หลัก
- [ ] เก็บ OTP pepper ใน secret env ที่แยกจาก database
- [ ] รองรับ migration window สำหรับ record เดิม แล้วลบ `codePlain` จาก schema
- [ ] เพิ่ม rate limit:
  - forgot request ต่อ IP
  - forgot request ต่อ normalized-email digest
  - reset verify ต่อ IP
  - reset verify ต่อ account/reference
- [ ] ทำ attempt increment เป็น atomic update
- [ ] ทำ consume เป็น atomic compare-and-set โดยต้อง active, not expired, attempts below limit
- [ ] ป้องกัน valid OTP ถูกใช้พร้อมกันมากกว่าหนึ่ง request
- [ ] ไม่ log OTP, password, raw email หรือ recovery token
- [ ] ปรับ password policy เป็นอย่างน้อย 8–12 ตัวอักษรตาม policy ที่ตกลง และอนุญาต password manager/paste

Exit criteria:

- ไม่มี OTP plaintext ใน database, logs, audit metadata หรือ production API response
- OTP เดียว reset สำเร็จได้ครั้งเดียวแม้ยิงพร้อมกัน
- Brute-force ถูกจำกัดทั้งระดับ IP และ account/reference

Phase 3 local implementation evidence:

- New signup, resend-verification, and password-reset records always persist `codePlain: null`; OTP plaintext remains in process memory only long enough to call the mail provider and, in local password-reset development, return the existing dev-only response.
- New OTP hashes use `v3:` HMAC-SHA-256 with a dedicated `EMAIL_VERIFICATION_PEPPER`. Production startup and hash creation fail closed when the dedicated secret is missing or shorter than 32 characters.
- Verification retains a rollout compatibility window for existing v3/legacy hashes generated with prior auth secrets, but production no longer authenticates through `codePlain` fallback.
- Forgot-password limits requests by client IP and HMAC email digest. Reset verification limits by client IP and HMAC email/reference digest; raw emails are not stored in rate-limit keys.
- Invalid password-reset attempts use atomic compare-and-set updates on record id, attempt count, active state, consumption state, and expiration.
- A valid reset code is claimed once inside the same MongoDB transaction that updates the password and consumes remaining active reset codes, preventing two concurrent requests from succeeding with one OTP.
- Reset passwords now require at least 8 characters in both API and UI while preserving paste/password-manager behavior.
- `/api/auth/verification-pending` no longer selects or returns plaintext OTP, including in development.
- `scripts/clear-email-verification-plaintext.mjs` provides a default dry run and guarded `--apply` cleanup; it refuses mutation if any plaintext record lacks a replacement hash and never prints OTP/email values.
- Render Blueprint declares `EMAIL_VERIFICATION_PEPPER` as `sync: false`; it must be configured before deployment.
- Local verification: `check:auth` passed 31 files / 179 tests; Prisma validation, server TypeScript, changed-file ESLint, and production build passed. `check:i18n` retained the existing 299-repository finding baseline and introduced no new finding for the translated 8-character password policy.

Production cutover checklist (not executed from this local session):

1. Generate and set a new independent `EMAIL_VERIFICATION_PEPPER` (32+ random characters) in Render.
2. Deploy schema/application through the existing pre-deploy `prisma db push` flow.
3. Run `npm run db:print-target`, then `npm run db:clear-otp-plaintext` as a dry run.
4. If the dry run reports zero missing hashes, run `npm run db:clear-otp-plaintext -- --apply`.
5. Verify the cleanup dry run reports zero plaintext records; only then remove the legacy `codePlain` field in a follow-up schema release.

## Phase 4 — Revoke Sessions After Password Reset

Goal: password reset ตัด session เดิมที่อาจถูกขโมย

- [x] เพิ่ม `authVersion` ใน `User` โดยใช้ optional default `0` เพื่อรองรับ MongoDB records เดิม
- [x] ฝัง version ที่เกี่ยวข้องใน JWT ตอน sign-in
- [x] ตรวจ version กับฐานข้อมูลเมื่อ Auth.js ประเมิน JWT session ฝั่ง server
- [x] increment version ใน transaction เดียวกับ password change และ OTP consumption
- [x] ทำให้ session เดิมถูก reject; Auth.js ล้าง JWT cookie และ protected dashboard redirect ไป Login ใหม่
- [x] ไม่ revoke session ใหม่ที่เกิดหลัง reset สำเร็จ
- [x] เพิ่ม audit event `auth.password_reset.sessions_revoked`

Exit criteria:

- [x] Session ที่สร้างก่อน reset ใช้งาน protected route ไม่ได้
- [x] ผู้ใช้ Login ด้วย password ใหม่ได้
- [x] Password เก่า Login ไม่ได้

Implementation notes (2026-07-14):

- JWT เก่าจะถูก reject เมื่อ `token.authVersion` ไม่ตรงกับ `User.authVersion`; callback คืน `null` เพื่อให้ Auth.js ล้าง session cookie
- Sign-in ใหม่ทั้ง credentials และ OAuth ยึด version ล่าสุดจากฐานข้อมูล จึงไม่ถูก revoke พร้อม session เก่า
- reset transaction อัปเดต password/version, consume OTP และลบ adapter `Session` records ของผู้ใช้เดียวกันเป็น defense in depth
- dashboard layout ตรวจ session ซ้ำฝั่ง server และ redirect `/login` เมื่อ session ถูก revoke
- local verification ผ่าน `check:auth` จำนวน 31 test files / 184 tests พร้อม Prisma validation, changed-file ESLint, server TypeScript และ production build

## Phase 5 — Delivery Observability and Operations

Goal: ทีมตอบได้ว่าอีเมลไปถึงไหนโดยไม่ต้องเดา

- [x] เก็บ Resend message ID หลัง provider accepted
- [x] เพิ่ม signed webhook endpoint สำหรับ delivery events
- [x] ตรวจ webhook signature และทำ idempotent event processing
- [x] บันทึกสถานะ accepted/delivered/bounced/complained/suppressed/failed
- [x] เพิ่ม audit events ที่ไม่เปิดเผย PII:
  - `auth.password_reset.request_accepted`
  - `auth.password_reset.provider_accepted`
  - `auth.password_reset.delivered`
  - `auth.password_reset.delivery_failed`
  - `auth.password_reset.completed`
- [x] ใช้ email digest หรือ masked email เฉพาะที่จำเป็น
- [x] เพิ่ม alert เมื่อ failure/suppression rate เกิน threshold
- [x] เพิ่ม admin/ops lookup ด้วย reference code โดยไม่แสดง OTP
- [x] กำหนด retention สำหรับ delivery metadata 90 วัน และ audit logs 365 วัน

Exit criteria:

- [x] Support ตรวจ reference code แล้วทราบ provider/delivery state ได้
- [x] Bounce/suppression spike มี alert
- [x] Logs และ ops response ไม่มี OTP/password plaintext

Implementation notes (2026-07-14):

- `sendPasswordResetEmail` คืน Resend message ID และ forgot-password activation เก็บ provider/status แบบ atomic พร้อม OTP lifecycle
- `POST /api/webhooks/resend` ใช้ Resend/Svix verification กับ raw body และ headers ก่อนประมวลผลทุกครั้ง
- `EmailDeliveryWebhookEvent.providerEventId` เป็น unique idempotency claim; handler ลบ claim เมื่อ processing ล้มเหลวเพื่อให้ provider retry ได้
- delivery transition ป้องกัน event ย้อนลำดับ เช่น `email.sent` ไม่ลดสถานะจาก `DELIVERED` กลับเป็น `ACCEPTED`
- failure rate default alert คืออย่างน้อย 10 accepted messages ภายใน 60 นาที และ failure/suppression ตั้งแต่ 20%; ส่งทั้ง audit, stderr และ Sentry
- admin lookup: `GET /api/admin/ops/password-reset-delivery?referenceCode=TP-XXXX` คืนเฉพาะ provider state/timestamps และ aggregate health
- `npm run db:prune-email-delivery` เป็น dry run; ใช้ `-- --apply` หลัง `db:print-target` เพื่อลบ webhook events, delivery metadata และ audit logs ที่เก่ากว่า retention
- local verification ผ่าน `check:auth` จำนวน 35 test files / 196 tests พร้อม Prisma validation และ server TypeScript

## Phase 6 — Automated Tests and Auth Check Gate

Goal: ปัญหานี้ต้องทำให้ CI แดงได้หากเกิดซ้ำ

เพิ่ม test files:

- [x] `src/__tests__/forgot-password-route.test.ts`
- [x] `src/__tests__/reset-password-route.test.ts`
- [x] `src/__tests__/send-password-reset-email.test.ts`
- [x] `src/__tests__/password-reset-session-revocation.test.ts`

Forgot Password route cases:

- [x] invalid payload -> structured `INVALID_PAYLOAD`
- [x] nonexistent account -> neutral response, no OTP, no mail
- [x] Google-only account -> neutral response และไม่ส่ง recovery OTP ตาม policy ปัจจุบัน
- [x] credentials account -> hashed pending code + mail attempt
- [x] provider accepted -> code active + old code retired
- [x] provider rejected -> old active code preserved
- [x] missing production env -> readiness/send-boundary failure
- [x] cooldown begins only after provider accepted
- [x] IP/email rate limits
- [x] response shape does not reveal account/provider type

Reset Password route cases:

- [x] invalid/expired/consumed code
- [x] wrong purpose cannot reset password
- [x] maximum attempts
- [x] atomic concurrent invalid attempts
- [x] atomic concurrent valid submissions: exactly one success
- [x] password is bcrypt hashed
- [x] password policy validation
- [x] all recovery codes consumed after success
- [x] previous sessions revoked
- [x] audit data contains no secret/OTP/raw password

Email sender cases:

- [x] production sender configuration is required at the send boundary
- [x] `@resend.dev` sender rejected in production
- [x] missing/invalid public URL
- [x] Resend error mapping
- [x] provider message ID persisted
- [x] no plaintext OTP in production logs

CI integration:

- [x] เพิ่ม test ทั้งหมดใน `test:auth`
- [x] ให้ `check:auth` ครอบคลุม Prisma schema validation, security guard และ server type-check
- [x] เพิ่ม integration-style sender test ที่ใช้ controlled Resend provider mock
- [x] เพิ่ม architecture/security guard หากมี plaintext OTP persistence กลับมา

Exit criteria:

- [x] Defect ทั้งหมดใน incident summary มี regression test
- [x] `npm.cmd run check:auth` fail หากเอา protection สำคัญออก

Implementation notes (2026-07-14):

- แยก auth generation policy เป็น `src/lib/auth/session-version.ts` และเพิ่ม dedicated session-revocation tests
- reset route ตรวจ `purpose` ซ้ำใน record matcher จึงไม่พึ่ง database filter เพียงชั้นเดียว
- email sender ตรวจ production readiness ที่ send boundary ก่อนเรียก Resend รวม missing key/from, test sender และ public URL
- `scripts/check-auth-recovery-security.mjs` ตรวจ non-null `codePlain`, secret fields ใน audit metadata และ security contracts สำคัญ
- GitHub Actions `test-unit` รัน `check:auth-security`; local `check:auth` รัน tests, guard, Prisma validate และ server TypeScript
- local `check:auth` ผ่าน 36 test files / 212 tests; changed-file ESLint, `check:i18n` และ production build ผ่าน
- full unit baseline ยังไม่เขียว: 17 failures ใน 13 files จาก Admin/Classroom/Course/Game/Negamon (Auth recovery tests ผ่านทั้งหมด)

## Phase 7 — Manual QA and Controlled Rollout

QA matrix:

| Scenario | Expected result |
|---|---|
| ไม่มีบัญชี | Neutral response, ไม่ยืนยันว่ามี/ไม่มีบัญชี |
| Google-only account | Neutral response; ได้คำแนะนำ Google ตาม policy |
| Credentials account | Provider accepts; OTP email arrives; code ใช้ได้ครั้งเดียว |
| Email อยู่ใน spam | UI แนะนำ spam/support; ops ตรวจ delivery state ได้ |
| Provider rejected | ไม่ทำลาย OTP เดิม; มี audit/alert |
| Resend suppressed/bounced | Webhook อัปเดตสถานะ; support ตรวจได้ |
| กด resend ก่อน cooldown | Neutral rate-limit UX และ Retry-After ถูกต้อง |
| OTP หมดอายุ | Error localized และขอใหม่ได้ |
| กรอก OTP ผิดครบ limit | Code ถูก lock/consume แบบ atomic |
| ยิง OTP พร้อมกัน | สำเร็จสูงสุดหนึ่ง request |
| Reset สำเร็จ | Password เก่าและ session เก่าใช้ไม่ได้ |
| ภาษาไทย/อังกฤษ | ข้อความครบ ไม่มี hardcoded language leak |
| Mobile/desktop | Form, autocomplete, paste และ password manager ใช้งานได้ |

Rollout:

- [ ] Deploy staging พร้อม Resend test/QA domain
- [ ] ทดสอบ end-to-end ด้วย controlled credentials และ Google-only accounts
- [ ] เปิด production แบบ monitored rollout
- [ ] ตรวจ delivery metrics และ auth error rate อย่างน้อยหนึ่งรอบการใช้งานจริง
- [ ] เตรียม rollback ที่ไม่ย้อนกลับไปเก็บ OTP plaintext

Implementation notes (2026-07-14):

- local pre-deploy ผ่าน `check:auth` 36 files / 215 tests, security guard, Prisma validation, server TypeScript, `check:i18n` และ production build
- browser QA ยืนยัน forgot-password responsive ที่ desktop/390 px และ OTP input รองรับ `one-time-code`
- แก้ reset form ให้ใช้ shared Thai/English translations ทั้งหมด, localized API errors, accessible password toggle และ `autocomplete="new-password"`
- production `/api/ready` ยังไม่มี `checks.emailDelivery`; จึงถือว่า revision Phase 0-7 ยังไม่พร้อมให้ทำ controlled OTP/password mutation บน production
- ยังขาด staging deployment, controlled credentials/Google-only accounts และ mailbox จริงสอง provider; rollout checkboxes และ exit criteria จึงยังไม่ถูกปิด

Exit criteria:

- QA matrix ผ่านทั้งหมด
- ไม่มี false-success wording
- Production recovery สำเร็จกับ mailbox จริงอย่างน้อยสอง provider
- ไม่มี regression ใน Login/Register/Google OAuth

## Data Model Direction

โครงสร้างเป้าหมายโดยสรุป:

```text
PasswordRecoveryChallenge
  id
  userId
  emailDigest
  referenceCode
  codeHash
  purpose
  status
  attempts
  maxAttempts
  expiresAt
  providerMessageId
  providerStatus
  requestedAt
  acceptedAt
  deliveredAt
  failedAt
  consumedAt
  createdAt
  updatedAt
```

หมายเหตุ:

- พิจารณาใช้ model ใหม่แทนการขยาย `EmailVerificationCode` หาก signup verification และ password recovery เริ่มมี lifecycle ต่างกันมาก
- ห้ามมี `codePlain`
- raw email ควรเก็บเฉพาะเมื่อจำเป็นต่อการส่งและตาม retention policy; lookup/rate-limit ใช้ normalized digest

## API Contract Direction

Forgot Password public response:

```json
{
  "ok": true,
  "requestAccepted": true,
  "cooldownSeconds": 30
}
```

ข้อกำหนด:

- response นี้หมายถึง "ระบบรับคำขอแล้ว" ไม่ได้หมายถึง "อีเมล delivered แล้ว"
- ห้ามคืน `sent`, `referenceCode`, provider type หรือ account existence ใน production response แรก หากข้อมูลดังกล่าวทำให้เกิด enumeration หรือ false confidence
- reference code แสดงจากอีเมลเป็นหลัก หรือออกแบบ request handle ที่ไม่เปิดเผย account state
- error ใช้ structured error contract กลาง

## Files Expected to Change

Core routes and services:

- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/lib/email/send-password-reset-email.ts`
- `src/lib/email-verification.ts`
- `src/lib/security/rate-limit.ts`
- `src/lib/security/audit-log.ts`
- `src/auth.ts`

UI and localization:

- `src/app/forgot-password/forgot-password-form.tsx`
- `src/app/forgot-password/reset/reset-password-form.tsx`
- `src/app/login/login-form.tsx`
- `src/lib/ui-error-messages.ts`
- `src/lib/translations.ts`

Schema and deployment:

- `prisma/schema.prisma`
- `.env.example`
- `render.yaml`
- readiness/health implementation
- Resend webhook route and verification helper

Tests and docs:

- `package.json`
- new auth recovery test files
- `docs/auth-manual-qa-checklist.md`
- `docs/security-pr-review-checklist.md` if recovery-specific checks are added

## Validation Commands

Targeted during implementation:

```powershell
npm.cmd test -- src/__tests__/forgot-password-route.test.ts
npm.cmd test -- src/__tests__/reset-password-route.test.ts
npm.cmd test -- src/__tests__/send-password-reset-email.test.ts
```

Auth gate:

```powershell
npm.cmd run check:auth
```

Repository baseline:

```powershell
npm.cmd run check:i18n:strict
npm.cmd run lint
npm.cmd run predev
npm.cmd run build
```

Production verification:

```text
1. /api/ready reports email recovery configuration ready without exposing secrets
2. Request recovery for controlled credentials account
3. Confirm provider accepted and webhook delivered
4. Reset password with OTP once
5. Confirm reuse fails
6. Confirm old password and old sessions fail
7. Confirm new password login succeeds
```

## Definition of Done

- [x] Local dev ที่ `emailDelivery: not_configured` แสดงสถานะโหมดพัฒนาและ dev OTP ทันทีบนหน้ารับคำขอ แทนการบอกให้ผู้ใช้รออีเมลที่ระบบไม่ได้ส่ง; production response ไม่คืน dev OTP
- [x] Signup email verification ใช้ encrypted, HttpOnly flow handle ส่ง dev OTP เฉพาะ browser ที่เริ่มสมัครบน non-production; public resend response ของ unknown/verified/Google-only ยังคง neutral และ production ไม่คืน OTP
- [x] Local development resend คืน OTP ทดสอบโดยตรงหลังออก code สำเร็จ แม้ provider ตอบรับแต่เมลไม่ถึงหรือ flow cookie สูญหาย พร้อมกรอก OTP อัตโนมัติ; production ยังคง neutral และไม่คืน OTP
- [x] เฉพาะ `NODE_ENV=development` ข้าม resend cooldown/rate-limit เพื่อให้ทดสอบ localhost ซ้ำได้; test/production ยังคงใช้ atomic layered rate limiting ตามเดิม

- [ ] ผู้ใช้ไม่เห็น false-success ว่า OTP ส่งแล้ว
- [ ] Credentials account รับ recovery email จาก verified domain
- [ ] Google-only และ nonexistent account ไม่ทำให้ API เปิดเผย account state
- [ ] Email provider failure ไม่ทำลาย active code เดิม
- [ ] ไม่มี OTP plaintext ใน database, logs, audit หรือ production response
- [ ] Reset/verify มี rate limit และ atomic attempt/consume behavior
- [ ] Password reset revoke session เดิม
- [x] Delivery status ตรวจสอบได้จาก provider message ID/webhook
- [ ] Thai/English UX ครบและใช้ shared localization/error helpers
- [x] Forgot/Reset/Email sender tests อยู่ใน `test:auth`
- [ ] `check:auth`, i18n, lint, type-check และ build ผ่าน
- [ ] Manual QA production ผ่าน controlled accounts โดยไม่ใช้บัญชีผู้ใช้จริงแบบสุ่ม

## Recommended Execution Order

1. Phase 0 — ยืนยันและแก้ production email config ทันที
2. Phase 1 — หยุด false-success UX
3. Phase 6 ส่วน test scaffolding — เขียน regression tests ก่อนเปลี่ยน lifecycle
4. Phase 2 — ทำ OTP lifecycle failure-safe
5. Phase 3 — ลบ plaintext และเพิ่ม abuse controls
6. Phase 4 — session revocation
7. Phase 5 — delivery webhook/observability
8. Phase 6 ที่เหลือ + Phase 7 — full validation และ rollout

## Remaining Decisions Before Implementation

- [ ] Google-only account: ส่ง provider-guidance email หรืออนุญาตตั้ง credentials password หลังยืนยันอีเมล
- [ ] Password minimum: 8, 10 หรือ 12 ตัวอักษร
- [ ] แยก model `PasswordRecoveryChallenge` หรือ migrate `EmailVerificationCode`
- [ ] ระยะเวลาหมดอายุ OTP และ resend cooldown ที่ต้องการ
- [x] Session revocation ใช้ `authVersion`
- [x] Delivery metadata 90 วัน, audit logs 365 วัน; alert default 20% เมื่อ sample อย่างน้อย 10 รายการใน 60 นาที
