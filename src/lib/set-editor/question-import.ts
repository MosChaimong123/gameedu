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

export function getWordTemplateExamLines(language: "en" | "th"): string[] {
    if (language === "th") {
        return [
            "จัดรูปแบบแบบข้อสอบ — แต่ละข้อลงท้ายด้วยบรรทัด ตอบ ข. ให้ตรงตัวเลือกที่ถูก (ไม่จำเป็นต้องใส่จุดหลังตัวอักษร)",
            "",
            "1. จุดเริ่มแรกของสนามไฟฟ้าเกิดจากสิ่งใด",
            "ก. กระแสไฟฟ้า",
            "ข. ประจุไฟฟ้า",
            "ค. สนามแม่เหล็ก",
            "ง. ความร้อน",
            "ตอบ ข.",
            "",
            "2. ตัวอย่างคำถามข้อที่สอง?",
            "ก. ตัวเลือก 1",
            "ข. ตัวเลือก 2",
            "ค. ตัวเลือก 3",
            "ง. ตัวเลือก 4",
            "ตอบ ค.",
            "",
            "ถ้าต้องการกำหนดเวลา: เพิ่มบรรทัด เวลา: 30 หลังคำถาม",
        ];
    }

    return [
        "Exam-style format. Mark the correct choice with Answer: b",
        "",
        "1. What is the source of an electric field?",
        "a. Electric current",
        "b. Electric charge",
        "c. Magnetic field",
        "d. Heat",
        "Answer: b",
        "",
        "2. Second example question?",
        "a. Choice 1",
        "b. Choice 2",
        "c. Choice 3",
        "d. Choice 4",
        "Answer: c",
    ];
}

export function buildWordTemplateHtml(language: "en" | "th"): string {
    const langAttr = language === "th" ? "th" : "en";
    const title = language === "th" ? "แบบฟอร์มนำเข้าคำถาม" : "Question import template";
    const font =
        language === "th"
            ? "'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt"
            : "Calibri, sans-serif; font-size: 12pt";
    const paragraphs = getWordTemplateExamLines(language)
        .map((line) => (line.length === 0 ? "<p>&nbsp;</p>" : `<p>${line}</p>`))
        .join("\n");

    return `<!DOCTYPE html>
<html lang="${langAttr}"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: ${font}; line-height: 1.6;">
${paragraphs}
</body></html>`;
}
