# i18n System Follow-up Plan

อัปเดตล่าสุด: 2026-05-02

## เป้าหมาย

หลังจากกวาดข้อความภาษาไทย/อังกฤษและแก้ตัวอักษรเพี้ยนรอบใหญ่แล้ว งานถัดไปไม่ควรเป็นแค่การไล่เก็บจุดหลุดทีละหน้าอีกต่อไป แต่ควรเปลี่ยนเป็นการทำระบบให้:

- ข้อความใหม่ไม่หลุดจากระบบภาษาอีก
- API และ UI ใช้มาตรฐาน error เดียวกัน
- มี test กัน regression
- ตรวจ flow ใช้งานจริงได้ง่าย
- ค่อย ๆ ลดการพึ่งพา legacy Thai fallback

## สถานะปัจจุบัน

งานที่ทำแล้ว:

- กวาด UI หลักให้แสดงตามภาษาที่เลือกได้ดีขึ้น
- แก้ข้อความ mojibake ใน `src/app`, `src/components`, `src/lib`
- รวมการแปลบางส่วนผ่าน `translation-lookup.ts`
- ปรับ route ฝั่ง billing / upload / settings / admin actions ให้ map error message ได้ดีขึ้น
- ทำให้หน้า upgrade, board, host, settings, negamon, OMR, landing, legal pages สะอาดขึ้น
- เริ่มข้อ 1 แล้วด้วยสคริปต์ guardrail:
  - `npm run check:i18n`
  - `npm run check:i18n:strict`

ความคืบหน้าที่วัดได้:

- findings จาก `check:i18n` ลดจากประมาณ `171`
- เหลือประมาณ `120` หลังเก็บ `admin actions + API error`
- เหลือ `93` หลังเก็บ `landing + legal + auth + classroom action errors`
- เหลือ `69` หลังลด false positive ของ guardrail และเก็บ mock/demo text เพิ่ม
- เหลือ `56` หลังเก็บ `board + classroom-dashboard-actions`

งานที่ยังควรทำต่อ:

- วาง guardrail ระดับโค้ดให้เข้มขึ้น
- รวมมาตรฐาน API error ให้เป็นระบบเดียว
- เพิ่ม regression tests ด้านภาษา
- ทำ manual QA แบบ end-to-end
- cleanup translation source ระยะยาว

## ลำดับงานแนะนำ

### 1. i18n Guardrail

เป้าหมาย:

- กันไม่ให้ dev hardcode ข้อความใหม่ลง JSX / toast / placeholder / aria / title / alt โดยไม่ผ่าน `t(...)`

งานย่อย:

- เพิ่ม lint rule หรือ script scan สำหรับ:
  - JSX text
  - `placeholder=`
  - `title=`
  - `aria-label=`
  - toast description/title
  - `new Error("...")` ที่เป็น user-facing
- เพิ่ม guideline ในเอกสารทีม
- เพิ่ม command/check ที่รันก่อน merge หรือก่อน deploy

สถานะล่าสุด:

- มีสคริปต์ที่ `scripts/check-i18n-hardcoded.mjs`
- มี 2 โหมด:
  - `npm run check:i18n` ใช้เป็นรายงาน
  - `npm run check:i18n:strict` ใช้เป็นโหมด fail ตอนพร้อมบังคับจริง
- ปรับ script ให้ลด false positive แล้วในกลุ่ม:
  - identifier-like keys
  - hook/provider invariant errors
  - code-shaped strings เช่น `return (`, `new Date(...)`, `x²`
- findings ล่าสุดอยู่ที่ `56`

งานถัดไปของข้อนี้:

- ลด false positive เพิ่มในกลุ่ม type-level / code-shaped literals
- ปิด findings กลุ่มสำคัญทีละหมวด
- เมื่อ findings ต่ำพอ ค่อยผูก `strict` เข้ากับ workflow บังคับ

ผลลัพธ์ที่คาดหวัง:

- ถ้ามีข้อความใหม่หลุดเป็น hardcoded text จะถูกจับได้ตั้งแต่ตอนพัฒนา

### 2. Error Standardization

เป้าหมาย:

- ให้ API ตอบ error เป็นโครงสร้างเดียวกันทั้งระบบ โดยใช้ `AppErrorCode` เป็นหลัก

งานย่อย:

- ไล่เปลี่ยน route ที่ยังคืน string ดิบ ให้ใช้:
  - `createAppErrorResponse(...)`
  - `createAppError(...)`
