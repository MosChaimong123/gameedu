# Plan 39: SkillLane-Style Online Course LMS

Status: Phase 49 release gate in QA  
Owner: Teacher / Student Learning Platform  
Scope: ระบบคอร์สเรียนออนไลน์แบบ LMS ที่ต่อยอดจาก Lesson Content V2 เท่านั้น

## เป้าหมาย

พัฒนาระบบบทเรียนเดี่ยวให้กลายเป็นระบบคอร์สเรียนออนไลน์แบบเป็นชุดเรียน เหมาะกับครูสร้างเนื้อหาให้นักเรียนเรียนต่อเนื่องได้ คล้ายแนวคิดของ SkillLane แต่ปรับให้เป็นระบบภายใน TeachPlayEdu ก่อน ไม่ใช่ marketplace สาธารณะ

ระบบใหม่ต้องทำให้ครูสามารถ:

- สร้างคอร์สจากหลายบทเรียน V2
- จัดลำดับบทเรียนเป็นโมดูลหรือบท
- เพิ่มวิดีโอ เอกสาร และสื่อประกอบในแต่ละบทเรียน
- Assign คอร์สให้ห้องเรียน
- ดู progress รายคน รายห้อง และรายบทเรียน
- ปล่อย certificate หรือ achievement ได้ในเฟสถัดไป

ระบบนักเรียนต้องทำให้:

- เห็นคอร์สที่ได้รับมอบหมาย
- เข้าเรียนต่อจากจุดเดิมได้
- ดูวิดีโอ เอกสาร และเนื้อหา Lesson V2 ได้ลื่น
- ระบบบันทึก progress ชัดเจน
- จบคอร์สได้เมื่อผ่านเงื่อนไขที่กำหนด

## หลักการสำคัญ

- ใช้ `LessonContentV2` เป็นเนื้อหาหลักเท่านั้น
- ไม่ revive ระบบ Lesson V1, old quiz draft, หรือ legacy AI lesson route
- แยก `Course` ออกจาก `Lesson` ชัดเจน: คอร์สคือชุดของบทเรียน ไม่ใช่บทเรียนเดี่ยว
- ระบบแบบทดสอบใหม่ต้องเป็น `Assessment V2` แยกจากเนื้อหาบทเรียน
- หน้า student ต้องอ่าน state เดียว ไม่แปลงหลาย schema ปนกัน
- Teacher/Admin visibility ต้องอ่านจาก course progress schema ใหม่

## โครงสร้างข้อมูลที่ต้องเพิ่ม

### Course

เก็บข้อมูลคอร์สหลัก

- `id`
- `teacherId`
- `title`
- `description`
- `coverImageUrl`
- `subject`
- `gradeLevel`
- `categoryIds`
- `tagIds`
- `status`: `draft | published | archived`
- `visibility`: `private | classroom`
- `estimatedMinutes`
- `createdAt`
- `updatedAt`

### CourseModule

ใช้แบ่งคอร์สเป็นบทหรือหมวดใหญ่

- `id`
- `courseId`
- `title`
- `description`
- `order`
- `lessonRefs`

### CourseLessonRef

ผูกบทเรียน V2 เข้ากับคอร์ส

- `lessonId`
- `moduleId`
- `order`
- `required`
- `unlockRule`
- `estimatedMinutes`

### CourseAssignment

Assign คอร์สให้ห้องเรียน

- `id`
- `courseId`
- `classroomId`
- `teacherId`
- `startAt`
- `dueAt`
- `status`
- `createdAt`

### CourseProgress

เก็บ progress นักเรียนต่อคอร์ส

- `id`
- `courseId`
- `studentId`
- `classroomId`
- `completedLessonIds`
- `currentLessonId`
- `percent`
- `startedAt`
- `lastOpenedAt`
- `completedAt`

### CourseAssessment

เฟสแรกยังไม่ต้องทำลึก แต่ต้องเตรียมที่ไว้

- `id`
- `courseId`
- `type`: `pretest | posttest | checkpoint`
- `title`
- `rules`
- `questionSetId`

### CourseCertificate

ออกใบรับรองหรือ achievement หลังเรียนจบ

- `id`
- `courseId`
- `studentId`
- `issuedAt`
- `certificateCode`
- `criteriaSnapshot`

## Phase 39: Course LMS Foundation

Goal: วาง foundation ให้ระบบคอร์สใช้ Lesson V2 ได้โดยไม่ดึงระบบบทเรียนเก่ากลับมา

Checklist:

