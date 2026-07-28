# 55) LINE Security, Reliability, and Product Development Plan

Status: Repository implementation complete; production rollout pending external gates
Last updated: 2026-07-27
Created: 2026-07-27
Owner: GameEdu Classroom / Platform
Priority: P0 security hardening before wider production rollout

Related documents:

- [Nong Gring LINE Assignment Roadmap](./33-nong-gring-line-assignment-roadmap.md)
- [Nong Gring LINE Simple UX Mode](./34-nong-gring-line-ux-simple-mode.md)
- [Nong Gring LINE Production Growth Plan](./35-nong-gring-line-production-growth-plan.md)
- [Nong Gring LINE Auto Reminder Simplification](./36-nong-gring-line-auto-reminder-simplification.md)

## 1. Objective

ยกระดับระบบ LINE ของ GameEdu ให้:

1. คำสั่งครูใช้ได้เฉพาะผู้มีสิทธิ์จริง
2. นักเรียนส่งและดูข้อมูลได้เฉพาะบัญชีของตนเอง
3. Webhook ตอบกลับได้เร็วและไม่ประมวลผลงานหนักซ้ำ
4. Reminder retry ได้โดยไม่ส่งซ้ำ
5. ครูและแอดมินตรวจสอบสาเหตุเมื่อระบบไม่ส่งข้อความได้
6. การตั้งค่า production แยก secret ตามหน้าที่และตรวจสอบได้
7. ระบบมี automated tests ครอบคลุม authorization, idempotency, retry และ failure recovery

## 2. Current Baseline

ความสามารถที่มีแล้ว:

- LINE webhook พร้อมตรวจ `x-line-signature`
- ผูกกลุ่ม LINE กับห้องเรียนด้วย signed token ที่หมดอายุ
- สรุปงานค้าง ทวงงาน และสร้างงานผ่านกลุ่ม
- ผูกบัญชีนักเรียนด้วยรหัส 6 หลักผ่านแชตส่วนตัว
- ดูงาน คะแนน และประวัติการส่งของนักเรียน
- ส่งคำตอบแบบข้อความผ่าน LINE
- AI ให้คะแนนเบื้องต้นโดยยังไม่บันทึกเป็นคะแนนจริง
- ครูตรวจผล LINE/AI และ export ข้อมูลได้
- Auto reminder, readiness, dry run, delivery history และ admin health
- Plan gating สำหรับ Free, Plus และ Pro
- Gold reward แบบมี idempotency key

ผลตรวจ baseline วันที่ 2026-07-27:

- LINE tests ผ่าน 18 ไฟล์ รวม 90 tests
- `npx.cmd tsc --noEmit` ผ่าน
- `npx.cmd tsc --project tsconfig.server.json --noEmit` ผ่าน
- Targeted ESLint ไม่มี error และมี warning ตัวแปรไม่ได้ใช้ 2 จุด
- ยังไม่ได้ยืนยัน end-to-end delivery กับ LINE production

## 3. Confirmed Problems

### P0 — Group teacher commands do not verify teacher identity

`processGroupTextCommand()` รับ `createdByLineUserId` แต่ไม่ได้ตรวจว่า LINE user นั้นเป็นครู เจ้าของห้อง หรือผู้ดูแล

ผลกระทบ:

- สมาชิกทั่วไปในกลุ่มสามารถสร้างงาน
- สมาชิกทั่วไปสามารถเรียกคำสั่งแก้ข้อมูลจาก legacy debt tracker
- ไม่มีหลักประกันว่าคำสั่งระดับห้องมาจากครู

### P0 — Legacy group submission can impersonate a student

คำสั่งส่งงานในกลุ่มแบบเดิมรับ `studentCode` และบันทึกงานโดยไม่ตรวจว่า LINE user ผูกกับนักเรียนคนนั้น

ผลกระทบ:

- ผู้ที่ทราบ student login code อาจส่งหรือแก้คำตอบแทนนักเรียน
- การส่งซ้ำสามารถเขียนทับคำตอบเดิมและตั้งคะแนนกลับเป็น `0`

### P1 — Failed or abandoned reminder cannot be retried

