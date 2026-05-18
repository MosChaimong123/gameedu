# System Plan 16: Interactive Worksheet

Last updated: 2026-05-18

## Scope

สร้างระบบใบงานออนไลน์แบบโต้ตอบสำหรับ GameEdu โดยต่อยอดจากระบบที่มีอยู่แล้ว ได้แก่ classroom, assignment, question set, upload, student portal, quiz submission และ auto grading

เป้าหมายหลักของระบบนี้คือให้ครูสามารถสร้างใบงานจากไฟล์ `PDF`, `JPG`, `PNG` หรือสร้างจากคำถามเดิมในระบบ แล้วให้นักเรียนเปิดทำบนเว็บ ส่งคำตอบ และรับคะแนนอัตโนมัติได้

## Navigation Decision

ตำแหน่งของฟีเจอร์ใน MVP ให้ยึดตาม assignment flow เดิมของระบบ:

- ไม่เพิ่มเมนูใหม่ใน sidebar
- ไม่แยก worksheet เป็นหมวดระดับเดียวกับ `My Sets`, `Classrooms`, `Reports`, `OMR`
- ให้ worksheet เป็น assignment type ใหม่ภายใต้ `Classrooms > เลือกห้อง > Assignments`
- จุดเข้าใช้งานหลักของครูคือ modal สร้างงานเดิมใน `src/components/classroom/add-assignment-dialog.tsx`

เหตุผล:

- sidebar ปัจจุบันใช้สำหรับหมวดระบบใหญ่ ไม่ใช่เครื่องมือย่อย
- worksheet มีพฤติกรรมใกล้ assignment มากกว่าหมวด content library
- reuse submission, score, analytics, classroom access control และ student flow เดิมได้มากที่สุด
- ลดความเสี่ยงเรื่อง navigation ซ้ำซ้อนและลดภาระการสอนผู้ใช้ใหม่

แนวทางระยะถัดไป:

- ถ้ามี reusable worksheet library ในอนาคต ค่อยพิจารณาขยายเข้า `My Sets` หรือเปลี่ยนหมวดเป็น content library ที่เก็บทั้ง question sets และ worksheets

## Current System Fit

ระบบปัจจุบันมีฐานที่พร้อมต่อยอดแล้ว:

- `Assignment` รองรับงานในห้องเรียนและผูกกับนักเรียนผ่าน `AssignmentSubmission`
- `QuestionSet` เก็บชุดคำถามแบบ JSON และถูกใช้กับ quiz/game flow
- `src/app/api/upload/route.ts` รองรับการอัปโหลดไฟล์เอกสาร รูปภาพ วิดีโอ และไฟล์ทั่วไป
- `src/components/student/quiz-client.tsx` เป็นฐานของประสบการณ์นักเรียนทำงานออนไลน์
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route.ts` มี flow ตรวจคะแนนและบันทึก submission
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/check-answer/route.ts` มี endpoint สำหรับตรวจคำตอบระหว่างทำ quiz

ข้อสรุป:

- ระบบนักเรียนทำใบงานสามารถต่อยอดจาก quiz/student assignment flow ได้ทันที
- ระบบตรวจคำตอบอัตโนมัติมีฐานอยู่แล้ว แต่ต้องเพิ่ม answer engine สำหรับชนิดคำถามใหม่
- ระบบสร้างใบงานแบบลากวางบนเอกสารยังไม่มี ต้องทำ editor ใหม่แบบค่อยเป็นค่อยไป

## Product Goals

- ครูอัปโหลดไฟล์พื้นหลังใบงาน เช่น `PDF`, `JPG`, `PNG`
- ครูวางช่องคำตอบหรือ activity บนหน้าใบงาน
- นักเรียนเปิดใบงานจาก student portal ด้วย login code หรือบัญชีที่ผูกไว้
- นักเรียนตอบคำถามบนหน้าใบงานและส่งงานได้ทันที
- ระบบตรวจคะแนนอัตโนมัติสำหรับคำตอบที่ตรวจได้
- ครูดูคะแนน คำตอบ และสถานะการส่งงานจาก classroom dashboard
- ระบบยังเข้ากับ gamification/Negamon reward ที่มีอยู่ได้ในอนาคต
- ครูเข้าถึง worksheet ผ่านจุดเดิมที่ใช้สร้าง assignment โดยไม่ต้องเรียนรู้เมนูใหม่

