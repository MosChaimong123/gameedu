/**
 * ระบบความสมบูรณ์ของข้อสอบออนไลน์ (anti-cheat / ลดการนำข้อไปถาม AI)
 *
 * ข้อจำกัดที่ต้องยอมรับ:
 * - ไม่สามารถกันการถ่ายรูปหน้าจอหรือพิมพ์คำถามซ้ำด้วยมือได้
 * - การบล็อกคัดลอกทั้งหมดกระทบผู้เรียนที่ใช้เครื่องอ่านหน้าจอ — เลือกเก็บ log เป็นหลัก
 *
 * ชั้นที่ออกแบบไว้ (ทยอยทำได้):
 * 1) Telemetry ฝั่ง client → บันทึกใน cheatingLogs (ทำแล้วในฮุก + submit)
 * 2) ลด copy/paste ง่าย: user-select:none + ข้อความนโยบาย (UX)
 * 3) ส่งทีละข้อจาก API โดยไม่ส่ง correctAnswer ลง client (รีแฟกเตอร์ใหญ่ — แนะนำเป็นขั้นถัดไป)
 * 4) ครูดูสรุป flags ใน classroom / รายงาน (ยังไม่ทำ)
 */

export const QUIZ_INTEGRITY_EVENT_TYPES = [
  "document_hidden",
  "window_blur",
  "copy",
  "paste",
  "context_menu",
] as const;

export type QuizIntegrityEventType = (typeof QUIZ_INTEGRITY_EVENT_TYPES)[number];

const ALLOWED = new Set<string>(QUIZ_INTEGRITY_EVENT_TYPES);

export type SanitizedIntegrityEntry = {
  type: QuizIntegrityEventType;
  /** เวลาที่เซิร์ฟเวอร์รับรู้เหตุการณ์ */
  at: string;
  /** เวลาฝั่ง client (epoch ms) ใช้เรียงลำดับเมื่อวิเคราะห์ */
  clientT: number;
};

const MAX_EVENTS = 120;

/** รับ payload จาก client แล้วกรอง type / จำกัดความยาวก่อนบันทึก DB */
/** สรุป log สำหรับมุมมองครู (badge) */
export function summarizeIntegrityLogs(logs: unknown): {
  total: number;
  documentHidden: number;
} {
  if (!Array.isArray(logs)) return { total: 0, documentHidden: 0 };
  let documentHidden = 0;
  for (const item of logs) {
    if (item && typeof item === "object" && (item as { type?: string }).type === "document_hidden") {
      documentHidden++;
    }
  }
  return { total: logs.length, documentHidden };
}

/** true = ควรโชว์ป้ายเตือนครู (ปรับเกณฑ์ได้) */
export function shouldFlagIntegrityForTeacher(logs: unknown): boolean {
  const { total, documentHidden } = summarizeIntegrityLogs(logs);
  return total >= 5 || documentHidden >= 2;
}

export function sanitizeIntegrityEvents(raw: unknown): SanitizedIntegrityEntry[] {
  if (raw === null || raw === undefined || typeof raw !== "object") return [];
  const events = (raw as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];

  const out: SanitizedIntegrityEntry[] = [];
  for (const item of events.slice(0, MAX_EVENTS)) {
    if (item === null || typeof item !== "object") continue;
    const type = (item as { type?: unknown }).type;
    const t = (item as { t?: unknown }).t;
    if (typeof type !== "string" || !ALLOWED.has(type)) continue;
    if (typeof t !== "number" || !Number.isFinite(t)) continue;
    out.push({
      type: type as QuizIntegrityEventType,
      at: new Date().toISOString(),
      clientT: Math.round(t),
    });
  }
  return out;
}