- แยกกลุ่ม error code เพิ่มถ้าจำเป็น:
  - auth
  - billing
  - board
  - classroom
  - negamon
  - OMR
- ทำให้ UI ทุกหน้าที่รับ response ใช้ helper กลาง:
  - `getLocalizedErrorMessageFromResponse(...)`
  - `getLocalizedMessageFromApiErrorBody(...)`

สถานะล่าสุด:

- เก็บ admin actions และหลาย route ฝั่ง billing/settings/upload แล้ว
- เพิ่ม code `ENDPOINT_NO_LONGER_AVAILABLE`
- เก็บ route ฝั่ง public/profile/set บางส่วนเพิ่มแล้ว
- auth rate limit ฝั่ง login ใช้ code path แทนประโยคอังกฤษตรง ๆ แล้ว
- เก็บ `board-actions` ให้โยน key ที่หน้า UI แปลได้โดยตรงแล้ว
- เก็บ `classroom-dashboard-actions` ให้โยน code/message จาก API แทน string อังกฤษดิบแล้ว

งานถัดไปของข้อนี้:

- กลุ่ม `board actions`
- กลุ่ม `classroom-dashboard-actions`
- กลุ่ม `quiz-take-context`
- กลุ่ม `socket/register-game-socket-handlers`

ผลลัพธ์ที่คาดหวัง:

- ลดโอกาสที่ข้อความอังกฤษดิบจะหลุดขึ้นหน้าเว็บ
- แปลไทย/อังกฤษได้จากจุดเดียว

### 3. Language Regression Tests

เป้าหมาย:

- กัน regression หลังมีการเพิ่มฟีเจอร์หรือ refactor

งานย่อย:

- เพิ่ม unit tests ให้ helper แปลข้อความและ error
- เพิ่ม snapshot / render tests บางหน้าสำคัญใน EN/TH
- เพิ่ม scan test สำหรับจับ pattern ต่อไปนี้:
  - mojibake
  - hardcoded placeholder
  - hardcoded aria/title/alt
  - untranslated fallback key ที่หลุดแสดงตรง ๆ

ชุดหน้าที่ควรเริ่มก่อน:

- login / register
- dashboard
- board
- host / play
- negamon battle
- upgrade / billing
- OMR

ผลลัพธ์ที่คาดหวัง:

- รู้เร็วเมื่อข้อความหลุดหรือพังหลังแก้โค้ด

### 4. End-to-End QA Flow

เป้าหมาย:

- ตรวจจากพฤติกรรมหน้าเว็บจริง ไม่ใช่แค่ scan source code

งานย่อย:

- ทำ checklist เปิดใช้งานจริงทีละ flow
- ทดสอบทั้งภาษาไทยและอังกฤษ
- เช็กกรณี success / empty state / error state

flow ที่ควรตรวจ:

- sign in / sign up
- profile / settings
- classroom dashboard
- board create / vote / comment
- host / lobby / play
- negamon selection / battle / rewards
- billing / checkout / reconcile
- OMR create / scan / result

ผลลัพธ์ที่คาดหวัง:

- เจอข้อความที่ regex หาไม่เจอ
- เจอ state พิเศษที่ยังไม่ผ่านระบบภาษา

### 5. Translation Source Cleanup

เป้าหมาย:

- ลดการพึ่งพา `translations-th-legacy.json` และ `translation-lookup.ts` แบบชั่วคราว

งานย่อย:

- ย้ายข้อความไทยที่ใช้งานจริงไปอยู่ source หลักที่อ่านง่าย
- ใช้ `translation-lookup.ts` เป็น fallback ชั่วคราวเท่าที่จำเป็น
- ทยอยลบ legacy keys ที่ไม่ได้ใช้แล้ว
- ถ้าพร้อม อาจแยก translation file ตามโดเมน เช่น:
  - auth
  - dashboard
  - board
  - negamon
  - billing
  - omr

ผลลัพธ์ที่คาดหวัง:

- โครงสร้างแปลง่ายขึ้น
- แก้ข้อความในอนาคตได้เร็วขึ้น

## ลำดับลงมือทำจริง

แนะนำให้ทำตามนี้:

1. `i18n guardrail`
2. `error standardization`
3. `language regression tests`
4. `end-to-end QA flow`
5. `translation source cleanup`

## Definition of Done

