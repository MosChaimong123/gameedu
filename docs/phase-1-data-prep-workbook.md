# Phase 1 Data Prep Workbook

เอกสารนี้เป็น workbook สำหรับเตรียมข้อมูลและหลักฐานก่อนเปิด Phase 1 MVP Online Readiness ของ GameEdu

หลักการใช้งาน:

- ห้ามใส่ secret จริงลง git เช่น database password, `AUTH_SECRET`, Stripe/Omise secret key
- ให้ใส่สถานะว่า secret ถูกเก็บที่ไหนแทน เช่น Render env, MongoDB Atlas, provider dashboard
- ใช้เอกสารนี้เป็นตัวกลางสำหรับทีม dev, ops, support และคนตัดสิน Go/No-Go
- ทุกหัวข้อควรมี owner, status, evidence และวันที่ตรวจล่าสุด

สถานะที่ใช้:

- `Not Started`
- `In Progress`
- `Blocked`
- `Ready`
- `Verified`
- `No-Go`

## 1. Phase 1 Scope Matrix

เป้าหมาย: ยืนยันว่ารอบ MVP เปิดอะไร ปิดอะไร จำกัดอะไร และครู/นักเรียนจะเห็นอะไรจริง

### 1.1 Feature Scope

| Feature area | Phase 1 decision | User visible? | Server enforced? | Owner | Status | Evidence / notes |
| --- | --- | --- | --- | --- | --- | --- |
| Teacher registration/login | Open | Yes | Yes |  |  |  |
| Google OAuth | Open only if production OAuth is configured | Conditional | Yes |  |  |  |
| Teacher dashboard | Open | Yes | Yes |  |  |  |
| Classroom create/update | Open | Yes | Yes |  |  |  |
| Add students / student codes | Open | Yes | Yes |  |  |  |
| Question sets | Open with plan limits | Yes | Yes |  |  |  |
| Live game mode 1 | Open after smoke test | Yes | Yes |  |  |  |
| Live game mode 2 | Open after smoke test | Yes | Yes |  |  |  |
| Student portal | Open | Yes | Yes |  |  |  |
| Score / leaderboard / history | Open basic | Yes | Yes |  |  |  |
| FREE / PLUS gates | Open | Yes | Yes |  |  |  |
| Checkout | Open one provider only | Yes | Yes |  |  |  |
| AI question generation | Closed or PLUS beta only | No/Conditional | Must be enforced |  |  |  |
| AI file parse | Closed or PLUS beta only | No/Conditional | Must be enforced |  |  |  |
| OMR/OpenCV | Closed public, beta only | No/Conditional | Must be enforced |  |  |  |
| Economy advanced/audit | Hidden from general launch | No | Must be enforced |  |  |  |
| Negamon advanced | Limited to tested flows | Conditional | Must be enforced |  |  |  |
| Heavy PDF/Excel export | Limited | Conditional | Must be enforced |  |  |  |
| School Pro self-serve | Contact-only | No | Yes |  |  |  |
| Marketplace/add-ons | Closed | No | Yes |  |  |  |

### 1.2 FREE / PLUS Limit Matrix

Source of truth: `src/constants/plan-limits.ts`

| Capability | FREE value | PLUS value | API route / enforcement point | UI messaging status | Verified by | Status |
| --- | ---: | ---: | --- | --- | --- | --- |
| Max classrooms |  |  | `src/app/api/classrooms/route.ts` |  |  |  |
| Max question sets |  |  | `src/app/api/sets/route.ts` |  |  |  |
| Max questions per set |  |  | `src/app/api/sets/[id]/route.ts` |  |  |  |
| Max live players |  |  | `server.ts`, socket handlers |  |  |  |
| AI question generation |  |  | `src/app/api/ai/generate-questions/route.ts` |  |  |  |
| AI file parse |  |  | `src/app/api/ai/parse-file/route.ts` |  |  |  |
| OMR scans/month |  |  | `src/app/api/omr/**` |  |  |  |
| Negamon species |  |  | `src/app/api/classrooms/[id]/gamification-settings/route.ts` |  |  |  |

### 1.3 Scope Risks

