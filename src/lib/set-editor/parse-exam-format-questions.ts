import type { QuestionImportRow } from "@/lib/set-editor/question-import";
import { normalizeExamImportDocument, normalizeExamImportLine } from "@/lib/set-editor/word-html-text";

const THAI_OPTION_LETTERS = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ"] as const;
const EN_OPTION_LETTERS = ["a", "b", "c", "d", "e"] as const;

function normalizeLine(value: string): string {
    return normalizeExamImportLine(value);
}

function normalizeOptionLetter(value: string): string {
    return value.trim().toLowerCase();
}

function isThaiOptionLine(line: string): boolean {
    return /^[กขคงจฉชซฌญ]\s*[.)]/u.test(line);
}

function isEnOptionLine(line: string): boolean {
    return /^[a-eA-E]\s*[.)]/i.test(line);
}

function isAnswerLineForSplit(line: string): boolean {
    return /^ตอบ\s*[:：]?\s*[กขคงจฉชซฌญ]/u.test(line) || /^answer\s*[:：]?\s*[a-e]/i.test(line);
}

function containsAnswerMarker(line: string): boolean {
    return isAnswerLineForSplit(line) || /(?:^|\s)ตอบ\s*[:：]?\s*[กขคงจฉชซฌญ]/u.test(line) || /(?:^|\s)answer\s*[:：]?\s*[a-e]/i.test(line);
}

function isTimeLine(line: string): boolean {
    return /^(?:เวลา(?:\s*\(วินาที\))?|time(?:\s*limit)?)\s*[:：]\s*\d+\s*$/i.test(line);
}

/** Split document into question blocks (numbered lines or groups ending with ตอบ / Answer). */
export function splitNumberedQuestionBlocks(text: string): string[] {
    const lines = normalizeExamImportDocument(text).split(/\n/);
    const blocks: string[][] = [];
    let current: string[] = [];

    for (const line of lines) {
        if (/^\d+\.\s/.test(line) && current.length > 0) {
            blocks.push(current);
            current = [line];
            continue;
        }

        current.push(line);

        if (isAnswerLineForSplit(line)) {
            blocks.push(current);
            current = [];
        }
    }

    if (current.length > 0) {
        blocks.push(current);
    }

    return blocks.map((blockLines) => blockLines.join("\n")).filter((block) => block.trim().length > 0);
}

function looksLikeExamFormat(text: string): boolean {
    const normalized = normalizeExamImportDocument(text);
    const hasNumberedQuestion = /^\d+\.\s/m.test(normalized);
    const hasThaiOptions = /^[กขคงจฉชซฌญ]\s*[.)]/mu.test(normalized);
    const hasEnOptions = /^[a-eA-E]\s*[.)]/m.test(normalized);
    const hasAnswerLine =
        /^ตอบ\s/m.test(normalized) || /^answer\s*[:：]?/im.test(normalized) || containsAnswerMarker(normalized);
    const answerCount = (normalized.match(/^ตอบ\s*[กขคงจฉชซฌญ]/gmu) ?? []).length;
    const hasExamShape = (hasThaiOptions || hasEnOptions) && hasAnswerLine;
    return hasExamShape && (hasNumberedQuestion || answerCount >= 1);
}

