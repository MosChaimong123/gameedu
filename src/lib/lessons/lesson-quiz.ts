import { normalizeGeneratedQuestions, type QuestionSetQuestion } from "@/lib/question-set-schema";

export type LessonQuizQuestion = Pick<
    QuestionSetQuestion,
    "id" | "question" | "options" | "correctAnswer" | "explanation"
>;

export type LessonQuizDraft = {
    questions: LessonQuizQuestion[];
    generatedAt?: string;
};

export type LessonContentWithQuiz = {
    objectives?: string[];
    sections?: Array<{ heading?: string; content?: string }>;
    keyTerms?: Array<{ term?: string; definition?: string }>;
    summary?: string;
    quizDraft?: LessonQuizDraft;
};

function isNonEmptyText(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

export function buildLessonQuizSourceText(content: LessonContentWithQuiz) {
    return [
        (content.objectives ?? []).filter(isNonEmptyText).join("\n"),
        (content.sections ?? [])
            .map((section) => [section.heading, section.content].filter(isNonEmptyText).join("\n"))
            .filter(Boolean)
            .join("\n\n"),
        (content.keyTerms ?? [])
            .map((term) => [term.term, term.definition].filter(isNonEmptyText).join(": "))
            .filter(Boolean)
            .join("\n"),
        content.summary ?? "",
    ]
        .filter(isNonEmptyText)
        .join("\n\n");
}

export function normalizeLessonQuizQuestions(input: unknown, createId: () => string): LessonQuizQuestion[] {
    return normalizeGeneratedQuestions(input, createId)
        .slice(0, 10)
        .map((question) => ({
            id: question.id,
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
        }));
}

export function getLessonQuizDraft(content: unknown): LessonQuizDraft | null {
    if (!content || typeof content !== "object") return null;
    const draft = (content as { quizDraft?: unknown }).quizDraft;
    if (!draft || typeof draft !== "object") return null;
    const questions = (draft as { questions?: unknown }).questions;
    if (!Array.isArray(questions)) return null;

    try {
        const normalized = questions
            .map((question, index): LessonQuizQuestion | null => {
                if (!question || typeof question !== "object") return null;
                const item = question as Record<string, unknown>;
                const options = item.options;
                if (
                    !isNonEmptyText(item.question) ||
                    !Array.isArray(options) ||
                    options.length !== 4 ||
                    !options.every(isNonEmptyText) ||
                    typeof item.correctAnswer !== "number" ||
                    !Number.isInteger(item.correctAnswer) ||
                    item.correctAnswer < 0 ||
                    item.correctAnswer > 3
                ) {
                    return null;
                }
                return {
                    id: isNonEmptyText(item.id) ? item.id : `q-${index + 1}`,
                    question: item.question,
                    options,
                    correctAnswer: item.correctAnswer,
                    explanation: isNonEmptyText(item.explanation) ? item.explanation : "",
                };
            })
            .filter((question): question is LessonQuizQuestion => Boolean(question));
        return normalized.length > 0 ? { questions: normalized } : null;
    } catch {
        return null;
    }
}
