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

describe("worksheet builder mobile polish", () => {
  it("renders compact mobile actions for add, arrange, and preview", () => {
    const html = renderToStaticMarkup(
      <WorksheetBuilder value={buildDefaultWorksheetData()} onChange={() => {}} />
    );

    expect(html).toContain("sticky top-2 z-20");
    expect(html).toContain("assignmentWorksheetAddPage");
    expect(html).toContain("assignmentWorksheetToolbarLabel");
    expect(html).toContain("assignmentWorksheetArrangeLabel");
    expect(html).toContain("assignmentWorksheetPreviewLabel");
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