จะถือว่ารอบถัดไปสำเร็จเมื่อ:

- ข้อความใหม่ทุกจุดผ่าน `t(...)` หรือ helper กลาง
- route ที่ user-facing ไม่คืนข้อความอังกฤษดิบแบบไม่มี code
- มี test จับ regression เรื่องภาษาอย่างน้อยใน flow สำคัญ
- มี checklist QA ที่ย้อนใช้ได้
- จำนวนการพึ่งพา legacy Thai fallback ลดลงอย่างมีนัยสำคัญ

## โฟกัสรอบหน้า

ถ้าจะทำต่อทันทีจากสถานะล่าสุด แนะนำลุยตามนี้:

1. `board actions + classroom-dashboard-actions`
2. `quiz / socket / game-engine user-facing errors`
3. เริ่ม `language regression tests` ชุดแรกสำหรับ login/register/dashboard
## 2026-05-02 Progress Note

- `check:i18n` ลดจาก `56` เหลือ `25`
- ก้อนที่ปิดเพิ่มแล้ว:
  - `quiz-take-context` + quiz plain-error keys
  - `socket/register-game-socket-handlers` user-facing errors ส่วนหลัก
  - `crypto-hack` task overlay / frequency / pattern UI text
  - socket error formatter รวมเป็น `src/lib/socket-error-messages.ts`
- โฟกัสถัดไป:
  - `classroom attendance + classroom points + manual score validation`
  - `billing/env/internal technical strings`
  - เริ่ม `language regression tests`

## 2026-05-02 Progress Note 2

- `check:i18n` ลดจาก `25` เหลือ `15`
- ก้อนที่ปิดเพิ่มแล้ว:
  - `classroom attendance` service + route error keys
  - `classroom points` single/batch service + route error keys
  - `manual score validation` error keys
- โฟกัสถัดไป:
  - `billing/env/internal technical strings`
  - false positive / compact labels เช่น `CRIT+`
  - เริ่ม `language regression tests`

## 2026-05-02 Progress Note 3

- `check:i18n` ลดจาก `15` เหลือ `0`
- ก้อนที่ปิดเพิ่มแล้ว:
  - `billing/env/internal technical strings`
  - `battle-loadout` validation message keys
  - compact battle label `CRIT+` ให้ผ่าน `battleBadgeCrit`
  - false positive จาก code-shaped JSX / hook invariant
  - Thai billing start route error response ให้กลับผ่าน `createAppErrorResponse`
  - direct API error key localization ใน `ui-error-messages`
- ตรวจผ่านแล้ว:
  - `npm.cmd run check:i18n`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- โฟกัสถัดไป:
  - เริ่ม `language regression tests` ชุดแรก
  - ทำ checklist/manual QA flow ตามหน้าใช้งานจริง
 
## 2026-05-02 Progress Note 4

- เริ่ม `language regression tests` ชุดแรกแล้ว:
  - เพิ่ม `src/__tests__/i18n-regression.test.ts`
  - ครอบคลุม core keys ของ login / register / dashboard
  - ครอบคลุม shared API error codes สำคัญ ให้ resolve ได้ทั้ง EN/TH
  - ตรวจ structured API error body/response ว่าไม่หลุดเป็น raw code/key
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- โฟกัสถัดไป:
  - ขยาย `language regression tests` ไปยัง board / host-play / negamon / OMR
  - ทำ checklist/manual QA flow สำหรับ sign in / sign up / dashboard ก่อน

## 2026-05-02 Progress Note 5

- ขยาย `language regression tests` เพิ่มแล้ว:
  - เพิ่ม coverage key กลุ่ม `board / host-play / negamon / OMR`
  - เพิ่ม coverage formatter ของ `board-action-error-messages`
  - เพิ่ม coverage formatter ของ `socket-error-messages`
  - เพิ่ม coverage OMR-specific error override ผ่าน `getLocalizedOmrErrorMessageFromResponse`
- test ชุดนี้เจอช่องว่างจริง:
  - `apiError_PLAN_LIMIT_OMR_MONTHLY`
  - `apiError_PLAN_LIMIT_LIVE_PLAYERS`
- เติม Thai supplemental keys ใน `src/lib/translation-lookup.ts` แล้ว
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- โฟกัสถัดไป:
  - ทำ checklist/manual QA flow สำหรับ sign in / sign up / dashboard
  - ถ้าจะเพิ่ม automated coverage ต่อ ให้ต่อที่ OMR scan/result และ host/play render states

