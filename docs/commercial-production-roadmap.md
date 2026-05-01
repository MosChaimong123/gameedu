# GameEdu Commercial Production Roadmap

เอกสารนี้เป็นแผนระยะยาวสำหรับนำ GameEdu ขึ้นใช้งานจริงบนเว็บและต่อยอดเป็นระบบหารายได้ เอกสารนี้ตั้งใจให้ AI coding agent และนักพัฒนาคนถัดไปใช้เป็นแผนทำงานต่อได้ทันที

## เป้าหมายหลัก

GameEdu ควรเริ่มขายจากแกนที่แข็งแรงที่สุดก่อน:

- Classroom management
- Student login code / student portal
- Live classroom games
- Negamon progression
- Economy / shop / check-in / quests
- Basic analytics
- Subscription plan limits

ระบบที่ซับซ้อนกว่า เช่น OMR, AI question generation, school admin, premium assets และ marketplace ควรถูกวางเป็น Pro หรือ add-on หลังระบบหลักนิ่งแล้ว

## หลักการทำงานสำหรับ Agent

ทุกงาน production/commercial ต้องยึดกฎนี้:

1. อ่าน domain ที่เกี่ยวข้องก่อนแก้โค้ด
2. อย่าใส่ business logic ก้อนใหญ่ใน component หรือ route handler
3. ถ้าเป็น command/write flow ให้ทำผ่าน service ใน `src/lib/services/**` หรือ domain lib เช่น `src/lib/negamon/**`
4. ทุก API ที่เกี่ยวกับข้อมูลห้องเรียนต้องมี ownership check
5. ทุก flow เงิน, EXP, gold, reward, plan ต้องมี idempotency หรือ audit trail
6. ทุก phase ต้องปิดด้วย verification ที่ระบุไว้ในเอกสารนี้

ไฟล์อ้างอิงสำคัญ:

- `src/app`
- `src/app/api`
- `src/components`
- `src/lib/services`
- `src/lib/negamon`
- `src/lib/billing`
- `src/lib/security`
- `prisma/schema.prisma`
- `docs/production-readiness-runbook.md`
- `docs/phase-1-production-readiness-status.md`
- `docs/operational-safety-contract.md`
- `docs/security-pr-review-checklist.md`

## Phase 1: ก่อนอัปเว็บจริง และค่าใช้จ่ายที่ต้องเตรียม

### เป้าหมาย

ทำให้ระบบพร้อม deploy แบบ production beta ที่ปลอดภัยพอสำหรับผู้ใช้จริงกลุ่มเล็ก โดยยังไม่เน้น scale ใหญ่

### ค่าใช้จ่ายโดยประมาณต่อเดือน

ตัวเลขนี้เป็นประมาณการเริ่มต้นสำหรับตลาดไทยและทีมเล็ก:

| รายการ | ช่วงเริ่มต้น | หมายเหตุ |
| --- | ---: | --- |
| Domain | 300-1,000 บาทต่อปี | เช่น `.com`, `.app`, `.co` |
| Hosting app | 0-700 บาท/เดือน | Render/Railway/Fly/Vercel เริ่ม free ได้ แต่ควรมี paid tier เมื่อรับเงินจริง |
| MongoDB Atlas | 0-900 บาท/เดือน | เริ่ม M0/M2 ได้ แต่ production ควรมี backup |
| File/image storage | 0-300 บาท/เดือน | ถ้ามี upload asset/student image มากขึ้นค่อยแยกไป S3/R2 |
| Email transactional | 0-500 บาท/เดือน | Resend/Postmark/SendGrid สำหรับ auth/billing/notification |
| Error monitoring | 0-900 บาท/เดือน | Sentry free tier ได้ช่วงแรก |
| Uptime monitoring | 0-300 บาท/เดือน | Better Stack/UptimeRobot |
| Payment gateway | ไม่มีรายเดือนหรือมีเล็กน้อย | Stripe/Omise/2C2P คิดตาม transaction |
| AI API quota | 0-1,500+ บาท/เดือน | ต้องทำ quota ก่อนเปิดขาย |
| Legal/privacy docs | 0-10,000+ บาทครั้งแรก | เริ่มจาก template ได้ แต่ถ้าขายโรงเรียนควรให้ผู้รู้ตรวจ |

งบเริ่มจริงแบบประหยัด: ประมาณ 500-2,500 บาท/เดือน  
งบพร้อมขายจริงแบบมั่นใจขึ้น: ประมาณ 2,000-6,000 บาท/เดือน

