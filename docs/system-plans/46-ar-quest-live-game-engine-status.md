# AR Quest Live Game Engine Status

## สถานะ

Live Game Engine MVP พร้อมใช้งานในเฟส 1 แล้ว

## สิ่งที่ทำแล้ว

- เพิ่ม `AR_QUEST` เข้า `GameManager`, socket create/join/start lifecycle และ persistence recovery
- เพิ่ม `ArQuestEngine` สำหรับโหลดคำถาม, serve คำถาม, ตรวจคำตอบ, เก็บ `arScore`, `streak`, `correctAnswers`, `incorrectAnswers`
- เพิ่ม socket events `submit-ar-answer`, `ar-tracking-ready`, `ar-quest-state`, `ar-answer-result`
- เปิดปุ่ม AR Quest ในหน้าเลือกโหมดเกมของครู
- เพิ่มหน้า settings สำหรับ AR Quest โดยเลือกได้ว่าเล่นบนจอครูหรือจอนักเรียน พร้อมค่า Local Camera + Hand Tracking
- เพิ่ม host live view สำหรับครู ดู PIN, เวลา, สถานะ Local Camera/Hand Tracking และ leaderboard
- เพิ่ม player state/type สำหรับ `ArQuestPlayer` และให้หน้าเล่นตอบคำถามผ่าน live socket ได้
- เพิ่ม unit test `src/lib/game-engine/__tests__/ar-quest-engine.test.ts`

## ข้อจำกัดที่ยังเหลือ

- หน้าเล่น live ของนักเรียนยังใช้ question UI เดิมเป็น fallback ยังไม่ใช่ camera full-screen AR UI
- Hand Tracking จริงด้วย MediaPipe ยังไม่ได้ต่อกับ live player screen
- สถานะกล้อง/มือยังไม่ sync แบบละเอียดกลับไปหน้า host
- หน้า audit/remediation เฉพาะ AR Quest ยังไม่ได้ทำ UI แยก

## Verification

- `npm.cmd run predev` ผ่าน
- `npm.cmd run build` ผ่าน
- `node .\node_modules\vitest\vitest.mjs run --config vitest.config.mts --pool threads src\lib\game-engine\__tests__\ar-quest-engine.test.ts` ผ่าน

## Classroom Rewards

สถานะ: Classroom Rewards สำหรับ AR Quest เชื่อมแล้ว

สิ่งที่ทำแล้ว:

- เพิ่ม `ArQuestRewardClaim` ใน Prisma สำหรับกันรางวัลซ้ำด้วย `idempotencyKey`
- เพิ่ม `arQuestRewardClassroomId` ใน `GameSettings`
- เมื่อครู host AR Quest จากลิงก์ที่มี `classroomId` ระบบจะตรวจว่าเป็นห้องของครู และบันทึก classroom id ลงใน settings
- เมื่อนักเรียน join ด้วย student code ในห้องที่ผูก reward ระบบจะ bind `studentId` ให้ผู้เล่น AR Quest
- หลังเกม AR Quest จบ `GameManager` จะ trigger reward sync อัตโนมัติ
- Reward sync จะจับคู่ผู้เล่นกับนักเรียนด้วย `studentId` ก่อน แล้ว fallback เป็นชื่อ/ชื่อเล่น ถ้าชื่อไม่ซ้ำ
- EXP เข้า `Student.behaviorPoints` และสร้าง `PointHistory.reason` รูปแบบ `ar-quest-live-v1|...`
- เพิ่ม notification keys สำหรับรางวัล AR Quest
- เพิ่ม audit events `classroom.ar_quest.rewards_applied`, `classroom.ar_quest.rewards_skipped`, `classroom.ar_quest.rewards_sync_failed`

Verification เพิ่มเติม:

- `node .\node_modules\vitest\vitest.mjs run --config vitest.config.mts --pool threads src\__tests__\ar-quest-live-reward-sync.test.ts src\lib\game-engine\__tests__\ar-quest-reward-sync-runner.test.ts` ผ่าน
- `npm.cmd run build` ผ่าน