- [x] เพิ่ม type `CourseContentV1`
- [x] เพิ่ม type `CourseModule`
- [x] เพิ่ม type `CourseLessonRef`
- [x] เพิ่ม validator สำหรับ course draft
- [x] เพิ่ม validator สำหรับ published course
- [x] ยืนยันว่า lesson ที่ใส่ในคอร์สต้องเป็น `lesson_content_v2`
- [x] สร้าง helper ตรวจ publish readiness ของคอร์ส
- [x] เพิ่ม tests สำหรับ valid/invalid course payload
- [x] เพิ่ม failure behavior เมื่อคอร์สอ้างถึง lesson เก่าหรือ lesson ที่ publish ไม่ได้

Implementation:

- Added `src/lib/courses/course-content.ts`
- Added `src/lib/courses/__tests__/course-content.test.ts`
- Targeted tests passed: `src/lib/courses/__tests__/course-content.test.ts` and `src/lib/lessons/__tests__/lesson-content.test.ts`
- Type check passed: `npm.cmd run predev`

## Phase 40: Teacher Course Builder

Goal: ให้ครูสร้างคอร์สจากบทเรียน V2 ได้

Checklist:

- [x] สร้างหน้า `/dashboard/courses`
- [x] สร้างหน้า `/dashboard/courses/create`
- [x] สร้างหน้า `/dashboard/courses/[id]/edit`
- [x] เพิ่ม UI ตั้งชื่อคอร์ส วิชา ระดับชั้น คำอธิบาย และรูปปก
- [x] เพิ่ม UI สร้างโมดูล
- [x] เพิ่ม UI เลือกบทเรียน V2 เข้ามาในโมดูล
- [x] เพิ่ม reorder ลำดับโมดูลและบทเรียนด้วยปุ่มขึ้น/ลง
- [x] เพิ่ม save draft
- [x] เพิ่ม publish guard
- [x] ห้าม publish ถ้ามี lesson legacy หรือ lesson ยังไม่พร้อม

Implementation:

- Added Prisma `Course` model and `User.courses` relation
- Added `GET/POST /api/courses`
- Added `GET/PATCH/DELETE /api/courses/[id]`
- Added `src/components/courses/course-builder-client.tsx`
- Added `/dashboard/courses`, `/dashboard/courses/create`, and `/dashboard/courses/[id]/edit`
- Added sidebar entry for teacher course builder
- Added targeted route tests in `src/__tests__/teacher-courses-routes.test.ts`
- Targeted tests passed: course contracts and teacher course routes
- Type check passed: `npm.cmd run predev`
- Production build passed: `npm.cmd run build`

## Phase 41: Classroom Course Assignment

Goal: ให้ครู assign คอร์สให้ห้องเรียนได้เหมือน assignment จริง

Checklist:

- [x] สร้าง route `POST /api/classrooms/[id]/courses`
- [x] สร้าง route `GET /api/classrooms/[id]/courses`
- [x] เพิ่ม assign dialog ใน teacher course page
- [x] รองรับ start date และ due date ใน API
- [x] กัน assign คอร์ส draft
- [x] กัน assign คอร์สที่ไม่มีบทเรียนหรือ lesson ไม่พร้อม
- [x] เพิ่ม classroom course list ในหน้าห้องเรียน
- [x] เพิ่ม tests สำหรับ permission, draft guard, duplicate assignment/upsert

Implementation:

- Added Prisma `CourseAssignment` model and classroom/course relations
- Added `GET/POST /api/classrooms/[id]/courses`
- Added assign dialog in `CourseBuilderClient`
- Added classroom `courses` tab and `ClassroomCoursesProgressTab`
- Added targeted route tests in `src/__tests__/classroom-courses-routes.test.ts`
- Targeted tests passed: classroom course routes, teacher course routes, course contracts
- Type check passed: `npm.cmd run predev`
- Production build passed: `npm.cmd run build`

## Phase 42: Student Course Shelf

Goal: นักเรียนเห็นคอร์สที่ได้รับมอบหมายและเข้าเรียนได้ง่าย

Checklist:

- [x] เพิ่ม tab หรือ section คอร์สเรียนใน student dashboard
- [x] สร้าง route `GET /api/student/[code]/courses`
- [x] แสดงคอร์สที่ assigned จาก classroom
- [x] แสดง summary เบื้องต้นของคอร์ส: โมดูล, บทเรียน, เวลาเรียนรวม
- [x] แสดงปุ่มเริ่มเรียนจากบทเรียนแรกชั่วคราวก่อน Phase 43 course player
- [x] แยกคอร์สออกจากบทเรียนเดี่ยวให้ชัดเจน
- [x] เพิ่ม empty state เมื่อยังไม่มีคอร์ส

Implementation:

