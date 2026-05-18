import { describe, expect, it } from "vitest";
import {
    buildCsvTemplateContent,
    detectQuestionImportLanguage,
    mapRowsToImportedQuestions,
} from "@/lib/set-editor/question-import";
import { buildWordTemplateDocxBlob } from "@/lib/set-editor/build-word-template-docx";
import {
    isSupportedWordImportFile,
    parseQuestionsFromWordFile,
    parseQuestionsFromWordHtml,
} from "@/lib/set-editor/parse-word-document";
import { WordImportError } from "@/lib/set-editor/word-import-errors";

describe("question-import", () => {
    it("detects th and en headers", () => {
        expect(detectQuestionImportLanguage(["คำถาม", "คำตอบที่ถูกต้อง"])).toBe("th");
        expect(detectQuestionImportLanguage(["Question Text", "Correct Answer"])).toBe("en");
        expect(detectQuestionImportLanguage(["foo"])).toBeNull();
    });

    it("maps spreadsheet-like rows", () => {
        const questions = mapRowsToImportedQuestions([
            {
                คำถาม: "ข้อ 1?",
                "เวลา (วินาที)": "20",
                "คำตอบที่ถูกต้อง": "ถูก",
                "ตัวเลือก 2": "ผิด",
            },
        ]);

        expect(questions).toHaveLength(1);
        expect(questions[0]?.question).toBe("ข้อ 1?");
        expect(questions[0]?.timeLimit).toBe(20);
        expect(questions[0]?.options[0]).toBe("ถูก");
    });

    it("builds localized csv template", () => {
        expect(buildCsvTemplateContent("th")).toContain("คำถาม");
        expect(buildCsvTemplateContent("en")).toContain("Question Text");
    });
});

