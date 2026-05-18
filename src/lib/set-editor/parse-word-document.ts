import { rowsFromExamFormatText } from "@/lib/set-editor/parse-exam-format-questions";
import {
    detectQuestionImportLanguage,
    mapRowsToImportedQuestions,
    type ImportedQuestionDraft,
    type QuestionImportRow,
} from "@/lib/set-editor/question-import";
import { isZipParseErrorMessage, WordImportError } from "@/lib/set-editor/word-import-errors";
import { extractTextFromWordHtml } from "@/lib/set-editor/word-html-text";

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

    const structuredText = extractTextFromWordHtml(html);
    const textForExam = structuredText.length > 0 ? structuredText : rawText;

    const examRows = rowsFromExamFormatText(textForExam, language);
    if (examRows.length > 0) {
        return mapRowsToImportedQuestions(examRows);
    }

    return mapRowsToImportedQuestions(rowsFromPlainText(textForExam, language));
}

function htmlToPlainText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function isOleWordDocument(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer.slice(0, 4));
    return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

function isZipOfficeDocument(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer.slice(0, 2));
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function looksLikeHtmlWordDocument(buffer: ArrayBuffer): boolean {
    const scanLength = Math.min(buffer.byteLength, 16384);
    const slice = buffer.slice(0, scanLength);
    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(slice).toLowerCase();
    if (utf8.includes("<html") || utf8.includes("<!doctype")) {
        return true;
    }

    const bom = new Uint8Array(buffer.slice(0, 2));
    if (bom[0] === 0xff && bom[1] === 0xfe) {
        const utf16 = new TextDecoder("utf-16le", { fatal: false }).decode(slice).toLowerCase();
        return utf16.includes("<html") || utf16.includes("<!doctype");
    }

    return false;
}

export async function parseQuestionsFromDocxFile(
    file: File,
    language: "en" | "th"
): Promise<ImportedQuestionDraft[]> {
    try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const [htmlResult, textResult] = await Promise.all([
            mammoth.convertToHtml({ arrayBuffer }),
            mammoth.extractRawText({ arrayBuffer }),
        ]);

        return parseQuestionsFromWordHtml(htmlResult.value, textResult.value, language);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (isZipParseErrorMessage(message)) {
            throw new WordImportError("CORRUPT_DOCX");
        }
        throw err;
    }
}

/** Supports .docx and the downloaded .doc template (HTML). */
export async function parseQuestionsFromWordFile(
    file: File,
    language: "en" | "th"
): Promise<ImportedQuestionDraft[]> {
    const name = file.name.toLowerCase();

    if (name.endsWith(".docx")) {
        return parseQuestionsFromDocxFile(file, language);
    }

    if (name.endsWith(".doc")) {
        const buffer = await file.arrayBuffer();

        if (isZipOfficeDocument(buffer)) {
            const docxFile = new File([buffer], file.name.replace(/\.doc$/i, ".docx"), {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            return parseQuestionsFromDocxFile(docxFile, language);
        }

        if (looksLikeHtmlWordDocument(buffer)) {
            const html = new TextDecoder().decode(buffer);
            return parseQuestionsFromWordHtml(html, htmlToPlainText(html), language);
        }

        if (isOleWordDocument(buffer)) {
            throw new WordImportError("LEGACY_DOC");
        }

        throw new WordImportError("UNSUPPORTED");
    }

    throw new WordImportError("UNSUPPORTED");
}

export function isSupportedWordImportFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return (
        name.endsWith(".docx") ||
        name.endsWith(".doc") ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword"
    );
}

/** @deprecated Use isSupportedWordImportFile */
export function isDocxFile(file: File): boolean {
    return isSupportedWordImportFile(file);
}
