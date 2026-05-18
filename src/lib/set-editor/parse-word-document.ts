import { rowsFromExamFormatText } from "@/lib/set-editor/parse-exam-format-questions";
import {
    detectQuestionImportLanguage,
    mapRowsToImportedQuestions,
    type ImportedQuestionDraft,
    type QuestionImportRow,
} from "@/lib/set-editor/question-import";

function normalizeCellText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function stripHtmlTags(value: string): string {
    return normalizeCellText(value.replace(/<[^>]+>/g, " "));
}

function tableRowsFromHtmlRegex(html: string): QuestionImportRow[] {
    const rows: QuestionImportRow[] = [];
    const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

    for (const tableHtml of tableMatches) {
        const rowHtmlList = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
        if (rowHtmlList.length < 2) {
            continue;
        }

        const headerRowHtml = rowHtmlList[0];
        if (!headerRowHtml) {
            continue;
        }
        const headerCells = (headerRowHtml.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map(stripHtmlTags);
        const language = detectQuestionImportLanguage(headerCells);
        if (!language) {
            continue;
        }

        for (const rowHtml of rowHtmlList.slice(1)) {
            const cells = (rowHtml.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map(stripHtmlTags);
            if (cells.every((cell) => cell.length === 0)) {
                continue;
            }

            const row: QuestionImportRow = {};
            headerCells.forEach((header, index) => {
                if (header) {
                    row[header] = cells[index] ?? "";
                }
            });
            rows.push(row);
        }
    }

    return rows;
}

function tableRowsFromHtml(html: string): QuestionImportRow[] {
    if (typeof DOMParser === "undefined") {
        return tableRowsFromHtmlRegex(html);
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const tables = Array.from(doc.querySelectorAll("table"));
    const rows: QuestionImportRow[] = [];

    for (const table of tables) {
        const tableRows = Array.from(table.querySelectorAll("tr"));
        if (tableRows.length < 2) {
            continue;
        }

        const headerCells = Array.from(tableRows[0].querySelectorAll("th,td")).map((cell) =>
            normalizeCellText(cell.textContent ?? "")
        );
        const language = detectQuestionImportLanguage(headerCells);
        if (!language) {
            continue;
        }

        for (const rowEl of tableRows.slice(1)) {
            const cells = Array.from(rowEl.querySelectorAll("td,th")).map((cell) =>
                normalizeCellText(cell.textContent ?? "")
            );
            if (cells.every((cell) => cell.length === 0)) {
                continue;
            }

            const row: QuestionImportRow = {};
            headerCells.forEach((header, index) => {
                if (header) {
                    row[header] = cells[index] ?? "";
                }
            });
            rows.push(row);
        }
    }

    return rows.length > 0 ? rows : tableRowsFromHtmlRegex(html);
}

const BLOCK_FIELD_PATTERNS: Array<{ key: keyof BlockFields; pattern: RegExp }> = [
    { key: "question", pattern: /^(?:คำถาม|question(?:\s*text)?|q)\s*[:：]\s*(.+)$/i },
    { key: "time", pattern: /^(?:เวลา(?:\s*\(วินาที\))?|time(?:\s*limit)?)\s*[:：]\s*(\d+)\s*$/i },
    { key: "correct", pattern: /^(?:คำตอบที่ถูกต้อง|correct(?:\s*answer)?|answer)\s*[:：]\s*(.+)$/i },
    { key: "opt2", pattern: /^(?:ตัวเลือก\s*2|option\s*2)\s*[:：]\s*(.+)$/i },
    { key: "opt3", pattern: /^(?:ตัวเลือก\s*3|option\s*3)\s*[:：]\s*(.+)$/i },
    { key: "opt4", pattern: /^(?:ตัวเลือก\s*4|option\s*4)\s*[:：]\s*(.+)$/i },
];

type BlockFields = {
    question: string;
    time: string;
    correct: string;
    opt2: string;
    opt3: string;
    opt4: string;
};

function blockToRow(fields: BlockFields, language: "en" | "th"): QuestionImportRow {
    if (language === "th") {
        return {
            คำถาม: fields.question,
            "เวลา (วินาที)": fields.time,
            "คำตอบที่ถูกต้อง": fields.correct,
            "ตัวเลือก 2": fields.opt2,
            "ตัวเลือก 3": fields.opt3,
            "ตัวเลือก 4": fields.opt4,
        };
    }

    return {
        "Question Text": fields.question,
        "Time Limit": fields.time,
        "Correct Answer": fields.correct,
        "Option 2": fields.opt2,
        "Option 3": fields.opt3,
        "Option 4": fields.opt4,
    };
}

function parseBlock(block: string, language: "en" | "th"): QuestionImportRow | null {
    const fields: BlockFields = {
        question: "",
        time: "",
        correct: "",
        opt2: "",
        opt3: "",
        opt4: "",
    };

    const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    for (const line of lines) {
        for (const { key, pattern } of BLOCK_FIELD_PATTERNS) {
            const match = line.match(pattern);
            if (match?.[1]) {
                fields[key] = normalizeCellText(match[1]);
                break;
            }
        }
    }

    if (!fields.question && lines.length > 0) {
        const firstLine = lines[0].replace(/^(?:ข้อ\s*\d+[:：.]?\s*)/i, "");
        fields.question = normalizeCellText(firstLine);
    }

    return blockToRow(fields, language);
}

function rowsFromPlainText(text: string, language: "en" | "th"): QuestionImportRow[] {
    const blocks = text
        .split(/\n\s*\n+/)
        .map((block) => block.trim())
        .filter(Boolean);

    return blocks.map((block) => parseBlock(block, language)).filter((row): row is QuestionImportRow => row !== null);
}

export function parseQuestionsFromWordHtml(html: string, rawText: string, language: "en" | "th"): ImportedQuestionDraft[] {
    const tableRows = tableRowsFromHtml(html);
    if (tableRows.length > 0) {
        return mapRowsToImportedQuestions(tableRows);
    }

    const examRows = rowsFromExamFormatText(rawText, language);
    if (examRows.length > 0) {
        return mapRowsToImportedQuestions(examRows);
    }

    return mapRowsToImportedQuestions(rowsFromPlainText(rawText, language));
}

export async function parseQuestionsFromDocxFile(
    file: File,
    language: "en" | "th"
): Promise<ImportedQuestionDraft[]> {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const [htmlResult, textResult] = await Promise.all([
        mammoth.convertToHtml({ arrayBuffer }),
        mammoth.extractRawText({ arrayBuffer }),
    ]);

    return parseQuestionsFromWordHtml(htmlResult.value, textResult.value, language);
}

export function isDocxFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return (
        name.endsWith(".docx") ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
}