## 2026-05-02 Progress Note 6

- เริ่มก้อน `end-to-end QA flow` แบบ manual checklist แล้ว:
  - เพิ่ม `docs/i18n-manual-qa-checklist.md`
  - ครอบคลุม sign in / sign up / teacher dashboard
  - เพิ่ม smoke section สำหรับ student dashboard
  - เพิ่ม cross-flow checks สำหรับ structured API errors, legacy text errors, network failures, unauthorized, forbidden, not found
- โฟกัสถัดไป:
  - ใช้ checklist นี้รัน QA จริงบน dev/staging
  - บันทึก issue ที่เจอ แล้วค่อยแตก automated coverage เพิ่มเฉพาะจุดที่พังซ้ำหรือเสี่ยงสูง

## 2026-05-02 Progress Note 7

- ขยาย automated coverage ต่อจาก manual QA checklist แล้ว:
  - เพิ่ม host/play render-state keys ใน `src/__tests__/i18n-regression.test.ts`
  - เพิ่ม OMR scan/result render-state keys ใน `src/__tests__/i18n-regression.test.ts`
  - ครอบคลุม loading / empty / error / game-over / lobby / scanner result states เพิ่มขึ้น
- test ชุดนี้เจอช่องว่างจริง:
  - `hostNegamonIdentityStartTitle`
  - `hostNegamonIdentityStartDesc`
  - `hostNegamonIdentityStartBack`
  - `hostNegamonIdentityStartAnyway`
- เติม Thai supplemental keys ใน `src/lib/translation-lookup.ts` แล้ว
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- โฟกัสถัดไป:
  - รัน manual QA checklist บน dev/staging เมื่อมี environment พร้อม
  - เริ่ม cleanup translation source โดยย้าย key ที่ใช้จริงจาก supplemental/legacy ไปโครงหลักทีละกลุ่ม

## 2026-05-02 Progress Note 8

- เริ่ม `translation source cleanup` แล้ว:
  - เพิ่ม `thaiPack` ใน `src/lib/translations.ts` สำหรับ Thai keys ที่ย้ายออกจาก supplemental
  - ปรับ `src/lib/translation-lookup.ts` ให้อ่าน `thaiPack` ก่อน legacy fallback
  - ย้าย key ชุดแรกออกจาก `thaiSupplemental`:
    - `apiError_PLAN_LIMIT_OMR_MONTHLY`
    - `apiError_PLAN_LIMIT_LIVE_PLAYERS`
    - `hostNegamonIdentityStartTitle`
    - `hostNegamonIdentityStartDesc`
    - `hostNegamonIdentityStartBack`
    - `hostNegamonIdentityStartAnyway`
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- โฟกัสถัดไป:
  - ย้ายกลุ่ม battle / board / OMR keys ที่ใช้จริงจาก `thaiSupplemental` ไป `thaiPack` ต่อ
  - ค่อย ๆ ลดขนาด `translation-lookup.ts` ให้เหลือเป็น lookup/fallback helper จริง ๆ

## 2026-05-02 Progress Note 9

- ขยาย `translation source cleanup` เพิ่มแล้ว:
  - ย้ายกลุ่ม board keys ที่ regression test คุมอยู่เข้า `thaiPack`
  - ย้ายกลุ่ม OMR scan/result keys ที่ regression test คุมอยู่เข้า `thaiPack`
  - ย้าย socket/play error keys สำคัญที่ regression test คุมอยู่เข้า `thaiPack`
  - ลบ key ที่ย้ายแล้วออกจาก `thaiSupplemental`:
    - `omrCvErrorShort`
    - `playSocketInvalidQuestionSet`
    - `playSocketGameNotFound`
- ตอนนี้ key เหล่านี้ resolve ผ่าน source หลักก่อน legacy/supplemental fallback
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- โฟกัสถัดไป:
  - ย้ายกลุ่ม battle/negamon keys จาก `thaiSupplemental` ไป `thaiPack` ต่อ
  - เพิ่ม regression coverage สำหรับกลุ่ม battle ก่อนย้ายชุดใหญ่ เพื่อกันข้อความหลุดใน battle HUD/log/result

## 2026-05-02 Progress Note 10

