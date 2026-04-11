# Operational Safety Contract

เอกสารนี้สรุปมาตรฐานของ Milestone 3 สำหรับงานด้าน observability, abuse control, และ operational safety ในโปรเจกต์นี้

## Scope

Milestone 3 ครอบคลุม 3 เรื่องหลัก:

- `rate limiting`
- `audit logging`
- `structured error responses`

เป้าหมายคือให้ route และ action สำคัญ:
- กัน abuse ได้ในระดับพื้นฐาน
- trace ย้อนหลังได้เมื่อเกิด incident
- ส่งสัญญาณ error ที่ UI และ monitoring แยกสาเหตุได้ชัด

## Rate Limiting

helper กลาง:
- [rate-limit.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/security/rate-limit.ts)

ฟังก์ชันหลัก:
- `buildRateLimitKey(...)`
- `getRequestClientIdentifier(request)`
- `consumeRateLimit(...)`
- `createRateLimitResponse(retryAfterSeconds)`

แนวทางใช้งาน:

1. เลือก `bucket` ตามประเภท route
- ตัวอย่าง: `login`, `register`, `student-notifications`, `upload`, `ai-generate`

2. สร้าง key จากข้อมูลที่เหมาะกับ risk
- `IP`
- `IP + email`
- `IP + loginCode`
- `userId`

3. เมื่อ limit เต็ม ให้ตอบผ่าน `createRateLimitResponse(...)`

ผลลัพธ์มาตรฐาน:
- HTTP `429`
- `Retry-After` header
- JSON error shape มาตรฐานพร้อม code `RATE_LIMITED`

ข้อจำกัดปัจจุบัน:
- limiter เป็น in-memory store
- เหมาะกับ single-instance/dev/staging และ protection ขั้นต้น
- ถ้าจะขยาย production multi-instance ในอนาคต ควรย้ายไป shared backing store

## Audit Logging

helper กลาง:
- [audit-log.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/security/audit-log.ts)

ฟังก์ชันหลัก:
- `logAuditEvent({ actorUserId, action, targetType, targetId, metadata })`

รูปแบบ log:
- prefix `[AUDIT]`
- payload เป็น JSON
- มี `timestamp` อัตโนมัติ

ควร log เมื่อ:
- เปลี่ยน role
- ลบ user / set
- duplicate classroom
- reset points
- สร้าง/ลบ event หรือ custom achievement
- award achievement
- create-game / join-classroom / classroom-update สำเร็จหรือถูกปฏิเสธ
- upload success/failure ที่สำคัญ

แนวทาง metadata:
- เก็บเฉพาะข้อมูลที่พอ trace ได้
- หลีกเลี่ยงการใส่ payload ดิบทั้งก้อนถ้าไม่จำเป็น
- ไม่ log ความลับ เช่น password, token, raw credentials

## Structured Errors

helper กลาง:
- [api-error.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/api-error.ts)
- [ui-error-messages.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/ui-error-messages.ts)
- [omr-ui-messages.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/omr-ui-messages.ts)

shape มาตรฐาน:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden"
  }
}
```

ผลที่คาดหวัง:
- UI map `error.code` ได้ตรงจุด
- tests ตรวจ policy ได้จาก code แทน string ยาว
- future monitoring แยกหมวด error ได้ง่าย

## Current Coverage

ก้อนที่ใช้มาตรฐานนี้แล้วในระบบ:

- student/loginCode flows
- register/login related flows
- upload
- AI routes
- quiz submit
- leaderboard / avatar / notifications
- classroom mutations
- history / OMR support routes
- OMR dashboard + scanner UI
- set-editor import local messaging

## Verification Standard

ก่อนปิดงานที่แตะก้อน operational safety ให้เช็กอย่างน้อย:

1. `npx tsc --noEmit`
2. `npm test`
3. `npx eslint .`
4. `npx next build`

ถ้า route ใหม่เพิ่ม limiter หรือ audit:
- ควรมี regression test หรืออย่างน้อย unit/integration test ของ helper path ที่เกี่ยวข้อง

## Review Checklist

เมื่อเพิ่ม route ใหม่:
- route นี้ควรมี rate limit ไหม
- route นี้ควรมี audit log ไหม
- error path ตอบ structured code หรือยัง

เมื่อเพิ่ม action/socket event ใหม่:
- มี ownership/role check หรือยัง
- reject path ถูก log หรือยัง
- success path สำคัญถูก log หรือยัง

เมื่อเพิ่ม UI ใหม่:
- ใช้ helper กลางแปล error หรือยัง
- หลีกเลี่ยงการ parse string ดิบเองหรือยัง

## Out of Scope

สิ่งที่ยังไม่ถือว่าจบใน Milestone 3:
- shared distributed rate limiting store
- external log sink / SIEM integration
- alert rules ระดับ production

สิ่งเหล่านี้เป็นงานต่อยอดได้ใน milestone ถัดไปหากต้องการขยาย operational maturity
