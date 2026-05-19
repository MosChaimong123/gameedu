# System Plan 16: Interactive Worksheet

Last updated: 2026-05-19  
Status: In progress

## Scope

สร้างระบบ `Interactive Worksheet` บน flow เดิมของ `Classrooms > Assignments` เพื่อให้ครูสร้างใบงานบนภาพหรือเอกสารพื้นหลัง นักเรียนทำบนเว็บ ส่งคำตอบ และรับการตรวจอัตโนมัติหรือรอครูตรวจในข้อที่ต้อง review

## Navigation Decision

- [x] ไม่เพิ่มเมนูใหม่ใน sidebar สำหรับ MVP
- [x] ใช้ `worksheet` เป็น assignment type ภายใต้ `Classrooms > Assignments`
- [x] ใช้ assignment dialog และ assignment flow เดิมเป็นจุดเข้าใช้งานหลัก
- [ ] พิจารณา reusable worksheet library ในอนาคต

## Current Status Summary

- [x] Worksheet assignment type เชื่อมกับ assignment flow เดิมแล้ว
- [x] Teacher worksheet builder ใช้งานได้แล้ว
- [x] Student worksheet player ใช้งานได้แล้ว
- [x] Submission และ auto grading ทำงานแล้ว
- [x] รองรับ worksheet หลายหน้า
- [x] รองรับ teacher review / manual review queue ระดับ MVP
- [x] รองรับ CSV export และ analytics พื้นฐานของ worksheet
- [x] รองรับ quick arrange, snap-to-grid, direct move/resize จาก preview
- [x] รองรับ resubmit policy UI/flow
- [x] PDF import + page extraction ใช้งานได้ใน builder
- [x] accessibility pass แบบเต็มระบบระดับใช้งานจริง
- [ ] mobile/tablet editor polish ยังไม่เสร็จทั้งหมด

## Implemented Item Types

- [x] `short_text`
- [x] `multiple_choice`
- [x] `fill_blank`
- [x] `drag_drop`
- [x] `matching_pairs`
- [x] `media_prompt` (`audio` / `video`)
- [x] `checklist`
- [x] `file_upload`
- [x] `speaking`

## Implemented Files