ระบบสร้าง delivery record ก่อนส่ง LINE และใช้ unique key ป้องกันรายการซ้ำ แต่รอบต่อไปมองทั้ง `pending`, `failed` และ `sent` เป็น duplicate เหมือนกัน

Failure modes:

- LINE API ล้มเหลวชั่วคราวแล้วไม่มี retry
- process หยุดหลังสร้าง `pending` แต่ก่อนส่ง ทำให้รายการค้างถาวร
- `markDeliverySent()` ล้มเหลวแล้วสถานะไม่ตรงกับการส่งจริง

### P1 — Webhook performs heavy work before returning HTTP

Webhook ประมวลผล event ทีละรายการ รวม database queries, LINE API calls และ AI grading ก่อนตอบ request

ผลกระทบ:

- latency สูง
- reply token อาจหมดอายุหรือใช้งานไม่ทัน
- LINE อาจ retry webhook และทำให้เกิดงานซ้ำ
- event หนึ่งที่ล้มเหลวทำให้ทั้ง request ตอบ 500

### P1 — Linking codes and commands have no application rate limit

รหัสเชื่อมบัญชีมี 6 หลักและอายุ 10 นาที แต่ไม่มี limit ต่อ LINE user, code หรือช่วงเวลา

ผลกระทบ:

- เดารหัสจำนวนมากได้
- spam คำสั่งที่เรียก database/AI ได้
- ไม่มี temporary lock หรือ audit signal เมื่อผิดซ้ำ

### P1 — Legacy global binding secret is still accepted

ยังรองรับคำสั่งผูกห้องด้วย shared secret ทั้งระบบ แม้มี signed expiring token แล้ว

ผลกระทบ:

- secret อาจปรากฏในประวัติแชตกลุ่ม
- secret เดียวกระทบทุกห้อง
- หมุน secret ยากและกระทบการใช้งานกว้าง

### P2 — Configuration is incomplete or coupled

Local environment มี LINE channel credentials และ binding secret แต่ขาด:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_LINE_BOT_URL` หรือ `LINE_BOT_CHAT_URL`
- `LINE_REMINDER_CRON_SECRET` แบบเฉพาะ

ปัจจุบัน cron secret สามารถ fallback ไปใช้ `ADMIN_SECRET` ซึ่งทำให้ขอบเขต secret กว้างเกินจำเป็น

### P2 — Delivery timestamps and health semantics are ambiguous

- `sentAt` ถูกกำหนดตอนสร้าง record แม้สถานะยังเป็น `pending`
- health ของ reminder job ใช้ delivery record แทน run record
- ยังแยกไม่ชัดระหว่าง “worker ทำงานแล้วแต่ไม่มี candidate” กับ “worker ไม่ได้ทำงาน”

### P2 — Legacy debt tracker increases command and security surface

คำสั่ง debt tracker ยังอยู่ใน parser และ handler แม้ไม่ใช่เส้นทางหลักของ Classroom LINE

ผลกระทบ:

- เพิ่มคำสั่ง mutation ที่สมาชิกกลุ่มเรียกได้
- ทำให้ help, tests และ authorization ซับซ้อน
- เพิ่มความเสี่ยงจาก behavior เก่าที่ไม่มี owner ชัดเจน

## 4. Security Model

### 4.1 Identity classes

กำหนด LINE actor เป็นหนึ่งในสถานะต่อไปนี้:

- `unknown`
- `linked_student`
- `verified_teacher`
- `admin`

### 4.2 Command capability matrix

| Capability | Unknown | Linked student | Verified teacher | Admin |
|---|---:|---:|---:|---:|
| Help / ping | Yes | Yes | Yes | Yes |
| ดูงาน/คะแนนของตนเอง | No | Yes | No | No |
| ส่งงานของตนเองใน direct chat | No | Yes | No | No |
| ดูสรุปรวมในกลุ่ม | No | Optional | Yes | Yes |
| ส่ง reminder | No | No | Yes | Yes |
| สร้างงาน | No | No | Yes | Yes |
| เปลี่ยน reminder settings | No | No | Yes | Yes |
| ผูก/ย้ายกลุ่มห้องเรียน | No | No | Yes | Yes |
| Legacy debt mutation | No | No | Disabled | Disabled |

### 4.3 Teacher verification design

แนวทางแนะนำ:

1. ครูลงชื่อเข้าใช้ GameEdu
2. หน้า Classroom สร้าง one-time teacher link token
3. ครูส่ง `ยืนยันครู <token>` ใน direct chat กับ bot
4. ระบบบันทึกความสัมพันธ์ `LINE user ↔ GameEdu user`
5. เมื่อใช้คำสั่งในกลุ่ม ระบบตรวจ:
   - LINE user เชื่อมกับ GameEdu user
   - user เป็น `TEACHER` หรือ `ADMIN`
   - user เป็นเจ้าของห้อง หรือผ่าน resource authorization ของห้องนั้น
   - LINE group ถูกผูกกับห้องเดียวกัน

ห้ามอนุมานสิทธิ์ครูจากการเป็นผู้เชิญ bot หรือจากการอยู่ในกลุ่มเพียงอย่างเดียว

### 4.4 Privacy defaults

- คำตอบรายบุคคลส่งเฉพาะ direct chat
- กลุ่มแสดงเฉพาะข้อมูลรวมโดยค่าเริ่มต้น
- ไม่แสดง student login code ใน audit metadata หรือข้อความตอบ
- ไม่บันทึก raw LINE message ที่มีคำตอบนักเรียนลง application log
- จำกัด audit metadata ให้มีเฉพาะ ID, action, result และ reason code

## 5. Target Architecture

แยก webhook ingestion ออกจาก command execution:

```text
LINE webhook
  -> verify signature
  -> validate and normalize event
  -> claim event idempotency key
  -> enqueue/persist event
  -> return 200 quickly