export function parseExamFormatBlock(block: string, language: "en" | "th"): QuestionImportRow | null {
    const lines = block.split(/\n/).map((line) => normalizeExamImportLine(line)).filter(Boolean);

    let question = "";
    let timeLimit = "";
    const optionsByLetter = new Map<string, string>();
    let answerLetter = "";
    let lastOptionLetter: string | null = null;

    for (const line of lines) {
        const questionMatch = line.match(/^\d+\.\s*(.+)$/);
        if (questionMatch?.[1]) {
            question = normalizeLine(questionMatch[1]);
            lastOptionLetter = null;
            continue;
        }

        const timeMatch = line.match(/^(?:เวลา(?:\s*\(วินาที\))?|time(?:\s*limit)?)\s*[:：]\s*(\d+)\s*$/i);
        if (timeMatch?.[1]) {
            timeLimit = timeMatch[1];
            lastOptionLetter = null;
            continue;
        }

        const thaiOptionMatch = line.match(/^([กขคงจฉชซฌญ])\s*[.)]\s*(.*)$/u);
        if (thaiOptionMatch?.[1]) {
            const optionText = normalizeLine(thaiOptionMatch[2]?.split(/\t/)[0] ?? thaiOptionMatch[2] ?? "");
            optionsByLetter.set(thaiOptionMatch[1], optionText);
            lastOptionLetter = thaiOptionMatch[1];
            continue;
        }

        const enOptionMatch = line.match(/^([a-eA-E])\s*[.)]\s*(.*)$/i);
        if (enOptionMatch?.[1]) {
            const letter = normalizeOptionLetter(enOptionMatch[1]);
            optionsByLetter.set(letter, normalizeLine(enOptionMatch[2] ?? ""));
            lastOptionLetter = letter;
            continue;
        }

        const thaiAnswerMatch = line.match(/(?:^|\s)ตอบ\s*[:：]?\s*([กขคงจฉชซฌญ])\s*\.?/u);
        if (thaiAnswerMatch?.[1]) {
            answerLetter = thaiAnswerMatch[1];
            lastOptionLetter = null;
            continue;
        }

        const enAnswerMatch = line.match(/(?:^|\s)answer\s*[:：]?\s*([a-eA-E])\s*\.?/i);
        if (enAnswerMatch?.[1]) {
            answerLetter = normalizeOptionLetter(enAnswerMatch[1]);
            lastOptionLetter = null;
            continue;
        }

        if (
            lastOptionLetter &&
            !containsAnswerMarker(line) &&
            !isTimeLine(line) &&
            !isThaiOptionLine(line) &&
            !isEnOptionLine(line)
        ) {
            const previous = optionsByLetter.get(lastOptionLetter) ?? "";
            optionsByLetter.set(lastOptionLetter, normalizeLine(`${previous} ${line}`.trim()));
            continue;
        }

        if (
            !question &&
            !isThaiOptionLine(line) &&
            !isEnOptionLine(line) &&
            !containsAnswerMarker(line) &&
            !isTimeLine(line) &&
            !/^จัดรูปแบบ/u.test(line) &&
            !/^ถ้าต้องการกำหนดเวลา/u.test(line)
        ) {
            question = normalizeLine(line);
            lastOptionLetter = null;
        }
    }

    if (!question || optionsByLetter.size === 0) {
        return null;
    }

    const letterOrder = language === "th" ? THAI_OPTION_LETTERS : EN_OPTION_LETTERS;

    let correctText = "";
    if (answerLetter) {
        correctText =
            optionsByLetter.get(answerLetter) ??
            optionsByLetter.get(normalizeOptionLetter(answerLetter)) ??
            "";
    }

    if (!correctText) {
        const firstLetter = letterOrder.find((letter) => optionsByLetter.has(letter));
        correctText = firstLetter ? optionsByLetter.get(firstLetter) ?? "" : "";
    }

    const wrongOptions: string[] = [];
    for (const letter of letterOrder) {
        const optionText = optionsByLetter.get(letter);
        if (optionText && optionText !== correctText) {
            wrongOptions.push(optionText);
        }
    }

    if (!correctText) {
        return null;
    }

    if (language === "th") {
        return {
            คำถาม: question,
            "เวลา (วินาที)": timeLimit,
            "คำตอบที่ถูกต้อง": correctText,
            "ตัวเลือก 2": wrongOptions[0] ?? "",
            "ตัวเลือก 3": wrongOptions[1] ?? "",
            "ตัวเลือก 4": wrongOptions[2] ?? "",
        };
    }

    return {
        "Question Text": question,
        "Time Limit": timeLimit,
        "Correct Answer": correctText,
        "Option 2": wrongOptions[0] ?? "",
        "Option 3": wrongOptions[1] ?? "",
        "Option 4": wrongOptions[2] ?? "",
    };
}

export function rowsFromExamFormatText(text: string, language: "en" | "th"): QuestionImportRow[] {
    const normalized = normalizeExamImportDocument(text);
    if (!looksLikeExamFormat(normalized)) {
        return [];
    }

    return splitNumberedQuestionBlocks(normalized)
        .map((block) => parseExamFormatBlock(block, language))
        .filter((row): row is QuestionImportRow => row !== null);
}
