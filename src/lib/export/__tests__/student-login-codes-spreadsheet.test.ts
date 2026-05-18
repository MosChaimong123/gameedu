import { describe, expect, it } from "vitest";
import {
    buildStudentLoginCodesCsv,
    buildStudentLoginCodesExcelXml,
} from "@/lib/export/student-login-codes-spreadsheet";

describe("student-login-codes-spreadsheet", () => {
    const headers = { name: "ชื่อ", code: "รหัสเข้าใช้งาน" };
    const rows = [
        { name: "สมชาย", loginCode: "abc123def456" },
        { name: "=SUM(1,1)", loginCode: "+001" },
    ];

    it("builds Excel XML with headers and escaped formula-like values", () => {
        const xml = buildStudentLoginCodesExcelXml(rows, headers);
        expect(xml).toContain("<Worksheet ss:Name=\"StudentCodes\">");
        expect(xml).toContain("ชื่อ");
        expect(xml).toContain("ABC123DEF456");
        expect(xml).toContain("'=SUM(1,1)");
        expect(xml).toContain("'+001");
    });

    it("builds UTF-8 CSV with BOM", () => {
        const csv = buildStudentLoginCodesCsv(rows, headers);
        expect(csv.startsWith("\uFEFF")).toBe(true);
        expect(csv).toContain("สมชาย");
        expect(csv).toContain("ABC123DEF456");
    });
});