### งานเทคนิคที่ต้องทำก่อน deploy จริง

#### 1. Environment และ deploy readiness

งาน:

- ตรวจ `.env.example` ให้ครบ production env
- ตั้ง `DATABASE_URL`
- ตั้ง `AUTH_SECRET` หรือ `NEXTAUTH_SECRET`
- ตั้ง `NEXTAUTH_URL` และ `NEXT_PUBLIC_APP_URL`
- ตั้ง `RATE_LIMIT_STORE=auto`
- ตั้ง `AUDIT_LOG_SINK=auto` หรือ `both`
- ตั้ง health check ของ platform ไปที่ `/api/ready`

ไฟล์ที่เกี่ยวข้อง:

- `src/lib/env.ts`
- `server.ts`
- `src/app/api/health/route.ts`
- `src/app/api/ready/route.ts`
- `docs/production-readiness-runbook.md`

เกณฑ์จบ:

- `/api/health` ผ่าน
- `/api/ready` ผ่าน
- startup log แสดง rate limit และ audit sink ถูกต้อง

#### 2. Database และ indexes

งาน:

- รัน Prisma generate
- ตรวจ schema production
- รัน index scripts สำหรับ economy ledger และ Negamon reward claim
- ตรวจ backup policy ใน MongoDB Atlas
- ทำ restore drill อย่างน้อย 1 ครั้งบน staging

ไฟล์ที่เกี่ยวข้อง:

- `prisma/schema.prisma`
- `scripts/ensure-economy-ledger-indexes.mjs`
- `scripts/ensure-negamon-live-reward-indexes.mjs`
- `docs/backup-restore-runbook.md`

เกณฑ์จบ:

- unique/index สำคัญถูกสร้างครบ
- ledger/reward claim idempotency ทำงาน
- มี backup และ restore ขั้นต่ำ

#### 3. Security และ route authorization sweep

งาน:

- ตรวจ route ใน `src/app/api/**`
- route ครูต้องเช็ค teacher ownership
- route นักเรียนต้องใช้ login code หรือ linked student account ที่ถูกต้อง
- route admin ต้องเช็ค `ADMIN`
- เพิ่ม tests ให้ route สำคัญที่ยังไม่มี

ไฟล์ที่เกี่ยวข้อง:

- `src/lib/auth-guards.ts`
- `src/lib/services/battle-read-auth.ts`
- `src/app/api`
- `docs/route-authorization-test-template.md`
- `docs/security-pr-review-checklist.md`

เกณฑ์จบ:

- ไม่มี API สำคัญที่อ่าน/เขียนข้อมูลห้องเรียนโดยไม่เช็คสิทธิ์
- มี test สำหรับ forbidden/unauthorized paths

#### 4. Billing MVP

งาน:

- ทำ checkout flow สำหรับ Plus/Pro
- ทำ webhook idempotency
- sync plan เข้า `User.plan`, `User.planStatus`, `planExpiry`
- แสดงหน้า upgrade/pricing
- enforce plan limits จริง

ไฟล์ที่เกี่ยวข้อง:

- `src/lib/billing`
- `src/app/api/billing`
- `src/app/dashboard/upgrade`
- `src/constants/pricing.ts`
- `src/constants/plan-limits.ts`
- `prisma/schema.prisma`

เกณฑ์จบ:

- payment sandbox สำเร็จ
- webhook retry ไม่ทำ plan เพี้ยน
- user ที่หมด plan ถูกลดสิทธิ์อย่างสุภาพ
- plan limits ถูกใช้จริงใน create classroom/student/AI/feature gates

#### 5. Legal และ privacy ขั้นต่ำ

งาน:

- เพิ่ม Terms of Service
- เพิ่ม Privacy Policy
- เพิ่ม Data deletion request path
- ระบุว่าเก็บข้อมูลนักเรียนอะไรบ้าง
- ระบุผู้ควบคุมข้อมูลและช่องทางติดต่อ

ตำแหน่งแนะนำ:

- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- footer หรือ settings link

เกณฑ์จบ:

- ผู้ใช้เห็น terms/privacy ก่อนสมัครหรือในหน้าสมัคร
- มีช่องทางติดต่อเพื่อลบข้อมูล

#### 6. Production QA

คำสั่งขั้นต่ำ:

```bash
npx tsc --noEmit
npm test
npx eslint .
npm run build
npm run test:e2e:negamon-reward
```