- Added `GET /api/student/[code]/courses`
- Added `StudentCoursesTab`
- Added student dashboard learn tab `courses`
- Updated student dashboard URL tab allowlist for `lessons` and `courses`
- Added targeted route tests in `src/__tests__/student-courses-routes.test.ts`
- Targeted tests passed: student/classroom/teacher course routes and course contracts
- Type check passed: `npm.cmd run predev`
- Production build compiled successfully and included `GET /api/student/[code]/courses`

## Phase 43: Student Course Player

Goal: ทำหน้าเรียนแบบ course player ที่อ่าน Lesson V2 ได้เต็มระบบ

Checklist:

- สร้างหน้า `/student/[code]/courses/[courseId]`
- แสดง sidebar รายชื่อโมดูลและบทเรียน
- เปิด lesson V2 ภายใน course player
- รองรับวิดีโอเป็นสื่อหลักใน section
- รองรับเอกสารประกอบการเรียน
- มีปุ่ม previous / next lesson
- บันทึก current lesson
- แสดง percent progress
- รองรับ mobile layout

Implementation:

- [x] Added `GET /api/student/[code]/courses/[courseId]`
- [x] Added `/student/[code]/courses/[courseId]`
- [x] Added `StudentCoursePlayer`
- [x] Updated student course shelf cards to open the course player instead of the standalone lesson page
- [x] Course player renders Lesson V2 topics, objectives, sections, video/image media, and document references
- [x] Added previous / next lesson navigation
- [x] Stores current lesson locally for temporary resume; persistent progress remains Phase 44
- [x] Supports responsive sidebar/main layout for mobile and desktop
- [x] Added targeted tests in `src/__tests__/student-course-player-route.test.ts`
- [x] Targeted tests passed: student course shelf and player routes
- [x] Type check passed: `npm.cmd run predev`

## Phase 44: Progress And Resume Runtime

Goal: progress ต้องแม่นและใช้ต่อกับ analytics ได้

Checklist:

- สร้าง route `PATCH /api/student/[code]/courses/[courseId]/progress`
- บันทึก completed lesson
- บันทึก current lesson
- คำนวณ percent จาก required lesson เท่านั้น
- รองรับ resume จาก lesson ล่าสุด
- กันนักเรียน update progress ของคนอื่น
- เพิ่ม tests สำหรับ complete lesson, resume, course complete
- เพิ่ม event log เมื่อเริ่มคอร์สและจบคอร์ส

Implementation:

- [x] Added Prisma `CourseProgress` model
- [x] Added `src/lib/courses/course-progress.ts`
- [x] Added `PATCH /api/student/[code]/courses/[courseId]/progress`
- [x] Added `POST /api/student/[code]/courses/[courseId]/complete`
- [x] Updated `GET /api/student/[code]/courses/[courseId]` to return normalized progress
- [x] Student course player now resumes from server-side `currentLessonId`
- [x] Student course player now syncs lesson selection to server progress
- [x] Student course player can mark lessons complete and show completed state
- [x] Progress percent is calculated from required lessons only
- [x] Added start/complete history events via `PointHistory` zero-value rows
- [x] Added targeted tests in `src/__tests__/student-course-progress-routes.test.ts`
- [x] Targeted tests passed: player route, progress route, and course shelf route
- [x] Type check passed: `npm.cmd run predev`

## Phase 45: Course Catalog And Discovery

Goal: ทำหน้าค้นหาและจัดหมวดคอร์สแบบ LMS

Checklist:

- เพิ่ม category และ tag catalog
- เพิ่ม filter: วิชา, ระดับชั้น, สถานะ, มีเอกสาร, มีวิดีโอ, มีแบบทดสอบ
- เพิ่ม sorting: ล่าสุด, กำลังใช้งาน, นักเรียนเรียนเยอะ
- เพิ่ม course card สำหรับ teacher
- เพิ่ม course card สำหรับ student
- เพิ่ม cover image fallback
- เพิ่ม search title/description

Implementation:

- [x] Added `src/lib/courses/course-catalog.ts`
- [x] Added `src/components/courses/course-cover-art.tsx`
- [x] Teacher `/dashboard/courses` now supports search, subject filter, grade filter, feature filter, and sorting
- [x] Teacher course cards now show fallback cover art, usage count, tags, and richer catalog metadata
- [x] Updated `GET /api/courses` to include assignment usage counts
- [x] Student course shelf now supports search, subject filter, progress filter, feature filter, and sorting
- [x] Updated `GET /api/student/[code]/courses` to include normalized progress for discovery/continue flows
- [x] Student course cards now show progress bars, continue labels, and fallback cover art
- [x] Added/updated targeted tests for teacher and student course routes
- [x] Targeted tests passed: teacher routes, student shelf routes, player routes, and progress routes
- [x] Type check passed: `npm.cmd run predev`