## Non Goals

- ไม่คัดลอก UI, asset หรือ implementation ของ Liveworksheets
- ไม่ทำ editor ระดับ production เต็มรูปแบบในเฟสแรก
- ไม่รองรับ OCR/AI extraction จากเอกสารแบบเต็มตั้งแต่ MVP
- ไม่ให้ speaking answer ตรวจคะแนนอัตโนมัติแบบสมบูรณ์ในเฟสแรก
- ไม่เปลี่ยน assignment/quiz flow เดิมโดยไม่จำเป็น
- ไม่เพิ่ม sidebar menu ใหม่สำหรับ worksheet ใน MVP

## Proposed Data Model

ทางเลือกที่แนะนำคือเริ่มด้วย field JSON บน `Assignment` ก่อน เพื่อลด migration ใหญ่ แล้วค่อยแยก model เมื่อระบบนิ่ง

เพิ่ม type ใหม่:

- `Assignment.type = "worksheet"`

เพิ่มข้อมูลใบงาน:

```ts
type WorksheetData = {
  version: 1;
  source: {
    type: "image" | "pdf";
    url: string;
    originalFileName?: string;
    pageCount?: number;
  };
  pages: WorksheetPage[];
  settings: {
    showScoreToStudent: boolean;
    allowResubmit: boolean;
    shuffleItems: boolean;
  };
};

type WorksheetPage = {
  id: string;
  pageNumber: number;
  backgroundUrl: string;
  width: number;
  height: number;
  items: WorksheetItem[];
};
```

ชนิด item ใน MVP:

```ts
type WorksheetItem =
  | {
      id: string;
      type: "short_text";
      x: number;
      y: number;
      width: number;
      height: number;
      label?: string;
      answer: {
        mode: "exact" | "normalized";
        accepted: string[];
        points: number;
      };
    }
  | {
      id: string;
      type: "multiple_choice";
      x: number;
      y: number;
      width: number;
      height: number;
      prompt: string;
      options: string[];
      correctIndex: number;
      points: number;
    };
```

ชนิด item ในเฟสถัดไป:

- `drag_drop`
- `matching`
- `fill_blank`
- `audio_prompt`
- `video_prompt`
- `file_upload`
- `speaking`
- `manual_review`

## API Plan

Teacher APIs:

- `POST /api/classrooms/[id]/worksheets`
- สร้าง assignment type `worksheet` พร้อม `worksheetData`

- `PATCH /api/classrooms/[id]/assignments/[assignmentId]/worksheet`
- บันทึก layout, pages, items, answer key และ settings

- `POST /api/classrooms/[id]/assignments/[assignmentId]/worksheet/upload-source`
- อัปโหลดไฟล์ต้นฉบับและเตรียม background pages

Student APIs:

- `GET /api/classrooms/[id]/assignments/[assignmentId]/worksheet`
- โหลดใบงานแบบไม่เปิดเผย answer key

- `POST /api/classrooms/[id]/assignments/[assignmentId]/worksheet/check-answer`
- ตรวจคำตอบรายข้อ ถ้า settings อนุญาต

- `POST /api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit`
- ส่งคำตอบทั้งหมด คำนวณคะแนน และสร้าง `AssignmentSubmission`

Teacher review APIs:

- `GET /api/classrooms/[id]/assignments/[assignmentId]/worksheet/submissions`
- ดูคำตอบ คะแนน และสถานะของนักเรียน

- `PATCH /api/classrooms/[id]/assignments/[assignmentId]/worksheet/submissions/[submissionId]`
- ปรับคะแนน manual review เฉพาะคำตอบที่ตรวจอัตโนมัติไม่ได้

## UI Plan

Navigation and entry:

- sidebar คงเดิมใน MVP
- ครูเข้า `ชั้นเรียนที่ใช้งานอยู่`
- เลือก classroom
- เปิด dialog จัดการ assignments
- เลือก assignment type ใหม่ `worksheet`
- จากนั้นระบบพาไปหน้า editor หรือเปิด editor panel ตาม implementation ที่เลือก

Teacher editor:

