import { describe, expect, it } from "vitest";
import { gradeWorksheetSubmission } from "@/lib/grade-worksheet-submission";
import type { WorksheetData } from "@/lib/worksheet-schema";

const worksheetFixture: WorksheetData = {
  version: 1,
  source: {
    type: "image",
    url: "data:image/png;base64,abc",
  },
  pages: [
    {
      id: "page-1",
      pageNumber: 1,
      backgroundUrl: "data:image/png;base64,abc",
      width: 1200,
      height: 1600,
      items: [
        {
          id: "short-1",
          type: "short_text",
          x: 10,
          y: 10,
          width: 30,
          height: 5,
          label: "Capital",
          placeholder: "",
          answer: {
            mode: "normalized",
            accepted: ["bangkok"],
            points: 2,
          },
        },
        {
          id: "mcq-1",
          type: "multiple_choice",
          x: 10,
          y: 20,
          width: 40,
          height: 12,
          prompt: "1 + 1",
          options: ["1", "2", "3", "4"],
          correctIndex: 1,
          points: 3,
        },
        {
          id: "fill-1",
          type: "fill_blank",
          x: 15,
          y: 36,
          width: 50,
          height: 14,
          prompt: "Primary colors: __, __, __",
          blanks: [
            {
              id: "fill-1-blank-1",
              label: "Blank 1",
              placeholder: "",
              answer: {
                mode: "normalized",
                accepted: ["red"],
              },
            },
            {
              id: "fill-1-blank-2",
              label: "Blank 2",
              placeholder: "",
              answer: {
                mode: "normalized",
                accepted: ["blue"],
              },
            },
            {
              id: "fill-1-blank-3",
              label: "Blank 3",
              placeholder: "",
              answer: {
                mode: "normalized",
                accepted: ["yellow"],
              },
            },
          ],
          pointsPerBlank: 2,
        },
        {
          id: "drag-1",
          type: "drag_drop",
          x: 18,
          y: 58,
          width: 52,
          height: 16,
          prompt: "Match each country to its capital",
          choices: [
            { id: "choice-th", label: "Thailand" },
            { id: "choice-jp", label: "Japan" },
          ],
          targets: [
            { id: "target-bangkok", label: "Bangkok", correctChoiceId: "choice-th" },
            { id: "target-tokyo", label: "Tokyo", correctChoiceId: "choice-jp" },
          ],
          pointsPerTarget: 2,
        },
        {
          id: "match-1",
          type: "matching_pairs",
          x: 20,
          y: 76,
          width: 50,
          height: 16,
          prompt: "Match the subject and teacher",
          choices: [
            { id: "choice-math", label: "Mr. A" },
            { id: "choice-science", label: "Ms. B" },
          ],
          prompts: [
            { id: "prompt-math", label: "Math", correctChoiceId: "choice-math" },
            { id: "prompt-science", label: "Science", correctChoiceId: "choice-science" },
          ],
          pointsPerPair: 1,
        },
        {
          id: "media-1",
          type: "media_prompt",
          x: 22,
          y: 92,
          width: 52,
          height: 16,
          prompt: "Listen and answer",
          mediaType: "audio",
          mediaUrl: "/uploads/sample-audio.mp3",
          placeholder: "",
          answer: {
            mode: "normalized",
            accepted: ["hello"],
            points: 2,
          },
        },
        {
          id: "check-1",
          type: "checklist",
          x: 24,
          y: 86,
          width: 54,
          height: 18,
          prompt: "Select all mammals",
          options: [
            { id: "check-cat", label: "Cat", correct: true },
            { id: "check-fish", label: "Fish", correct: false },
            { id: "check-dog", label: "Dog", correct: true },
          ],
          pointsPerCorrect: 1,
        },
      ],
    },
  ],
  settings: {
    showScoreToStudent: true,
    allowResubmit: false,
    shuffleItems: false,
  },
};

describe("gradeWorksheetSubmission", () => {
  it("awards points for correct text and multiple choice answers", () => {
    const result = gradeWorksheetSubmission(worksheetFixture, {
      "short-1": "Bangkok ",
      "mcq-1": 1,
      "fill-1": ["Red", "blue", "yellow"],
      "drag-1": {
        "target-bangkok": "choice-th",
        "target-tokyo": "choice-jp",
      },
      "match-1": {
        "prompt-math": "choice-math",
        "prompt-science": "choice-science",
      },
      "media-1": " hello ",
      "check-1": [true, false, true],
    });

    expect(result.score).toBe(21);
    expect(result.maxScore).toBe(21);
    expect(result.itemResults).toEqual([
      expect.objectContaining({ itemId: "short-1", correct: true, score: 2 }),
      expect.objectContaining({ itemId: "mcq-1", correct: true, score: 3 }),
      expect.objectContaining({ itemId: "fill-1", correct: true, score: 6 }),
      expect.objectContaining({ itemId: "drag-1", correct: true, score: 4 }),
      expect.objectContaining({ itemId: "match-1", correct: true, score: 2 }),
      expect.objectContaining({ itemId: "media-1", correct: true, score: 2 }),
      expect.objectContaining({ itemId: "check-1", correct: true, score: 2 }),
    ]);
  });

  it("returns zero points for wrong answers", () => {
    const result = gradeWorksheetSubmission(worksheetFixture, {
      "short-1": "Chiang Mai",
      "mcq-1": 0,
      "fill-1": ["green", "purple", "orange"],
      "drag-1": {
        "target-bangkok": "choice-jp",
        "target-tokyo": "choice-th",
      },
      "match-1": {
        "prompt-math": "choice-science",
        "prompt-science": "choice-math",
      },
      "media-1": "goodbye",
      "check-1": [false, true, false],
    });

    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(21);
    expect(result.itemResults).toEqual([
      expect.objectContaining({ itemId: "short-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "mcq-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "fill-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "drag-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "match-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "media-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "check-1", correct: false, score: 0 }),
    ]);
  });

  it("awards partial score for partially correct fill blanks", () => {
    const result = gradeWorksheetSubmission(worksheetFixture, {
      "short-1": "Bangkok",
      "mcq-1": 1,
      "fill-1": ["red", "purple", "yellow"],
      "drag-1": {
        "target-bangkok": "choice-th",
        "target-tokyo": "choice-th",
      },
      "match-1": {
        "prompt-math": "choice-math",
        "prompt-science": "choice-math",
      },
      "media-1": "hello",
      "check-1": [true, false, false],
    });

    expect(result.score).toBe(15);
    expect(result.maxScore).toBe(21);
    expect(result.itemResults).toEqual([
      expect.objectContaining({ itemId: "short-1", correct: true, score: 2 }),
      expect.objectContaining({ itemId: "mcq-1", correct: true, score: 3 }),
      expect.objectContaining({ itemId: "fill-1", correct: false, score: 4, maxScore: 6 }),
      expect.objectContaining({ itemId: "drag-1", correct: false, score: 2, maxScore: 4 }),
      expect.objectContaining({ itemId: "match-1", correct: false, score: 1, maxScore: 2 }),
      expect.objectContaining({ itemId: "media-1", correct: true, score: 2, maxScore: 2 }),
      expect.objectContaining({ itemId: "check-1", correct: false, score: 1, maxScore: 2 }),
    ]);
  });
});
