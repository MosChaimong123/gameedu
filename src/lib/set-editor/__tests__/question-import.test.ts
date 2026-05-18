import { describe, expect, it } from "vitest";
import {
    buildCsvTemplateContent,
    detectQuestionImportLanguage,
    mapRowsToImportedQuestions,
} from "@/lib/set-editor/question-import";
import { parseQuestionsFromWordHtml } from "@/lib/set-editor/parse-word-document";

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
