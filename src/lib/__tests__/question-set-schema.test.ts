import { describe, expect, it } from "vitest";
import {
  normalizeGeneratedQuestions,
  validateQuestionSetQuestions,
} from "@/lib/question-set-schema";

const validQuestion = {
  id: "q1",
  question: "What is 2 + 2?",
  image: null,
  timeLimit: 20,
  options: ["1", "2", "3", "4"],
  optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
  questionType: "MULTIPLE_CHOICE",
  correctAnswer: 3,
  explanation: "",
};

describe("question set schema", () => {
  it("accepts valid editor questions", () => {
    expect(validateQuestionSetQuestions([validQuestion])).toEqual({
      ok: true,
      questions: [validQuestion],
    });
  });

  it("rejects corrupt question arrays before saving", () => {
    expect(
      validateQuestionSetQuestions([
        {
          ...validQuestion,
          options: ["only one option"],
          correctAnswer: 9,
        },
      ])
    ).toEqual({ ok: false, code: "INVALID_QUESTION_DATA" });
  });

  it("normalizes AI generated questions into editor-ready questions", () => {
    expect(
      normalizeGeneratedQuestions(
        [
          {
            question: "Capital of Thailand?",
            options: ["Bangkok", "Chiang Mai", "Phuket", "Khon Kaen"],
            correctAnswer: 0,
          },
        ],
        () => "generated-1"
      )
    ).toEqual([
      {
        id: "generated-1",
        question: "Capital of Thailand?",
        image: null,
        timeLimit: 20,
        options: ["Bangkok", "Chiang Mai", "Phuket", "Khon Kaen"],
        optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
        questionType: "MULTIPLE_CHOICE",
        correctAnswer: 0,
        explanation: "",
      },
    ]);
  });
});