| Risk | Impact | Decision | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `planStatus` / `planExpiry` not fully enforced in all quota logic | Expired PLUS may retain access if `plan` remains PLUS |  | Ensure billing downgrade/sync is verified |  |  |
| Feature hidden in UI but API still open | Users can call closed feature manually |  | Server-side gate required |  |  |
| Pricing page promises unready feature | Support and refund risk |  | Review pricing copy before launch |  |  |

## 2. Production Environment Checklist

เป้าหมาย: เตรียม env สำหรับ Render โดยไม่ใช้ค่า dev, localhost หรือ placeholder

### 2.1 Core Env

| Env key | Required | Build/runtime | Expected production value type | Stored in | Owner | Status | Evidence / notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Runtime/build | MongoDB production URI | Render env |  |  | Do not paste secret here |
| `AUTH_SECRET` | Yes | Runtime | Strong random secret | Render env |  |  |  |
| `NEXTAUTH_SECRET` | Yes | Runtime | Same strength as auth secret | Render env |  |  |  |
| `NEXTAUTH_URL` | Yes | Runtime | `https://your-domain` | Render env |  |  |  |
| `NEXT_PUBLIC_APP_URL` | Yes | Build/runtime | `https://your-domain` | Render env |  |  |  |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Build/runtime | `https://your-domain` | Render env |  |  |  |
| `SOCKET_IO_CORS_ORIGIN` | Yes | Runtime | Exact production origin | Render env |  |  | Must not be `*` |
| `AUTH_TRUST_HOST` | Yes | Runtime | `true` | Render env |  |  |  |
| `ADMIN_SECRET` | Yes for bootstrap | Runtime | Strong random secret | Render env |  |  | Rotate/remove after bootstrap if possible |
| `RATE_LIMIT_STORE` | Yes | Runtime | `auto` | Render env |  |  |  |
| `AUDIT_LOG_SINK` | Yes | Runtime | `auto` or `both` | Render env |  |  |  |
| `HEALTHCHECK_DB_TIMEOUT_MS` | Yes | Runtime | `3000` | Render env |  |  |  |

### 2.2 Payment Env

Choose one provider first.

| Provider | Env key | Required when selected | Stored in | Owner | Status | Evidence / notes |
| --- | --- | --- | --- | --- | --- | --- |
| Stripe | `STRIPE_SECRET_KEY` | Yes | Render env |  |  | Do not paste secret |
| Stripe | `STRIPE_WEBHOOK_SECRET` | Yes | Render env |  |  |  |
| Stripe | `STRIPE_PRICE_PLUS_MONTHLY` | Yes | Render env |  |  |  |
| Stripe | `STRIPE_PRICE_PLUS_YEARLY` | Yes | Render env |  |  |  |
| Omise | `BILLING_THAI_PROVIDER=omise` | Yes | Render env |  |  | Must not be `mock` |
| Omise | `OMISE_SECRET_KEY` | Yes | Render env |  |  | Do not paste secret |
| Omise | `NEXT_PUBLIC_OMISE_PUBLIC_KEY` | Yes | Render env |  |  | Public key ok, still avoid accidental test/live mix |
| Omise | `OMISE_PLUS_MONTHLY_SATANG` | Yes | Render env |  |  |  |
| Omise | `OMISE_PLUS_YEARLY_SATANG` | Yes | Render env |  |  |  |

### 2.3 Render Deployment Evidence

| Check | Expected | Actual / evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| Region | Singapore or closest available |  |  |  |
| Build command | `NPM_CONFIG_PRODUCTION=false npm ci && npm run build` |  |  |  |
| Start command | `npm run start` |  |  |  |
| Health check path | `/api/ready` |  |  |  |
| Production URL | custom domain or Render URL |  |  |  |
| SSL | active |  |  |  |
| `/api/health` | 200 |  |  |  |
| `/api/ready` | 200 |  |  |  |
| Socket.IO CORS | exact domain |  |  |  |

## 3. MongoDB Production Checklist

เป้าหมาย: production database ต้องแยกจาก dev และมี backup/restore ที่ทำได้จริง

### 3.1 MongoDB Setup

