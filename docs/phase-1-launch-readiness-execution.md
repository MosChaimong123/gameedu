# Phase 1 Launch Readiness Execution

เอกสารนี้เป็นรายการปฏิบัติสำหรับเฟส 1 จากแผน
`.cursor/plans/phase_1_launch_readiness_cb3ee3f1.plan.md` โดยไม่แทนที่ไฟล์แผนหลัก

## 1. MVP Scope และ Feature Gates

### เปิดใน Phase 1

| Area | Phase 1 decision | Source of truth |
| --- | --- | --- |
| Auth | เปิด credentials login และเปิด Google เฉพาะเมื่อตั้ง OAuth production แล้ว | `src/auth.ts`, `src/auth.config.ts` |
| Teacher dashboard | เปิด | `src/app/dashboard/**` |
| Classroom management | เปิด | `src/app/api/classrooms/**` |
| Student code portal | เปิด | `src/app/api/student/[code]/**`, `src/components/student/**` |
| Question sets | เปิดแบบจำกัดตาม plan | `src/app/api/sets/**`, `src/constants/plan-limits.ts` |
| Live games | เปิดเฉพาะโหมดที่ smoke test ผ่าน | `server.ts`, `src/lib/socket/**` |
| FREE/PLUS limits | เปิด | `src/lib/plan/plan-access.ts`, `src/constants/plan-limits.ts` |
| Payment | เปิด 1 provider ก่อน | `src/app/api/billing/**`, `src/app/api/webhooks/**` |
| Health/readiness | เปิด | `src/app/api/health/route.ts`, `src/app/api/ready/route.ts` |

### ปิดหรือจำกัดใน Phase 1

| Area | Phase 1 decision | Reason |
| --- | --- | --- |
| AI question generation | ปิดหรือเปิดเฉพาะ PLUS พร้อม quota | คุมต้นทุน Gemini และ abuse |
| AI file parse | ปิดหรือเปิดเฉพาะ PLUS พร้อม quota | คุมต้นทุนและไฟล์เสี่ยง |
| OMR/OpenCV | ปิด public launch หรือ beta เฉพาะผู้ทดสอบ | ต้องทดสอบ device จริง |
| Economy advanced/audit | ไม่แสดงเป็น feature หลักให้ครูทั่วไป | ลด UX complexity |
| Negamon advanced | เปิดเฉพาะส่วนที่เสถียร | ลด balancing/support risk |
| Heavy PDF/Excel export | จำกัดขนาด/จำนวน | ลด memory และ timeout |
| School Pro self-serve | contact-only | ยังไม่มี organization model |
| Marketplace/add-ons | ปิด | Phase 4 |

### Plan Gate Matrix

| Capability | FREE | PLUS | Phase 1 note |
| --- | ---: | ---: | --- |
| Classrooms | `PLAN_LIMITS.FREE.maxClassrooms` | `PLAN_LIMITS.PLUS.maxClassrooms` | API ต้อง enforce server-side |
| Question sets | `PLAN_LIMITS.FREE.maxQuestionSets` | `PLAN_LIMITS.PLUS.maxQuestionSets` | มี enforcement ใน set routes |
| Questions per set | `PLAN_LIMITS.FREE.maxQuestionsPerSet` | `PLAN_LIMITS.PLUS.maxQuestionsPerSet` | ตรวจตอน save |
| Live players | `PLAN_LIMITS.FREE.maxLiveGamePlayers` | `PLAN_LIMITS.PLUS.maxLiveGamePlayers` | Socket host path ต้อง enforce |
| AI generation | false | true | สำหรับ Phase 1 แนะนำปิดไว้จนมี quota/cost monitor |
| OMR monthly | จำกัด | สูงกว่า | แนะนำไม่โปรโมต public launch |
| Negamon species | จำกัด | สูงกว่า | เปิดเฉพาะ flow ที่ test ผ่าน |

Known gap: `getLimitsForUser()` ใช้ `plan` เป็นหลัก ยังไม่ได้ enforce `planStatus`/`planExpiry` ใน quota logic โดยตรง จึงต้องระวังไม่ให้ user ที่หมดอายุยังมี `plan: "PLUS"` ค้างใน production

## 2. Deployment และ Environment Checklist

### Render

- `render.yaml` ใช้ `runtime: node`, Node 20 และ region `singapore`
- `buildCommand` ต้องตรงกับ production: `NPM_CONFIG_PRODUCTION=false npm ci && npm run build`
- `startCommand` ต้องเป็น `npm run start`
- `healthCheckPath` ต้องเป็น `/api/ready`
- ถ้าใช้ plan `free` ใน blueprint ให้ปรับเป็น paid plan ก่อนรับเงินจริง เพราะ Socket/Next.js production ไม่เหมาะกับ sleep/cold start

### Environment Variables