ถ้าแตะ socket/game:

- ทดสอบ host เปิดเกม
- นักเรียน join
- reconnect
- จบเกม
- reward sync

## Phase 2: หลังอัปช่วงแรก ใช้ระบบสำคัญก่อนเพื่อหารายได้

### เป้าหมาย

เปิด beta แบบเก็บเงินจริงหรือเก็บ pre-order จากครูกลุ่มเล็ก โดยเน้นระบบที่มี value สูงและ maintenance ต่ำกว่าระบบหนัก ๆ

### Feature ที่ควรเปิดขายก่อน

#### 1. Classroom + student management

เปิดให้ใช้:

- สร้างห้องเรียน
- เพิ่มนักเรียน
- student login code
- student dashboard
- basic points/history

ห้ามปล่อยถ้า:

- ครูดูข้อมูลห้องอื่นได้
- login code อ่านข้อมูลผิดคน
- ลบนักเรียนแล้วข้อมูลค้างแบบกระทบ UI หนัก

#### 2. Live quiz/game แบบหลัก

เปิดให้ใช้:

- host game
- student join
- score summary
- basic game history

ควรจำกัดก่อน:

- จำนวนผู้เล่นต่อห้องตาม plan
- จำนวนเกมต่อวันถ้าต้นทุน server สูง

#### 3. Negamon progression

เปิดให้ใช้:

- monster assignment/selection
- EXP จากงานหรือเกม
- student profile/codex
- rank/evolution display

ต้องระวัง:

- EXP duplicate
- duplicate student identity ใน live game
- reward sync retry

ไฟล์หลัก:

- `src/lib/negamon/sync-negamon-battle-rewards.ts`
- `src/components/negamon`
- `src/app/student/[code]/negamon`
- `src/app/api/classrooms/[id]/negamon`

#### 4. Economy แบบจำกัด scope

เปิดให้ใช้:

- gold ledger
- shop
- check-in
- passive gold
- teacher adjustment
- reconciliation report

ต้องระวัง:

- ทุก gold movement ต้องลง `EconomyTransaction`
- spend ต้อง atomic
- earn ที่ retry ได้ต้อง idempotent

ไฟล์หลัก:

- `src/lib/services/student-economy`
- `src/app/api/classrooms/[id]/economy`
- `src/app/api/student/[code]`
- `src/components/classroom/classroom-economy-ledger-tab.tsx`

#### 5. Pricing beta

แพ็กเริ่มต้นแนะนำ:

- Free: 1 classroom, 30 students, limited games, basic Negamon
- Plus: 3-5 classrooms, 150 students, full Negamon/economy, exports
- Pro: more classrooms/students, OMR/AI quota, advanced reports

Agent ควรดู:

- `src/constants/plan-limits.ts`
- `src/constants/pricing.ts`
- `src/lib/plan`

### งานหลัง launch 30 วันแรก

1. เก็บ feedback จากครู 5-10 คน
2. ดู error logs ทุกวัน
3. ดู payment/webhook logs ทุกวันถ้ามีการจ่ายเงินจริง
4. แก้ onboarding ที่ทำให้ครูเริ่มไม่ได้
5. ลด feature ที่ซับซ้อนเกินและยังไม่ทำเงิน
6. เพิ่ม sample classroom/demo flow

### Metrics ที่ต้องวัด

- สมัครแล้วสร้างห้องเรียนกี่ %
- สร้างห้องแล้วเพิ่มนักเรียนกี่ %
- เปิดเกมครั้งแรกกี่ %
- นักเรียน join สำเร็จกี่ %
- ครูกลับมาใช้อีกใน 7 วันกี่ %
- conversion free -> paid
- support issue ต่อครู 1 คน

### เกณฑ์จบ Phase 2

- มีครูใช้งานจริงอย่างน้อย 5-10 คน
- มี payment หรือ waitlist/pre-order อย่างน้อย 1 ช่องทาง
- flow ครูใหม่เริ่มสร้างห้อง/เปิดเกมได้ใน 3-5 นาที
- ไม่มี incident ด้านข้อมูลรั่วหรือเงิน/EXP/gold ซ้ำร้ายแรง

## Phase 3: พัฒนาให้น่าใช้ขึ้นและเหมาะกับระดับโรงเรียน

### เป้าหมาย

ยกระดับจากเครื่องมือสำหรับครูรายคนเป็นระบบที่โรงเรียนสนใจซื้อแบบรายปี