## Phase 46: Assessment V2

Goal: แบบทดสอบต้องเป็นระบบใหม่แยกจาก LessonContentV2

Checklist:

- สร้าง type `CourseAssessmentV2`
- รองรับ pretest/posttest/checkpoint
- ผูก assessment กับ course หรือ module
- ไม่เก็บ quiz ใน lesson content
- เพิ่ม publish guard ถ้า course ต้องการ assessment แต่ยังไม่มี question set
- เพิ่ม student attempt route
- เพิ่ม teacher result route
- เพิ่ม tests สำหรับ score, pass/fail, retake rule

Implementation:

- [x] Extended `course_content_v1` with optional `assessments`
- [x] Added builder UI for course-level and module-level assessments
- [x] Added publish and assign guard for missing assessment question sets
- [x] Added Prisma `CourseAssessmentAttempt` model
- [x] Added `GET /api/student/[code]/courses/[courseId]/assessments/[assessmentId]`
- [x] Added `POST /api/student/[code]/courses/[courseId]/assessments/[assessmentId]/attempt`
- [x] Added `GET /api/classrooms/[id]/courses/[courseId]/assessment-results`
- [x] Added targeted tests in `src/__tests__/course-assessment-routes.test.ts`
- [x] `npm.cmd run predev` passed
- [x] `npm.cmd run build` passed

## Phase 47: Certificate And Rewards

Goal: นักเรียนจบคอร์สแล้วได้ผลลัพธ์ที่จับต้องได้

Checklist:

- เพิ่ม certificate criteria
- เพิ่ม certificate issue route
- เพิ่ม certificate code
- เพิ่ม certificate preview
- เพิ่ม student achievement เมื่อจบคอร์ส
- เชื่อม gold/reward rule ถ้าต้องการ
- เพิ่ม teacher visibility ว่าใครได้ certificate แล้ว
- เพิ่ม tests สำหรับ duplicate issue และ criteria guard

Implementation:

- Added `CourseCertificate` persistence model in Prisma
- Extended `CourseContentV1` with certificate config and publish-readiness validation
- Added student route payload for certificate config, eligibility, issued status, and assessment attempts
- Added `GET/POST /api/student/[code]/courses/[courseId]/certificate/issue`
- Added `GET /api/classrooms/[id]/courses/[courseId]/certificates`
- Added certificate and reward editor in `CourseBuilderClient`
- Added student course player UI for certificate claim state and reward summary
- Added targeted tests in `src/__tests__/student-course-certificate-route.test.ts`
- Passed targeted tests, `npm.cmd run predev`, and `npm.cmd run build`

## Phase 48: Teacher Analytics And Intervention

Goal: ครูเห็นว่าใครเรียนถึงไหนและต้องช่วยตรงไหน

Checklist:

- เพิ่ม classroom course progress dashboard
- แสดงรายชื่อนักเรียนพร้อม percent
- แสดงบทเรียนที่ค้างมากที่สุด
- แสดง last opened date
- แสดง completed / in progress / not started
- เพิ่ม export CSV
- เพิ่ม teacher note หรือ intervention flag
- เพิ่ม tests สำหรับ query permission และ aggregation

Implementation:

- Added course progress aggregation helpers in `src/lib/courses/classroom-course-analytics.ts`
- Added `GET /api/classrooms/[id]/courses/[courseId]/progress`
- Upgraded `ClassroomCoursesProgressTab` to show:
  - course-level summary cards
  - student percent/status rows
  - blocker lessons
  - intervention flags
  - CSV export
  - quick link into student history modal flow
- Added targeted tests in `src/__tests__/classroom-course-progress-route.test.ts`
- Passed targeted tests, `npm.cmd run predev`, and `npm.cmd run build`

## Phase 49: Release Gate

Goal: ปล่อยระบบคอร์สแบบ production โดยไม่ให้ระบบเก่าปนกลับมา

Checklist:

- ตรวจ route เก่าของ lesson ที่ลบแล้วไม่กลับมา
- ตรวจทุก course route รับเฉพาะ Lesson V2
- รัน targeted tests ของ lesson/course
- รัน `npm.cmd run predev`
- รัน `npm.cmd run build`
- ทดสอบ localhost ด้วย teacher flow: create course, add lessons, publish, assign
- ทดสอบ localhost ด้วย student flow: open course, watch content, complete lesson, resume
- ตรวจ mobile viewport
- ตรวจ teacher analytics
- commit/push/deploy รอบเดียวหลัง QA ผ่าน