- เพิ่ม regression coverage สำหรับ battle/Negamon แล้ว:
  - เพิ่ม `battleUiKeys` ใน `src/__tests__/i18n-regression.test.ts`
  - ครอบคลุม battle HUD labels, view tabs, ready/start states, action menu metadata, result summary/stat labels
- ขยาย `translation source cleanup` ต่อ:
  - ย้าย battle HUD/action/result subset จาก `thaiSupplemental` ไป `thaiPack`
  - ลบ key subset ที่ย้ายแล้วออกจาก `thaiSupplemental`
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- โฟกัสถัดไป:
  - เพิ่ม coverage สำหรับ battle log/status placeholder keys ก่อนย้ายชุด log ใหญ่
  - ย้าย battle log/status keys เข้า `thaiPack` เป็นกลุ่มถัดไปเมื่อ coverage พร้อม

## 2026-05-02 Progress Note 11

- เพิ่ม regression coverage สำหรับ battle log/status placeholder keys แล้ว:
  - เพิ่ม `battleLogStatusKeys` ใน `src/__tests__/i18n-regression.test.ts`
  - ครอบคลุม move/damage/heal/faint/status apply/status tick/skip/status labels/status meta keys
- ขยาย `translation source cleanup` ต่อ:
  - ย้าย battle log/status subset จาก `thaiSupplemental` ไป `thaiPack`
  - ลบ key subset ที่ย้ายแล้วออกจาก `thaiSupplemental`
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- โฟกัสถัดไป:
  - ถ้าจะ cleanup ต่อ ให้ย้าย battle log/status keys ส่วนที่เหลือแบบเพิ่ม coverage ควบคู่
  - รัน manual QA checklist บน dev/staging เพื่อปิดส่วน end-to-end จริง

## 2026-05-02 Progress Note 12

- ขยาย regression coverage เพิ่มอีก 2 กลุ่มใน `src/__tests__/i18n-regression.test.ts`:
  - battle support/reward audit keys เช่น ability trigger, battle history time labels, reward audit reasons
  - shared utility/accessibility keys เช่น admin plan status, timer labels, image alt labels, board/OMR alt labels, signup legal copy
- ปิด `translation source cleanup` สำหรับ battle/Negamon กลุ่มหลัก:
  - ย้าย battle log/status advanced keys, battle level/personal turn labels, และ move category labels จาก `thaiSupplemental` ไป `thaiPack`
  - ย้าย battle ability/history/reward audit, admin plan/timer/accessibility/alt label subset จาก `thaiSupplemental` ไป `thaiPack`
  - ลบ key ที่ย้ายแล้วออกจาก `thaiSupplemental` รวม 73 keys ในรอบนี้
- ปรับ `battleStatusMetaIgnoreDef` เป็นข้อความไทยจริง (`DEF ×{mult} เท่า`) เพื่อให้ regression ยืนยัน Thai glyph ได้โดยไม่เสียความหมาย stat เดิม
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- สถานะล่าสุด:
  - `translation-lookup.ts` ไม่เหลือ battle log/status/action/category keys ใน `thaiSupplemental` แล้ว
  - `thaiSupplemental` เหลือ 282 keys สำหรับ cleanup รอบถัดไป โดยกลุ่มที่ควรเก็บต่อคือ admin/billing error keys, classroom/attendance/manual score keys, crypto task keys, และ board/profile placeholder edge cases

## 2026-05-02 Progress Note 13

- ขยาย regression coverage ใน `src/__tests__/i18n-regression.test.ts` เพิ่มอีก 4 กลุ่ม:
  - admin/billing error keys
  - classroom attendance/points/manual score validation keys
  - crypto task/play crypto keys
  - battle loadout/battle shop/item keys
- ขยาย `translation source cleanup` ต่อ:
  - ย้าย admin/billing/classroom assessment subset จาก `thaiSupplemental` ไป `thaiPack` จำนวน 48 keys
  - ย้าย crypto task/play crypto subset จาก `thaiSupplemental` ไป `thaiPack` จำนวน 20 keys
  - ย้าย battle loadout/shop/item subset จาก `thaiSupplemental` ไป `thaiPack` จำนวน 44 keys
  - รวมรอบนี้ย้ายออกจาก `thaiSupplemental` 112 keys
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- สถานะล่าสุด:
  - regression i18n รวมเป็น 16 tests
  - regression รวมกับ ui-error รวมเป็น 25 tests
  - `thaiSupplemental` เหลือ 170 keys
  - กลุ่มที่ควรเก็บต่อคือ play/socket/quiz/economy/quest/group keys, placeholder keys ที่ไม่มี Thai glyph, และ multiline battle prep keys ที่ควร cleanup แบบแยก patch

