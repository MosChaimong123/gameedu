import { describe, expect, it } from "vitest";
import {
  clampWorksheetPageHeight,
  clampWorksheetPageWidth,
  WORKSHEET_PAGE_MAX_HEIGHT,
  WORKSHEET_PAGE_MAX_WIDTH,
  WORKSHEET_PAGE_MIN,
} from "@/lib/worksheet-page-size";
import { validateWorksheetData } from "@/lib/worksheet-schema";

describe("worksheet page size clamping", () => {
  it("clamps small dimensions up to the schema minimum", () => {
    expect(clampWorksheetPageWidth(50)).toBe(WORKSHEET_PAGE_MIN);
    expect(clampWorksheetPageHeight(1)).toBe(WORKSHEET_PAGE_MIN);
    expect(clampWorksheetPageWidth(0)).toBe(WORKSHEET_PAGE_MIN);
  });

  it("clamps huge dimensions down to the schema maximum", () => {
    expect(clampWorksheetPageWidth(99999)).toBe(WORKSHEET_PAGE_MAX_WIDTH);
    expect(clampWorksheetPageHeight(99999)).toBe(WORKSHEET_PAGE_MAX_HEIGHT);
  });

  it("keeps in-range dimensions and rounds to an integer", () => {
    expect(clampWorksheetPageWidth(800)).toBe(800);
    expect(clampWorksheetPageHeight(1123.6)).toBe(1124);
  });

  it("falls back to the minimum for non-finite input", () => {
    expect(clampWorksheetPageWidth(Number.NaN)).toBe(WORKSHEET_PAGE_MIN);
    expect(clampWorksheetPageHeight(Number.POSITIVE_INFINITY)).toBe(WORKSHEET_PAGE_MAX_HEIGHT);
  });

  it("produces a page that passes validateWorksheetData (regression for small-image save)", () => {
    const worksheet = {
      version: 1,
      source: { type: "image", url: "/uploads/tiny.png" },
      pages: [
        {
          id: "page-1",
          pageNumber: 1,
          backgroundUrl: "/uploads/tiny.png",
          // A 50x50 source image clamped into the valid range.
          width: clampWorksheetPageWidth(50),
          height: clampWorksheetPageHeight(50),
          items: [
            {
              id: "item-1",
              type: "short_text",
              x: 10,
              y: 10,
              width: 30,
              height: 5,
              label: "Answer",
              placeholder: "",
              answer: { mode: "normalized", reviewMode: "auto", accepted: ["a"], points: 1 },
            },
          ],
        },
      ],
      settings: { showScoreToStudent: true, allowResubmit: false, shuffleItems: false },
    };

    expect(validateWorksheetData(worksheet).ok).toBe(true);

    // Without clamping the same source image would be invalid (below min 320).
    const unclamped = {
      ...worksheet,
      pages: [{ ...worksheet.pages[0], width: 50, height: 50 }],
    };
    expect(validateWorksheetData(unclamped).ok).toBe(false);
  });
});