Implementation:

- Route audit passed for active source code: removed legacy lesson and quiz generation endpoints are not referenced by the current app code.
- Course route audit passed: current course flow stays on Lesson V2 contracts and legacy lesson payloads are covered by validators and route tests.
- Release-gate targeted tests passed across lesson, course, progress, player, certificate, and assessment flows (13 test files / 73 tests).
- `npm.cmd run predev` passed.
- `npm.cmd run build` passed.
- Temporary localhost smoke test passed for app boot and `GET /api/health`.
- Removed legacy endpoints return `404` in local smoke checks as expected.
- Remaining release-gate work:
  - complete full localhost teacher flow (`create -> publish -> assign`)
  - complete full localhost student flow (`open -> learn -> complete -> resume`)
  - verify mobile viewport in a persistent browser session
  - do one final commit/push/deploy only after manual QA passes

Release Gate Checklist:

- [x] Audit removed legacy lesson/quiz routes
- [x] Audit course routes for Lesson V2 only
- [x] Run targeted lesson/course tests
- [x] Run `npm.cmd run predev`
- [x] Run `npm.cmd run build`
- [x] Verify teacher analytics route/tab still works
- [ ] Manual localhost teacher flow
- [ ] Manual localhost student flow
- [ ] Manual mobile viewport check
- [ ] Commit / push / deploy after QA

## Route Plan

Teacher routes:

- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/[courseId]`
- `PATCH /api/courses/[courseId]`
- `POST /api/courses/[courseId]/publish`
- `POST /api/classrooms/[id]/courses`
- `GET /api/classrooms/[id]/courses`

Student routes:

- `GET /api/student/[code]/courses`
- `GET /api/student/[code]/courses/[courseId]`
- `PATCH /api/student/[code]/courses/[courseId]/progress`
- `POST /api/student/[code]/courses/[courseId]/complete`

Future assessment routes:

- `GET /api/student/[code]/courses/[courseId]/assessments/[assessmentId]`
- `POST /api/student/[code]/courses/[courseId]/assessments/[assessmentId]/attempt`
- `GET /api/classrooms/[id]/courses/[courseId]/assessment-results`

## UI Plan

Teacher:

- Course list
- Course builder
- Module editor
- Lesson picker
- Publish checklist
- Assign course dialog
- Course progress dashboard

Student:

- Course shelf
- Course detail
- Course player
- Module sidebar
- Lesson content viewer
- Download documents
- Continue learning button
- Completion screen

## First Release Scope

ทำก่อน:

- Course draft/publish
- Add Lesson V2 into course
- Assign course to classroom
- Student course player
- Progress tracking
- Teacher progress visibility

ยังไม่ทำใน release แรก:

- Marketplace public course sale
- Payment per course
- Instructor payout
- CPD legal/compliance workflow
- Full certificate designer
- Advanced recommendation engine
- Public course SEO pages

## Migration Rule

ระบบคอร์สใหม่ต้องไม่ migrate Lesson V1 เข้ามาอัตโนมัติ ถ้าพบ lesson เก่าให้แสดงเป็น incompatible และให้ครูสร้างหรือแปลงเป็น Lesson V2 ใหม่เท่านั้น

Acceptance criteria:

- ไม่มี course ใด publish ได้ถ้ามี legacy lesson
- Student course player ไม่อ่าน V1
- Teacher course builder แสดงเฉพาะ lesson V2 ที่พร้อมใช้
- API validation reject payload เก่าอย่างชัดเจน

## QA Commands

Targeted tests:

```powershell
npm.cmd test -- src/lib/lessons/__tests__/lesson-content.test.ts src/__tests__/teacher-lessons-routes.test.ts src/__tests__/classroom-lessons-routes.test.ts src/__tests__/student-lessons-routes.test.ts
```

Before deploy:

```powershell
npm.cmd run predev
npm.cmd run build
```

Manual QA:

- Teacher creates course draft
- Teacher adds two Lesson V2 lessons
- Teacher publishes course
- Teacher assigns course to classroom
- Student opens assigned course
- Student completes first lesson
- Student refreshes and resumes correctly
- Teacher sees progress update

## Development Order

1. Course contracts and validators
2. Course CRUD routes
3. Teacher course builder
4. Classroom assignment
5. Student course shelf
6. Student course player
7. Progress runtime
8. Teacher analytics
9. Release gate

## Definition Of Done

- Course system uses Lesson V2 only
- Old lesson/quiz generation flow is not reintroduced
- Teacher can create, publish, and assign a course
- Student can learn and resume a course
- Progress is visible to teacher
- Build passes
- Manual localhost QA passes before deploy
