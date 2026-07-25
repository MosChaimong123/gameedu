# Lesson System Correctness And Progress Plan

Date: 2026-07-12

## เป้าหมาย

ทำให้ระบบบทเรียนใช้กฎเดียวกันตั้งแต่การสร้าง แก้ไข เผยแพร่ แสดงผล ติดตามความคืบหน้า
จนถึงการเรียนจบ โดยแก้ปัญหาหลักดังนี้:

- การติดตามวิดีโอหลายรายการในหัวข้อเดียวปะปนกัน
- บทเรียนข้อความหรือเอกสารถูกมองว่าเรียนจบทันที
- teacher UI, student UI และ progress service เลือก active topic ไม่ตรงกัน
- publish API ยอมให้ข้าม teacher confirmation เมื่อไม่ส่ง field
- ข้อความ error ของ student lesson เสียหายเป็น `????????`
- route page มี business logic ซ้ำและหนาเกินไป

## ขอบเขต

อยู่ในขอบเขต:

- `src/lib/lessons/**`
- `src/app/api/lessons/**`
- `src/app/api/student/[code]/lessons/**`
- `src/app/student/[code]/lessons/[lessonId]/page.tsx`
- `prisma/schema.prisma` และ migration/backfill ที่เกี่ยวกับ `TopicVideoWatch`
- lesson route tests, lesson domain tests และ student playback QA
- architecture guards ที่ป้องกันการนำกฎ lesson ไปเขียนซ้ำใน UI

อยู่นอกขอบเขต:

- การ redesign หน้าบทเรียน
- course progress ที่ไม่ใช้ lesson assignment contract
- legacy physics lesson builder
- การเปลี่ยน reward หรือ certificate policy เว้นแต่จำเป็นต่อ completion correctness

## หลักการสถาปัตยกรรม

- `lesson_content_v2` และ `src/lib/lessons/lesson-content.ts` เป็น canonical content contract
- UI ห้ามตัดสิน active topic จาก `contentStatus` โดยตรง
- progress และ completion ต้องคำนวณฝั่ง server จาก canonical policy
- client แสดงผลจาก server summary และห้ามสร้าง completion policy ชุดที่สอง
- การติดตามวิดีโอต้องระบุระดับ media ไม่ใช่เพียงระดับ topic
- การ publish ต้อง fail closed เมื่อไม่ได้รับคำยืนยันที่ต้องการ

## ลำดับการแก้ไข

### Phase 1: Canonical Active Topic Policy

เพิ่ม helper กลางใน lesson domain เช่น:

```ts
hasLessonTopicStudentContent(topic)
getActiveLessonTopics(content)
getLessonTopicRequirements(topic)
```

งาน:

- รวมกฎ section, media, document และ assessment ไว้จุดเดียว
- กำหนด fallback สำหรับ lesson เก่าที่ทุก topic ไม่มี deliverable อย่างชัดเจน
- เปลี่ยน `lesson-progress.ts` และ student player ให้ใช้ helper เดียวกัน
- เลิกใช้ `contentStatus !== "empty"` เป็นตัวตัดสิน visibility ใน student UI
- เพิ่ม tests สำหรับ stale `contentStatus`, video-only, document-only และ assessment-only topics

Acceptance criteria:

- sidebar, rendered topics, progress total และ resume topic ใช้รายการ topic ชุดเดียวกัน
- topic ที่มี deliverable แสดงได้แม้ stored `contentStatus` ล้าสมัย
- ไม่มี local `topicHasStudentContent()` ซ้ำใน route page หรือ progress module

### Phase 2: Multi-Video Tracking Model

ปรับ `TopicVideoWatch` ให้หนึ่ง record แทนหนึ่ง media:

```text
studentId + lessonId + topicId + mediaId
```

งาน:

- เปลี่ยน Prisma unique constraint และเพิ่ม index ที่รองรับการสรุปตาม lesson/topic
- ปรับ video-watch upsert ให้ใช้ composite key ใหม่
- ตรวจสอบว่า `mediaId` อยู่ใน topic และเป็น video จริงก่อนบันทึก
- สรุป topic video completion จากวิดีโอที่เป็น requirement ทุกตัว
- ปรับ API response ให้ส่ง progress ราย media และ summary ราย topic
- สร้าง migration/backfill script แบบ idempotent
- เก็บ record เดิมไว้กับ `mediaId` ปัจจุบัน และไม่คาดเดาความคืบหน้าของ media อื่น

Migration safety:

