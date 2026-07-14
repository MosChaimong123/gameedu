import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WorksheetBuilder } from "@/components/classroom/worksheet-builder";
import { buildDefaultWorksheetData } from "@/lib/worksheet-schema";

vi.mock("@/components/providers/language-provider", () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.count ? `${key}:${params.count}` : key,
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/components/image-upload", () => ({
  ImageUpload: ({ value }: { value: string }) =>
    React.createElement("div", { "data-testid": "image-upload" }, value || "image-upload"),
}));

vi.mock("@/components/media-upload", () => ({
  MediaUpload: ({ value }: { value: string }) =>
    React.createElement("div", { "data-testid": "media-upload" }, value || "media-upload"),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("div", { className }, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("h2", { className }, children),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("div", { className }, children),
  SheetDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", null, children),
  SheetHeader: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  SheetTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("h2", { className }, children),
}));

describe("worksheet builder drag_drop authoring", () => {
  it("renders visually-positioned area boxes, add/remove controls, and a correct-choice select", () => {
    const value = buildDefaultWorksheetData("https://example.com/worksheet-bg.png");
    value.pages[0].items = [
      {
        id: "dd-1",
        type: "drag_drop",
        x: 10,
        y: 10,
        width: 50,
        height: 20,
        prompt: "Match the pictures",
        pointsPerTarget: 1,
        choices: [
          {
            id: "choice-a",
            label: "Choice A",
            sourceArea: { x: 12, y: 18, width: 18, height: 8 },
          },
        ],
        targets: [
          {
            id: "target-a",
            label: "Target A",
            correctChoiceId: "choice-a",
            dropArea: { x: 58, y: 18, width: 22, height: 8 },
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(<WorksheetBuilder value={value} onChange={() => {}} />);

    // area boxes are positioned directly on the canvas using sourceArea/dropArea, not the item's own x/y/width/height
    expect(html).toContain("left:12%");
    expect(html).toContain("top:18%");
    expect(html).toContain("width:18%");
    expect(html).toContain("left:58%");
    expect(html).toContain("width:22%");

    // add/remove controls for choices and targets
    expect(html).toContain("assignmentWorksheetAddDragSelectChoice");
    expect(html).toContain("assignmentWorksheetAddDragTarget");
    expect(html).toContain("assignmentWorksheetRemoveDragChoice");
    expect(html).toContain("assignmentWorksheetRemoveDragTarget");

    // correct-choice pairing control per target
    expect(html).toContain('data-slot="select-trigger"');
  });
});

describe("worksheet builder matching_pairs authoring", () => {
  it("renders prompt/choice area boxes as images and add/remove controls", () => {
    const value = buildDefaultWorksheetData("https://example.com/worksheet-bg.png");
    value.pages[0].items = [
      {
        id: "mp-1",
        type: "matching_pairs",
        x: 12,
        y: 60,
        width: 58,
        height: 18,
        prompt: "Match the pictures",
        pointsPerPair: 1,
        choices: [
          {
            id: "choice-a",
            label: "Choice A",
            sourceArea: { x: 60, y: 12, width: 15, height: 8 },
          },
        ],
        prompts: [
          {
            id: "prompt-a",
            label: "Prompt A",
            correctChoiceId: "choice-a",
            sourceArea: { x: 10, y: 12, width: 15, height: 8 },
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(<WorksheetBuilder value={value} onChange={() => {}} />);

    // both prompt and choice render as image-cropped area boxes at their own sourceArea
    expect(html).toContain("left:10%");
    expect(html).toContain("left:60%");
    expect(html).toContain("width:15%");

    // add/remove controls for choices and prompts
    expect(html).toContain("assignmentWorksheetMatchingAddChoice");
    expect(html).toContain("assignmentWorksheetMatchingRemoveChoice");
    expect(html).toContain("assignmentWorksheetMatchingAddPrompt");
    expect(html).toContain("assignmentWorksheetMatchingRemovePrompt");

    // correct-choice pairing select is still present
    expect(html).toContain('data-slot="select-trigger"');
  });
});

describe("worksheet builder word_search authoring", () => {
  it("renders grid size inputs, canvas marking hint, and answer-cell overlay for a selected word_search item", () => {
    const value = buildDefaultWorksheetData("https://example.com/worksheet-bg.png");
    value.pages[0].items = [
      {
        id: "ws-1",
        type: "word_search",
        x: 12,
        y: 60,
        width: 50,
        height: 30,
        prompt: "Find the hidden words",
        rows: 6,
        cols: 6,
        answerCells: [0, 1, 2],
        pointsPerCell: 1,
      },
    ];

    const html = renderToStaticMarkup(<WorksheetBuilder value={value} onChange={() => {}} />);

    expect(html).toContain("assignmentWorksheetAddWordSearch");
    expect(html).toContain("assignmentWorksheetWordSearchRowsLabel");
    expect(html).toContain("assignmentWorksheetWordSearchColsLabel");
    expect(html).toContain("assignmentWorksheetWordSearchMarkOnCanvasHint");
    expect(html).toContain("assignmentWorksheetWordSearchAnswerCount:3");
    // canvas overlay: a 6x6 grid of toggle cells positioned at the item's box
    expect(html).toContain("repeat(6, minmax(0, 1fr))");
    expect(html).toContain('aria-pressed="true"');
  });
});

describe("worksheet builder mobile polish", () => {
  it("renders compact mobile actions for adding tools and previewing", () => {
    const html = renderToStaticMarkup(
      <WorksheetBuilder value={buildDefaultWorksheetData()} onChange={() => {}} />
    );

    // mobile-only compact add-tools card
    expect(html).toContain("lg:hidden");
    expect(html).toContain("assignmentWorksheetAddPage");
    expect(html).toContain("assignmentWorksheetToolbarLabel");
    expect(html).toContain("assignmentWorksheetPreviewLabel");
    expect(html).toContain("assignmentWorksheetAddShortText");
    expect(html).toContain("assignmentWorksheetAddDragDrop");
  });

  it("keeps page chips in a horizontal scroll container for small screens", () => {
    const value = buildDefaultWorksheetData();
    value.pages.push(
      {
        ...value.pages[0],
        id: "page-2",
        pageNumber: 2,
      },
      {
        ...value.pages[0],
        id: "page-3",
        pageNumber: 3,
      }
    );

    const html = renderToStaticMarkup(<WorksheetBuilder value={value} onChange={() => {}} />);

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("assignmentWorksheetPageChip:1");
    expect(html).toContain("assignmentWorksheetPageChip:2");
    expect(html).toContain("assignmentWorksheetPageChip:3");
  });
});
