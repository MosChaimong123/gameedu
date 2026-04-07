/** แปลงวันที่จาก DB/ISO เป็นค่าให้ `<input type="datetime-local" />` (เวลาท้องถิ่น) */
export function toDatetimeLocalValue(d: Date | string | null | undefined): string {
  if (d === null || d === undefined) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** จากค่า datetime-local เป็น ISO ส่ง API หรือ null ถ้าว่าง */
export function fromDatetimeLocalToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** แสดงกำหนดส่งแบบสั้น (th-TH) สำหรับการ์ด / ตาราง */
export function formatDeadlineDisplayTh(
  isoOrDate: Date | string | null | undefined
): string | null {
  if (isoOrDate === null || isoOrDate === undefined) return null;
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export function isAssignmentDeadlinePast(
  isoOrDate: Date | string | null | undefined
): boolean {
  if (isoOrDate === null || isoOrDate === undefined) return false;
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return false;
  return date < new Date();
}