- สำรองจำนวน record ก่อนและหลัง migration
- ตรวจ duplicate ตาม composite key ใหม่ก่อนสร้าง unique index
- script ต้องรองรับ dry run และ rerun
- deploy schema/API ที่อ่านข้อมูลเก่าได้ก่อนเปิด write path ใหม่ หาก rollout ต้องแยกหลายรอบ

Acceptance criteria:

- การดู video A ไม่เพิ่ม watched range ของ video B
- topic ที่มีสองวิดีโอจะไม่ complete จนกว่าวิดีโอ requirement ครบทั้งสองรายการ
- watch ranges ของแต่ละ media ไม่ปะปนกัน
- migration ไม่ลบ completion หรือ assessment history

### Phase 3: Text And Document Progress Policy

กำหนดพฤติกรรมที่วัดได้สำหรับ topic ที่ไม่มีวิดีโอ โดยเลือก policy เริ่มต้น:

- topic มีวิดีโอ: ผ่านเมื่อวิดีโอ requirement ครบ
- topic มีข้อความหรือเอกสารและไม่มีวิดีโอ: ผ่านเมื่อผู้เรียนกด “อ่านหัวข้อนี้แล้ว”
- topic มี assessment: ต้องผ่าน assessment เพิ่มจาก content requirement
- assessment-only topic: content ผ่านโดยอัตโนมัติ แต่ assessment ยังเป็น requirement

งาน:

- เพิ่ม persistence สำหรับ topic acknowledgement หรือ progress event ที่เหมาะกับ schema ปัจจุบัน
- เพิ่ม endpoint แบบ idempotent สำหรับ mark topic content complete
- ให้ `summarizeStudentLessonProgress()` รวม video, acknowledgement และ assessment
- ป้องกัน lesson completion เมื่อยังมี text/document topic ที่ไม่ acknowledge
- แสดงปุ่มและสถานะเฉพาะเมื่อ topic ต้องการ acknowledgement
- ไม่ใช้ scroll position หรือเวลาเปิดหน้าเป็นหลักฐาน completion

Acceptance criteria:

- text-only และ document-only lesson เริ่มที่ progress 0% ไม่ใช่ 100%
- refresh แล้ว acknowledgement ยังคงอยู่
- completion endpoint ใช้ server summary และปฏิเสธ request ที่ requirement ยังไม่ครบ
- progress percent เปลี่ยนแบบ monotonic ภายใต้ content version เดิม

### Phase 4: Publish And Error Correctness

งาน publish:

- เมื่อเปลี่ยนเป็น `PUBLISHED` ให้ API กำหนด `requireTeacherConfirmation: true`
- รับผ่านเฉพาะ `confirmPublishReady === true`
- แยก publish command จาก generic content update ให้ชัดเจนใน service boundary
- เพิ่ม test สำหรับ omitted, `false`, `true` และ non-publish PATCH

งาน error handling:

- แทนข้อความ `????????` ด้วยข้อความไทย UTF-8 ที่อ่านได้
- ใช้ typed API error parser/helper แทนข้อความ fallback กระจายในหน้า
- ตรวจ `npm.cmd run check:i18n:strict`
- เพิ่ม test อย่างน้อยระดับ helper หรือ component behavior สำหรับ completion failure

Acceptance criteria:

- request publish ที่ไม่ส่ง confirmation ถูกปฏิเสธ
- save draft ไม่ต้องส่ง confirmation
- student เห็นข้อความที่อ่านได้เมื่อ complete lesson ล้มเหลว
- source file ไม่มี placeholder `????????` ใน lesson flow

### Phase 5: Student Player Decomposition And Guards

แยก business logic ออกจาก route page หลัง behavior ถูกตรึงด้วย tests แล้ว:

```text
src/components/lessons/student-player/
  student-lesson-player-client.tsx
  student-lesson-player.types.ts
  use-student-lesson-data.ts
  use-topic-video-progress.ts
  lesson-topic-navigation.tsx
  lesson-content-panel.tsx
  lesson-assessment-panel.tsx
```

งาน:

- ย้าย fetch/load/complete orchestration ไป hook หรือ client container
- ให้ presentational components รับ typed view model และ callbacks
- ลบ client-side completion policy ที่คำนวณซ้ำกับ server
- คง login code, lesson id และ topic id ผ่าน typed context/props ชุดเดียว
- เพิ่ม architecture guard ป้องกัน local active-topic helpers และ line-count budget สำหรับไฟล์ที่ cleanup แล้ว

Acceptance criteria:

- route page ทำหน้าที่ compose component เป็นหลัก
- presentational components ไม่เรียก `fetch()` และไม่ import Prisma types
- completion eligibility มาจาก server summary
- behavior เดิมผ่าน browser QA ทั้ง desktop และ mobile

