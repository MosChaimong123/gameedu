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
            reviewMode: "auto",
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
          type: "drag_drop",
          x: 20,
          y: 58,
          width: 52,
          height: 16,
          prompt: "ลากภาพจากต้นทางไปวางที่จุดวางให้ถูกต้อง",
          choices: [
            {
              id: "choice-cat",
              label: "Cat",
              sourceArea: { x: 10, y: 12, width: 12, height: 8 },
            },
            {
              id: "choice-dog",
              label: "Dog",
              sourceArea: { x: 10, y: 24, width: 12, height: 8 },
            },
          ],
          targets: [
            {
              id: "target-meow",
              label: "Meow",
              correctChoiceId: "choice-cat",
              dropArea: { x: 64, y: 12, width: 14, height: 8 },
            },
            {
              id: "target-bark",
              label: "Bark",
              correctChoiceId: "choice-dog",
              dropArea: { x: 64, y: 24, width: 14, height: 8 },
            },
          ],
          pointsPerTarget: 1,
        },
        {
          id: "item-4",
          type: "matching_pairs",
          x: 24,
          y: 78,
          width: 48,
          height: 16,
          prompt: "Match the country and capital",
          choices: [
            { id: "choice-bangkok", label: "Bangkok", sourceArea: { x: 60, y: 12, width: 15, height: 8 } },
            { id: "choice-tokyo", label: "Tokyo", sourceArea: { x: 60, y: 24, width: 15, height: 8 } },
          ],
          prompts: [
            {
              id: "prompt-thailand",
              label: "Thailand",
              correctChoiceId: "choice-bangkok",
              sourceArea: { x: 10, y: 12, width: 15, height: 8 },
            },
            {
              id: "prompt-japan",
              label: "Japan",
              correctChoiceId: "choice-tokyo",
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

  it("rejects drag drop items without source and drop areas", () => {
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [
        {
          ...worksheetFixture.pages[0],
          items: [
            {
              ...worksheetFixture.pages[0].items[2],
              choices: [{ id: "choice-cat", label: "Cat" }],
              targets: [{ id: "target-meow", label: "Meow", correctChoiceId: "choice-cat" }],
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
    expect(studentView.pages[0]?.items).toHaveLength(4);
  });

  it("accepts manual review mode for supported items", () => {
    const parsed = validateWorksheetData(worksheetFixture);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const shortText = parsed.data.pages[0]?.items[0];
    expect(shortText && "answer" in shortText ? shortText.answer.reviewMode : null).toBe("auto");
  });

  it("accepts valid drag_select item", () => {
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [
        {
          ...worksheetFixture.pages[0],
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
                {
                  id: "ds-choice-a",
                  label: "A",
                  sourceArea: { x: 10, y: 12, width: 12, height: 8 },
                },
                {
                  id: "ds-choice-b",
                  label: "B",
                  sourceArea: { x: 10, y: 24, width: 12, height: 8 },
                },
              ],
              dropArea: { x: 64, y: 18, width: 14, height: 8 },
              correctChoiceId: "ds-choice-a",
              points: 2,
            },
          ],
        },
      ],
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects drag_select item with invalid correctChoiceId", () => {
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [
        {
          ...worksheetFixture.pages[0],
          items: [
            {
              id: "drag-select-2",
              type: "drag_select",
              x: 18,
              y: 58,
              width: 52,
              height: 16,
              prompt: "ลากภาพที่ถูกต้องมาวางที่จุดวาง",
              choices: [
                {
                  id: "ds-choice-a",
                  label: "A",
                  sourceArea: { x: 10, y: 12, width: 12, height: 8 },
                },
                {
                  id: "ds-choice-b",
                  label: "B",
                  sourceArea: { x: 10, y: 24, width: 12, height: 8 },
                },
              ],
              dropArea: { x: 64, y: 18, width: 14, height: 8 },
              correctChoiceId: "ds-choice-missing",
              points: 2,
            },
          ],
        },
      ],
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects drag_select item with fewer than 2 choices", () => {
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [
        {
          ...worksheetFixture.pages[0],
          items: [
            {
              id: "drag-select-3",
              type: "drag_select",
              x: 18,
              y: 58,
              width: 52,
              height: 16,
              prompt: "ลากภาพที่ถูกต้องมาวางที่จุดวาง",
              choices: [
                {
                  id: "ds-choice-a",
                  label: "A",
                  sourceArea: { x: 10, y: 12, width: 12, height: 8 },
                },
              ],
              dropArea: { x: 64, y: 18, width: 14, height: 8 },
              correctChoiceId: "ds-choice-a",
              points: 2,
            },
          ],
        },
      ],
    });
    expect(parsed.ok).toBe(false);
  });

  it("strips correctChoiceId from drag_select student payload", () => {
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [
        {
          ...worksheetFixture.pages[0],
          items: [
            {
              id: "drag-select-4",
              type: "drag_select",
              x: 18,
              y: 58,
              width: 52,
              height: 16,
              prompt: "ลากภาพที่ถูกต้องมาวางที่จุดวาง",
              choices: [
                {
                  id: "ds-choice-a",
                  label: "A",
                  sourceArea: { x: 10, y: 12, width: 12, height: 8 },
                },
                {
                  id: "ds-choice-b",
                  label: "B",
                  sourceArea: { x: 10, y: 24, width: 12, height: 8 },
                },
              ],
              dropArea: { x: 64, y: 18, width: 14, height: 8 },
              correctChoiceId: "ds-choice-a",
              points: 2,
            },
          ],
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const studentView = sanitizeWorksheetForStudent(parsed.data);
    const serialized = JSON.stringify(studentView);
    expect(serialized).not.toContain("correctChoiceId");
    expect(serialized).toContain("dropArea");
  });

  const buildWordSearchItem = () => ({
    id: "word-search-1",
    type: "word_search",
    x: 12,
    y: 60,
    width: 50,
    height: 30,
    prompt: "ค้นหาคำที่ซ่อนอยู่ในตาราง",
    rows: 6,
    cols: 6,
    answerCells: [0, 1, 2],
    pointsPerCell: 2,
  });

  it("accepts valid word_search item", () => {
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [{ ...worksheetFixture.pages[0], items: [buildWordSearchItem()] }],
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects word_search item with duplicate answer cells", () => {
    const item = buildWordSearchItem();
    item.answerCells = [0, 0, 1];
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [{ ...worksheetFixture.pages[0], items: [item] }],
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects word_search item whose answer cell is out of grid bounds", () => {
    const item = buildWordSearchItem();
    item.answerCells = [0, 1, 999];
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [{ ...worksheetFixture.pages[0], items: [item] }],
    });
    expect(parsed.ok).toBe(false);
  });

  it("strips answerCells from word_search student payload", () => {
    const parsed = validateWorksheetData({
      ...worksheetFixture,
      pages: [{ ...worksheetFixture.pages[0], items: [buildWordSearchItem()] }],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const studentView = sanitizeWorksheetForStudent(parsed.data);
    const item = studentView.pages[0]?.items[0];
    expect(item?.type).toBe("word_search");
    const serialized = JSON.stringify(item);
    expect(serialized).not.toContain("answerCells");
    expect(serialized).toContain('"rows"');
    expect(serialized).toContain('"cols"');
  });
});