LINE event worker
  -> resolve actor
  -> authorize capability
  -> execute command
  -> send reply/push
  -> write audit and processing status
```

ถ้ายังไม่เพิ่ม queue infrastructure ในระยะแรก ให้ใช้ persistent inbox table และ worker loop ใน custom server แทน in-memory fire-and-forget

## 6. Data Model Changes

ชื่อ model เป็นข้อเสนอและปรับได้ระหว่าง implementation

### 6.1 `LineUserAccountLink`

ใช้เก็บ LINE identity ที่เชื่อมกับ GameEdu user:

- `lineUserId`
- `userId`
- `linkedAt`
- `verifiedAt`
- `revokedAt`
- `lastSeenAt`

Indexes:

- unique `lineUserId`
- index `userId`

บัญชีนักเรียนที่มีอยู่สามารถ migrate หรืออ้างถึง model นี้เพื่อลดข้อมูลซ้ำ

### 6.2 `LineWebhookEvent`

ใช้เป็น persistent inbox และ idempotency boundary:

- `webhookEventId` หรือ deterministic hash
- `eventType`
- `sourceType`
- `sourceIdHash`
- `status`: `received | processing | processed | failed | dead`
- `attemptCount`
- `availableAt`
- `lockedAt`
- `processedAt`
- `lastErrorCode`
- `lastErrorMessage`
- `createdAt`

ห้ามเก็บ raw message content หากไม่จำเป็น หากจำเป็นต้องเข้ารหัสและกำหนด retention

### 6.3 Reminder delivery lifecycle

ปรับ `LineAssignmentReminderDelivery` ให้มี:

- `status`: `pending | sending | sent | retry_wait | failed | abandoned`
- `attemptCount`
- `maxAttempts`
- `nextAttemptAt`
- `lockedAt`
- `lastAttemptAt`
- `sentAt` เป็น nullable และกำหนดเมื่อส่งสำเร็จจริง
- `failedAt`
- `errorCode`
- `errorMessage`
- `providerRequestId` ถ้า LINE SDK เปิดให้ใช้

### 6.4 `LineReminderRun`

แยก job run ออกจาก delivery:

- `triggeredBy`
- `startedAt`
- `completedAt`
- `status`
- `scannedGroupCount`
- `candidateCount`
- `sentCount`
- `retryCount`
- `failedCount`
- `skippedCount`
- `errorCode`

## 7. Phased Implementation Plan

###

Priority: P0
Goal: ปิด mutation ที่ยังไม่มี authorization โดยเร็ว

Tasks:

- [x] เพิ่ม feature flag `LINE_GROUP_MUTATIONS_ENABLED`
- [x] ค่า default เป็น `false` จนกว่า teacher verification พร้อม
- [x] ปิดคำสั่งสร้างงานผ่านกลุ่มชั่วคราว
- [x] ปิด legacy group submission ที่รับ student code
- [x] ปิด legacy debt mutation commands
- [x] ให้คำสั่งที่ถูกปิดตอบข้อความแนะนำเส้นทางเว็บหรือ direct chat
- [x] เพิ่ม audit event เมื่อมีการพยายามใช้คำสั่งที่ถูกปิด

Acceptance criteria:

- สมาชิกกลุ่มที่ไม่ยืนยันตัวตนไม่สามารถแก้ข้อมูลใด ๆ
- student direct-chat flow เดิมยังใช้งานได้
- manual send จากหน้าเว็บครูยังใช้งานได้

### Phase 1 — Teacher identity and command authorization

Priority: P0
Goal: ทุกคำสั่ง mutation ต้องผ่าน actor authorization

Tasks:

- [x] เพิ่ม teacher LINE linking flow ด้วย signed one-time token
- [x] เพิ่ม service `resolveLineActor()`
- [x] เพิ่ม policy `authorizeLineCapability()`
- [x] ตรวจ teacher ownership/resource access ต่อ classroom
- [x] บังคับ authorization ก่อนเข้า repository mutation
- [x] แยก student, teacher และ public command handlers
- [x] ป้องกันการผูก LINE user เดียวกับหลาย GameEdu users โดยไม่ revoke
- [x] เพิ่มหน้าเว็บสำหรับดูและยกเลิก LINE teacher link
- [x] เพิ่ม audit events `line.authorization.allowed/denied`

Acceptance criteria:

- นักเรียนเรียก teacher command แล้วถูกปฏิเสธ
- ครูห้อง A ไม่สามารถสร้างงานหรือทวงงานห้อง B
- ADMIN ทำงานได้ตาม policy ที่กำหนด
- การ revoke มีผลทันที

### Phase 2 — Student submission integrity

Priority: P0
Goal: นักเรียนส่งหรือแก้ได้เฉพาะงานของตนเอง

Tasks:

- [x] ลบหรือ disable parser ของ legacy group submission
- [x] รองรับ submission เฉพาะ direct chat ของ linked student
- [x] เก็บ actor LINE user ID และ linked student ID ใน submission audit
- [x] เพิ่ม optimistic concurrency หรือ submission version
- [x] ห้าม reset คะแนนครูเป็น `0` เมื่อแก้คำตอบหลังครูตรวจแล้ว
- [x] กำหนด policy การ resubmit หลัง review/deadline
- [x] แสดงสถานะ `submitted`, `resubmitted`, `locked`, `needs_review`
- [x] รักษา reward idempotency เดิม

Acceptance criteria:

- LINE user ไม่สามารถส่งงานแทน student ID อื่น
- resubmit ไม่ทำลายคะแนนที่ครูยืนยันโดยไม่แจ้งเตือน
- reward ไม่ถูกแจกซ้ำ
- มี audit trail ของ submission revisions

### Phase 3 — Link-code abuse protection

Priority: P1
Goal: จำกัดการเดารหัสและปิด race condition

Tasks:

- [x] rate limit ตาม `lineUserId`
- [x] rate limit ตาม code/hash และ global abuse threshold
- [x] temporary lock เมื่อผิดเกินกำหนด
- [x] ใช้ atomic consume โดย update เฉพาะ record ที่ `consumedAt = null` และยังไม่หมดอายุ
- [x] ถ้า atomic update ได้ 0 rows ให้ตอบว่า code ถูกใช้หรือหมดอายุ
- [x] เพิ่ม audit โดยไม่บันทึกรหัสจริง
- [x] เพิ่ม alert เมื่อ rejection rate ผิดปกติ

ค่าเริ่มต้นที่เสนอ:

- ไม่เกิน 5 ครั้งต่อ LINE user ต่อ 10 นาที
- lock 15 นาทีเมื่อผิดเกินกำหนด
- จำกัด global verification attempts ต่อ instance และต่อ source

Acceptance criteria:

- code เดียว consume สำเร็จได้ครั้งเดียวภายใต้ concurrent requests
- brute-force test ถูก block
- legitimate retry ยังใช้งานได้โดย UX ไม่สับสน

### Phase 4 — Webhook inbox and fast acknowledgment

Priority: P1
Goal: Webhook ตอบเร็วและ process event ได้อย่างน่าเชื่อถือ

Tasks:

- [x] สร้าง persistent webhook inbox
- [x] เพิ่ม deterministic event idempotency key
- [x] route ทำเฉพาะ signature verification, validation และ persist
- [x] route ตอบ 200 หลัง persist event สำเร็จ
- [x] worker claim งานด้วย lease/lock
- [x] retry transient failures ด้วย exponential backoff และ jitter
- [x] แยก permanent error ไป `dead`
- [x] เพิ่ม admin view สำหรับ failed/dead events
- [x] ไม่ retry command ที่มีผลสำเร็จแล้ว

Acceptance criteria:

- webhook route ไม่เรียก AI หรือ LINE push โดยตรง
- event เดียวส่งซ้ำจาก LINE แล้วเกิด side effect ครั้งเดียว
- worker restart แล้วทำงานต่อจาก persisted state
- event หนึ่งล้มเหลวไม่ทำให้ event อื่นเสียหาย

### Phase 5 — Reminder retry and delivery correctness

Priority: P1
Goal: ส่งซ้ำได้เมื่อควรส่ง และไม่ duplicate เมื่อส่งสำเร็จ

Tasks:

- [x] เปลี่ยน duplicate logic ให้พิจารณา status
- [x] `sent` คือ terminal success
- [x] `pending/sending` ที่ lease ยังไม่หมดถือว่ากำลังทำงาน
- [x] stale `pending/sending` กลับเข้า retry queue
- [x] `retry_wait/failed` retry ตาม attempt policy
- [x] ใช้ compare-and-set ตอน claim delivery
- [x] ตั้ง `sentAt` หลัง push สำเร็จเท่านั้น
- [x] แยก `createdAt`, `lastAttemptAt`, `sentAt`, `failedAt`
- [x] เพิ่ม manual retry สำหรับ admin/teacher ตามสิทธิ์
- [x] รวม manual และ auto send ให้ใช้ dispatch service เดียวกัน

Retry policy ที่เสนอ:

- Retry เฉพาะ timeout, network error, 429 และ 5xx
- Backoff: 1 นาที, 5 นาที, 15 นาที
- ไม่ retry 4xx ที่เกิดจาก invalid target/invalid payload
- สูงสุด 3 attempts ก่อนเป็น `failed`

Acceptance criteria:

- LINE 429/5xx ชั่วคราวแล้วส่งสำเร็จในรอบ retry
- crash หลังสร้าง record แต่ก่อน push ไม่ทำให้ reminder หาย
- concurrent cron สอง instance ไม่ส่งข้อความซ้ำ
- history แสดง attempt และเหตุผลทุกครั้ง

### Phase 6 — Configuration and secret separation

Priority: P1
Goal: production configuration ชัดเจนและ least privilege

Tasks:

- [x] บังคับ `LINE_REMINDER_CRON_SECRET` แยกจาก `ADMIN_SECRET`
- [x] เลิก fallback ไป `ADMIN_SECRET` หลัง migration window
- [ ] ตั้งค่า `LINE_REMINDER_CRON_SECRET` ใน runtime environment จริง
- [ ] ตั้งค่า `LINE_WEBHOOK_INBOX_SECRET` ใน runtime environment จริง
- [x] ลบ legacy global classroom binding command
- [ ] หมุน `LINE_CLASSROOM_BINDING_SECRET` หลังเลิก flow เก่า
- [ ] กำหนด `NEXT_PUBLIC_APP_URL`
- [ ] กำหนด `NEXT_PUBLIC_LINE_BOT_URL` หรือ `LINE_BOT_CHAT_URL`
- [x] ตรวจ URL scheme/host ตอน startup
- [x] เพิ่ม structured configuration readiness
- [x] ไม่แสดง secret value ใน health, logs หรือ API response

Acceptance criteria:

- production health ผ่าน required checks
- cron credential ใช้กับ cron route เท่านั้น
- การผูกห้องใช้ signed expiring token เท่านั้น
- student dashboard มีปุ่มเปิด LINE chat และลิงก์กลับ GameEdu ถูกต้อง

### Phase 7 — Observability and operator workflow

Priority: P2
Goal: ตอบคำถาม “ทำไมไม่ส่ง” ได้จากหน้าเดียว

Tasks:

- [x] แยก worker run health ออกจาก delivery health
- [x] แสดง last successful run และ last attempted run
- [x] แสดง next run และ scheduler source
- [x] แสดงจำนวน pending/retrying/failed/dead
- [x] เพิ่ม stable error codes
- [x] เพิ่ม filter ตาม classroom, assignment, status และเวลา
- [x] เพิ่ม alert สำหรับ webhook failure, worker stale และ LINE rate limit
- [x] เพิ่ม retention policy สำหรับ audit และ delivery logs

Suggested error codes:

- `LINE_AUTHORIZATION_DENIED`
- `LINE_LINK_RATE_LIMITED`
- `LINE_INVALID_TARGET`
- `LINE_PROVIDER_RATE_LIMITED`
- `LINE_PROVIDER_UNAVAILABLE`
- `LINE_WEBHOOK_DUPLICATE`
- `LINE_DELIVERY_STALE_LOCK`
- `LINE_DELIVERY_MAX_ATTEMPTS`
- `LINE_CONFIG_MISSING`

Acceptance criteria:

- แอดมินรู้ได้ว่า webhook และ worker ทำงานล่าสุดเมื่อใด
- ครูเห็น blocker ที่แก้ได้เอง
- error response และ audit ใช้ code เดียวกัน

### Phase 8 — Command and UX simplification

Priority: P2
Goal: ลดคำสั่งที่ต้องจำและลดพื้นที่ความเสี่ยง

Tasks:

- [x] ลบ legacy debt commands และ repository โดยเก็บ schema/data เดิมไว้สำหรับ rollback
- [x] แยก help ตาม actor และ source
- [x] ใช้ rich menu หรือ postback สำหรับคำสั่งหลัก
- [x] direct chat แสดงงานพร้อม short code และปุ่ม
- [x] teacher group ใช้เฉพาะคำสั่ง read-only หรือ verified mutation
- [x] เพิ่มข้อความปฏิเสธที่บอกวิธียืนยันตัวตน
- [x] เพิ่มสถานะ submission/review ที่นักเรียนเข้าใจง่าย

Acceptance criteria:

- help ไม่แสดงคำสั่งที่ actor ใช้ไม่ได้
- flow หลักใช้งานได้โดยไม่ต้องจำ syntax ยาว
- ไม่มี legacy mutation handler ที่ไม่ผ่าน authorization

### Phase 9 — Production validation and staged rollout

Priority: P1 release gate
Goal: เปิดใช้งานอย่างควบคุมได้

Rollout:

1. เปิดเฉพาะทีมงาน/internal classroom
2. เปิด read-only commands
3. เปิด student direct-chat submission
4. เปิด verified teacher group mutations
5. เปิด auto reminder สำหรับห้อง pilot
6. ขยายตาม error rate และ delivery success

Tasks:

- [ ] deploy staging ให้ `prisma generate` และ `prisma db push` สร้าง inbox/delivery schema
- [ ] สร้าง test LINE OA/channel สำหรับ staging
- [ ] ทดสอบ webhook signature จริง
- [ ] ทดสอบ join/leave/direct/group events
- [x] ทดสอบ provider 429/5xx ด้วย fault injection
- [x] ทดสอบ concurrent cron และ worker restart
- [x] ทดสอบ revoke teacher/student link
- [ ] ทำ manual QA บนอุปกรณ์จริง
- [x] เตรียม rollback flags

### Rollout gates ที่ยังต้องทำภายนอก repository

งานโค้ด Phase 0–8 เสร็จแล้ว ส่วนงานที่เหลือ 10 รายการต้องใช้สิทธิ์หรือสภาพแวดล้อมจริง:

- ตั้ง `LINE_REMINDER_CRON_SECRET` เป็น secret เฉพาะงาน
- ตั้ง `LINE_WEBHOOK_INBOX_SECRET` ความยาวอย่างน้อย 32 ตัวอักษร
- หมุน `LINE_CLASSROOM_BINDING_SECRET` ให้ยาวอย่างน้อย 32 ตัวอักษร
- ตั้ง `NEXT_PUBLIC_APP_URL` เป็น public HTTPS URL
- ตั้ง `NEXT_PUBLIC_LINE_BOT_URL` เป็น LINE OA chat URL
- deploy staging ให้ pre-deploy สร้าง Prisma client/schema ใหม่
- สร้าง test LINE OA/channel สำหรับ staging
- ทดสอบ signature และ redelivery ด้วย LINE provider จริง
- ทดสอบ join/leave/direct/group event บน staging
- ทำ manual QA บนอุปกรณ์จริง

ตรวจโดยไม่แสดงค่า secret:

```powershell
npm.cmd run check:line-rollout
```

ก่อนเปิด group mutation ให้ตั้ง `LINE_PILOT_CLASSROOM_IDS` จำกัดเฉพาะห้อง pilot และคง
`LINE_GROUP_MUTATIONS_ENABLED=false` ไว้จนกว่า staging/manual QA ทั้งหมดผ่าน

### Continuation audit — 2026-07-27

- `npm.cmd run check:line` ผ่าน: 29 test files / 133 tests, client/server
  type-check, Prisma validation และ rollout report
- readiness checker ผ่านโหมด strict เมื่อจำลองค่าครบ และรองรับทั้ง
  `NEXT_PUBLIC_LINE_BOT_URL` กับ `LINE_BOT_CHAT_URL`
- `render.yaml` ประกาศ dedicated secrets, LINE chat URL, retention และ staged
  rollout flags ครบ โดยคง `LINE_GROUP_MUTATIONS_ENABLED=false`
- production probe ที่ `https://www.teachplayedu.com/api/ready` และ
  `/api/health` ตอบ HTTP 200; `lineBot` รายงาน `configured`
