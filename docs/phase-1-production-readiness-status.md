# Phase 1 Production Readiness Status

Single place to see **what is done vs still open** for Phase 1 (from `docs/commercial-production-roadmap.md`).

Last updated: 2026-05-05

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
| หน้า legal (starter) | Terms / Privacy + ลิงก์ตอนสมัคร |
| สคริปต์ index + runbook | `npm run db:ensure-indexes` (เรียกทั้งสองสคริปต์); ขั้นตอน ops → [**Ops: MongoDB index scripts (production)**](#ops-mongodb-index-scripts-production) |
| เอกสารสถานะ | ไฟล์นี้, payment readiness, revenue checklist, route audit |

### ใน repo — ยังเปิด / ติดตาม (ไม่ใช่บล็อกโค้ดหลัก)

| หัวข้อ | รายละเอียด |
| --- | --- |
| Checklist รายได้ | ติ๊ก `- [ ]` ใน [`revenue-plus-pilot-task-checklist.md`](./revenue-plus-pilot-task-checklist.md) |
| ข้อความ Terms/Privacy | เมื่อทนายส่งข้อความกลับมา → แก้หน้า + commit |

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
| ชำระเงิน | **Done (Stripe test):** ทดสอบชำระเงินสำเร็จ + webhook ทำงานบนโดเมนจริง (ดู log) — [`phase-1-payment-readiness.md`](./phase-1-payment-readiness.md) |
| Monitoring | Sentry, uptime ฯลฯ |
| กฎหมาย | ทนายตรวจ Terms / Privacy |
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

**Agents:** if an item appears here, treat it as **done (นอก repo)** unless the user reports a regression.

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
- [ ] งานคงค้าง: monitoring, legal text review

---

## Summary (legacy narrative)

Phase 1 is code-ready for a production beta foundation. Hosting and primary domain are in place; **core production smoke (auth, classroom, student code, live game + Socket)** is confirmed. Remaining risk is mostly **data durability (backup)**, **billing verification**, **monitoring**, **legal text**, and **extended smoke** (Negamon rewards, economy, billing) when those paths matter for the pilot.

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
| Billing skeleton | Done in repo | Needs provider sandbox/live |
| Billing idempotency | Done in repo | `BillingProviderEvent` |
| Plan limits + quota fields | Done in repo | `resolvePlanIdForQuota`, session `planExpiry` |
| Terms / Privacy pages | Done (starter) | Needs legal review |
| Signup legal visibility | Done | Links on register |
| Route authorization | Done in repo | [`phase-1-route-authorization-audit.md`](./phase-1-route-authorization-audit.md) |
| Production DB backup + drill | Deferred to Phase 2 | Track in Phase 2 ops scope |
| Domain and hosting | Done | See log |
| Payment provider verification | Done (Stripe test) | Checkout + webhook 2xx verified on production domain |
| Monitoring | **Open** | Sentry / uptime |

## External actions (checklist)

**Done for current deployment:** hosting, custom domain, primary public URL env alignment (see log), **DB index scripts** on production cluster (`npm run db:ensure-indexes` — 2026-05-02), **production smoke (manual — core)** สมัคร / ล็อกอิน / ห้องเรียน / โค้ดนักเรียน / เกม + Socket บน `www.teachplayedu.com` (2026-05-02).

**Still to verify / complete:**

1. ~~Production domain~~ — **Done** (`www.teachplayedu.com`).
2. ~~Production hosting~~ — **Done** (Render `gameedu-app`).
3. ~~Confirm MongoDB backup/restore drill in Phase 1~~ — **Moved to Phase 2** (retain DB URL/network checks in Phase 1 ops).
4. Confirm **production env** complete (secrets not documented here).
5. ~~Run **`npm run db:ensure-indexes`** on production~~ — **Done** (2026-05-02); optional: confirm index names in Atlas UI.
6. ~~**Payment:** sandbox/live + webhooks~~ — **Done (Stripe test, 2026-05-06)** — [`phase-1-payment-readiness.md`](./phase-1-payment-readiness.md).
7. **Monitoring:** errors + uptime.
8. **Legal:** replace starter Terms/Privacy after review.
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
- Do not mark billing complete without a real provider run.
- Do not mark DB readiness complete without backup/restore verification.
- Terms/Privacy are placeholders until legal approval.
