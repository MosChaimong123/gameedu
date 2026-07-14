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
            reviewMode: "auto",
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
          id: "drag-1",
          type: "drag_drop",
          x: 18,
          y: 58,
          width: 52,
          height: 16,
          prompt: "Match each country to its capital",
          choices: [
            { id: "choice-th", label: "Thailand", sourceArea: { x: 10, y: 60, width: 15, height: 8 } },
            { id: "choice-jp", label: "Japan", sourceArea: { x: 10, y: 70, width: 15, height: 8 } },
          ],
          targets: [
            {
              id: "target-bangkok",
              label: "Bangkok",
              correctChoiceId: "choice-th",
              dropArea: { x: 50, y: 60, width: 18, height: 8 },
            },
            {
              id: "target-tokyo",
              label: "Tokyo",
              correctChoiceId: "choice-jp",
              dropArea: { x: 50, y: 70, width: 18, height: 8 },
            },
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
            { id: "choice-math", label: "Mr. A", sourceArea: { x: 60, y: 12, width: 15, height: 8 } },
            { id: "choice-science", label: "Ms. B", sourceArea: { x: 60, y: 24, width: 15, height: 8 } },
          ],
          prompts: [
            {
              id: "prompt-math",
              label: "Math",
              correctChoiceId: "choice-math",
              sourceArea: { x: 10, y: 12, width: 15, height: 8 },
            },
            {
              id: "prompt-science",
              label: "Science",
              correctChoiceId: "choice-science",
              sourceArea: { x: 10, y: 24, width: 15, height: 8 },
            },
          ],
          pointsPerPair: 1,
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
      "drag-1": {
        "target-bangkok": "choice-th",
        "target-tokyo": "choice-jp",
      },
      "match-1": {
        "prompt-math": "choice-math",
        "prompt-science": "choice-science",
      },
    });

    expect(result.score).toBe(11);
    expect(result.maxScore).toBe(11);
    expect(result.itemResults).toEqual([
      expect.objectContaining({ itemId: "short-1", correct: true, score: 2 }),
      expect.objectContaining({ itemId: "mcq-1", correct: true, score: 3 }),
      expect.objectContaining({ itemId: "drag-1", correct: true, score: 4 }),
      expect.objectContaining({ itemId: "match-1", correct: true, score: 2 }),
    ]);
  });

  it("returns zero points for wrong answers", () => {
    const result = gradeWorksheetSubmission(worksheetFixture, {
      "short-1": "Chiang Mai",
      "mcq-1": 0,
      "drag-1": {
        "target-bangkok": "choice-jp",
        "target-tokyo": "choice-th",
      },
      "match-1": {
        "prompt-math": "choice-science",
        "prompt-science": "choice-math",
      },
    });

    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(11);
    expect(result.itemResults).toEqual([
      expect.objectContaining({ itemId: "short-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "mcq-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "drag-1", correct: false, score: 0 }),
      expect.objectContaining({ itemId: "match-1", correct: false, score: 0 }),
    ]);
  });

  it("awards partial score for partially correct drag-drop and matching answers", () => {
    const result = gradeWorksheetSubmission(worksheetFixture, {
      "short-1": "Bangkok",
      "mcq-1": 1,
      "drag-1": {
        "target-bangkok": "choice-th",
        "target-tokyo": "choice-th",
      },
      "match-1": {
        "prompt-math": "choice-math",
        "prompt-science": "choice-math",
      },
    });

    expect(result.score).toBe(8);
    expect(result.maxScore).toBe(11);
    expect(result.itemResults).toEqual([
      expect.objectContaining({ itemId: "short-1", correct: true, score: 2 }),
      expect.objectContaining({ itemId: "mcq-1", correct: true, score: 3 }),
      expect.objectContaining({ itemId: "drag-1", correct: false, score: 2, maxScore: 4 }),
      expect.objectContaining({ itemId: "match-1", correct: false, score: 1, maxScore: 2 }),
    ]);
  });

  it("requires every accepted choice for grouped drag-drop targets", () => {
    const groupWorksheet: WorksheetData = {
      ...worksheetFixture,
      pages: [
        {
          ...worksheetFixture.pages[0],
          items: [
            {
              id: "drag-group-1",
              type: "drag_drop",
              x: 18,
              y: 58,
              width: 52,
              height: 16,
              prompt: "Group drag pieces into one target",
              choices: [
                { id: "choice-a", label: "A", sourceArea: { x: 10, y: 55, width: 12, height: 8 } },
                { id: "choice-b", label: "B", sourceArea: { x: 10, y: 65, width: 12, height: 8 } },
                { id: "choice-c", label: "C", sourceArea: { x: 10, y: 75, width: 12, height: 8 } },
                { id: "choice-extra", label: "Extra", sourceArea: { x: 10, y: 85, width: 12, height: 8 } },
              ],
              targets: [
                {
                  id: "target-group",
                  label: "Group target",
                  correctChoiceId: "choice-a",
                  acceptedChoiceIds: ["choice-a", "choice-b", "choice-c"],
                  dropArea: { x: 50, y: 60, width: 20, height: 20 },
                },
              ],
              pointsPerTarget: 3,
            },
          ],
        },
      ],
    };

    expect(
      gradeWorksheetSubmission(groupWorksheet, {
        "drag-group-1": {
          "target-group": ["choice-a", "choice-b", "choice-c"],
        },
      }).score
    ).toBe(3);

    expect(
      gradeWorksheetSubmission(groupWorksheet, {
        "drag-group-1": {
          "target-group": ["choice-a", "choice-b"],
        },
      }).score
    ).toBe(0);

    expect(
      gradeWorksheetSubmission(groupWorksheet, {
        "drag-group-1": {
          "target-group": ["choice-a", "choice-b", "choice-c", "choice-extra"],
        },
      }).score
    ).toBe(0);
  });

  it("marks manual review short text items as pending", () => {
    const firstItem = worksheetFixture.pages[0]?.items[0];
    if (!firstItem || firstItem.type !== "short_text") {
      throw new Error("short text fixture missing");
    }

    const manualWorksheet: WorksheetData = {
      ...worksheetFixture,
      pages: [
        {
          ...worksheetFixture.pages[0],
          items: [
            {
              ...firstItem,
              answer: {
                ...firstItem.answer,
                reviewMode: "manual",
              },
            },
          ],
        },
      ],
    };

    const result = gradeWorksheetSubmission(manualWorksheet, {
      "short-1": "Bangkok",
    });

    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(2);
    expect(result.itemResults).toEqual([
      expect.objectContaining({
        itemId: "short-1",
        correct: null,
        score: 0,
        maxScore: 2,
        needsReview: true,
      }),
    ]);
  });

  describe("drag_select scoring", () => {
    const dragSelectWorksheet: WorksheetData = {
      version: 1,
      source: { type: "image", url: "data:image/png;base64,abc" },
      pages: [
        {
          id: "page-1",
          pageNumber: 1,
          backgroundUrl: "data:image/png;base64,abc",
          width: 1200,
          height: 1600,
          items: [
            {
              id: "drag-select-1",
              type: "drag_select",
              x: 18,
              y: 58,
              width: 52,
              height: 16,
              prompt: "ลากภาพที่ถูกต้องมาวางที่จุดวาง",
              choices: [
                { id: "ds-choice-a", label: "A", sourceArea: { x: 10, y: 12, width: 12, height: 8 } },
                { id: "ds-choice-b", label: "B", sourceArea: { x: 10, y: 24, width: 12, height: 8 } },
              ],
              dropArea: { x: 64, y: 18, width: 14, height: 8 },
              correctChoiceId: "ds-choice-a",
              points: 3,
            },
          ],
        },
      ],
      settings: { showScoreToStudent: true, allowResubmit: false, shuffleItems: false },
    };

    it("awards full points for correct choice", () => {
      const result = gradeWorksheetSubmission(dragSelectWorksheet, {
        "drag-select-1": "ds-choice-a",
      });
      expect(result.score).toBe(3);
      expect(result.maxScore).toBe(3);
      expect(result.itemResults).toEqual([
        expect.objectContaining({
          itemId: "drag-select-1",
          correct: true,
          score: 3,
          maxScore: 3,
          needsReview: false,
        }),
      ]);
    });

    it("awards zero points for wrong choice", () => {
      const result = gradeWorksheetSubmission(dragSelectWorksheet, {
        "drag-select-1": "ds-choice-b",
      });
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(3);
      expect(result.itemResults).toEqual([
        expect.objectContaining({
          itemId: "drag-select-1",
          correct: false,
          score: 0,
          maxScore: 3,
        }),
      ]);
    });

    it("awards zero points for empty answer", () => {
      const result = gradeWorksheetSubmission(dragSelectWorksheet, {
        "drag-select-1": "",
      });
      expect(result.score).toBe(0);
      expect(result.itemResults).toEqual([
        expect.objectContaining({
          itemId: "drag-select-1",
          correct: false,
          score: 0,
        }),
      ]);
    });
  });

  describe("word_search scoring", () => {
    // 6x6 grid; the teacher marked cells 0, 1, 2 (top-left row) as the answer.
    const wordSearchWorksheet: WorksheetData = {
      version: 1,
      source: { type: "image", url: "data:image/png;base64,abc" },
      pages: [
        {
          id: "page-1",
          pageNumber: 1,
          backgroundUrl: "data:image/png;base64,abc",
          width: 1200,
          height: 1600,
          items: [
            {
              id: "ws-1",
              type: "word_search",
              x: 12,
              y: 60,
              width: 50,
              height: 30,
              prompt: "แตะช่องที่เป็นคำตอบในภาพค้นหาคำ",
              rows: 6,
              cols: 6,
              answerCells: [0, 1, 2],
              pointsPerCell: 2,
            },
          ],
        },
      ],
      settings: { showScoreToStudent: true, allowResubmit: false, shuffleItems: false },
    };

    it("awards full points when every answer cell is selected and nothing else", () => {
      const result = gradeWorksheetSubmission(wordSearchWorksheet, { "ws-1": "0,1,2" });
      expect(result.score).toBe(6);
      expect(result.maxScore).toBe(6);
      expect(result.itemResults).toEqual([
        expect.objectContaining({
          itemId: "ws-1",
          correct: true,
          score: 6,
          maxScore: 6,
          needsReview: false,
        }),
      ]);
    });

    it("awards partial points for partially correct selections", () => {
      const result = gradeWorksheetSubmission(wordSearchWorksheet, { "ws-1": "0,1" });
      expect(result.score).toBe(4);
      expect(result.itemResults).toEqual([
        expect.objectContaining({ itemId: "ws-1", correct: false, score: 4, maxScore: 6 }),
      ]);
    });

    it("cancels correct points with wrong selections", () => {
      const result = gradeWorksheetSubmission(wordSearchWorksheet, { "ws-1": "0,1,2,3,4" });
      // 3 correct, 2 wrong -> net 1 earned cell
      expect(result.score).toBe(2);
      expect(result.itemResults).toEqual([
        expect.objectContaining({ itemId: "ws-1", correct: false, score: 2, maxScore: 6 }),
      ]);
    });

    it("scores zero for missing answers", () => {
      const result = gradeWorksheetSubmission(wordSearchWorksheet, {});
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(6);
    });
  });
});
