import { describe, expect, it } from "vitest";
import {
  sanitizeWorksheetForStudent,
  validateWorksheetData,
} from "@/lib/worksheet-schema";

const worksheetFixture = {
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
          id: "item-1",
          type: "short_text",
          x: 10,
          y: 12,
          width: 30,
          height: 5,
          label: "Planet",
          placeholder: "",
          answer: {
            mode: "normalized",
            accepted: ["earth", "โลก"],
            points: 2,
          },
        },
        {
          id: "item-2",
          type: "multiple_choice",
          x: 12,
          y: 24,
          width: 40,
          height: 12,
          prompt: "2 + 2",
          options: ["1", "2", "3", "4"],
          correctIndex: 3,
          points: 1,
        },
        {
          id: "item-3",
          type: "fill_blank",
          x: 18,
          y: 40,
          width: 48,
          height: 12,
          prompt: "Water boils at __ degrees and freezes at __ degrees.",
          blanks: [
            {
              id: "blank-1",
              label: "Blank 1",
              placeholder: "",
              answer: {
                mode: "normalized",
                accepted: ["100", "100 c"],
              },
            },
            {
              id: "blank-2",
              label: "Blank 2",
              placeholder: "",
              answer: {
                mode: "normalized",
                accepted: ["0", "0 c"],
              },
            },
          ],
          pointsPerBlank: 2,
        },
        {
          id: "item-4",
          type: "drag_drop",
          x: 20,
          y: 58,
          width: 52,
          height: 16,
          prompt: "Match the animal to its sound",
          choices: [
            { id: "choice-cat", label: "Cat" },
            { id: "choice-dog", label: "Dog" },
          ],
          targets: [
            { id: "target-meow", label: "Meow", correctChoiceId: "choice-cat" },
            { id: "target-bark", label: "Bark", correctChoiceId: "choice-dog" },
          ],
          pointsPerTarget: 1,
        },
        {
          id: "item-5",
          type: "matching_pairs",
          x: 24,
          y: 78,
          width: 48,
          height: 16,
          prompt: "Match the country and capital",
          choices: [
            { id: "choice-bangkok", label: "Bangkok" },
            { id: "choice-tokyo", label: "Tokyo" },
          ],
          prompts: [
            { id: "prompt-thailand", label: "Thailand", correctChoiceId: "choice-bangkok" },
            { id: "prompt-japan", label: "Japan", correctChoiceId: "choice-tokyo" },
          ],
          pointsPerPair: 1,
        },
        {
          id: "item-6",
          type: "media_prompt",
          x: 28,
          y: 90,
          width: 50,
          height: 16,
          prompt: "Listen and write the word",
          mediaType: "audio",
          mediaUrl: "/uploads/sample-audio.mp3",
          placeholder: "",
          answer: {
            mode: "normalized",
            accepted: ["banana"],
            points: 2,
          },
        },
        {
          id: "item-7",
          type: "checklist",
          x: 30,
          y: 86,
          width: 52,
          height: 18,
          prompt: "Select the fruits",
          options: [
            { id: "check-apple", label: "Apple", correct: true },
            { id: "check-carrot", label: "Carrot", correct: false },
            { id: "check-banana", label: "Banana", correct: true },
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

describe("worksheet schema", () => {
  it("accepts valid worksheet data", () => {
    const parsed = validateWorksheetData(worksheetFixture);
    expect(parsed.ok).toBe(true);
  });

  it("rejects multiple choice items with invalid correct index", () => {
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [
        {
          ...worksheetFixture.pages[0],
          items: [
            worksheetFixture.pages[0].items[0],
            {
              ...worksheetFixture.pages[0].items[1],
              options: ["1", "2"],
              correctIndex: 3,
            },
          ],
        },
      ],
    });

    expect(parsed.ok).toBe(false);
  });

  it("removes answer keys from student payload", () => {
    const parsed = validateWorksheetData(worksheetFixture);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const studentView = sanitizeWorksheetForStudent(parsed.data);
    expect(JSON.stringify(studentView)).not.toContain("accepted");
    expect(JSON.stringify(studentView)).not.toContain("correctIndex");
    expect(studentView.pages[0]?.items).toHaveLength(7);
  });
});