| Item | Expected | Actual / evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| Atlas project | Separate production project or clearly separated cluster |  |  |  |
| Cluster tier | Shared/Flex for soft launch or M10+ for stronger production |  |  |  |
| Database name | Production-specific name |  |  |  |
| Database user | Dedicated production user |  |  |  |
| Network access | Render can connect |  |  |  |
| Dev access | Restricted |  |  |  |
| Backup | Enabled or scheduled export documented |  |  |  |
| Restore drill | Tested into non-production DB |  |  |  |

### 3.2 Index / Setup Evidence

| Setup item | Command / source | Environment | Result | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Prisma schema push | `npx prisma db push` | production/staging |  |  |  |
| Operational indexes | server startup / `src/lib/ops/mongo-admin.ts` | production/staging |  |  |  |
| Economy ledger indexes | script if used | production/staging |  |  |  |
| Negamon reward indexes | script if used | production/staging |  |  |  |
| Backup restore drill | Atlas restore/export process | non-production |  |  |  |

### 3.3 DB Risk Log

| Risk | Evidence | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- |
| Production app points to dev DB |  | Verify database name and Atlas project |  |  |
| Backup not enabled |  | Enable Atlas backup or export schedule |  |  |
| Slow query during live game |  | Capture Atlas metrics during load test |  |  |
| Restore untested |  | Run restore drill before pilot |  |  |

## 4. Payment Smoke Evidence

เป้าหมาย: ถ้าเปิดขาย PLUS ต้องพิสูจน์ว่า payment สำเร็จ, fail, cancel และ duplicate webhook ถูกต้อง

Selected provider:

- Provider:
- Test mode or live mode:
- Dashboard URL:
- Webhook URL:
- Owner:
- Date:

### 4.1 Checkout Evidence

| Scenario | Expected result | Actual result | Evidence link / screenshot / log | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Start monthly checkout | Redirect/payment session created |  |  |  |  |
| Start yearly checkout | Redirect/payment session created |  |  |  |  |
| Checkout success | User returns to app |  |  |  |  |
| Checkout cancel | No entitlement granted |  |  |  |  |
| Checkout fail/expired | No entitlement granted |  |  |  |  |
| Session refresh | UI sees PLUS after payment |  |  |  |  |

### 4.2 Webhook Evidence

| Scenario | Expected result | Actual result | Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Webhook success | PLUS entitlement granted |  |  |  |  |
| Duplicate webhook | No duplicate entitlement |  |  |  |  |
| Failed/unpaid webhook | No PLUS entitlement |  |  |  |  |
| Subscription cancel/delete | Plan/status updates correctly |  |  |  |  |
| Provider dashboard event replay | Idempotent response |  |  |  |  |

### 4.3 Manual Entitlement Procedure

Use only after confirming payment state in provider dashboard.

| Step | Detail | Owner | Status |
| --- | --- | --- | --- |
| Confirm payment in provider dashboard |  |  |  |
| Record provider event/charge/subscription ID |  |  |  |
| Apply entitlement manually through approved admin path |  |  |  |
| Confirm user session/UI sees updated plan |  |  |  |
| Record incident note and root cause |  |  |  |

## 5. Build, Test, and Error Evidence

เป้าหมาย: มีหลักฐานว่า code พร้อม deploy และ core journey ไม่เจอ blocking error

### 5.1 Automated Checks

| Command | Expected | Result | Date/time | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `npm run check:phase1` | Pass |  |  |  |  |
| `npm audit --omit=dev` | 0 vulnerabilities |  |  |  |  |
| `npm run check:i18n` | Pass |  |  |  |  |
| `npm run test:unit` | Pass |  |  |  |  |
| `npm run build` | Pass |  |  |  |  |
| `npm run smoke:build` | Pass |  |  |  |  |

### 5.2 Manual Core Journey Evidence

Run at least twice.

| Flow | Round 1 result | Round 2 result | Browser/device | Error/log notes | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Register teacher |  |  |  |  |  |  |
| Login teacher |  |  |  |  |  |  |
| Open dashboard |  |  |  |  |  |  |
| Create classroom |  |  |  |  |  |  |
| Add student |  |  |  |  |  |  |
| Create question set |  |  |  |  |  |  |
| Host live game |  |  |  |  |  |  |
| Student joins |  |  |  |  |  |  |
| Finish game |  |  |  |  |  |  |
| Verify score/history |  |  |  |  |  |  |
| Start checkout |  |  |  |  |  |  |
| Upgrade result |  |  |  |  |  |  |

