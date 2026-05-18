export type ImportedQuestionDraft = {
    id: string;
    question: string;
    timeLimit: number;
    options: string[];
    answers: string[];
    questionType: "MULTIPLE_CHOICE";
};

export type QuestionImportRow = Record<string, string | undefined>;

const EN_HEADERS = {
    question: "Question Text",
    time: "Time Limit",
    correct: "Correct Answer",
    opt2: "Option 2",
    opt3: "Option 3",
    opt4: "Option 4",
} as const;

const TH_HEADERS = {
    question: "คำถาม",
    time: "เวลา (วินาที)",
    correct: "คำตอบที่ถูกต้อง",
    opt2: "ตัวเลือก 2",
    opt3: "ตัวเลือก 3",
    opt4: "ตัวเลือก 4",
} as const;

export function detectQuestionImportLanguage(headers: string[]): "en" | "th" | null {
    const normalized = headers.map((header) => header.trim());
    const hasEn = [EN_HEADERS.question, EN_HEADERS.correct].every((field) => normalized.includes(field));
    const hasTh = [TH_HEADERS.question, TH_HEADERS.correct].every((field) => normalized.includes(field));
    if (hasEn) return "en";
    if (hasTh) return "th";
    return null;
}

function pickCell(row: QuestionImportRow, enKey: string, thKey: string): string {
    const value = row[enKey] ?? row[thKey];
    return typeof value === "string" ? value.trim() : "";
}

export function mapImportRowToQuestion(row: QuestionImportRow): ImportedQuestionDraft | null {
    const question = pickCell(row, EN_HEADERS.question, TH_HEADERS.question);
    const correctAnswer = pickCell(row, EN_HEADERS.correct, TH_HEADERS.correct);
    const timeRaw = pickCell(row, EN_HEADERS.time, TH_HEADERS.time);
    const opt2 = pickCell(row, EN_HEADERS.opt2, TH_HEADERS.opt2);
    const opt3 = pickCell(row, EN_HEADERS.opt3, TH_HEADERS.opt3);
    const opt4 = pickCell(row, EN_HEADERS.opt4, TH_HEADERS.opt4);

    const options = [correctAnswer, opt2, opt3, opt4].filter((opt) => opt.length > 0);
    if (!question || options.length === 0) {
        return null;
    }

    const parsedTime = parseInt(timeRaw, 10);

    return {
        id: crypto.randomUUID(),
        question,
        timeLimit: Number.isFinite(parsedTime) ? parsedTime : 30,
        options,
        answers: correctAnswer ? [correctAnswer] : [],
        questionType: "MULTIPLE_CHOICE",
    };
}

export function mapRowsToImportedQuestions(rows: QuestionImportRow[]): ImportedQuestionDraft[] {
    return rows.map((row) => mapImportRowToQuestion(row)).filter((row): row is ImportedQuestionDraft => row !== null);
}

export function buildCsvTemplateContent(language: "en" | "th"): string {
    if (language === "th") {
        return "คำถาม,เวลา (วินาที),คำตอบที่ถูกต้อง,ตัวเลือก 2,ตัวเลือก 3,ตัวเลือก 4\nตัวอย่างคำถาม?,30,คำตอบถูก,ผิด 1,ผิด 2,ผิด 3";
    }
    return "Question Text,Time Limit,Correct Answer,Option 2,Option 3,Option 4\nExample Question?,30,Correct Answer,Wrong 1,Wrong 2,Wrong 3";
}

export function buildWordTemplateHtml(language: "en" | "th"): string {
    if (language === "th") {
        return `<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8"><title>แบบฟอร์มนำเข้าคำถาม</title></head>
<body style="font-family: 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.6;">
<p>จัดรูปแบบแบบข้อสอบ (บันทึกเป็น .docx) — ใส่ <strong>ตอบ ก.</strong> ให้ตรงตัวเลือกที่ถูก (ไม่จำเป็นต้องใส่จุดหลังตัวอักษร)</p>
<p>1. จุดเริ่มแรกของสนามไฟฟ้าเกิดจากสิ่งใด</p>
<p>ก. กระแสไฟฟ้า</p>
<p>ข. ประจุไฟฟ้า</p>
<p>ค. สนามแม่เหล็ก</p>
<p>ง. ความร้อน</p>
<p>ตอบ ข.</p>
<p>&nbsp;</p>
<p>2. ตัวอย่างคำถามข้อที่สอง?</p>
<p>ก. ตัวเลือก 1</p>
<p>ข. ตัวเลือก 2</p>
<p>ค. ตัวเลือก 3</p>
<p>ง. ตัวเลือก 4</p>
<p>ตอบ ค.</p>
<p>&nbsp;</p>
<p><em>ถ้าต้องการกำหนดเวลา: เพิ่มบรรทัด เวลา: 30 หลังคำถาม</em></p>
</body></html>`;
    }

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Question import template</title></head>
<body style="font-family: Calibri, sans-serif; font-size: 12pt; line-height: 1.6;">
<p>Exam-style format (save as .docx). Mark the correct choice with <strong>Answer: b</strong></p>
<p>1. What is the source of an electric field?</p>
<p>a. Electric current</p>
<p>b. Electric charge</p>
<p>c. Magnetic field</p>
<p>d. Heat</p>
<p>Answer: b</p>
<p>&nbsp;</p>
<p>2. Second example question?</p>
<p>a. Choice 1</p>
<p>b. Choice 2</p>
<p>c. Choice 3</p>
<p>d. Choice 4</p>
<p>Answer: c</p>
</body></html>`;
}