### ระบบที่ต้องเพิ่มหรือยกระดับ

#### 1. School / Organization layer

งาน:

- เพิ่ม model สำหรับ school/organization
- ผูก teacher หลายคนเข้ากับ school
- admin โรงเรียนดูภาพรวมได้
- จำกัดสิทธิ์ตาม role ในโรงเรียน

Schema ที่อาจเพิ่ม:

- `School`
- `SchoolMember`
- `SchoolInvitation`
- `SchoolBillingAccount`

จุดสำคัญ:

- ต้องไม่ทำให้ teacher เดิมพัง
- migration ต้องรองรับ user เก่าที่ไม่มี school

#### 2. School admin dashboard

งาน:

- dashboard ภาพรวมจำนวนครู ห้องเรียน นักเรียน เกมที่เล่น
- export report รายเดือน
- usage analytics
- plan/billing status ของโรงเรียน

ตำแหน่งแนะนำ:

- `src/app/school`
- `src/components/school`
- `src/lib/services/school`

#### 3. Classroom report สำหรับผู้บริหาร

งาน:

- attendance summary
- engagement summary
- points/Negamon progression summary
- export CSV/XLSX/PDF

ไฟล์ที่เกี่ยวข้อง:

- `src/lib/services/classroom-dashboard`
- `src/app/api/classrooms/[id]/economy/ledger/export`
- `src/components/classroom/AnalyticsDashboard.tsx`

#### 4. Data privacy ระดับโรงเรียน

งาน:

- data retention settings
- delete/export student data
- audit log viewer สำหรับ admin
- consent/notice wording

#### 5. Reliability สำหรับหลายห้องพร้อมกัน

งาน:

- ทดสอบ socket load เบื้องต้น
- reconnect ให้แข็งขึ้น
- host refresh recovery
- game history persistence
- reward sync retry queue ถ้าจำเป็น

ไฟล์หลัก:

- `server.ts`
- `src/lib/socket/register-game-socket-handlers.ts`
- `src/lib/game-engine/manager.ts`
- `src/lib/game-engine`

#### 6. UX สำหรับครูและนักเรียน

งาน:

- onboarding checklist
- empty states ที่บอก next action
- template ห้องเรียน/กิจกรรม
- mobile polish สำหรับ student portal
- ลดหน้าที่ซับซ้อนเกิน เช่น Economy ledger tab ให้แยก section/panel

Hotspots:

- `src/components/classroom/classroom-economy-ledger-tab.tsx`
- `src/components/negamon/BattleArena.tsx`
- `src/components/classroom/add-assignment-dialog.tsx`
- `src/app/dashboard/classrooms/[id]/page.tsx`

#### 7. Support และ operations

งาน:

- admin impersonation ห้ามทำแบบไม่ audit
- support tools สำหรับค้น user/classroom
- incident checklist
- announcement/banner system

### Pricing สำหรับโรงเรียน

ตัวอย่าง:

- School Starter: 10 ครู / 500 นักเรียน / รายปี
- School Pro: 50 ครู / 2,000 นักเรียน / reports + OMR + AI quota
- Enterprise: custom, SSO, onboarding, training

### เกณฑ์จบ Phase 3

- โรงเรียน 1 แห่งทดลองใช้ได้
- มี school admin dashboard ขั้นต่ำ
- มี report/export ที่ผู้บริหารใช้คุยต่อได้
- มี privacy/data deletion workflow
- ระบบยังผ่าน regression หลัก

## Phase 4: พัฒนาระบบเพื่อหารายได้หลายช่องทาง

### เป้าหมาย

เพิ่มรายได้จากหลายแหล่งโดยไม่ทำให้ core classroom flow หนักหรือพัง

### ช่องทางรายได้ที่ควรพิจารณา

#### 1. AI add-on

ขายเป็น quota:

- AI generate questions
- AI worksheet
- AI lesson activity suggestions
- AI rubric/feedback

งานที่ต้องทำ:

- quota ต่อ user/school
- cost tracking
- prompt safety
- retry/idempotency
- usage dashboard

ไฟล์ที่เกี่ยวข้อง:

- `src/app/api/ai`
- `src/constants/plan-limits.ts`
- `src/lib/plan`

#### 2. OMR / Exam tools add-on

ขายให้ครูหรือโรงเรียน:

- scan answer sheets
- export gradebook
- item analysis
- exam archive