- ยังไม่ปิด 10 external gates: LINE security changes ยังไม่ถูก push/deploy,
  ไม่มี dedicated staging target ใน repository และ browser session ยังไม่ได้
  sign in ที่ Render/LINE Developers
- ห้ามใช้ production เป็น staging สำหรับ event/mutation QA จนกว่าจะยืนยัน
  test channel, pilot classroom และ rollback owner

## 8. Test Plan

### Unit tests

- Command parser แยก student/teacher/legacy ได้ถูกต้อง
- Capability matrix ครบทุก actor × command
- Classroom resource authorization
- Atomic link-code consume
- Rate-limit windows และ lockout
- Reminder state transitions
- Error classification และ retry policy
- Webhook idempotency key

### Route tests

- Webhook rejects missing/invalid signature
- Webhook duplicate returns success without duplicate side effect
- Cron rejects missing/invalid dedicated secret
- Health requires ADMIN สำหรับข้อมูลละเอียด
- Teacher-link routes ตรวจ auth และ classroom ownership
- Manual retry route ตรวจ authorization

### Integration tests

- Student cannot execute teacher mutation
- Teacher A cannot mutate Classroom B
- Concurrent code consumption succeeds once
- Concurrent reminder workers send once
- Failed reminder retries and becomes sent
- Stale lock is recovered
- Webhook restart resumes queued event
- AI timeout does not block webhook response