### 5.3 Error Log

| Error source | Error | Repro steps | Severity | Fix / mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Browser console |  |  |  |  |  |  |
| Server log |  |  |  |  |  |  |
| API response |  |  |  |  |  |  |
| Payment provider |  |  |  |  |  |  |
| Render runtime |  |  |  |  |  |  |

## 6. Security Evidence

เป้าหมาย: เก็บหลักฐานว่าไม่มี critical auth/ownership/payment/secret issue ก่อนเปิด pilot

### 6.1 Auth and RBAC

| Check | Expected | Evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| `/dashboard` blocks `STUDENT` | Student cannot access teacher dashboard |  |  |  |
| `/admin` requires `ADMIN` | Non-admin blocked |  |  |  |
| Credential login rate limited | Rate limit active in production |  |  |  |
| Session includes role/plan/status | Correct after login and upgrade |  |  |  |
| Google OAuth callback | Production domain only |  |  |  |

### 6.2 API Ownership

| API area | Expected ownership rule | Evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| Classroom read/write | `teacherId === session.user.id` or admin policy |  |  |  |
| Student-code routes | Student only sees own/class data |  |  |  |
| Payment start routes | Teacher/admin only |  |  |  |
| Admin mutations | Admin only |  |  |  |
| Socket host actions | Authenticated host and resource access check |  |  |  |

### 6.3 Secret and Browser Safety

| Check | Expected | Evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| No secrets in repo | No real secret committed |  |  |  |
| No secrets in client bundle | Secret keys server-only |  |  |  |
| Socket CORS | Exact production origin |  |  |  |
| Upload/import size/type | Restricted |  |  |  |
| Payment webhook | Verified and idempotent |  |  |  |

## 7. Capacity and Load Evidence

เป้าหมาย: รู้ตัวเลขรองรับเบื้องต้นก่อน pilot และมีหลักฐานว่าไม่ OOM/restart

### 7.1 HTTP Load Smoke

| Scenario | Command | Expected | Actual p95 | Failures | Date/time | Owner | Status |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| Health 30 users | `PHASE1_PATH=/api/health PHASE1_CONCURRENCY=30 PHASE1_REQUESTS=120 npm run load:phase1:http` | 0 failures |  |  |  |  |  |
| Ready 30 users | `PHASE1_PATH=/api/ready PHASE1_CONCURRENCY=30 PHASE1_REQUESTS=120 npm run load:phase1:http` | 0 failures |  |  |  |  |  |
| Health 100 users | `PHASE1_PATH=/api/health PHASE1_CONCURRENCY=100 PHASE1_REQUESTS=500 npm run load:phase1:http` | 0 failures |  |  |  |  |  |

### 7.2 Live Classroom Load

| Scenario | Teachers | Students | Duration | Game mode | Socket disconnects | Node memory max | Mongo latency | 4xx/5xx | Result | Owner |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 teacher + 30 students | 1 | 30 | 10 min |  |  |  |  |  |  |  |
| 3 teachers + 100 students | 3 | 100 | 10 min |  |  |  |  |  |  |  |
| Dashboard/history after game | 5-10 | N/A | 5 min | N/A | N/A |  |  |  |  |  |
| Payment during live game | 1+ | 30+ | During game |  |  |  |  |  |  |  |
| Student refresh/reconnect | 1 | 30 | During game |  |  |  |  |  |  |  |

### 7.3 Capacity Decision

| Decision item | Threshold | Actual | Go/No-Go | Notes |
| --- | --- | --- | --- | --- |
| No OOM/restart | Required |  |  |  |
| API p95 usable | Required |  |  |  |
| Socket stable | Required |  |  |  |
| No data loss/duplicate reward | Required |  |  |  |
| Mongo latency acceptable | Required |  |  |  |

## 8. Monitoring, Backup, Incident, and Rollback

