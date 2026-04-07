# Error Code Contract

เอกสารนี้กำหนดรูปแบบมาตรฐานของ error response ฝั่ง API และวิธีแปลข้อความฝั่ง UI เพื่อให้ทั้งระบบใช้ pattern เดียวกัน

## API Shape

route ที่เป็น JSON API ควรตอบ error ในรูปแบบนี้:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden"
  }
}
```

helper กลาง:
- [api-error.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/api-error.ts)

ฟังก์ชันหลัก:
- `createAppError(code, message)`
- `createAppErrorResponse(code, message, status)`

## Standard Codes

รหัสที่ใช้อยู่ในระบบตอนนี้:

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `INVALID_LOGIN_CODE`
- `LOGIN_CODE_ALREADY_LINKED`
- `ALREADY_IN_CLASSROOM`
- `RATE_LIMITED`
- `INVALID_PAYLOAD`
- `NOT_FOUND`
- `NO_FILE`
- `UNSUPPORTED_FILE_TYPE`
- `FILE_TOO_LARGE`
- `INTERNAL_ERROR`

ถ้าจะเพิ่ม code ใหม่:
- ใช้ชื่อแบบตัวพิมพ์ใหญ่คั่น `_`
- เพิ่มใน [api-error.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/api-error.ts)
- เพิ่มข้อความไทย default ใน [ui-error-messages.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/ui-error-messages.ts)
- เพิ่ม test สำหรับ route หรือ helper ที่เกี่ยวข้อง

## UI Helpers

helper กลางฝั่ง UI:
- [ui-error-messages.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/ui-error-messages.ts)
- [omr-ui-messages.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/omr-ui-messages.ts)

ฟังก์ชันหลัก:
- `getThaiErrorMessage(code, fallback, overrides?)`
- `getThaiErrorMessageFromLegacyText(message, fallback?)`
- `getThaiErrorMessageFromAuthResult(error)`
- `getThaiErrorMessageFromResponse(response, fallback, overrides?)`

กฎการใช้งาน:
- UI ใหม่ไม่ควร parse `message` ดิบเป็นหลัก
- ถ้า route ส่ง `error.code` มาแล้ว ให้เรียก helper กลางแทนการ `switch` ใน component
- ถ้าข้อความในบางหน้าต้องต่างกันตามบริบท ให้ใช้ `overrides`

## OMR-Specific UI Helpers

OMR มี helper แยกสำหรับ local-device และ OMR-specific wording:
- [omr-ui-messages.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/omr-ui-messages.ts)

เหมาะกับกรณี:
- camera permission
- OMR processing
- OMR quiz loading/saving

## Examples

### Route Example

```ts
return createAppErrorResponse("FORBIDDEN", "Forbidden", 403);
```

### Client Fetch Example

```ts
const res = await fetch("/api/register", { method: "POST", body: JSON.stringify(payload) });

if (!res.ok) {
  const message = await getThaiErrorMessageFromResponse(
    res,
    "สมัครสมาชิกไม่สำเร็จ"
  );
  throw new Error(message);
}
```

### Auth Result Example

```ts
const result = await signIn("credentials", {
  email,
  password,
  redirect: false,
});

if (result?.error || !result?.ok) {
  setError(getThaiErrorMessageFromAuthResult(result?.error));
}
```

## Existing References

ตัวอย่าง route ที่ใช้ structured error แล้ว:
- [register route](C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/register/route.ts)
- [upload route](C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/upload/route.ts)
- [student notifications route](C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/student/[code]/notifications/route.ts)
- [history route](C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/history/route.ts)

ตัวอย่าง UI ที่ใช้ helper กลางแล้ว:
- [login-form.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/app/login/login-form.tsx)
- [register-form.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/app/register/register-form.tsx)
- [signup-wizard.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/app/register/signup-wizard.tsx)
- [join-class-dialog.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/student/join-class-dialog.tsx)
- [ai-generator-dialog.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/set-editor/ai-generator-dialog.tsx)
- [CreatePostModal.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/board/CreatePostModal.tsx)

## Review Checklist For New Work

เมื่อเพิ่ม route ใหม่:
- route ตอบ JSON error shape มาตรฐานหรือยัง
- ใช้ `AppErrorCode` ที่มีอยู่หรือยัง
- ถ้าจำเป็นต้องเพิ่ม code ใหม่ เพิ่ม message mapping แล้วหรือยัง

เมื่อเพิ่ม UI ใหม่:
- ใช้ helper กลางแทน string mapping เองหรือยัง
- ใช้ `overrides` เฉพาะกรณีที่ wording ต้องเปลี่ยนตามบริบทหรือยัง
- มี fallback message ที่เหมาะกับผู้ใช้หรือยัง