### Manual QA

- เชื่อมครูผ่าน direct chat
- ผูกกลุ่มด้วย expiring token
- สร้างงานโดย verified teacher
- นักเรียนทั่วไปลองสร้างงานแล้วถูกปฏิเสธ
- นักเรียนเชื่อมบัญชีและส่งงานของตนเอง
- ครู review/แก้คะแนนโดยคำตอบไม่สูญหาย
- ปิด bot/block bot/นำ bot ออกจากกลุ่มแล้วสถานะอัปเดต
- ทดสอบข้อความภาษาไทยและอังกฤษ

## 9. Validation Commands

เพิ่ม script เฉพาะ LINE แล้ว:

```json
{
  "test:line": "node scripts/run-line-tests.mjs",
  "check:line": "test + client/server type-check + prisma validate + rollout readiness"
}
```

Validation ขั้นต่ำระหว่างพัฒนา:

```powershell
npm.cmd run test:line
npx.cmd tsc --noEmit
npx.cmd tsc --project tsconfig.server.json --noEmit
npx.cmd eslint src/lib/line-bot src/app/api/webhooks/line
npx.cmd prisma validate
```

ก่อน production rollout:

```powershell
npm.cmd run check:line
npm.cmd run check:auth
npm.cmd run check:classroom-core
npm.cmd run check:assignment-quiz
npm.cmd run check:economy-shop-ledger
npm.cmd run build
```