- เริ่มจาก assignment dialog เดิม แล้วต่อเข้า worksheet setup
- หน้าเลือกไฟล์หรือสร้างใบงานเปล่า
- canvas/editor แสดงพื้นหลังเอกสาร
- toolbar สำหรับเลือกเครื่องมือ เช่น text answer, multiple choice, preview, save
- property panel สำหรับตั้ง answer key, points, label, validation mode
- preview mode เพื่อดูเหมือนนักเรียน

Student worksheet:

- เปิดจากหน้า assignment เดิมใน student portal
- แสดงใบงานเป็นหน้า ๆ พร้อมช่องตอบบนตำแหน่งที่ครูวางไว้
- autosave draft ใน client state หรือ server draft ในเฟสถัดไป
- submit แล้วแสดงคะแนนตาม policy ของ classroom/assignment

Teacher review:

- แสดงรายชื่อนักเรียน ส่งแล้ว/ยังไม่ส่ง/คะแนน
- เปิดดูคำตอบรายคน
- override คะแนนได้ในข้อที่ต้อง manual review

Assignment dialog integration:

- เพิ่ม type ใหม่ใน `src/lib/assignment-type.ts`
- เพิ่ม label ใหม่ใน `src/lib/assignment-form-type-label.ts`
- เพิ่ม card/tool option ใหม่ใน `src/components/classroom/add-assignment-dialog.tsx`
- เมื่อเลือก `worksheet` ให้แสดง field และ CTA ที่เกี่ยวกับ worksheet แทน quiz/checklist

## Auto Grading Engine

สร้าง service กลาง:

- `src/lib/worksheet/grade-worksheet-submission.ts`
- รับ `worksheetData` และ `studentAnswers`
- คืนค่า score, maxScore, itemResults และ manualReviewRequired

กฎตรวจคำตอบ MVP:

- `multiple_choice`: เทียบ index
- `short_text exact`: trim แล้วเทียบตรง
- `short_text normalized`: trim, lower-case, normalize whitespace, รองรับ accepted answers หลายค่า

ผลลัพธ์ตัวอย่าง:

```ts
type WorksheetGradeResult = {
  score: number;
  maxScore: number;
  itemResults: Array<{
    itemId: string;
    correct: boolean | null;
    score: number;
    maxScore: number;
    needsReview: boolean;
  }>;
};
```

## Phase Plan

### Phase 1: Worksheet MVP

- คง sidebar เดิม และใช้ `Classrooms > Assignments` เป็น entry point หลัก
- เพิ่ม `Assignment.type = "worksheet"`
- เพิ่ม schema validation สำหรับ `worksheetData`
- สร้าง grading engine สำหรับ `short_text` และ `multiple_choice`
- สร้าง student worksheet player
- เพิ่มตัวเลือก `worksheet` ใน assignment dialog เดิม
- สร้าง teacher worksheet editor แบบพื้นฐานที่ถูกเปิดจาก assignment flow
- บันทึก submission พร้อมคะแนนอัตโนมัติ
- เพิ่ม test สำหรับ schema, grading, submit authorization

Exit criteria:

- ครูหา worksheet เจอผ่าน assignment flow เดิมโดยไม่ต้องมีเมนูใหม่
- ครูสร้างใบงานจากรูปภาพได้
- นักเรียนตอบและส่งงานได้
- ระบบตรวจคะแนนได้อย่างน้อย 2 ชนิดคำถาม
- ครูเห็นคะแนนในระบบ assignment/classroom เดิม

### Phase 2: Document Background

- รองรับ PDF หลายหน้า
- แปลง PDF page เป็น image background หรือใช้ PDF renderer ฝั่ง client
- เพิ่ม page navigation ใน editor และ student player
- เพิ่ม duplicate item, copy/paste, snap/grid
- เพิ่ม preview ก่อน publish

Exit criteria:

- ครูใช้ PDF เป็นใบงานหลายหน้าได้
- item คงตำแหน่งถูกต้องบน desktop/mobile
- student player ไม่ทำ layout shift ระหว่างโหลดหน้า

### Phase 3: Interactive Items

- เพิ่ม drag-drop
- เพิ่ม matching pairs
- เพิ่ม fill-in-the-blank หลายช่อง
- เพิ่ม audio/video prompt โดยใช้ upload route เดิม
- เพิ่ม partial score

Exit criteria:

