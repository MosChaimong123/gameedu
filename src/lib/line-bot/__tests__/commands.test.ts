import { describe, expect, it } from "vitest";
import {
    formatOpenDebtSummary,
    formatRemindMessage,
    parseLineDebtCommand,
} from "@/lib/line-bot/commands";

describe("line-bot commands", () => {
    it("parses add command with optional note", () => {
        expect(parseLineDebtCommand("ค้าง สมชาย 500 ค่าข้าว")).toEqual({
            type: "add",
            debtorLabel: "สมชาย",
            amountBaht: 500,
            note: "ค่าข้าว",
        });
    });

    it("parses summary, remind, paid, ping", () => {
        expect(parseLineDebtCommand("สรุป")).toEqual({ type: "summary" });
        expect(parseLineDebtCommand("ทวง")).toEqual({ type: "remind" });
        expect(parseLineDebtCommand("จ่ายแล้ว 3")).toEqual({ type: "mark_paid", shortCode: 3 });
        expect(parseLineDebtCommand("ping")).toEqual({ type: "ping" });
    });

    it("returns null for unrelated chat", () => {
        expect(parseLineDebtCommand("สวัสดีทุกคน")).toBeNull();
    });

    it("formats summary and remind messages", () => {
        const rows = [
            { shortCode: 1, debtorLabel: "สมชาย", amountBaht: 500, note: "ค่าข้าว" },
            { shortCode: 2, debtorLabel: "มิ้น", amountBaht: 200, note: null },
        ];

        expect(formatOpenDebtSummary(rows)).toContain("#1 สมชาย — 500 บาท");
        expect(formatOpenDebtSummary(rows)).toContain("รวม 700 บาท");
        expect(formatRemindMessage(rows)).toContain("🔔 ทวงค้างชำระ");
        expect(formatOpenDebtSummary([])).toContain("ไม่มียอดค้าง");
    });
});