## 10. Release Gates

ห้ามเปิด group mutation ใน production หากข้อใดข้อหนึ่งยังไม่ผ่าน:

- [x] Teacher LINE identity มี one-time verification และ revoke
- [x] มี classroom-level resource authorization
- [x] ปิด Legacy student-code submission แล้ว
- [x] Failed/stale reminder retry ได้ตาม policy
- [x] Link code มี rate limit และ atomic consume
- [x] Cron route ไม่ fallback ไป `ADMIN_SECRET`
- Gate pending: ยังไม่มี end-to-end test กับ LINE channel จริง
- [x] มี rollback flags และ pilot classroom allowlist

## 11. Success Metrics

Security:

- Unauthorized group mutation สำเร็จ = 0
- Cross-student submission สำเร็จ = 0
- Reused link code สำเร็จมากกว่า 1 ครั้ง = 0

Reliability:

- Webhook acknowledgment p95 ต่ำกว่า 1 วินาที
- Reminder duplicate rate = 0
- Transient reminder recovery rate > 95%
- Stale pending delivery เกิน 30 นาที = 0

Product:

- Teacher LINE linking completion rate > 80%
- Student LINE linking completion rate > 80%
- Delivery success rate > 98% โดยไม่นับ invalid/blocked targets
- ครูสามารถระบุสาเหตุ “ไม่ส่ง” ได้จาก readiness/history โดยไม่เปิด server logs