- worksheet รองรับ activity ที่มากกว่า quiz ปกติ
- auto grading ครอบคลุมคำถามหลักที่ครูใช้บ่อย
- submission result แสดงรายละเอียดรายข้อได้

### Phase 4: Review, Analytics, And Polish

- เพิ่ม manual review queue
- เพิ่ม export results
- เพิ่ม classroom analytics สำหรับ worksheet
- เพิ่ม resubmit policy
- เพิ่ม accessibility pass สำหรับ keyboard/screen reader
- เพิ่ม mobile editing constraints หรือ tablet-first editor mode

Exit criteria:

- ครูตรวจงานที่ auto grading ไม่ครอบคลุมได้
- ผู้บริหาร/ครูเห็นภาพรวมผลลัพธ์ของใบงาน
- ระบบพร้อมใช้จริงในห้องเรียน pilot

## Security And Authorization

- Teacher APIs ต้องตรวจ `auth()` และ classroom ownership/access
- Student APIs ต้องตรวจ `studentCode` และ classroom assignment access
- ห้ามส่ง answer key ไปยัง student API
- จำกัดขนาดไฟล์และชนิดไฟล์ตาม upload policy เดิม
- เพิ่ม rate limit สำหรับ submit/check-answer
- ป้องกัน duplicate submission ตาม policy เดิมของ `AssignmentSubmission`
- audit log สำหรับ upload, create, update, submit, manual score override

## Testing Plan

Unit tests:

- worksheet schema validation
- answer normalization
- grading engine
- score rounding
- manual review flags

Route tests:

- teacher create/update worksheet auth
- student load worksheet hides answer key
- student submit validates payload
- duplicate submit behavior
- invalid classroom/student code behavior

Component tests:

- editor renders existing worksheet data
- student player submits expected payload
- mobile layout keeps answer fields inside worksheet bounds

Manual QA:

- teacher uploads image and creates worksheet
- teacher previews worksheet
- student submits all answers
- student tries incomplete answers
- teacher views result
- unauthorized teacher cannot edit another classroom worksheet

## Risks

- PDF rendering and coordinate scaling can become the hardest UX issue
- Drag-drop and matching need careful mobile behavior
- Storing complex worksheet data in JSON is fast for MVP but may become harder to query later
- Speaking answers should start as manual review or AI-assisted review, not hard auto grading
- Large files and many pages can increase storage and bandwidth cost

## Recommended First Implementation Slice

เริ่มจาก image-based worksheet ก่อน:

- ครูเข้า `Classrooms > Assignments > Worksheet`
- ครูอัปโหลด `JPG/PNG`
- ครูวาง `short_text` และ `multiple_choice`
- นักเรียนทำใบงานบนหน้าเดียว
- ระบบตรวจคะแนนและบันทึก submission

เหตุผล:

- ใช้ upload route เดิมได้
- ลดความซับซ้อนของ PDF rendering
- ทดสอบ grading engine และ student flow ได้เร็ว
- เห็นคุณค่าของระบบก่อนลงทุนกับ editor ขั้นสูง

## Key Files To Touch Later

- `prisma/schema.prisma`
- `src/lib/question-set-schema.ts`
- `src/lib/assignment-type.ts`
- `src/lib/assignment-form-type-label.ts`
- `src/lib/worksheet/*`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/*`
- `src/components/student/*`
- `src/components/classroom/*`
- `src/components/dashboard/*`
- `src/app/dashboard/classrooms/[id]/page.tsx`
- `src/app/student/[code]/quiz/[assignmentId]/page.tsx`

## Open Questions

- ต้องการให้ใบงานผูกกับ classroom เท่านั้น หรือสร้างเป็น reusable worksheet library แบบ `QuestionSet`
- ต้องการให้นักเรียนทำซ้ำได้หรือส่งได้ครั้งเดียว
- คะแนน worksheet ควรเข้า Negamon/EXP ทันทีเหมือน quiz หรือแยก policy
- ต้องการรองรับ PDF ใน MVP หรือเริ่มจากรูปภาพก่อน
- ต้องการ speaking answer เป็น manual review, teacher listen, หรือ AI-assisted scoring
- หลัง MVP ต้องการให้ worksheet ไปอยู่ใน `My Sets` ด้วยหรือคงไว้เฉพาะ assignment flow