## Test Matrix

Unit tests:

- canonical active topics และ topic requirements
- progress ของ text-only, document-only, video-only, multi-video และ assessment-only
- stale content status และ empty-content fallback
- progress percent, resume topic และ completion eligibility

Route tests:

- video-watch ปฏิเสธ media ที่ไม่อยู่ใน topic
- video progress แยกตาม `mediaId`
- completion ถูก block เมื่อ video/text/document/assessment ยังไม่ครบ
- publish confirmation: omitted/false ถูก block, true ผ่าน
- student lesson list/detail ใช้ progress summary ตรงกัน

Migration tests:

- dry run ไม่เขียนข้อมูล
- rerun ไม่สร้าง duplicate
- record เดิมถูก map ไป media เดิม
- count และ referential checks ผ่านหลัง migration

Manual QA:

- lesson ที่มี topic เดียวและสองวิดีโอ
- lesson ข้อความล้วนและเอกสารล้วน
- lesson ผสมข้อความ วิดีโอ เอกสาร และ assessment
- resume หลัง refresh และเปิดจากอีกอุปกรณ์
- publish จาก lesson list และ edit page
- error state ของ completion และ network failure

## Validation Commands

```powershell
npx.cmd vitest run --config vitest.config.mts --pool threads src/lib/lessons/__tests__
npm.cmd test -- src/__tests__/teacher-lessons-routes.test.ts src/__tests__/student-lessons-routes.test.ts
npx.cmd eslint src/lib/lessons src/app/api/lessons "src/app/api/student/[code]/lessons" "src/app/student/[code]/lessons/[lessonId]/page.tsx"
npx.cmd tsc --noEmit --incremental false
npm.cmd run check:i18n:strict
npm.cmd run check:architecture
npm.cmd run build
```

## Rollout Plan

1. ลง Phase 1 เพื่อสร้าง canonical policy โดยยังไม่เปลี่ยน schema
2. ลง schema/migration และ API compatibility สำหรับ multi-video tracking
3. ตรวจ production metrics และข้อมูล watch records ก่อนเปิด requirement ใหม่
4. ลง text/document acknowledgement โดย feature flag หรือ classroom cohort หากจำเป็น
5. บังคับ publish confirmation และแก้ error strings
6. refactor student player หลัง runtime behavior เสถียร

Metrics ที่ควรเฝ้าดู:

- completion rejection rate แยกตามเหตุผล
- video-watch validation failures
- lessons ที่ progress 100% โดยไม่มี interaction
- median time จาก lesson open ถึง completion
- API error rate ของ lesson detail, watch และ complete routes

## Rollback Plan

- ห้าม rollback schema ด้วยการลบ watch records
- หาก multi-video summary มีปัญหา ให้ปิด requirement enforcement แต่ยังเขียน record แยก media ต่อ
- หาก acknowledgement UX มีปัญหา ให้หยุดบังคับ requirement ผ่าน feature flag โดยเก็บ event ที่บันทึกแล้ว
- publish confirmation สามารถ rollback เฉพาะ policy ได้โดยไม่เปลี่ยน content schema
- ทุก phase ต้อง deploy แยกกันได้และไม่พึ่ง refactor UI phase สุดท้าย

## Definition Of Done

- acceptance criteria ของทุก phase ผ่าน
- targeted tests, typecheck, i18n, architecture checks และ build ผ่าน
- migration dry run และ production run มีรายงาน count ตรวจสอบได้
- manual QA ครบ teacher publish, student playback, resume และ completion
- เอกสาร QA และ architecture conventions อัปเดตตาม contract ใหม่
- ไม่มี canonical lesson rule ถูกเขียนซ้ำใน student route page

## Implementation Progress

### Phase 1: Complete Locally

- เพิ่ม `getLessonTopicRequirements()`, `hasLessonTopicStudentContent()` และ
  `getActiveLessonTopics()` ใน canonical lesson domain
- เปลี่ยน progress engine, student lesson renderer และ curriculum sidebar ให้ใช้ active topics ชุดเดียวกัน
- เลิกใช้ stored `contentStatus` เป็น student visibility policy
- เพิ่ม regression tests สำหรับ stale status, video-only, document-only, empty topic และ legacy fallback
- ยังไม่ได้ commit, push หรือ deploy

### Phase 2: Complete Locally