## 2026-05-02 Progress Note 14

- ปิด `translation source cleanup` สำหรับ `thaiSupplemental` แล้ว:
  - ย้าย group/quest/recent/relative keys เข้า `thaiPack` จำนวน 15 keys
  - ย้าย play socket/quiz plain error keys เข้า `thaiPack` จำนวน 25 keys
  - ย้าย economy ledger/reconciliation keys เข้า `thaiPack` จำนวน 55 keys
  - ย้าย Negamon reward audit/remediation/effectiveness/resync keys เข้า `thaiPack` จำนวน 64 keys
  - ย้าย final literal/placeholder/multiline keys เข้า `thaiPack` จำนวน 12 keys รวม `analyticsExportCsvButton`
  - ลบ `thaiSupplemental` ออกจาก `src/lib/translation-lookup.ts` แล้ว ตอนนี้ lookup เหลือ `thaiPack -> legacyThaiTranslations -> English -> key`
- ขยาย regression coverage เพิ่ม:
  - group/quest/recent/relative
  - play socket/quiz plain errors
  - economy ledger/reconciliation
  - Negamon reward audit/resync operations
  - final supplemental cleanup keys แยก Thai glyph keys กับ literal keys ที่ตั้งใจไม่มี Thai glyph
- ตรวจผ่านแล้ว:
  - `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- สถานะล่าสุด:
  - regression i18n รวมเป็น 22 tests
  - regression รวมกับ ui-error รวมเป็น 31 tests
  - `thaiSupplemental` เหลือ 0 keys และถูกนำออกจาก lookup แล้ว
  - งานที่เหลือตามแผนคือ manual QA checklist บน dev/staging และตัดสินใจระยะถัดไปว่าจะยุบ legacy Thai JSON เข้าสู่ source หลักหรือเก็บเป็น fallback ระยะยาว

## 2026-05-02 Progress Note 15

- ปิดงาน preflight ก่อน manual QA:
  - อัปเดต `docs/i18n-manual-qa-checklist.md` ให้มีส่วน Automated Preflight พร้อมสถานะคำสั่งที่ผ่าน
  - ระบุชัดว่า manual browser QA ยัง blocked จนกว่าจะมี dev/staging URL และ test accounts
  - ระบุ residual risk ของ `npm.cmd run lint`: คำสั่งถูกลองรันแล้ว แต่ fail จาก React hook lint errors ในไฟล์ Negamon components ที่อยู่นอกขอบเขต i18n cleanup รอบนี้
- ตรวจซ้ำหลังอัปเดต checklist:
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
- สถานะล่าสุด:
  - i18n automated preflight ผ่านครบตาม checklist
  - `lint` ยังไม่ผ่านเพราะ issue นอกขอบเขตนี้
  - งานที่ยังต้องทำด้วยคนคือ manual QA บน dev/staging ตาม checklist

## 2026-05-02 Progress Note 16

- ปิด automated gate ที่เหลือให้เป็นสีเขียว:
  - แก้ React hook lint errors ใน Negamon UI ที่ทำให้ `npm.cmd run lint` fail:
    - `src/components/negamon/BattleArena.tsx`
    - `src/components/negamon/DialogueBox.tsx`
    - `src/components/negamon/battle-inventory-ui.tsx`
    - `src/components/negamon/monster-card.tsx`
    - `src/components/negamon/negamon-codex-client.tsx`
  - แก้ type error จาก build ใน `BattleArena.tsx` หลัง cleanup lint โดยใช้ active player จาก fighter refs ใน `accumulateBattleStats`
  - อัปเดต `docs/i18n-manual-qa-checklist.md` ให้บันทึกว่า lint/build ผ่านแล้ว
- ตรวจผ่านแล้ว:
  - `npm.cmd run lint` ผ่านแล้ว โดยเหลือ warnings เท่านั้น
  - `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
  - `npm.cmd run check:i18n:strict`
  - `npm.cmd run predev`
  - `npm.cmd run build`
- สถานะล่าสุด:
  - automated i18n/system preflight ปิดครบแล้ว
  - งาน manual browser QA ยังต้องรันบน dev/staging เมื่อมี URL และบัญชีทดสอบ