## 12. Recommended Delivery Order

ลำดับทำงานที่แนะนำ:

1. Phase 0 — Safety containment
2. Phase 1 — Teacher authorization
3. Phase 2 — Submission integrity
4. Phase 3 — Link abuse protection
5. Phase 4 — Webhook inbox
6. Phase 5 — Reminder correctness
7. Phase 6 — Configuration hardening
8. Phase 7 — Observability
9. Phase 8 — UX simplification
10. Phase 9 — Staged rollout

เหตุผลที่ทำ reminder correctness ก่อน webhook refactor คือแก้ปัญหาข้อมูลและ state transition ให้ชัดก่อนนำไปวางบน worker architecture ใหม่

## 13. Definition of Done

ระบบ LINE ถือว่าพร้อมขยาย production เมื่อ:

- ทุก mutation มี actor และ resource authorization
- นักเรียนส่งงานได้เฉพาะตัวเองผ่าน linked direct chat
- webhook ingest มี idempotency และไม่ทำงานหนักก่อน acknowledgment
- reminder มี retry, locking, stale recovery และสถานะถูกต้อง
- secrets แยกตามหน้าที่
- health/readiness สะท้อน webhook, worker และ delivery แยกกัน
- automated tests ครอบคลุม security boundary และ concurrency
- pilot classroom ผ่าน manual QA และ monitoring โดยไม่มี P0/P1 ค้าง
