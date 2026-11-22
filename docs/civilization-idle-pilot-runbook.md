# Civilization Idle Staging, Pilot, and Rollback Runbook

สถานะ: พร้อมสำหรับ staging/pilot โดย production default ยังปิด

## Rollout Controls

- `CIVILIZATION_IDLE_ENABLED=false` ปิด dashboard entry, page และ API ทั้งหมดด้วย 404 โดยไม่ลบ profile หรือ command receipt
- `CIVILIZATION_IDLE_ENABLED=true` เปิดระบบ แต่ยังถูกจำกัดด้วย allowlist หากตั้ง `CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS`
- `CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS` รับ Classroom ObjectId คั่นด้วย comma เช่น `id-a,id-b`; เว้นว่างหมายถึงทุกห้อง จึงห้ามเว้นว่างใน pilot
- ค่าใน `render.yaml` ตั้ง `CIVILIZATION_IDLE_ENABLED=false` เพื่อให้ deploy โค้ดได้ก่อนเปิดผู้ใช้จริง

## 1. Preflight

1. ยืนยัน branch/commit ที่จะปล่อยและตรวจว่าไม่มีไฟล์ลับติด commit
2. รัน `npm run db:print-target` และบันทึก host/database ที่แสดง
3. สำรอง database เป้าหมายด้วย `mongodump --archive=<path> --gzip`
4. ตรวจว่า restore account อ่าน archive ได้ และเก็บ path/checksum ไว้ใน deployment record
5. ตรวจ Prisma diff ก่อน deploy เพราะ `render.yaml` ใช้ `npx prisma db push` ใน pre-deploy และจะ apply schema ที่ค้างทั้งหมด ไม่ได้จำกัดเฉพาะ Civilization
6. รัน `render blueprints validate` เมื่อเครื่อง/CI มี Render CLI; การไม่มี CLI ต้องบันทึกไว้และให้ Render Dashboard validate ก่อน Apply Blueprint

ห้ามใช้ production เป็นเป้าหมายแรก ให้ทำขั้นตอนทั้งหมดใน dev/staging ที่แยกข้อมูลก่อน

## 2. Apply Schema and Persistence QA

```powershell
npm run db:print-target
npm run qa:civilization-pilot-readiness
npx prisma db push
npm run qa:civilization-db
```

`qa:civilization-db` อนุญาต localhost อัตโนมัติ สร้าง profile/receipt ชั่วคราว ทดสอบ create, replay และ reload แล้ว cleanup ข้อมูลที่สร้าง หากต้องรันบน staging ที่แยกจาก production ให้ยืนยันอย่างชัดเจน:

```powershell
$env:CIVILIZATION_DB_QA_ALLOW_REMOTE = "true"
npm run qa:civilization-db
Remove-Item Env:CIVILIZATION_DB_QA_ALLOW_REMOTE
```

ห้ามตั้ง `CIVILIZATION_DB_QA_ALLOW_REMOTE=true` บน production

## 3. Dark Deploy

1. Deploy ด้วย `CIVILIZATION_IDLE_ENABLED=false`
2. ตรวจ `/api/ready`, login ครู, student access, งาน/คะแนน/เช็กชื่อ, LINE และ Host/Play
3. ยืนยัน `/student/access/civilization` และ `/api/student/access/civilization/state` ตอบ 404
4. ตรวจว่า deployment ไม่มี Prisma error, command conflict spike หรือ server error ใหม่

## 4. Pilot Enablement

1. เลือกห้องทดสอบและเก็บ Classroom ObjectId ที่ถูกต้อง
2. ตั้ง `CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS=<pilot-id>` ก่อน
3. เปลี่ยน `CIVILIZATION_IDLE_ENABLED=true` แล้ว restart/deploy service
4. ห้อง pilot ต้องเห็นทางเข้าและเล่นได้ ห้องนอก pilot ต้องไม่เห็นทางเข้าและ URL/API ต้องตอบ 404
5. ทดสอบ Stone Age, reload, offline summary, Bronze transition, converter, สองแท็บพร้อมกัน และ session หมดอายุ
6. ตรวจว่า points, gold, attendance, assignments, LINE และ live-game records ไม่เปลี่ยนจากคำสั่ง Civilization

ตรวจ allowlist ด้วย session ชั่วคราวโดยไม่แสดง login code/cookie และ cleanup session อัตโนมัติ:

```powershell
$env:CIVILIZATION_SMOKE_BASE_URL = "https://<staging-host>"
$env:CIVILIZATION_SMOKE_ALLOW_REMOTE = "true"
npm run qa:civilization-pilot-smoke
Remove-Item Env:CIVILIZATION_SMOKE_ALLOW_REMOTE
Remove-Item Env:CIVILIZATION_SMOKE_BASE_URL
```

ผลที่ถูกต้องคือ `pilotStatus=200`, `controlStatus=404` และไม่มี session ที่มี `clientDigest=civilization-pilot-smoke` ค้างอยู่

## 5. Monitoring

- เฝ้าดู HTTP 409 revision conflicts, 422 rejected commands และ 500 invalid snapshots
- ไม่ log student login code, cookie, command payload ที่มี credential หรือ snapshot ทั้งก้อน
- ตรวจจำนวน `CivilizationProfile`, command rate, response latency และ command receipt growth รายวันระหว่าง pilot
- เก็บ feedback แยกเป็น balance, UX, data integrity และ access control

## 6. Rollback

1. ตั้ง `CIVILIZATION_IDLE_ENABLED=false` และ restart/deploy ทันที
2. ยืนยัน page/API ตอบ 404 และระบบเรียนหลักยังใช้งานได้
3. ห้ามลบ `CivilizationProfile` หรือ `CivilizationCommand`; การเปิด flag กลับต้องอ่าน revision เดิมได้
4. หากต้องย้อน app version ให้ตรวจ `schemaVersion`/`contentVersion` compatibility ก่อนเปิด flag อีกครั้ง
5. Restore database เฉพาะเมื่อมีหลักฐาน corruption และผ่านการอนุมัติ ไม่ restore เพียงเพราะปิดฟีเจอร์

## Exit Criteria

- Staging backup, schema push และ `qa:civilization-db` ผ่าน
- Focused Civilization tests, TypeScript, lint, architecture guard และ production build ผ่าน
- Regression งาน/คะแนน/เช็กชื่อ, LINE และ Host/Play ผ่าน
- Dark deploy ผ่านก่อนเปิด pilot และ rollback flag ผ่านโดย profile เดิมยังอยู่
- มี pilot classroom IDs, ผู้รับผิดชอบ monitoring และช่วงเวลาทดสอบที่ชัดเจน
