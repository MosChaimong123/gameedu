# Assessment Blueprint Per Subject

Last updated: 2026-06-21  
Status: done

## Goal

ทำแกน `assessment blueprint` ต่อรายวิชา เพื่อให้การสร้างข้อสอบจากบทเรียน/หัวข้อ/โมดูล ใช้กติกาที่สอดคล้องกับธรรมชาติของวิชา ไม่ใช่ prompt กลางก้อนเดียว

## Delivered

- เพิ่ม [src/lib/curriculum/assessment-blueprints.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/assessment-blueprints.ts)
- เพิ่ม [src/lib/curriculum/__tests__/assessment-blueprints.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/__tests__/assessment-blueprints.test.ts)
- ขยาย [src/lib/courses/assessment-source.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/courses/assessment-source.ts)
- เชื่อม blueprint เข้ากับ [src/app/api/ai/lessons/generate-assessment/route.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/ai/lessons/generate-assessment/route.ts)
- เพิ่ม route tests ใน [src/__tests__/ai-generate-lesson-assessment-route.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/ai-generate-lesson-assessment-route.test.ts)

## What The Blueprint Covers

- canonical subject ครบ 12 วิชา
- family ต่อวิชา เช่น `language_literacy`, `science_inquiry`, `career_practice`
- source type ระดับ `topic`, `lesson`, `module`, `course`
- question-count range
- recommended pass ratio
- minimum outcome coverage
- preferred question styles
- prompt notes เฉพาะวิชา

## Runtime Behavior

เมื่อ route `POST /api/ai/lessons/generate-assessment` ทำงาน:

1. resolve subject จาก lesson/course
2. map ไปยัง canonical subject blueprint
3. inject blueprint context เข้า prompt
4. คำนวณ question count ตาม blueprint
5. แนบ metadata กลับไปพร้อม draft เช่น `subjectId`, `unitId`, `learningOutcomeIds`, `assessmentBlueprintId`, `assessmentFamily`, `recommendedPassScore`

## Definition Of Done

- AI assessment generation เริ่มแยกมาตรฐานตามวิชาได้
- question set metadata มีข้อมูลพอให้ teacher builder และ analytics ใช้ต่อ
- route tests ตรวจได้ว่า subject blueprint ถูก inject จริง
