# LINE Bot MVP — ทวงงานในกลุ่ม

บอทบันทึกยอดค้างและทวงในกลุ่ม LINE ผ่าน Messaging API (ฝังใน GameEdu)

## ตั้งค่า LINE Developers

1. สร้าง **Messaging API** channel ที่ [LINE Developers Console](https://developers.line.biz/)
2. เปิด **Use webhook** และปิด auto-reply ที่ไม่จำเป็น
3. ตั้ง Webhook URL: `https://<โดเมนคุณ>/api/webhooks/line`
4. คัดลอก **Channel secret** และ **Channel access token** ใส่ `.env`

```env
LINE_CHANNEL_SECRET="..."
LINE_CHANNEL_ACCESS_TOKEN="..."
LINE_BOT_ENABLED="true"
```

## ฐานข้อมูล

```bash
npx prisma db push
```

โมเดล: `LineBotGroup`, `LineGroupDebt` ใน `prisma/schema.prisma`

## ทดสอบ local

1. `npm run dev`
2. เปิด tunnel (เช่น ngrok): `ngrok http 3000`
3. ใส่ Webhook URL ใน LINE Console ชี้ไป `https://<tunnel>/api/webhooks/line`
4. เชิญบอทเข้ากลุ่มทดสอบ

ตรวจสถานะ: `GET /api/webhooks/line` → `{ "service": "line-debt-bot", "enabled": true }`

## คำสั่งในกลุ่ม

| คำสั่ง | ความหมาย |
|--------|----------|
| `ค้าง <ชื่อ> <บาท> [หมายเหตุ]` | บันทึกยอดค้าง |
| `เพิ่ม ...` | เหมือน `ค้าง` |
| `สรุป` | รายการค้าง + รวม |
| `ทวง` | ข้อความทวน |
| `จ่ายแล้ว <เลข>` | ปิดรายการ (# จากสรุป) |
| `ping` | ทดสอบบอท |
| `ช่วย` / `help` | คู่มือคำสั่ง |

## โครงสร้างโค้ด

- `src/app/api/webhooks/line/route.ts` — verify signature + dispatch
- `src/lib/line-bot/commands.ts` — parse / format ข้อความ
- `src/lib/line-bot/handlers.ts` — logic ต่อ event
- `src/lib/line-bot/repository.ts` — Prisma

## ขั้นถัดไป (ยังไม่ทำ)

- Cron ทวงอัตโนมัติรายวัน
- รองรับ mention / Flex Message
- แยก service deploy ถ้า traffic สูง
