import type { WorksheetData } from "@/lib/worksheet-schema";
import { validateWorksheetData } from "@/lib/worksheet-schema";

export function parseWorksheetDataFromAssignmentPayload(raw: unknown): WorksheetData | null {
  const parsed = validateWorksheetData(raw);
  return parsed.ok ? parsed.data : null;
}

export function sumWorksheetMaxScore(worksheet: WorksheetData) {
  return worksheet.pages.reduce((pageSum, page) => {
    return (
      pageSum +
      page.items.reduce((itemSum, item) => {
        if (item.type === "short_text") {
          return itemSum + item.answer.points;
        }
        if (item.type === "drag_drop") {
          return itemSum + item.targets.length * item.pointsPerTarget;
        }
        if (item.type === "drag_select") {
          return itemSum + item.points;
        }
        if (item.type === "matching_pairs") {
          return itemSum + item.prompts.length * item.pointsPerPair;
        }
        if (item.type === "word_search") {
          return itemSum + item.answerCells.length * item.pointsPerCell;
        }
        return itemSum + item.points;
      }, 0)
    );
  }, 0);
}

export function countWorksheetItems(worksheet: WorksheetData) {
  return worksheet.pages.reduce((sum, page) => sum + page.items.length, 0);
}

export function hasWorksheetBackgrounds(worksheet: WorksheetData) {
  return worksheet.pages.every((page) => page.backgroundUrl.trim().length > 0);
}