- เปลี่ยน `TopicVideoWatch` unique key เป็น `studentId + lessonId + topicId + mediaId`
- เพิ่ม canonical video-media resolver และให้ progress ต้องครบทุกวิดีโอใน topic
- PATCH video-watch ตรวจ assignment, published lesson, topic และ video media id ก่อนเขียนข้อมูล
- student player เก็บสถานะราย media และแสดง video selector เมื่อ topic มีหลายวิดีโอ
- เพิ่ม migration preflight command `npm.cmd run db:check-lesson-video-watch`
- local preflight ผ่านด้วย 0 rows และ apply schema ไปยัง MongoDB local `gamedu` แล้ว
- existing rows มี `mediaId` อยู่ใน schema เดิม จึงไม่ต้อง backfill ข้อมูล
- ยังไม่ได้ apply schema กับ production, commit, push หรือ deploy

### Phase 3: Complete Locally

- เพิ่ม `LessonTopicAcknowledgement` แบบ unique ต่อ student/lesson/topic
- acknowledgement เก็บ deterministic `contentVersion`; เมื่อครูแก้ข้อความ เอกสาร หรือรูป ผู้เรียนต้องยืนยันใหม่
- canonical topic requirements ระบุ acknowledgement สำหรับข้อความ เอกสาร หรือรูปที่ไม่มีวิดีโอ
- assessment-only topic ไม่ต้อง acknowledge แต่ยังต้องผ่าน assessment
- เพิ่ม POST endpoint แบบ idempotent สำหรับ mark topic content complete
- lesson list, detail และ completion routes ใช้ acknowledgement จาก server summary ชุดเดียวกัน
- student player แสดงปุ่ม acknowledgement เฉพาะ topic ที่ต้องใช้ พร้อม loading/completed/error states
- progress ของ text/document เริ่มที่ 0% และ completion endpoint block จนกว่าจะ acknowledge
- apply collection และ indexes ไปยัง MongoDB local `gamedu` แล้ว
- ไม่มีข้อมูลเก่าที่เชื่อถือได้สำหรับ backfill จึงเริ่มเก็บ acknowledgement ใหม่จากศูนย์
- ยังไม่ได้ apply schema กับ production, commit, push หรือ deploy

### Phase 4: Complete Locally

- แยก publish validation เป็น `getLessonPublishCommandIssues()` ใน lesson service boundary
- publish API บังคับ teacher confirmation แบบ fail-closed และรับผ่านเฉพาะ `confirmPublishReady === true`
- generic draft/content PATCH ยังบันทึกได้โดยไม่ต้องส่ง publish confirmation
- student completion ใช้ typed `getLocalizedErrorMessageFromResponse()` แทนการ parse response และ fallback ภายในหน้า
- แทน placeholder `????????` ด้วย translation key ที่มีข้อความไทย UTF-8 และ English fallback
- เพิ่ม regression tests สำหรับ publish confirmation แบบ omitted, `false`, `true`, non-publish PATCH และ completion error fallback
- lesson-related targeted suite ผ่าน 76 tests; ESLint, TypeScript, architecture guard และ production build ผ่าน
- `check:i18n:strict` ยังพบ baseline เดิม 299 รายการ และไม่มี finding ใหม่จาก completion UI ใน Phase 4
- ยังไม่ได้ commit, push, deploy หรือทำ browser QA

### Phase 5: Complete Locally

- ลด route page เหลือ composition boundary ที่ render `StudentLessonPlayerClient` เท่านั้น
- แยก shared types, canonical render model, student lesson data orchestration และ topic video progress เป็นโมดูลเฉพาะ
- แยก content/objectives/documents panels และ topic navigation row เป็น presentational components ที่ไม่เรียก API
- student player client ไม่มี `fetch()` และไม่คำนวณ completion eligibility หรือ completed topic count ซ้ำกับ server
- progress bar, completed topics, resume state และ auto-complete ใช้ `progressSummary` จาก server
- เพิ่ม architecture guards สำหรับ required files, forbidden imports/API calls, local active-topic policy และ line budget 1,100 บรรทัด
- เพิ่ม model regression tests สำหรับ stale `contentStatus` และ canonical topic set
- lesson-related targeted suite ผ่าน 78 tests; ESLint, TypeScript, architecture guard และ production build ผ่าน
- browser QA ผ่านที่ 1440x900 และ 390x844: ไม่มี horizontal overflow, desktop sidebar และ mobile drawer ใช้งานได้ และเปลี่ยน topic แล้ว video/content ตรงกัน
- `check:i18n:strict` ยังพบ baseline เดิม 299 รายการ โดยไม่มี finding ใหม่จาก player modules ใน Phase 5
- ยังไม่ได้ commit, push หรือ deploy