- `src/lib/assignment-type.ts`
- `src/lib/assignment-form-type-label.ts`
- `src/lib/worksheet-schema.ts`
- `src/lib/worksheet-assignment.ts`
- `src/lib/grade-worksheet-submission.ts`
- `src/lib/worksheet-take-context.ts`
- `src/lib/worksheet-review.ts`
- `src/components/classroom/worksheet-builder.tsx`
- `src/components/classroom/worksheet-submission-review-dialog.tsx`
- `src/components/student/worksheet-client.tsx`
- `src/components/media-upload.tsx`
- `src/components/classroom/add-assignment-dialog.tsx`
- `src/components/classroom/classroom-table.tsx`
- `src/components/classroom/AnalyticsDashboard.tsx`
- `src/app/student/[code]/worksheet/[assignmentId]/page.tsx`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit/route.ts`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submissions/[submissionId]/route.ts`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/export/route.ts`
- `src/app/api/classrooms/[id]/analytics/route.ts`
- `src/lib/translations.ts`

## Phase Checklist

### Phase 1: Worksheet MVP

- [x] เพิ่ม `Assignment.type = "worksheet"`
- [x] เพิ่ม schema validation สำหรับ `worksheetData`
- [x] สร้าง grading engine สำหรับ `short_text`
- [x] สร้าง grading engine สำหรับ `multiple_choice`
- [x] สร้าง student worksheet player
- [x] เพิ่มตัวเลือก `worksheet` ใน assignment dialog
- [x] สร้าง teacher worksheet editor แบบพื้นฐาน
- [x] บันทึก submission พร้อมคะแนนอัตโนมัติ
- [x] เพิ่ม unit tests สำหรับ schema และ grading

Exit criteria

- [x] ครูเข้า worksheet ผ่าน assignment flow เดิมได้
- [x] ครูสร้าง worksheet จากภาพพื้นหลังได้
- [x] นักเรียนตอบและส่งงานได้
- [x] ระบบตรวจคำตอบพื้นฐานได้
- [x] คะแนนถูกเก็บผ่าน assignment/submission flow เดิม

### Phase 2: Document Background

- [x] รองรับ worksheet หลายหน้า
- [x] เพิ่ม page navigation ใน editor
- [x] เพิ่ม page navigation ใน student player
- [x] เพิ่ม duplicate item
- [x] เพิ่ม preview หลายหน้า
- [x] เพิ่ม quick arrange / snap-to-grid
- [x] เพิ่ม direct move / resize จาก preview
- [x] รองรับ PDF import หลายหน้าแบบอัตโนมัติ
- [x] แปลง PDF page เป็น image background อัตโนมัติ

Exit criteria

- [x] ครูใช้งาน worksheet หลายหน้าได้
- [x] item อยู่ตามหน้าที่แก้ไข
- [x] student player เปลี่ยนหน้าได้
- [x] PDF workflow ครบตามแผนเดิม

### Phase 3: Interactive Items

- [x] เพิ่ม `fill_blank`
- [x] เพิ่ม `drag_drop`
- [x] เพิ่ม `matching_pairs`
- [x] เพิ่ม `audio prompt`
- [x] เพิ่ม `video prompt`
- [x] เพิ่ม `checklist`
- [x] เพิ่ม `file_upload`
- [x] เพิ่ม `speaking`
- [x] เพิ่ม partial score สำหรับ item ที่เหมาะสม

Exit criteria

- [x] worksheet รองรับ activity มากกว่า quiz ปกติ
- [x] auto grading ครอบคลุมโจทย์หลักหลายชนิด
- [x] รองรับ partial score ในหลาย item type
- [x] submission result viewer สำหรับครูเสร็จระดับ MVP

### Phase 4: Review, Analytics, And Polish

- [x] manual review queue
- [x] teacher submission review UI
- [x] export worksheet results
- [x] classroom analytics สำหรับ worksheet ระดับพื้นฐาน
- [x] resubmit policy UI/flow
- [x] accessibility pass
- [ ] mobile/tablet editor polish

Exit criteria

- [x] ครูตรวจงานที่ auto grading ไม่ครอบคลุมได้
- [x] ครูเห็นผลรายคนและรายข้อได้ชัดเจน
- [x] ครูเห็น pending review ใน analytics ได้
- [ ] ระบบพร้อม pilot ใช้งานจริงในห้องเรียน

## Testing Status

- [x] `vitest` สำหรับ worksheet schema
- [x] `vitest` สำหรับ worksheet grading
- [x] `vitest` สำหรับ worksheet review parsing
- [x] `vitest` สำหรับ worksheet export route
- [x] `vitest` สำหรับ worksheet analytics route/stat aggregation
- [x] `vitest` สำหรับ worksheet submit route resubmission flow
- [x] `npm.cmd run predev`
- [x] targeted `eslint` สำหรับไฟล์ worksheet ที่แก้ล่าสุด
- [ ] full app build ยังไม่ใช้เป็นตัวตัดสินใน environment ปัจจุบัน

## Remaining High Priority Work

1. Mobile/tablet editor polish
2. Advanced review items เพิ่มเติม
3. Analytics และ export เชิงลึกเพิ่ม

## Notes

- `checklist` ในแผนนี้หมายถึง item ภายใน worksheet ไม่ใช่เมนูแยก
- `media_prompt` ใช้ upload flow เดิมผ่าน `/api/upload`
- teacher review MVP เปิดดูผลจาก `Classroom table` ได้ทั้ง mobile และ desktop
- manual review MVP รองรับ `short_text` และ `media_prompt` ที่ตั้งเป็น `manual`
- resubmit policy ใช้ `worksheet.settings.allowResubmit` และการส่งใหม่จะเขียนทับ submission เดิม
- direct manipulation ใน preview รองรับเลือก item, ลากย้าย, และลากจุดมุมเพื่อปรับขนาดแล้ว
- PDF import ใช้ `pdfjs-dist` render หน้าเอกสารใน browser แล้วอัปโหลด PNG ของแต่ละหน้ากลับเข้า `/api/upload`
- accessibility pass รอบนี้เพิ่ม live region, aria labels, keyboard page navigation, และ keyboard fallback สำหรับ drag/drop ผ่าน select