Required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `SOCKET_IO_CORS_ORIGIN`
- `AUTH_TRUST_HOST=true`
- `ADMIN_SECRET`
- `RATE_LIMIT_STORE=auto`
- `AUDIT_LOG_SINK=auto`
- `HEALTHCHECK_DB_TIMEOUT_MS=3000`

Payment, choose one set first:

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_PLUS_YEARLY`
- Omise: `BILLING_THAI_PROVIDER=omise`, `OMISE_SECRET_KEY`, `NEXT_PUBLIC_OMISE_PUBLIC_KEY`, `OMISE_PLUS_MONTHLY_SATANG`, `OMISE_PLUS_YEARLY_SATANG`

Must not use in production:

- `BILLING_THAI_PROVIDER=mock`
- placeholder secrets from `.env.example`
- dev MongoDB
- localhost callback URLs

## 3. Error Audit Checklist

Run locally before deploy:

```bash
npm run check:phase1
npm run check:i18n
npm run test:unit
npm run build
npm run smoke:build
```

Smoke test manually:

1. Register/login as teacher
2. Create classroom
3. Add student
4. Create question set
5. Host live game
6. Join as student using code/link
7. Finish game and verify score/history
8. Start checkout
9. Complete payment test
10. Confirm plan/session refresh

Errors to fail launch:

- API 500 in core journey
- payment grants entitlement without verified webhook/retrieve
- duplicate webhook gives duplicate entitlement
- student can access another student/classroom data
- Render restart/OOM under basic use
- `/api/ready` fails after deploy

## 4. Security Audit Checklist

### Auth and RBAC

- `/dashboard` must block `STUDENT`
- `/admin` must require `ADMIN`
- credential login rate limit must use Mongo in production through `RATE_LIMIT_STORE=auto`
- `AUTH_SECRET` and `NEXTAUTH_SECRET` must be strong and consistent
- Google OAuth production callback must match final domain

### API Ownership

Every teacher API must use one of these patterns:

- `auth()` plus `teacherId: session.user.id`
- shared access helper from `src/lib/authorization/resource-access.ts`
- explicit admin role check
- explicit student code flow that limits data to that student/classroom

### Student Code Threat Model

- Treat login code as bearer access for student-facing routes
- Codes must be hard to guess
- Brute force must be rate limited
- Support process must allow regenerating a compromised student code

### Socket/Game Security

- Host actions require NextAuth user from socket handshake
- Player joins rely on PIN/nickname for non-Negamon flows; treat PIN as bearer secret
- `SOCKET_IO_CORS_ORIGIN` must be explicit in production

## 5. Payment Readiness

Choose one provider first. Do not open both Stripe and Omise until one is proven stable.

### Stripe smoke

- Teacher monthly checkout success
- Teacher yearly checkout success
- Cancel checkout
- `checkout.session.completed` grants PLUS
- `customer.subscription.deleted` downgrades correctly
- replay same webhook returns duplicate-safe result

### Omise smoke

- PromptPay start route creates charge
- return/reconcile grants PLUS only after paid charge verify
- webhook `charge.complete` grants PLUS
- duplicate charge/webhook is idempotent
- unpaid/expired charge does not grant PLUS

## 6. Capacity Test Plan

Targets for Phase 1:

- 30 students, 1 teacher, 10-minute live game
- 100 students, 3 teachers, parallel sessions
- 5-10 teachers opening dashboard/history after games
- payment flow during live sessions
- student refresh/reconnect during game

Metrics:

- API p95 latency
- Socket disconnect rate
- Node memory growth
- Render restart/OOM
- MongoDB query latency
- 4xx/5xx rate

Go threshold:

- No OOM
- no unexplained restart
- no data loss or duplicate score/reward
- p95 usable for classroom flow
- socket reconnect does not break class activity

## 7. Monitoring, Backup, and Rollback

Minimum launch monitoring:

- Render logs
- `/api/ready` uptime monitor
- payment webhook error alerts
- MongoDB Atlas metrics
- daily count of active teachers, games hosted, checkout started/completed

Backup/restore:

- Enable Atlas backup if tier supports it
- Document restore drill
- Export/backup before risky production fixes

Rollback:

- Keep previous Render deploy available
- Roll back app first for code regressions
- Disable payment/AI/game mode if incident is isolated
- Freeze write path if data corruption is suspected

## 8. Pilot Go/No-Go

Pilot group:

- 3-5 teachers
- 1-2 real classroom sessions each
- support via Line/email
- collect blocker list after every session

Go if:

- core journey passes twice
- payment path verified
- critical security checklist passes
- load target passes
- there is a rollback process

No-Go if:

- dev/mock payment is enabled
- student/teacher data isolation fails
- webhook grants entitlement unsafely
- production deploy restarts or OOMs in basic scenarios
- no support/refund/privacy path exists
