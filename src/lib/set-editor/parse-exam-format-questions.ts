import type { QuestionImportRow } from "@/lib/set-editor/question-import";

const THAI_OPTION_LETTERS = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ"] as const;
const EN_OPTION_LETTERS = ["a", "b", "c", "d", "e"] as const;

function normalizeLine(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function normalizeOptionLetter(value: string): string {
    return value.trim().toLowerCase();
}

/** Split document into blocks starting at lines like "1. ..." */
export function splitNumberedQuestionBlocks(text: string): string[] {
    const lines = text.split(/\r?\n/).map((line) => line.trim());
    const blocks: string[][] = [];
    let current: string[] = [];

    for (const line of lines) {
        if (!line) {
            continue;
        }

        if (/^\d+\.\s/.test(line) && current.length > 0) {
            blocks.push(current);
            current = [line];
        } else {
            current.push(line);
        }
    }

    if (current.length > 0) {
        blocks.push(current);
    }

    return blocks.map((blockLines) => blockLines.join("\n"));
}

function looksLikeExamFormat(text: string): boolean {
    const hasNumberedQuestion = /^\d+\.\s/m.test(text);
    const hasThaiOptions = /^[กขคงจฉชซ]\s*[.)]/m.test(text);
    const hasEnOptions = /^[a-eA-E]\s*[.)]/m.test(text);
    const hasAnswerLine = /^ตอบ\s/m.test(text) || /^answer\s*[:：]?/im.test(text);
    return hasNumberedQuestion && (hasThaiOptions || hasEnOptions) && hasAnswerLine;
}

export function parseExamFormatBlock(block: string, language: "en" | "th"): QuestionImportRow | null {
    const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    let question = "";
    let timeLimit = "";
    const optionsByLetter = new Map<string, string>();
    let answerLetter = "";

    for (const line of lines) {
        const questionMatch = line.match(/^\d+\.\s*(.+)$/);
        if (questionMatch?.[1]) {
            question = normalizeLine(questionMatch[1]);
            continue;
        }

        const timeMatch = line.match(/^(?:เวลา(?:\s*\(วินาที\))?|time(?:\s*limit)?)\s*[:：]\s*(\d+)\s*$/i);
        if (timeMatch?.[1]) {
            timeLimit = timeMatch[1];
            continue;
        }

        const thaiOptionMatch = line.match(/^([กขคงจฉชซฌญ])\s*[.)]\s*(.+)$/u);
        if (thaiOptionMatch?.[1] && thaiOptionMatch[2]) {
            optionsByLetter.set(thaiOptionMatch[1], normalizeLine(thaiOptionMatch[2]));
            continue;
        }

        const enOptionMatch = line.match(/^([a-eA-E])\s*[.)]\s*(.+)$/);
        if (enOptionMatch?.[1] && enOptionMatch[2]) {
            optionsByLetter.set(normalizeOptionLetter(enOptionMatch[1]), normalizeLine(enOptionMatch[2]));
            continue;
        }

        const thaiAnswerMatch = line.match(/^ตอบ\s*[:：]?\s*([กขคงจฉชซฌญ])\s*\.?\s*$/u);
        if (thaiAnswerMatch?.[1]) {
            answerLetter = thaiAnswerMatch[1];
            continue;
        }

        const enAnswerMatch = line.match(/^answer\s*[:：]?\s*([a-eA-E])\s*\.?\s*$/i);
        if (enAnswerMatch?.[1]) {
            answerLetter = normalizeOptionLetter(enAnswerMatch[1]);
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
    if (!looksLikeExamFormat(text)) {
        return [];
    }

    return splitNumberedQuestionBlocks(text)
        .map((block) => parseExamFormatBlock(block, language))
        .filter((row): row is QuestionImportRow => row !== null);
}
