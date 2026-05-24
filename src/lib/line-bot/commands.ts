export type LineDebtCommand =
    | { type: "add"; debtorLabel: string; amountBaht: number; note?: string }
    | { type: "summary" }
    | { type: "remind" }
    | { type: "mark_paid"; shortCode: number }
    | { type: "help" }
    | { type: "ping" };

const ADD_PREFIXES = ["ค้าง", "เพิ่ม", "add"] as const;
const SUMMARY_KEYWORDS = new Set(["สรุป", "list", "รายการ"]);
const REMIND_KEYWORDS = new Set(["ทวง", "remind"]);
const HELP_KEYWORDS = new Set(["help", "ช่วย", "คำสั่ง"]);
const PING_KEYWORDS = new Set(["ping", "ทดสอบ"]);

export function parseLineDebtCommand(rawText: string): LineDebtCommand | null {
    const text = rawText.trim();
    if (!text) return null;

    const lower = text.toLowerCase();

    if (PING_KEYWORDS.has(lower)) return { type: "ping" };
    if (HELP_KEYWORDS.has(lower)) return { type: "help" };
    if (SUMMARY_KEYWORDS.has(lower)) return { type: "summary" };
    if (REMIND_KEYWORDS.has(lower)) return { type: "remind" };

    const paidMatch = text.match(/^จ่ายแล้ว\s+#?(\d+)\s*$/i);
    if (paidMatch) {
        return { type: "mark_paid", shortCode: Number(paidMatch[1]) };
    }

    for (const prefix of ADD_PREFIXES) {
        if (!lower.startsWith(prefix.toLowerCase())) continue;
        const rest = text.slice(prefix.length).trim();
        const parsed = parseAddRest(rest);
        if (parsed) return parsed;
    }

    return null;
}

function parseAddRest(rest: string): LineDebtCommand | null {
    if (!rest) return null;

    const match = rest.match(/^(.+?)\s+(\d[\d,]*)(?:\s+(.+))?$/);
    if (!match) return null;

    const debtorLabel = match[1].trim();
    const amountBaht = Number(match[2].replace(/,/g, ""));
    const note = match[3]?.trim();

    if (!debtorLabel) return null;
    if (!Number.isFinite(amountBaht) || amountBaht <= 0 || !Number.isInteger(amountBaht)) {
        return null;
    }

    return {
        type: "add",
        debtorLabel,
        amountBaht,
        note: note || undefined,
    };
}

export function formatDebtHelpMessage(): string {
    return [
        "📌 คำสั่งทวงงาน (MVP)",
        "• ค้าง <ชื่อ> <จำนวนบาท> — บันทึกยอดค้าง",
        "• สรุป — ดูรายการค้าง",
        "• ทวง — ส่งข้อความทวนในกลุ่ม",
        "• จ่ายแล้ว <เลข> — ปิดรายการ (เลขจาก # ในสรุป)",
        "• ping — ทดสอบว่าบอทออนไลน์",
    ].join("\n");
}

export type OpenDebtRow = {
    shortCode: number;
    debtorLabel: string;
    amountBaht: number;
    note: string | null;
};

export function formatOpenDebtSummary(rows: OpenDebtRow[]): string {
    if (rows.length === 0) {
        return "✅ ไม่มียอดค้างในกลุ่มนี้";
    }

    const lines = rows.map((row) => {
        const note = row.note ? ` (${row.note})` : "";
        return `#${row.shortCode} ${row.debtorLabel} — ${row.amountBaht} บาท${note}`;
    });

    const total = rows.reduce((sum, row) => sum + row.amountBaht, 0);
    lines.push("");
    lines.push(`รวม ${total} บาท`);
    lines.push("ปิดรายการ: จ่ายแล้ว <เลข>");

    return ["📋 สรุปค้างชำระ", ...lines].join("\n");
}

export function formatRemindMessage(rows: OpenDebtRow[]): string {
    if (rows.length === 0) {
        return "✅ ไม่มีใครค้าง — ไม่ต้องทวง";
    }

    const lines = rows.map((row) => {
        const note = row.note ? ` — ${row.note}` : "";
        return `• ${row.debtorLabel} ${row.amountBaht} บาท${note} (#${row.shortCode})`;
    });

    const total = rows.reduce((sum, row) => sum + row.amountBaht, 0);
    return ["🔔 ทวงค้างชำระ", ...lines, "", `รวม ${total} บาท`].join("\n");
}