เป้าหมาย: เมื่อเกิดปัญหา ต้องรู้ว่าใครดูอะไร และย้อนกลับอย่างไร

### 8.1 Owners

| Role | Name/contact | Responsibility | Backup owner |
| --- | --- | --- | --- |
| Incident owner |  | Decide pause/rollback/communication |  |
| Technical owner |  | Render, logs, deploy, DB |  |
| Payment owner |  | Provider dashboard, webhook, refund/contact |  |
| Support owner |  | Teacher communication |  |
| Data owner |  | Backup, restore, data repair |  |

### 8.2 Monitoring

| Signal | Tool/source | Alert threshold | Owner | Status |
| --- | --- | --- | --- | --- |
| `/api/ready` uptime | Uptime monitor | Non-200 or timeout |  |  |
| Render runtime logs | Render | API 500 spikes, restart, OOM |  |  |
| MongoDB metrics | Atlas | latency/storage/connection spike |  |  |
| Payment webhook errors | Provider logs/app logs | Any failed paid event |  |  |
| Active usage | App/admin/manual count | Unexpected spike/drop |  |  |

### 8.3 Incident Playbooks

| Incident | First action | Evidence to capture | Recovery action | Owner |
| --- | --- | --- | --- | --- |
| Payment webhook fail | Pause checkout if needed | Provider event ID, logs | Verify payment, manual entitlement if approved |  |
| MongoDB down | Show maintenance/friendly error | Atlas status, app logs | Restore service, avoid duplicate writes |  |
| Socket unstable | Limit live games | Render logs, disconnect count | Restart if memory/socket unhealthy |  |
| Auth/domain issue | Check env/domain/secrets | Auth logs, provider config | Rollback or fix env |  |
| Data corruption | Freeze affected write path | Snapshot before repair | Repair from backup/staging-tested script |  |

### 8.4 Rollback Checklist

| Step | Detail | Owner | Status |
| --- | --- | --- | --- |
| Identify regression | Code/payment/data/socket/auth |  |  |
| Capture logs | Render/provider/Atlas before changes |  |  |
| Roll back Render deploy | Previous known-good deploy |  |  |
| Check `/api/ready` | Must return 200 |  |  |
| Smoke login/dashboard/student portal | Must pass |  |  |
| Communicate to pilot teachers | Explain impact and next step |  |  |

## 9. Pilot Teacher Sheet and Go/No-Go

เป้าหมาย: เปิดใช้งานกับครู 3-5 คนก่อน แล้วใช้ feedback และหลักฐานระบบตัดสินขยายหรือหยุด

### 9.1 Pilot Teachers

| Teacher | Contact | School/level | Students | Device/browser | Projector? | Pilot date | Support channel | Status |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |

### 9.2 Teacher Script Result

| Teacher | Create account/login | Create classroom | Add students | Create question set | Host game | Students join | Review result | Payment tested | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |

### 9.3 Feedback Form

| Teacher | Setup time | Join success rate | Game success | Score correctness | Confusion point | Missing feature | Blocker severity | Follow-up owner |
| --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |

### 9.4 Go/No-Go Decision Log

Date:

Decision: Go / No-Go / Limited Pilot Extension

Evidence:

- Build/test:
- Security:
- Payment:
- Capacity:
- Monitoring/rollback:
- Pilot feedback:

Required fixes before expanding:

- 

Owner:

Next review date:

## Final Checklist Before Phase 1 Launch

| Output | Required | Owner | Status | Link / evidence |
| --- | --- | --- | --- | --- |
| Phase 1 Scope Matrix | Yes |  |  |  |
| Production Env Checklist | Yes |  |  |  |
| MongoDB Production Checklist | Yes |  |  |  |
| Payment Smoke Evidence | If paid plan enabled |  |  |  |
| Build/Test/Error Evidence | Yes |  |  |  |
| Security Audit Evidence | Yes |  |  |  |
| Capacity Test Result | Yes |  |  |  |
| Monitoring and Rollback Runbook | Yes |  |  |  |
| Pilot Feedback Sheet | Yes |  |  |  |
| Go/No-Go Decision Log | Yes |  |  |  |
