# Lesson Online Course Manual QA Checklist

ใช้ไฟล์นี้เป็นด่านตรวจแบบ manual ก่อนปล่อยงาน Lessons / Generate Lesson ขึ้น production โดยโฟกัสว่า “ครูใช้แล้วมั่นใจ” และ “นักเรียนเห็นบทเรียนเหมือนคอร์สออนไลน์”

## Scope

- หน้า `/dashboard/lessons`
- หน้า `/dashboard/lessons/create`
- หน้า `/dashboard/lessons/[id]/edit`
- หน้า `/student/[code]`
- หน้า `/student/[code]/lessons/[lessonId]`
- API กลุ่ม `/api/lessons`
- API กลุ่ม `/api/student/[code]/lessons`

## Teacher UX Gate

- [ ] หน้า `/dashboard/lessons` โหลดได้โดยไม่มี error
- [ ] ปุ่ม `สร้างจาก PDF` ไปที่ `/dashboard/lessons/create?source=pdf`
- [ ] ปุ่ม `สร้างจากข้อความ` ไปที่ `/dashboard/lessons/create?source=text`
- [ ] Empty state อธิบาย workflow สร้าง → ตรวจแก้ → assign ได้ชัดเจน
- [ ] Filter `Draft / Published / Assigned` ทำงานถูกต้อง
- [ ] Teacher Command Center แสดงจำนวน Draft, Published รอ Assign, Assigned ถูกต้อง
- [ ] Manual QA Gate แสดงจำนวน check ที่ผ่านและรายการที่ยังต้องทำ
- [ ] การกดรายการใน QA Gate พาไปดู filter ที่เกี่ยวข้อง
- [ ] Lesson row แสดง status, เวลาเรียนโดยประมาณ, ห้องที่ assign, และ course readiness
- [ ] Quick action `Publish` ทำงานกับ Draft
- [ ] Quick action `Assign` เปิดหน้า edit พร้อม dialog assign
- [ ] Quick action `View Progress` เปิดหน้า edit ที่ส่วน progress
- [ ] Delete lesson มี confirmation ก่อนลบ

## Lesson Create Gate

- [ ] สร้างบทเรียนจากข้อความได้
- [ ] สร้างบทเรียนจาก PDF ได้ผ่าน parse-file route
- [ ] เมื่อ AI response ผิดรูปแบบ ระบบแสดงข้อความที่ครูเข้าใจได้
- [ ] Preview ให้แก้ title, objectives, sections, key terms, summary ได้
- [ ] Save Draft สำเร็จ
- [ ] Publish หลัง save สำเร็จ

## Lesson Edit And Progress Gate

- [ ] หน้า edit แสดง assigned classrooms
- [ ] Assign dialog แสดงเฉพาะห้องของครู
- [ ] Assign ซ้ำไม่สร้างรายการซ้ำ
- [ ] Publish / unpublish ทำงาน
- [ ] Teacher progress summary แสดงจำนวนนักเรียนทั้งหมดและเรียนจบ
- [ ] Progress list แสดงรายชื่อนักเรียนที่เรียนจบ
- [ ] Average quiz score แสดงเมื่อมีคะแนน
- [ ] Export CSV สำหรับ lesson completions ใช้ได้

## Student Course Experience Gate

- [ ] หน้า student lesson list แสดงภาพรวมความคืบหน้ารวม
- [ ] แต่ละบทมี progress bar
- [ ] แต่ละบทมีเวลาเรียนโดยประมาณเมื่อมีข้อมูล
- [ ] แต่ละบทมีสถานะ `ยังไม่เริ่ม / กำลังเรียน / เรียนจบ`
- [ ] เปิดบทเรียนแล้วสถานะเปลี่ยนเป็น `กำลังเรียน`
- [ ] หน้าบทเรียนแสดง progress การอ่านต่อ section
- [ ] กด section แล้ว progress การอ่านเพิ่มขึ้น
- [ ] กด complete แล้วสถานะเป็น `เรียนจบ`
- [ ] Quiz score badge แสดงหลังมีคะแนน

## Release Checks

รันคำสั่งก่อน commit/deploy:

```bash
npm test -- src/__tests__/ai-generate-lesson-route.test.ts src/__tests__/student-lessons-routes.test.ts src/__tests__/teacher-lessons-routes.test.ts src/__tests__/classroom-lessons-routes.test.ts src/__tests__/lesson-progress-export-route.test.ts src/__tests__/lesson-quiz-routes.test.ts
npx tsc --project tsconfig.server.json --noEmit
npx eslint src/app/dashboard/lessons/page.tsx src/app/dashboard/lessons/create/page.tsx "src/app/dashboard/lessons/[id]/edit/page.tsx" "src/app/student/[code]/lessons/[lessonId]/page.tsx" src/components/student/student-lessons-tab.tsx src/app/api/lessons/route.ts
npm run build
```

## Deploy Scope Guard

ควร stage เฉพาะไฟล์กลุ่ม Lessons:

- `src/app/api/lessons/**`
- `src/app/api/classrooms/[id]/lessons/**`
- `src/app/api/student/[code]/lessons/**`
- `src/app/dashboard/lessons/**`
- `src/app/student/[code]/lessons/**`
- `src/components/student/student-lessons-tab.tsx`
- `docs/lesson-online-course-manual-qa-checklist.md`

ห้ามปนไฟล์นอก scope เช่น media library, LINE, Negamon หรือ generated artifacts ถ้าไม่ได้ตั้งใจ release พร้อมกัน