describe("parse-word-document", () => {
    it("parses html tables with thai headers", () => {
        const html = `
          <table>
            <tr><th>คำถาม</th><th>เวลา (วินาที)</th><th>คำตอบที่ถูกต้อง</th><th>ตัวเลือก 2</th></tr>
            <tr><td>คำถามตัวอย่าง?</td><td>30</td><td>A</td><td>B</td></tr>
          </table>
        `;

        const questions = parseQuestionsFromWordHtml(html, "", "th");
        expect(questions).toHaveLength(1);
        expect(questions[0]?.question).toBe("คำถามตัวอย่าง?");
    });

    it("parses thai exam-style numbered questions (ก ข ค ง + ตอบ)", () => {
        const text = `1. จุดเริ่มแรกของสนามไฟฟ้าเกิดจากสิ่งใด
ก. กระแสไฟฟ้า
ข. ประจุไฟฟ้า
ค. สนามแม่เหล็ก
ง. ความร้อน
ตอบ ข.

2. ข้อสอง?
ก. หนึ่ง
ข. สอง
ค. สาม
ง. สี่
ตอบ ค.`;

        const questions = parseQuestionsFromWordHtml("", text, "th");
        expect(questions).toHaveLength(2);
        expect(questions[0]?.question).toContain("สนามไฟฟ้า");
        expect(questions[0]?.answers[0]).toBe("ประจุไฟฟ้า");
        expect(questions[0]?.options).toContain("กระแสไฟฟ้า");
        expect(questions[1]?.answers[0]).toBe("สาม");
    });

    it("accepts downloaded .doc template extension", () => {
        const file = { name: "question_template.doc", type: "application/msword" } as File;
        expect(isSupportedWordImportFile(file)).toBe(true);
    });

    it("rejects legacy binary .doc without calling mammoth", async () => {
        const oleHeader = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]);
        const file = new File([oleHeader], "saved-from-word.doc", { type: "application/msword" });

        await expect(parseQuestionsFromWordFile(file, "th")).rejects.toBeInstanceOf(WordImportError);
        await expect(parseQuestionsFromWordFile(file, "th")).rejects.toMatchObject({ code: "LEGACY_DOC" });
    });

    it("builds a valid docx template zip", async () => {
        const blob = await buildWordTemplateDocxBlob("th");
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer.slice(0, 2));
        expect(bytes[0]).toBe(0x50);
        expect(bytes[1]).toBe(0x4b);
    });

    it("parses two-column Word table as column-first blocks", () => {
        const html = `
          <table>
            <tr>
              <td>
                <p>1. จุดเริ่มแรกของสนามไฟฟ้าเกิดจากสิ่งใด</p>
                <p>ก. กระแสไฟฟ้า</p>
                <p>ข. ประจุไฟฟ้า</p>
                <p>ค. สนามแม่เหล็ก</p>
                <p>ง. ความร้อน</p>
                <p>ตอบ ข.</p>
              </td>
              <td>
                <p>2. ตัวอย่างคำถามข้อที่สอง?</p>
                <p>ก. ตัวเลือก 1</p>
                <p>ข. ตัวเลือก 2</p>
                <p>ค. ตัวเลือก 3</p>
                <p>ง. ตัวเลือก 4</p>
                <p>ตอบ ค.</p>
              </td>
            </tr>
          </table>
        `;

        const questions = parseQuestionsFromWordHtml(html, "", "th");
        expect(questions).toHaveLength(2);
        expect(questions[0]?.answers[0]).toBe("ประจุไฟฟ้า");
        expect(questions[1]?.answers[0]).toBe("ตัวเลือก 3");
    });

    it("parses answer lines with extra column text on the same line", () => {
        const text = `1. จุดเริ่มแรกของสนามไฟฟ้าเกิดจากสิ่งใด
ก. กระแสไฟฟ้า
ข. ประจุไฟฟ้า
ค. สนามแม่เหล็ก
ง. ความร้อน
ตอบ ข.\tตอบ ข 7.`;

        const questions = parseQuestionsFromWordHtml("", text, "th");
        expect(questions).toHaveLength(1);
        expect(questions[0]?.answers[0]).toBe("ประจุไฟฟ้า");
    });

    it("parses edited template with tabs, question marks, and footer hint", () => {
        const text = `จัดรูปแบบแบบข้อสอบ — ใส่ ตอบ ก. ให้ตรงตัวเลือกที่ถูก (ไม่จำเป็นต้องใส่จุดหลังตัวอักษร)
1.    จุดเริ่มแรกของสนามไฟฟ้าเกิดจากสิ่งใด?
ก. กระแสไฟฟ้า
ข. ประจุไฟฟ้า
ค. สนามแม่เหล็ก
ง. ความร้อน
ตอบ ข.
2.    หน่วยของความเข้มสนามไฟฟ้า (E) คืออะไร?
ก. แอมแปร์ (A)
ข. เทสลา (T)
ค. นิวตันต่อคูลอมบ์ (N/C) หรือ โวลต์ต่อเมตร (V/m)
ง. คูลอมบ์ต่อตารางเมตร (C/m2)
ตอบ ค.
ถ้าต้องการกำหนดเวลา: เพิ่มบรรทัด เวลา: 30 หลังคำถาม`;

        const questions = parseQuestionsFromWordHtml("", text, "th");
        expect(questions).toHaveLength(2);
        expect(questions[0]?.answers[0]).toBe("ประจุไฟฟ้า");
        expect(questions[1]?.answers[0]).toContain("นิวตัน");
    });

    it("parses Word numbered lists when digits are not in plain text", () => {
        const html = `
          <p>จัดรูปแบบแบบข้อสอบ</p>
          <ol>
            <li>จุดเริ่มแรกของสนามไฟฟ้าเกิดจากสิ่งใด?</li>
          </ol>
          <p>ก. กระแสไฟฟ้า</p>
          <p>ข. ประจุไฟฟ้า</p>
          <p>ค. สนามแม่เหล็ก</p>
          <p>ง. ความร้อน</p>
          <p>ตอบ ข.</p>
          <ol>
            <li>หน่วยของความเข้มสนามไฟฟ้า (E) คืออะไร?</li>
          </ol>
          <p>ก. แอมแปร์ (A)</p>
          <p>ข. เทสลา (T)</p>
          <p>ค. นิวตันต่อคูลอมบ์ (N/C)</p>
          <p>ง. คูลอมบ์ต่อตารางเมตร</p>
          <p>ตอบ ค.</p>
        `;

        const questions = parseQuestionsFromWordHtml(html, "", "th");
        expect(questions).toHaveLength(2);
        expect(questions[0]?.question).toContain("สนามไฟฟ้า");
        expect(questions[1]?.answers[0]).toContain("นิวตัน");
    });

    it("parses wrapped option lines onto the previous choice", () => {
        const text = `1. ตัวอย่าง?
ก. หนึ่ง
ข. สอง
ค. บรรทัดแรก
บรรทัดต่อ
ง. สี่
ตอบ ค.`;

        const questions = parseQuestionsFromWordHtml("", text, "th");
        expect(questions).toHaveLength(1);
        expect(questions[0]?.answers[0]).toBe("บรรทัดแรก บรรทัดต่อ");
    });

    it("parses template header that mentions ตอบ in instructions without splitting early", () => {
        const text = `จัดรูปแบบแบบข้อสอบ — ใส่ ตอบ ก. ให้ตรงตัวเลือกที่ถูก
1. จุดเริ่มแรกของสนามไฟฟ้าเกิดจากสิ่งใด?
ก. กระแสไฟฟ้า
ข. ประจุไฟฟ้า
ค. สนามแม่เหล็ก
ง. ความร้อน
ตอบ ข.
2. หน่วยของความเข้มสนามไฟฟ้า (E) คืออะไร?
ก. แอมแปร์ (A)
ข. เทสลา (T)
ค. นิวตันต่อคูลอมบ์ (N/C) หรือ โวลต์ต่อเมตร (V/m)
ง. คูลอมบ์ต่อตารางเมตร (C/m2)
ตอบ ค.`;

        const questions = parseQuestionsFromWordHtml("", text, "th");
        expect(questions).toHaveLength(2);
    });

    it("parses labeled text blocks when no table exists", () => {
        const text = `คำถาม: จุดเริ่มต้นของสนามไฟฟ้า?
เวลา: 25
คำตอบที่ถูกต้อง: ประจุ
ตัวเลือก 2: กระแส
ตัวเลือก 3: แม่เหล็ก`;

        const questions = parseQuestionsFromWordHtml("", text, "th");
        expect(questions).toHaveLength(1);
        expect(questions[0]?.timeLimit).toBe(25);
    });
});
