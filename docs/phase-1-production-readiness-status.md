# Phase 1 Production Readiness Status

Single place to see **what is done vs still open** for Phase 1 (from `docs/commercial-production-roadmap.md`).

Last updated: 2026-05-07 (Terms/Privacy full draft + Stripe + monitoring)

---

## Quick summary — แยก ใน repo / นอก repo

**คำจำกัดความ**

- **ใน repo** = สิ่งที่อยู่ใน git: โค้ด, สคริปต์, เอกสาร markdown — ปิดงานด้วย PR/commit
- **นอก repo** = Dashboard (Render, Atlas, Stripe/Omise, Sentry), DNS, ค่าทนาย, การรันคำสั่งต่อ **DB จริง** / ทดสอบมือบน URL จริง — ปิดงานด้วยการยืนยันใน **Completed production setup (log)** และ/หรือย้ายแถวในสรุปด้านล่าง

### ใน repo — ทำแล้ว (Phase 1 core)

| หัวข้อ | รายละเอียด |
| --- | --- |
| แอป + API | Env validation (`src/lib/env.ts`), `/api/health`, `/api/ready`, rate limit + audit defaults |
| Billing ในโค้ด | Stripe / Omise / mock, idempotency, `apply-plus-entitlement` path |
| Plan / โควตา | `resolvePlanIdForQuota`, `getLimitsForUser(..., planStatus, planExpiry)`, JWT `planExpiry` |
| Auth / ขอบเขต API | [`phase-1-route-authorization-audit.md`](./phase-1-route-authorization-audit.md), harden `GET .../events` |
| หน้า Terms / Privacy | ฉบับเต็ม EN/TH ใน [`content/public-pages.ts`](../content/public-pages.ts) — PDPA-oriented privacy, Thailand law in terms, contact `support@teachplayedu.com`; ลิงก์จากหน้าสมัคร |
| สคริปต์ index + runbook | `npm run db:ensure-indexes` (เรียกทั้งสองสคริปต์); ขั้นตอน ops → [**Ops: MongoDB index scripts (production)**](#ops-mongodb-index-scripts-production) |
| เอกสารสถานะ | ไฟล์นี้, payment readiness, revenue checklist, route audit |

### ใน repo — ยังเปิด / ติดตาม (ไม่ใช่บล็อกโค้ดหลัก)

| หัวข้อ | รายละเอียด |
| --- | --- |
| Checklist รายได้ | ติ๊ก `- [ ]` ใน [`revenue-plus-pilot-task-checklist.md`](./revenue-plus-pilot-task-checklist.md) |
| สัญญาระดับสถาบัน (ถ้ามี) | DPA/MOU แยกจากข้อความสาธารณะ — ปรึกษาทนายเมื่อจัดซื้อโรงเรียน/เขต |

### นอก repo — ทำแล้ว (ยืนยันแล้ว)

| หัวข้อ | รายละเอียด |
| --- | --- |
| Hosting | Render web service **`gameedu-app`**, เชื่อม GitHub `main` |
| โดเมน + URL | **`https://www.teachplayedu.com`** — `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SOCKET_URL` ตรง origin; `SOCKET_IO_CORS_ORIGIN`; redirect www/non-www |
| **MongoDB index scripts (prod)** | รัน `npm run db:ensure-indexes` กับ production `DATABASE_URL` แล้ว — ตรวจชื่อ index ใน Atlas ตาม [Ops](#ops-mongodb-index-scripts-production) |
| **Production smoke (มือ — core)** | บน **`www.teachplayedu.com`:** สมัคร, ล็อกอิน, ห้องเรียน, โค้ดนักเรียน, เกม realtime + Socket — ดู [log](#completed-production-setup-log) |

(รายละเอียดวันที่อยู่ใน **Completed production setup (log)** ด้านล่าง)

### นอก repo — ยังไม่ทำ / ต้องยืนยัน

| หัวข้อ | รายละเอียด |
| --- | --- |
| MongoDB Atlas (Phase 2) | ย้าย **backup + restore drill** ไป Phase 2; ใน Phase 1 คงยืนยัน **`DATABASE_URL`** / network access |
| ชำระเงิน | **Done:** Stripe test + **Stripe live smoke (PLUS Monthly 290 THB, 2026-05-07)** + Omise test บนโดเมนจริง. **Omise live mode KYC** อยู่ระหว่าง review (ยื่น 2026-05-07; อาจขอเอกสารเพิ่ม). |
| Monitoring | **Sentry (live verified, 2026-05-07) + UptimeRobot (live, 2026-05-07).** ครบ error + uptime monitoring สำหรับ Phase 1. |
| กฎหมาย | **Terms / Privacy สาธารณะจัดทำใน repo แล้ว (2026-05-07)** — สัญญาจัดซื้อระดับโรงเรียนเป็นเรื่องแยก (ทนายตามความจำเป็น) |
| Smoke production (ส่วนขยาย) | ถ้าเปิดใช้: Negamon rewards, economy, billing — ทดสอบมือตาม [รายการท้ายเอกสาร](#external-actions-checklist) |
| Render | แผน **Free** = cold start หลังหยุดใช้ — ถ้าต้องการ latency คงที่ → **แผน paid** |

---

## เมื่องานเสร็จ ให้ทำอย่างไร (maintainer playbook)

1. **งานนอก repo เสร็จ** (Atlas, Stripe, smoke ฯลฯ): เพิ่มแถวใน **Completed production setup (log)** และย้ายแถวจาก **นอก repo — ยังไม่ทำ** → **นอก repo — ทำแล้ว** ด้านบน
2. **งานใน repo เสร็จ** (แก้โค้ด/เอกสาร): PR/commit ตามปกติ; ถ้าเป็นหัวข้อใน **ใน repo — ยังเปิด** ให้อัปเดตตารางนั้น
3. **ตาราง Detailed checklist** ด้านล่าง: แก้คอลัมน์ **Status** ให้สอดคล้อง
4. **คอมมิต** เช่น `docs: mark Atlas backup + index scripts on prod`
5. **Agents / AI:** อ่าน **Quick summary — แยก ใน repo / นอก repo** และ **Completed production setup (log)** ก่อนแนะนำงานซ้ำ

---

## Ops: MongoDB index scripts (production)

สคริปต์สร้าง index ผ่าน Prisma `$runCommandRaw` — ต้องมี **`DATABASE_URL`** ชี้ไป cluster ที่ต้องการ (production) ตอนรันคำสั่ง

| สคริปต์ | คอลเลกชัน | Index ที่สร้าง |
| --- | --- | --- |
| [`scripts/ensure-economy-ledger-indexes.mjs`](../scripts/ensure-economy-ledger-indexes.mjs) | `EconomyTransaction` | Unique partial: `EconomyTransaction_idempotencyKey_unique_non_null` บน `idempotencyKey` (เฉพาะ string) |
| [`scripts/ensure-negamon-live-reward-indexes.mjs`](../scripts/ensure-negamon-live-reward-indexes.mjs) | `NegamonLiveBattleRewardClaim` | `NegamonLiveBattleRewardClaim_idempotencyKey_unique`; `NegamonLiveBattleRewardClaim_classId_createdAt_idx`; `NegamonLiveBattleRewardClaim_studentId_createdAt_idx` |

### Precheck (ก่อนรัน)

1. ยืนยันว่า `DATABASE_URL` เป็น **production** (ไม่สลับกับ dev/staging) — แนะนำรัน **`npm run db:print-target`** ก่อน (พิมพ์เฉพาะ host / ชื่อ DB ไม่มีรหัสผ่าน); สคริปต์ index โหลด **`.env`** แล้ว **`.env.local`** ทับ (ค่าจาก shell ตอนเปิด Node ยังชนะ)
2. **Atlas → Network Access** — อนุญาต IP ของเครื่องที่รัน (หรือ outbound ของ Render ถ้ารันจาก Shell)
3. **Backup / snapshot** (แนะนำถ้า tier รองรับ) — `createIndexes` มัก idempotent แต่ **unique** จะล้มถ้ามีข้อมูลซ้ำที่ขัด constraint
4. (ถ้าเป็นไปได้) ตรวจว่าไม่มี `idempotencyKey` ซ้ำที่ขัดกับนิยาม index

### รันคำสั่ง

จากรากโปรเจกต์ หลัง `npx prisma generate` (หรือหลัง `npm ci` ที่มี `postinstall`):

**PowerShell (Windows)**

```powershell
$env:DATABASE_URL = "<production-connection-string>"   # อย่า commit
npm run db:ensure-indexes
```

**bash**

```bash
export DATABASE_URL="<production-connection-string>"   # อย่า commit
npm run db:ensure-indexes
```

ลำดับสองสคริปต์ในคำสั่งเดียวกันแล้ว — ไม่ต้องกังวลลำดับภายใน

**ทางเลือก:** Render Shell — ตั้ง `DATABASE_URL` จาก env ของ service แล้วรัน `npm run db:ensure-indexes` ในไดเรกทอรีที่มี `node_modules` และสคริปต์

### ตรวจหลังรัน (Atlas UI)

- คอลเลกชัน **EconomyTransaction** — มี index ชื่อ `EconomyTransaction_idempotencyKey_unique_non_null`
- คอลเลกชัน **NegamonLiveBattleRewardClaim** — มี index ทั้งสามชื่อข้างต้น

ถ้า error (เช่น duplicate key) แก้ข้อมูลหรือปรับแผนก่อนรันซ้ำ

### ปิดงานเมื่อรันบน prod สำเร็จ

เพิ่มแถวใน **Completed production setup (log)** (วันที่ + ข้อความสั้นๆ เช่น “Applied economy + negamon index scripts on production cluster”) และอัปเดตตาราง **นอก repo — ยังไม่ทำ** ตาม [playbook](#เมื่องานเสร็จ-ให้ทำอย่างไร-maintainer-playbook)

---

## Ops: Sentry observability (production)

โปรเจ็กต์ Sentry: **`teachplayedu.sentry.io`** / project slug **`javascript-nextjs`** (rename ทีหลังที่ Settings → Projects ได้ ถ้าต้องการให้ตรงกับชื่อ service)

### สถาปัตยกรรมในโค้ด

| ไฟล์ | ทำหน้าที่ |
| --- | --- |
| `instrumentation.ts` | hook ของ Next.js — init Sentry บน Node + Edge runtime + forward `onRequestError` |
| `instrumentation-client.ts` | init Sentry ใน browser bundle + capture router transitions |
| `server.ts` | early `Sentry.init` ก่อน Next ขึ้น เพื่อให้ Socket.IO + HTTP listen errors เข้า Sentry |
| `next.config.ts` | wrap ด้วย `withSentryConfig` (source-map upload เฉพาะเมื่อมี `SENTRY_AUTH_TOKEN`) |
| `src/lib/observability/sentry-pii.ts` | shared `beforeSend` scrubber — กรอง cookie/auth/Stripe sig/password/card/OTP/national-ID/bank ฟิลด์ก่อนส่ง |
| `src/lib/env.ts` | validate Sentry envs (DSN, AUTH_TOKEN, ORG, PROJECT, ENVIRONMENT, RELEASE, TRACES_SAMPLE_RATE + `NEXT_PUBLIC_*` peers) |

### Render env ขั้นต่ำสำหรับเปิด Sentry

```text
SENTRY_DSN=https://<key>@oXXXX.ingest.us.sentry.io/<project>
NEXT_PUBLIC_SENTRY_DSN=<same as SENTRY_DSN>          # NEXT_PUBLIC_ จำเป็นเพราะ browser bundle ใช้ตัวนี้
SENTRY_AUTH_TOKEN=sntrys_…                            # build-time only, scope: org:read + project:read + project:releases
SENTRY_ORG=teachplayedu
SENTRY_PROJECT=javascript-nextjs
SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.05                        # 0..1; 5% sample = ปลอดภัยสำหรับ free tier
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05
# ออปชัน — เปิดเฉพาะตอน verify เท่านั้น แล้วลบทิ้ง:
# SENTRY_DIAG_ENABLED=true
```

> ถ้าไม่มี `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` SDK จะ no-op (ไม่ส่ง event, ไม่เพิ่ม latency) — dev/branch deploys จึงไม่เปลือง quota.

### Verify Sentry (admin-only)

1. เปิด `SENTRY_DIAG_ENABLED=true` ใน Render → save → wait deploy live.
2. Login เป็น TEACHER/ADMIN บน `https://www.teachplayedu.com`.
3. เปิด address bar: `https://www.teachplayedu.com/api/admin/diag/sentry-test` → ต้องได้ JSON `ok:true` พร้อม `correlation` id.
4. ที่ Sentry Issues feed (`https://teachplayedu.sentry.io/issues/`) ภายใน ~30s ต้องเห็น `SentryDiagnosticError` ที่ tag `correlation_id` ตรงกัน + `environment=production`.
5. ปิด `SENTRY_DIAG_ENABLED` กลับเป็น `false` (หรือลบ env) → save → ให้ Render redeploy เพื่อกันยิง endpoint นี้สุ่ม.
6. ถ้าต้องการเทส 500 path: เพิ่ม `?mode=throw` ที่ URL → handler จะ `throw` แทน return JSON, `onRequestError` จะ capture ให้.

### PII scrubber — เพิ่มฟิลด์เมื่อมี secret ใหม่

แก้ `src/lib/observability/sentry-pii.ts` → เพิ่ม key (lowercase, ตัด `_`/`-` ออก) ใน `SECRET_FIELD_NAMES` หรือ header ใน `SECRET_HEADER_NAMES` แล้ว rebuild — sanitizer ใช้ทั้ง server + client + edge runtime.

### Quota / cost-control hints

- **Free tier:** 5,000 errors / 10,000 transactions / 50 replays ต่อเดือน — sample rate `0.05` กัน traces ล้น.
- เปิด **inbound filters** ใน Sentry → Settings → Inbound Filters เพื่อกรอง browser extension errors / known bots.
- ถ้า quota ใกล้หมด → `tracesSampleRate=0` ปิด traces แต่เก็บ errors ไว้.

---

## Ops: UptimeRobot uptime monitors (production)

Free tier (50 monitors / interval 5 นาที) — เพียงพอสำหรับ Phase 1

### Monitors ที่ตั้งไว้

| ชื่อ | URL | Method | Interval | Timeout | Alert |
| --- | --- | --- | --- | --- | --- |
| `teachplayedu.com/api/health` | `https://www.teachplayedu.com/api/health` | HEAD* | 5m | 30s | email, 2 ครั้งติด |
| `teachplayedu.com/api/ready` | `https://www.teachplayedu.com/api/ready` | HEAD* | 5m | 30s | email, 2 ครั้งติด |

> *Free tier ล็อก method ที่ `HEAD` — Next.js App Router (13.4+) auto-derive `HEAD` จาก `GET` handler โดยส่ง response เดียวกันแต่ตัด body ออก ดังนั้นทั้ง `/api/health` และ `/api/ready` ตอบ 200 ปกติ ไม่ต้องแก้โค้ด

### Behavior ที่ได้

- **Outage detect:** down ≥ 2 รอบติด (รวม ~10 นาที) → email alert
- **Cold-start mitigation:** Render Free spin down หลัง 50 วินาที — UptimeRobot ping ทุก 5 นาทีช่วยให้ instance ตื่นอยู่เกือบตลอด (ผู้ใช้ใหม่ ไม่ต้องรอ cold start หลายวินาที)
- **Public status page:** dashboard.uptimerobot.com ดู uptime % รายเดือน/ปี ฟรี

### เพิ่ม alert ช่องทางอื่น

ถ้าต้องการเตือนทาง LINE/SMS/Discord/Slack: My Settings → Alert Contacts → Add Alert Contact (Free tier รองรับ email + webhooks; LINE Notify ใช้ผ่าน webhook ได้)

### ปรับเปลี่ยน monitors

- เพิ่ม URL อื่น (เช่น landing page): My Settings → Add New Monitor → ใช้ template เดียวกัน
- ปิด monitor ชั่วคราว (deploy ใหญ่): กดปุ่ม `Pause` ที่ monitor row
- ดู response time history: เปิด monitor → "Response time" graph

---

## Completed production setup (log)

**Maintainers: append dated rows here when something ships.**

| When | What |
| --- | --- |
| 2026-05 (confirmed) | **Render** web service **`gameedu-app`**, repo `MosChaimong123/gameedu` / `main`. |
| 2026-05 (confirmed) | **Custom domain** `https://www.teachplayedu.com` (canonical); `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_URL` aligned (no trailing slash). |
| 2026-05 (confirmed) | **`SOCKET_IO_CORS_ORIGIN`** includes `https://www.teachplayedu.com`; **www vs non-www** redirect / single canonical host configured. |
| 2026-05-02 | **In repo:** `npm run db:ensure-indexes` + section [Ops: MongoDB index scripts (production)](#ops-mongodb-index-scripts-production). |
| 2026-05-02 (confirmed) | **MongoDB production cluster:** ran `npm run db:ensure-indexes` with production `DATABASE_URL` — `EconomyTransaction` + `NegamonLiveBattleRewardClaim` indexes per Ops doc. |
| 2026-05-02 (re-run) | Pre-flight **`npm run db:print-target`** (Atlas + DB `gameedu`); **`npm run db:ensure-indexes`** completed OK (idempotent). |
| 2026-05-02 | **Production smoke (API):** `GET /api/health` และ `GET /api/ready` ที่ **`https://www.teachplayedu.com`** ได้ **200**; **`npm run test:unit`** ผ่าน (522 tests). |
| 2026-05-02 (confirmed) | **Production smoke (manual — core flows):** สมัคร, ล็อกอิน, ห้องเรียน, โค้ดนักเรียน, เกม realtime + Socket บน **`https://www.teachplayedu.com`**. |
| 2026-05-05 | **Auth email verification fix:** normalize public origin for verify link generation (`http/https`), then redeploy + verify flow works on production. |
| 2026-05-05 | **User uniqueness hardening (Atlas + local):** merged duplicate users, fixed missing usernames, and synced Prisma indexes (including `User_email_key` / `User_username_key`) with current schema state. |
| 2026-05-05 | **Scope decision:** moved Atlas backup/restore drill to **Phase 2**; today focus is **Payment verification** completion. |
| 2026-05-05 | **Payment return URL hardening (in repo):** Thai billing start route now uses public app origin env for Omise return URL (prevents `0.0.0.0:10000` browser redirect). |
| 2026-05-06 (confirmed) | **Payment verification (Stripe test):** checkout success + webhook delivery 2xx observed; test subscription/payment appears in Stripe dashboard. |
| 2026-05-07 (confirmed) | **Omise test-mode end-to-end verified** on production domain: PromptPay charge → webhook `charge.complete` 200 → PLUS applied; in-app one-click "จ่ายเลย (test mode)" via `POST /charges/<id>/mark_as_paid`. |
| 2026-05-07 (in repo) | **Omise UX hardening (6 commits):** diagnostic endpoint + UI panel, reconcile poll loop + Recheck, test-mode dashboard link, mark-as-paid shortcut, Mobile Banking deep links (SCB/KBank/BAY/BBL/KTB), test-mode dashboard URL fix. |
| 2026-05-07 (in flight) | **Omise live mode KYC submitted** at `dashboard.omise.co/v2/registrations` (Education Services / Online subscription, 290 THB/charge avg, website channel only). Omise team is reviewing; need to follow up with DBD e-commerce certificate + bank book scan when requested. |
| 2026-05-07 (confirmed) | **Stripe live mode onboarding** — business profile (Individual, Thai), statement descriptor (`TEACHPLAYEDU.COM` / `GAMEDU`), weekly payouts. Products `GameEdu PLUS — Monthly` (290 THB) + `GameEdu PLUS — Yearly` (2,900 THB); webhook `TeachPlayEdu-Production` → `https://www.teachplayedu.com/api/webhooks/stripe` (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`). Live keys + price IDs on Render; Checkout returns `cs_live_…` from `/api/billing/create-checkout-session`. |
| 2026-05-07 (confirmed) | **Stripe live smoke (PLUS Monthly, 290 THB)** — real-card subscription checkout on production: Stripe Dashboard → Payments shows **฿290 succeeded** (“Subscription creation”); user lands on `/dashboard/upgrade?checkout=success` with PLUS UI (badge/header). Maintainer follow-up: Stripe → Developers → Webhooks → confirm recent deliveries **2xx** for `checkout.session.completed` / subscription events; if this was test-only, **full refund** the payment then **cancel subscription** in Stripe Customer so the account returns to FREE after `customer.subscription.deleted` webhook. |
| 2026-05-07 (confirmed) | **UptimeRobot uptime monitoring live** — บัญชี Free tier, 2 monitors บน production: (1) `https://www.teachplayedu.com/api/health` (2) `https://www.teachplayedu.com/api/ready` — interval 5 นาที, timeout 30s, method `HEAD` (Free tier ล็อก แต่ Next.js App Router auto-derive HEAD จาก GET handler ตั้งแต่ 13.4 ขึ้นไป — เราใช้ Next 16.x), alert ทาง email ถ้า down 2 รอบติด. ผลข้างเคียง: ping ทุก 5 นาทีช่วยกัน Render Free spin-down (~50s cold start) ระหว่างช่วงที่ไม่มีคนเข้าเว็บ. Status page: dashboard.uptimerobot.com. |
| 2026-05-07 (confirmed) | **Sentry observability live on production** (`teachplayedu.sentry.io` / `javascript-nextjs`). In repo: `@sentry/nextjs@10.52.0`, `instrumentation.ts` (Node + Edge), `instrumentation-client.ts` (browser), early `Sentry.init` in `server.ts` to cover Socket.IO + HTTP listen errors, shared `src/lib/observability/sentry-pii.ts` `beforeSend` scrubber (drops cookies, auth headers, Stripe signatures, password / card / OTP / national ID / bank fields, redacts IP), `withSentryConfig` in `next.config.ts` with conditional source-map upload. On Render: `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` + org `teachplayedu` + project `javascript-nextjs` + env `production` + traces sample rate `0.05`. Verified end-to-end via admin-only `GET /api/admin/diag/sentry-test` (gated by `SENTRY_DIAG_ENABLED`) — `SentryDiagnosticError` event landed in Issues with matching `correlation_id` tag within seconds; `View Sample Error` from the Sentry wizard also ingested, confirming client-side capture. |
| 2026-05-07 (confirmed) | **Sentry diagnostic disabled in production** — removed `SENTRY_DIAG_ENABLED` from Render env after verification; `GET /api/admin/diag/sentry-test` now responds **404** `ENDPOINT_NO_LONGER_AVAILABLE` unless temporarily re-enabled for a probe. |
| 2026-05-07 (in repo) | **Terms of Service + Privacy Policy (EN/TH)** — full public drafts in `content/public-pages.ts` (effective date 2026-05-07): PDPA-oriented privacy; Thailand governing law in terms; payment subprocessors (Stripe, Omise); support contact `support@teachplayedu.com`. UI: `LegalParagraphs` for multi-paragraph sections; `generateMetadata` on `/terms` and `/privacy`. School-wide DPA/MOU remains a separate optional engagement. |

---

## Checklist — จบงานวันนี้ (2026-05-05)

- [x] แก้ลิงก์ยืนยันอีเมลให้สร้าง URL เสถียรเมื่อ env ไม่มี protocol (normalize origin)
- [x] ตั้งค่า production URL env และยืนยันว่า verify email ใช้งานได้จริงหลัง redeploy
- [x] ตรวจ/แก้ข้อมูลผู้ใช้ซ้ำใน DB (duplicate email merge)
- [x] แก้ข้อมูล `username` ที่ว่างเพื่อให้ผ่าน unique index
- [x] sync Prisma indexes กับ DB ปลายทางที่ใช้งานจริง
- [x] เปลี่ยน `.env.local` กลับ local (`localhost`) หลังจบงาน production
- [x] แก้ route เริ่ม Omise ให้ใช้ public origin จาก env แทน request internal host (`0.0.0.0`)
- [x] Payment provider verification (Stripe test) สำเร็จ
- [x] monitoring (Sentry + UptimeRobot, 2026-05-07); Sentry diag env removed after verify
- [x] Terms / Privacy ฉบับเต็มใน `content/public-pages.ts` (2026-05-07)
- [ ] งานคงค้าง: สัญญา DPA/MOU ระดับสถาบัน (ถ้าจัดซื้อโรงเรียน) — ปรึกษาทนายแยก

---

## Summary (legacy narrative)

Phase 1 is code-ready for a production beta foundation. Hosting and primary domain are in place; **core production smoke (auth, classroom, student code, live game + Socket)** is confirmed. **Stripe live card payment (290 THB)** verified (2026-05-07). **Public Terms + Privacy (EN/TH)** shipped in repo (2026-05-07). Remaining risk is mostly **data durability (backup)** (Phase 2 drill), **Omise live approval**, and **extended smoke** (Negamon rewards, economy, billing) when those paths matter for the pilot. **Monitoring** (Sentry + UptimeRobot) is live (2026-05-07). Optional: **institutional** DPA/MOU with counsel.

## Revenue / PLUS / pilot

[`revenue-plus-pilot-task-checklist.md`](./revenue-plus-pilot-task-checklist.md)

## Detailed checklist

| Area | Status | Notes |
| --- | --- | --- |
| Environment documentation | Done | `.env.example` |
| Startup env validation | Done | `src/lib/env.ts` |
| Health endpoint | Done | `src/app/api/health/route.ts` |
| Readiness endpoint | Done | `src/app/api/ready/route.ts` |
| Operational rate limit/audit | Done | `RATE_LIMIT_STORE`, `AUDIT_LOG_SINK` |
| Economy ledger indexes | Done + applied prod | `npm run db:ensure-indexes` (2026-05-02) — [Ops](#ops-mongodb-index-scripts-production) |
| Negamon reward indexes | Done + applied prod | (same) |
| Billing skeleton | Done in repo | Stripe live verified (smoke 2026-05-07); Omise live pending KYC |
| Billing idempotency | Done in repo | `BillingProviderEvent` |
| Plan limits + quota fields | Done in repo | `resolvePlanIdForQuota`, session `planExpiry` |
| Terms / Privacy pages | Done | Full EN/TH in `content/public-pages.ts` (2026-05-07); contact `support@teachplayedu.com`; optional counsel for school-wide contracts |
| Signup legal visibility | Done | Links on register |
| Route authorization | Done in repo | [`phase-1-route-authorization-audit.md`](./phase-1-route-authorization-audit.md) |
| Production DB backup + drill | Deferred to Phase 2 | Track in Phase 2 ops scope |
| Domain and hosting | Done | See log |
| Payment provider verification | Done (Stripe test + Omise test + **Stripe live smoke 290 THB**, 2026-05-07) | Live Checkout + Payments succeeded on production; webhook endpoint configured — confirm 2xx in Stripe webhook logs after smoke. Omise live still pending KYC. |
| Monitoring | Done (Sentry + UptimeRobot) | Sentry verified 2026-05-07 (`teachplayedu.sentry.io`, env-gated diag endpoint, PII scrubber). UptimeRobot 2 monitors (`/api/health`, `/api/ready`) every 5m + email alert on 2 consecutive failures (2026-05-07). |

## External actions (checklist)

**Done for current deployment:** hosting, custom domain, primary public URL env alignment (see log), **DB index scripts** on production cluster (`npm run db:ensure-indexes` — 2026-05-02), **production smoke (manual — core)** สมัคร / ล็อกอิน / ห้องเรียน / โค้ดนักเรียน / เกม + Socket บน `www.teachplayedu.com` (2026-05-02).

**Still to verify / complete:**

1. ~~Production domain~~ — **Done** (`www.teachplayedu.com`).
2. ~~Production hosting~~ — **Done** (Render `gameedu-app`).
3. ~~Confirm MongoDB backup/restore drill in Phase 1~~ — **Moved to Phase 2** (retain DB URL/network checks in Phase 1 ops).
4. Confirm **production env** complete (secrets not documented here).
5. ~~Run **`npm run db:ensure-indexes`** on production~~ — **Done** (2026-05-02); optional: confirm index names in Atlas UI.
6. ~~**Payment:** sandbox/live + webhooks~~ — **Done** — Stripe test (2026-05-06) + **Stripe live smoke 290 THB** (2026-05-07); webhook configured — [`phase-1-payment-readiness.md`](./phase-1-payment-readiness.md).
7. ~~**Monitoring:** errors + uptime~~ — **Done** (Sentry + UptimeRobot, 2026-05-07).
8. ~~**Legal:** public Terms/Privacy~~ — **Done in repo** (2026-05-07) — optional **DPA/MOU** for institutional procurement (separate from public pages).
9. **Production smoke** (manual):
   - ~~`/api/health`, `/api/ready`~~ — **Done** (automated + 2026-05-02).
   - ~~registration, login, classroom, student code, live game + Socket / join~~ — **Done** (2026-05-02, ยืนยันผู้ใช้).
   - **ยัง verify ตามความจำเป็น:** Negamon rewards, economy, billing (ถ้าเปิดใช้งานจริงใน pilot)

## Recommended verification commands (CI / local)

```bash
npm run check:phase1
npm run test:unit
npm run build
npm run smoke:build
```

## Notes for Future Agents

- Read **Quick summary — แยก ใน repo / นอก repo** before suggesting work; do not re-assign **นอก repo — ทำแล้ว** items unless verifying a regression.
- Plan quotas: `getLimitsForUser(..., planStatus, planExpiry)`; keep JWT `planExpiry` in sync with `User`.
- Do not mark **Omise live** complete without a real provider run; Stripe live smoke is logged for PLUS Monthly (2026-05-07).
- Do not mark DB readiness complete without backup/restore verification.
- Public **Terms** and **Privacy** for GameEdu are maintained in `content/public-pages.ts` (not legal advice). **Institutional** customers may still need separate agreements; `LEGAL_CONTACT_EMAIL` is the support address shown in those pages.