ไฟล์ที่เกี่ยวข้อง:

- `src/app/dashboard/omr`
- `src/components/omr`
- `src/app/api/omr`
- `prisma/schema.prisma` models `OMRQuiz`, `OMRResult`

#### 3. Premium Negamon content

ขายเป็น:

- premium monster packs
- seasonal skins
- special battle backgrounds
- school-branded monsters

ข้อควรระวัง:

- หลีกเลี่ยง gambling/loot box กับเด็ก
- ซื้อแล้วต้องไม่กระทบ fairness ของ classroom
- ถ้าเป็น cosmetic จะปลอดภัยกว่า power advantage

ระบบที่ต้องเพิ่ม:

- asset ownership
- content catalog
- plan/add-on entitlement
- moderation ถ้ามี custom upload

#### 4. Marketplace สำหรับครู

ขาย/แบ่งรายได้:

- question sets
- classroom templates
- activity packs
- Negamon lesson packs

ระบบที่ต้องเพิ่ม:

- creator profile
- content review
- revenue share
- refund policy
- abuse/report system

#### 5. School services

รายได้แบบบริการ:

- onboarding โรงเรียน
- training ครู
- custom report
- custom deployment
- data migration

ไม่จำเป็นต้องเขียนโค้ดมากในช่วงแรก แต่ต้องมี:

- admin tools
- export/import ที่ดี
- documentation
- support process

#### 6. Parent/student companion optional

อาจขายหรือเปิดเป็น add-on:

- parent progress view
- weekly progress email
- student achievement certificate

ข้อควรระวัง:

- privacy ของนักเรียน
- school consent
- ไม่เปิดข้อมูลห้องหรือเพื่อนร่วมชั้นให้ผู้ปกครองผิดคน

### เกณฑ์จบ Phase 4

- มีรายได้มากกว่า subscription ครูอย่างน้อย 1 ช่องทาง
- มี usage/cost tracking ของ add-on
- มี entitlement system ที่บังคับสิทธิ์จริง
- มี admin report ดูรายได้/usage/support

## Technical Debt และ Risk Register

### Risk: route authorization ไม่สม่ำเสมอ

แนวทาง:

- เพิ่ม route tests ทุก endpoint สำคัญ
- ใช้ helper กลาง
- review ตาม `docs/security-pr-review-checklist.md`

### Risk: reward/gold/EXP ซ้ำจาก concurrency

แนวทาง:

- ใช้ unique idempotency key
- transaction + compare-and-set
- ledger/audit/reconciliation

### Risk: component ใหญ่เกินและแก้ยาก

แนวทาง:

- แยก container, panel, dialog, table, hooks
- ดัน logic ไป service
- เพิ่ม component tests เฉพาะ wiring สำคัญ

### Risk: billing ทำงานผิดแล้วกระทบรายได้

แนวทาง:

- webhook idempotency
- event log
- manual reconcile tool
- sandbox test

### Risk: server/socket ไม่เสถียรช่วงเล่นเกมสด

แนวทาง:

- reconnect flow
- game persistence
- load test แบบง่าย
- health/ready monitoring

### Risk: ค่า AI บาน

แนวทาง:

- quota ต่อ plan
- monthly usage cap
- prompt/result cache ถ้าเหมาะ
- admin cost dashboard

## Verification Matrix

ใช้ matrix นี้ก่อนปิดงานแต่ละ phase:

| งาน | Verification ขั้นต่ำ |
| --- | --- |
| Type/API/service | `npx tsc --noEmit`, Vitest เฉพาะ domain |
| Route auth | unauthorized/forbidden/success tests |
| UI flow | component test หรือ Playwright smoke |
| Billing | sandbox checkout + webhook retry test |
| Economy/Reward | idempotency test + ledger/reconciliation test |
| Socket/Game | host/play manual QA + integration test ถ้ามี |
| Production deploy | `/api/health`, `/api/ready`, smoke build |

## Recommended Work Order

1. Phase 1 security/deploy/billing foundation
2. Phase 2 beta monetization with core classroom, live game, Negamon, economy
3. Phase 3 school layer and reporting
4. Phase 4 add-ons and marketplace

ถ้า agent ไม่แน่ใจว่าจะหยิบงานไหนก่อน ให้เลือกงานที่ลด production risk ก่อนงานที่เพิ่ม feature ใหม่ โดยเฉพาะ auth, billing, data isolation, idempotency และ backup
