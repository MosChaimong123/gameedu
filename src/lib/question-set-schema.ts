import { z } from "zod";

const optionTypeSchema = z.enum(["TEXT", "IMAGE", "MATH"]);
const questionTypeSchema = z.enum(["MULTIPLE_CHOICE", "TYPING_ANSWER"]);

export const generatedQuestionInputSchema = z.object({
  question: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().optional(),
});

export const questionSetQuestionSchema = generatedQuestionInputSchema.extend({
  id: z.string().trim().min(1),
  image: z.string().nullable().optional(),
  timeLimit: z.number().int().min(1).max(600),
  optionTypes: z.array(optionTypeSchema).length(4),
  questionType: questionTypeSchema,
  explanation: z.string(),
});

export type QuestionSetQuestion = z.infer<typeof questionSetQuestionSchema>;

export function validateQuestionSetQuestions(
  questions: unknown
): { ok: true; questions: QuestionSetQuestion[] } | { ok: false; code: "INVALID_QUESTION_DATA" } {
  const parsed = z.array(questionSetQuestionSchema).safeParse(questions);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_QUESTION_DATA" };
  }

  return { ok: true, questions: parsed.data };
}

export function normalizeGeneratedQuestions(
  input: unknown,
  createId: () => string
): QuestionSetQuestion[] {
  const parsed = z.array(generatedQuestionInputSchema).parse(input);

  return parsed.map((question) => ({
    id: createId(),
    question: question.question,
    image: null,
    timeLimit: 20,
    options: question.options,
    optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
    questionType: "MULTIPLE_CHOICE",
    correctAnswer: question.correctAnswer,
    explanation: question.explanation ?? "",
  }));
}
