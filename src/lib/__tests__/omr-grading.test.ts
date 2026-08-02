import { describe, expect, it } from "vitest";
import {
  gradeOmrAnswers,
  parseOmrAnswerKey,
  parseOmrDetectedAnswers,
} from "@/lib/omr-grading";
import {
  OMR_ANSWER_GEOMETRY,
  OMR_QUESTION_COUNT,
  OMR_STUDENT_ID_GEOMETRY,
} from "@/lib/omr-template";

describe("fixed Thai OMR template", () => {
  it("contains one geometry row for every question and five student digits", () => {
    expect(OMR_ANSWER_GEOMETRY).toHaveLength(50);
    expect(OMR_ANSWER_GEOMETRY.map((item) => item.question)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1)
    );
    expect(OMR_ANSWER_GEOMETRY.every((item) => item.bubbles.length === 5)).toBe(true);
    expect(OMR_STUDENT_ID_GEOMETRY).toHaveLength(5);
    expect(OMR_STUDENT_ID_GEOMETRY.every((item) => item.bubbles.length === 10)).toBe(true);
  });
});

describe("OMR server grading", () => {
  const answerKey = Object.fromEntries(
    Array.from({ length: OMR_QUESTION_COUNT }, (_, index) => [
      String(index + 1),
      index % 2 === 0 ? "A" : "B",
    ])
  );
  const answers = Array.from({ length: OMR_QUESTION_COUNT }, (_, index) => ({
    question: index + 1,
    answer: index < 40 ? (index % 2 === 0 ? "A" : "B") : "E",
    confidence: 0.9,
    ambiguous: false,
  }));

  it("requires a complete A-E answer key when grading", () => {
    expect(parseOmrAnswerKey({ ...answerKey, "50": "" }, { requireComplete: true })).toEqual({
      ok: false,
      message: "Answer key is incomplete at question 50",
    });
  });

  it("normalizes detected answers and calculates the score from the key", () => {
    const parsedKey = parseOmrAnswerKey(answerKey, { requireComplete: true });
    const parsedAnswers = parseOmrDetectedAnswers(answers);
    expect(parsedKey.ok).toBe(true);
    expect(parsedAnswers.ok).toBe(true);
    if (!parsedKey.ok || !parsedAnswers.ok) return;

    const result = gradeOmrAnswers(
      parsedAnswers.answers,
      parsedKey.answerKey as Record<string, "A" | "B" | "C" | "D" | "E">
    );
    expect(result.score).toBe(40);
    expect(result.total).toBe(50);
    expect(result.answers[49]).toMatchObject({
      question: 50,
      answer: "E",
      correctAnswer: "B",
      isCorrect: false,
    });
  });

  it("rejects duplicate or missing question rows", () => {
    expect(parseOmrDetectedAnswers(answers.slice(0, 49))).toMatchObject({ ok: false });
    expect(
      parseOmrDetectedAnswers([
        ...answers.slice(0, 49),
        { ...answers[49], question: 1 },
      ])
    ).toMatchObject({ ok: false });
  });
});
