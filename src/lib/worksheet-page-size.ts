// worksheetPageSchema (src/lib/worksheet-schema.ts) constrains a page to
// width 320–4000 and height 320–6000. Source images/PDF pages can fall outside
// that range (a small icon, or a huge scan), which would make the worksheet
// fail validation and silently block saving. Clamp the stored page size into
// the valid range so any uploaded background can still be saved.

export const WORKSHEET_PAGE_MIN = 320;
export const WORKSHEET_PAGE_MAX_WIDTH = 4000;
export const WORKSHEET_PAGE_MAX_HEIGHT = 6000;

export function clampWorksheetPageWidth(value: number): number {
  if (Number.isNaN(value)) return WORKSHEET_PAGE_MIN;
  return Math.min(WORKSHEET_PAGE_MAX_WIDTH, Math.max(WORKSHEET_PAGE_MIN, Math.round(value)));
}

export function clampWorksheetPageHeight(value: number): number {
  if (Number.isNaN(value)) return WORKSHEET_PAGE_MIN;
  return Math.min(WORKSHEET_PAGE_MAX_HEIGHT, Math.max(WORKSHEET_PAGE_MIN, Math.round(value)));
}
