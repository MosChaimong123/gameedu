"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePlus2,
  Move,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLanguage } from "@/components/providers/language-provider";
import {
  WorksheetStudentPageRenderer,
  getAreaBackgroundStyle,
} from "@/components/worksheet/worksheet-student-page-renderer";
import {
  buildDefaultWorksheetData,
  normalizeWorksheetAcceptedAnswers,
  sanitizeWorksheetForStudent,
  type WorksheetData,
  type WorksheetItem,
  type WorksheetPage,
  type WorksheetStudentAnswers,
  type WorksheetWordSearchItem,
} from "@/lib/worksheet-schema";

type Props = {
  value: WorksheetData;
  onChange: (value: WorksheetData) => void;
  disabled?: boolean;
  layoutMode?: "default" | "immersive";
  allowSourceImport?: boolean;
};

type WorksheetArea = { x: number; y: number; width: number; height: number };

type WorksheetAreaTarget = {
  kind: "choice" | "target" | "dropArea" | "prompt";
  itemId: string;
  areaId?: string;
};

type WorksheetPreviewDragState = {
  mode: "move" | "resize";
  itemId: string;
  areaTarget?: WorksheetAreaTarget;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  containerWidth: number;
  containerHeight: number;
};


function clampWorksheetItem(item: WorksheetItem): WorksheetItem {
  return {
    ...item,
    x: Math.min(95, Math.max(0, Number(item.x.toFixed(2)))),
    y: Math.min(97, Math.max(0, Number(item.y.toFixed(2)))),
    width: Math.min(100, Math.max(5, Number(item.width.toFixed(2)))),
    height: Math.min(40, Math.max(3, Number(item.height.toFixed(2)))),
  };
}

function clampWorksheetArea(area: WorksheetArea): WorksheetArea {
  return {
    x: Math.min(98, Math.max(0, Number(area.x.toFixed(2)))),
    y: Math.min(98, Math.max(0, Number(area.y.toFixed(2)))),
    width: Math.min(100, Math.max(3, Number(area.width.toFixed(2)))),
    height: Math.min(100, Math.max(3, Number(area.height.toFixed(2)))),
  };
}

function nextAreaOffset(count: number, xBase: number, width: number): WorksheetArea {
  return { x: xBase, y: 18 + count * 9, width, height: 8 };
}


function createShortTextItem(): WorksheetItem {
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "short_text",
    label: "Answer",
    placeholder: "",
    x: 12,
    y: 12,
    width: 30,
    height: 5,
    answer: {
      mode: "normalized",
      reviewMode: "auto",
      accepted: ["answer"],
      points: 1,
    },
  };
}

function createMultipleChoiceItem(): WorksheetItem {
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "multiple_choice",
    prompt: "Question",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctIndex: 0,
    x: 12,
    y: 24,
    width: 50,
    height: 15,
    points: 1,
  };
}

function createDragDropItem(): WorksheetItem {
  const choiceAId = `choice-${crypto.randomUUID()}`;
  const choiceBId = `choice-${crypto.randomUUID()}`;
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "drag_drop",
    prompt: "ลากภาพจากต้นทางไปวางที่จุดวางให้ถูกต้อง",
    x: 12,
    y: 60,
    width: 58,
    height: 18,
    pointsPerTarget: 1,
    choices: [
      {
        id: choiceAId,
        label: "ต้นทาง 1",
        sourceArea: { x: 12, y: 18, width: 18, height: 8 },
      },
      {
        id: choiceBId,
        label: "ต้นทาง 2",
        sourceArea: { x: 12, y: 31, width: 18, height: 8 },
      },
    ],
    targets: [
      {
        id: `target-${crypto.randomUUID()}`,
        label: "จุดวาง 1",
        correctChoiceId: choiceAId,
        dropArea: { x: 58, y: 18, width: 22, height: 8 },
      },
      {
        id: `target-${crypto.randomUUID()}`,
        label: "จุดวาง 2",
        correctChoiceId: choiceBId,
        dropArea: { x: 58, y: 31, width: 22, height: 8 },
      },
    ],
  };
}

function createDragSelectItem(): WorksheetItem {
  const choiceAId = `choice-${crypto.randomUUID()}`;
  const choiceBId = `choice-${crypto.randomUUID()}`;
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "drag_select",
    prompt: "ลากภาพที่ถูกต้องมาวางที่จุดวาง",
    x: 12,
    y: 60,
    width: 58,
    height: 18,
    points: 1,
    choices: [
      {
        id: choiceAId,
        label: "ตัวเลือก 1",
        sourceArea: { x: 12, y: 18, width: 18, height: 8 },
      },
      {
        id: choiceBId,
        label: "ตัวเลือก 2",
        sourceArea: { x: 12, y: 31, width: 18, height: 8 },
      },
    ],
    dropArea: { x: 58, y: 24, width: 22, height: 8 },
    correctChoiceId: choiceAId,
  };
}

function createMatchingPairsItem(): WorksheetItem {
  const choiceAId = `choice-${crypto.randomUUID()}`;
  const choiceBId = `choice-${crypto.randomUUID()}`;
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "matching_pairs",
    prompt: "ลากเส้นจากรูปฝั่งซ้ายไปจับคู่กับรูปที่ถูกต้องฝั่งขวา",
    x: 12,
    y: 78,
    width: 58,
    height: 18,
    pointsPerPair: 1,
    choices: [
      { id: choiceAId, label: "คำตอบ A", sourceArea: nextAreaOffset(0, 58, 22) },
      { id: choiceBId, label: "คำตอบ B", sourceArea: nextAreaOffset(1, 58, 22) },
    ],
    prompts: [
      {
        id: `prompt-${crypto.randomUUID()}`,
        label: "โจทย์ 1",
        correctChoiceId: choiceAId,
        sourceArea: nextAreaOffset(0, 12, 22),
      },
      {
        id: `prompt-${crypto.randomUUID()}`,
        label: "โจทย์ 2",
        correctChoiceId: choiceBId,
        sourceArea: nextAreaOffset(1, 12, 22),
      },
    ],
  };
}

function createWordSearchItem(): WorksheetItem {
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "word_search",
    prompt: "แตะช่องที่เป็นคำตอบในภาพค้นหาคำ",
    x: 12,
    y: 60,
    width: 50,
    height: 30,
    rows: 9,
    cols: 9,
    answerCells: [],
    pointsPerCell: 1,
  };
}

// Resize the marking grid, keeping answer cells that still fit inside the new bounds.
function resizeWordSearchItem(
  item: WorksheetWordSearchItem,
  nextRows: number,
  nextCols: number
): WorksheetWordSearchItem {
  const nextAnswerCells = item.answerCells
    .map((cellIndex) => {
      const row = Math.floor(cellIndex / item.cols);
      const col = cellIndex % item.cols;
      return row < nextRows && col < nextCols ? row * nextCols + col : -1;
    })
    .filter((cellIndex) => cellIndex >= 0);
  return { ...item, rows: nextRows, cols: nextCols, answerCells: nextAnswerCells };
}

function createWorksheetPage(pageNumber: number): WorksheetPage {
  return {
    id: `page-${crypto.randomUUID()}`,
    pageNumber,
    backgroundUrl: "",
    width: 1200,
    height: 1600,
    items: [],
  };
}

function duplicateWorksheetItem(item: WorksheetItem): WorksheetItem {
  return {
    ...item,
    id: `ws-item-${crypto.randomUUID()}`,
    x: Math.min(item.x + 3, 92),
    y: Math.min(item.y + 3, 92),
  };
}

export function WorksheetBuilder({ value, onChange, disabled = false }: Props) {
  const { t } = useLanguage();
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [preferredSelectedItemId, setPreferredSelectedItemId] = useState<string | null>(null);
  const [previewDragState, setPreviewDragState] = useState<WorksheetPreviewDragState | null>(null);
  const [mobileAddSheetOpen, setMobileAddSheetOpen] = useState(false);
  const [itemSettingsOpen, setItemSettingsOpen] = useState(false);
  // On desktop the item settings render docked in the left sidebar instead of a
  // modal, so the dialog itself should only ever open on smaller screens.
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  const [previewMode, setPreviewMode] = useState<"teacher" | "student">("teacher");
  const [studentPreviewAnswers, setStudentPreviewAnswers] = useState<WorksheetStudentAnswers>({});
  const [studentPreviewDraggingChoiceId, setStudentPreviewDraggingChoiceId] = useState<string | null>(null);
  const previewOverlayRef = useRef<HTMLDivElement | null>(null);
  const previewDidDragRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => setIsDesktopViewport(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const fallbackPage = buildDefaultWorksheetData().pages[0];
  const safeActivePageIndex = Math.min(activePageIndex, Math.max(0, value.pages.length - 1));
  const page = value.pages[safeActivePageIndex] ?? fallbackPage;
  const selectedItemId =
    preferredSelectedItemId && page.items.some((item) => item.id === preferredSelectedItemId)
      ? preferredSelectedItemId
      : page.items[0]?.id ?? null;
  const selectedItemIndex = selectedItemId
    ? page.items.findIndex((item) => item.id === selectedItemId)
    : -1;
  const studentPreviewPage = sanitizeWorksheetForStudent(value).pages[safeActivePageIndex];

  const assignStudentPreviewDragChoice = useCallback((itemId: string, targetId: string, choiceId: string) => {
    setStudentPreviewAnswers((currentAnswers) => {
      const currentValue = currentAnswers[itemId];
      const placements =
        currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)
          ? { ...currentValue }
          : {};

      placements[targetId] = choiceId;
      return {
        ...currentAnswers,
        [itemId]: placements,
      };
    });
  }, []);

  const clearStudentPreviewDragChoice = useCallback((itemId: string, targetId: string) => {
    setStudentPreviewAnswers((currentAnswers) => {
      const currentValue = currentAnswers[itemId];
      if (!currentValue || typeof currentValue !== "object" || Array.isArray(currentValue)) {
        return currentAnswers;
      }

      const placements = { ...currentValue };
      delete placements[targetId];
      return {
        ...currentAnswers,
        [itemId]: placements,
      };
    });
  }, []);

  const updatePages = useCallback((pages: WorksheetPage[]) => {
    onChange({
      ...value,
      source: {
        ...value.source,
        type: "image",
        url: pages[0]?.backgroundUrl ?? value.source.url,
        pageCount: pages.length,
      },
      pages: pages.map((entry, index) => ({
        ...entry,
        pageNumber: index + 1,
      })),
    });
  }, [onChange, value]);

  const updateCurrentPage = useCallback((updater: (currentPage: WorksheetPage) => WorksheetPage) => {
    updatePages(
      value.pages.map((entry, index) => (index === safeActivePageIndex ? updater(entry) : entry))
    );
  }, [safeActivePageIndex, updatePages, value.pages]);

  const updateItem = useCallback((itemId: string, updater: (item: WorksheetItem) => WorksheetItem) => {
    updateCurrentPage((currentPage) => ({
      ...currentPage,
      items: currentPage.items.map((item) =>
        item.id === itemId ? clampWorksheetItem(updater(item)) : item
      ),
    }));
  }, [updateCurrentPage]);

  const updateItemArea = useCallback(
    (itemId: string, target: WorksheetAreaTarget, updater: (area: WorksheetArea) => WorksheetArea) => {
      updateCurrentPage((currentPage) => ({
        ...currentPage,
        items: currentPage.items.map((item) => {
          if (item.id !== itemId) return item;
          if (
            target.kind === "choice" &&
            (item.type === "drag_drop" || item.type === "drag_select" || item.type === "matching_pairs")
          ) {
            return {
              ...item,
              choices: item.choices.map((choice) =>
                choice.id === target.areaId
                  ? { ...choice, sourceArea: clampWorksheetArea(updater(choice.sourceArea)) }
                  : choice
              ),
            };
          }
          if (target.kind === "target" && item.type === "drag_drop") {
            return {
              ...item,
              targets: item.targets.map((entry) =>
                entry.id === target.areaId
                  ? { ...entry, dropArea: clampWorksheetArea(updater(entry.dropArea)) }
                  : entry
              ),
            };
          }
          if (target.kind === "dropArea" && item.type === "drag_select") {
            return { ...item, dropArea: clampWorksheetArea(updater(item.dropArea)) };
          }
          if (target.kind === "prompt" && item.type === "matching_pairs") {
            return {
              ...item,
              prompts: item.prompts.map((prompt) =>
                prompt.id === target.areaId
                  ? { ...prompt, sourceArea: clampWorksheetArea(updater(prompt.sourceArea)) }
                  : prompt
              ),
            };
          }
          return item;
        }),
      }));
    },
    [updateCurrentPage]
  );

  const removeItem = (itemId: string) => {
    updateCurrentPage((currentPage) => ({
      ...currentPage,
      items: currentPage.items.filter((item) => item.id !== itemId),
    }));
  };

  const duplicateItem = (itemId: string) => {
    updateCurrentPage((currentPage) => {
      const target = currentPage.items.find((item) => item.id === itemId);
      if (!target) return currentPage;
      return {
        ...currentPage,
        items: [...currentPage.items, duplicateWorksheetItem(target)],
      };
    });
  };

  const addPage = () => {
    updatePages([...value.pages, createWorksheetPage(value.pages.length + 1)]);
    setActivePageIndex(value.pages.length);
  };

  const removePage = () => {
    if (value.pages.length <= 1) return;
    const nextPages = value.pages.filter((_, index) => index !== safeActivePageIndex);
    updatePages(nextPages);
    setActivePageIndex((current) => Math.max(0, current - 1));
  };

  const addItem = (item: WorksheetItem) => {
    updateCurrentPage((currentPage) => ({
      ...currentPage,
      items: [...currentPage.items, item],
    }));
    setPreferredSelectedItemId(item.id);
  };

  const selectedItem = page.items.find((item) => item.id === selectedItemId) ?? null;

  const addItemActions = [
    {
      key: "short_text",
      label: t("assignmentWorksheetAddShortText"),
      icon: Plus,
      create: createShortTextItem,
    },
    {
      key: "multiple_choice",
      label: t("assignmentWorksheetAddMultipleChoice"),
      icon: Plus,
      create: createMultipleChoiceItem,
    },
    {
      key: "drag_drop",
      label: t("assignmentWorksheetAddDragDrop"),
      icon: Plus,
      create: createDragDropItem,
    },
    {
      key: "drag_select",
      label: t("assignmentWorksheetAddDragSelect"),
      icon: Plus,
      create: createDragSelectItem,
    },
    {
      key: "matching_pairs",
      label: t("assignmentWorksheetAddMatchingPairs"),
      icon: Plus,
      create: createMatchingPairsItem,
    },
    {
      key: "word_search",
      label: t("assignmentWorksheetAddWordSearch"),
      icon: Plus,
      create: createWordSearchItem,
    },
  ] as const;

  useEffect(() => {
    if (!previewDragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const dxPercent =
        ((event.clientX - previewDragState.startClientX) / previewDragState.containerWidth) * 100;
      const dyPercent =
        ((event.clientY - previewDragState.startClientY) / previewDragState.containerHeight) * 100;
      if (Math.abs(event.clientX - previewDragState.startClientX) > 3 || Math.abs(event.clientY - previewDragState.startClientY) > 3) {
        previewDidDragRef.current = true;
      }

      const { areaTarget } = previewDragState;

      if (previewDragState.mode === "move") {
        if (areaTarget) {
          updateItemArea(previewDragState.itemId, areaTarget, (area) => ({
            ...area,
            x: previewDragState.startX + dxPercent,
            y: previewDragState.startY + dyPercent,
          }));
          return;
        }
        updateItem(previewDragState.itemId, (current) => ({
          ...current,
          x: previewDragState.startX + dxPercent,
          y: previewDragState.startY + dyPercent,
        }));
        return;
      }

      if (areaTarget) {
        updateItemArea(previewDragState.itemId, areaTarget, (area) => ({
          ...area,
          width: previewDragState.startWidth + dxPercent,
          height: previewDragState.startHeight + dyPercent,
        }));
        return;
      }

      updateItem(previewDragState.itemId, (current) => ({
        ...current,
        width: previewDragState.startWidth + dxPercent,
        height: previewDragState.startHeight + dyPercent,
      }));
    };

    const handlePointerUp = () => {
      setPreviewDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [previewDragState, updateItem, updateItemArea]);

  const renderAddItemButtons = (className?: string, onActionComplete?: () => void) => (
    <div className={className} aria-label={t("assignmentWorksheetToolbarLabel")}>
      {addItemActions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.key}
            type="button"
            variant="outline"
            disabled={disabled}
            className="justify-start"
            onClick={() => {
              addItem(action.create());
              onActionComplete?.();
            }}
          >
            <Icon className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );

  const renderAreaBox = (params: {
    key: string;
    area: WorksheetArea;
    areaTarget: WorksheetAreaTarget;
    label: string;
    ariaLabel: string;
    variant: "source" | "target";
    backgroundUrl?: string;
  }) => {
    const { key, area, areaTarget, label, ariaLabel, variant, backgroundUrl } = params;
    const startDrag = (mode: "move" | "resize", event: ReactPointerEvent) => {
      if (disabled) return;
      if (mode === "move" && event.button !== 0) return;
      const overlay = previewOverlayRef.current;
      if (!overlay) return;
      previewDidDragRef.current = false;
      setPreferredSelectedItemId(areaTarget.itemId);
      setPreviewDragState({
        mode,
        itemId: areaTarget.itemId,
        areaTarget,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: area.x,
        startY: area.y,
        startWidth: area.width,
        startHeight: area.height,
        containerWidth: overlay.clientWidth || 1,
        containerHeight: overlay.clientHeight || 1,
      });
      event.preventDefault();
    };

    return (
      <div
        key={key}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          // A genuine drag already moved the box; only a plain click selects
          // the parent item and (on mobile) opens its settings dialog.
          if (previewDidDragRef.current) {
            previewDidDragRef.current = false;
            return;
          }
          setPreferredSelectedItemId(areaTarget.itemId);
          setItemSettingsOpen(true);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          startDrag("move", event);
        }}
        className={`absolute overflow-hidden rounded-lg shadow-sm ${disabled ? "" : "cursor-move"} ${
          variant === "source"
            ? "border-2 border-fuchsia-400 bg-white/90"
            : "border-2 border-dashed border-sky-400 bg-white/70"
        }`}
        style={{
          left: `${area.x}%`,
          top: `${area.y}%`,
          width: `${area.width}%`,
          height: `${area.height}%`,
          ...(variant === "source" && backgroundUrl ? getAreaBackgroundStyle(backgroundUrl, area) : {}),
        }}
      >
        <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/50 px-1 text-[9px] font-bold text-white">
          {label}
        </span>
        {!disabled ? (
          <button
            type="button"
            aria-label={t("assignmentWorksheetResizeHandleLabel")}
            onPointerDown={(event) => {
              event.stopPropagation();
              startDrag("resize", event);
            }}
            className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full border-2 border-white bg-sky-600 shadow-md"
          />
        ) : null}
      </div>
    );
  };

  const renderPreviewPanel = () => (
    <div className="rounded-xl border border-fuchsia-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-800">{t("assignmentWorksheetPreviewLabel")}</p>
          <p className="text-xs text-slate-500">{t("assignmentWorksheetPreviewHint")}</p>
        </div>
        <div className="space-y-2 text-xs font-medium text-slate-500">
          <div className="flex justify-end rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setPreviewMode("teacher")}
              className={`rounded-full px-3 py-1.5 font-bold transition-colors ${
                previewMode === "teacher"
                  ? "bg-cyan-400 text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t("assignmentWorksheetTeacherPreviewMode")}
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("student")}
              className={`rounded-full px-3 py-1.5 font-bold transition-colors ${
                previewMode === "student"
                  ? "bg-cyan-400 text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t("assignmentWorksheetStudentPreviewMode")}
            </button>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span>{t("assignmentWorksheetShowScoreLabel")}</span>
            <Switch
              checked={value.settings.showScoreToStudent}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  settings: {
                    ...value.settings,
                    showScoreToStudent: checked,
                  },
                })
              }
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <span>{t("assignmentWorksheetAllowResubmitLabel")}</span>
            <Switch
              checked={value.settings.allowResubmit}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  settings: {
                    ...value.settings,
                    allowResubmit: checked,
                  },
                })
              }
            />
          </div>
        </div>
      </div>
      <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
        <span>{t("assignmentWorksheetPreviewPageLabel", { count: safeActivePageIndex + 1 })}</span>
        <span>{t("assignmentWorksheetPageCountLabel", { count: value.pages.length })}</span>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {page.backgroundUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.backgroundUrl}
              alt={t("assignmentWorksheetPreviewImageAlt")}
              className="block w-full"
            />
            {previewMode === "student" && studentPreviewPage ? (
              <WorksheetStudentPageRenderer
                className="absolute inset-0"
                page={studentPreviewPage}
                answers={studentPreviewAnswers}
                setAnswers={setStudentPreviewAnswers}
                draggingChoiceId={studentPreviewDraggingChoiceId}
                setDraggingChoiceId={setStudentPreviewDraggingChoiceId}
                assignDragChoice={assignStudentPreviewDragChoice}
                clearDragChoice={clearStudentPreviewDragChoice}
                t={t}
              />
            ) : (
            <div ref={previewOverlayRef} className="absolute inset-0 touch-none">
              {page.items.map((item) => {
                // Area-based items are represented directly by their draggable
                // area boxes below, so they skip the generic bounding-box chip.
                if (
                  item.type === "drag_drop" ||
                  item.type === "drag_select" ||
                  item.type === "matching_pairs"
                ) {
                  return null;
                }
                return (
                <div
                  key={`${item.id}-preview`}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-pressed={selectedItemId === item.id}
                  aria-label={t("assignmentWorksheetPreviewItemLabel", {
                    count: page.items.findIndex((entry) => entry.id === item.id) + 1,
                  })}
                  onClick={() => {
                    if (disabled) return;
                    if (previewDidDragRef.current) {
                      previewDidDragRef.current = false;
                      return;
                    }
                    setPreferredSelectedItemId(item.id);
                    setItemSettingsOpen(true);
                  }}
                  onPointerDown={(event) => {
                    if (disabled) return;
                    if (event.button !== 0) return;
                    const overlay = previewOverlayRef.current;
                    if (!overlay) return;
                    previewDidDragRef.current = false;
                    setPreferredSelectedItemId(item.id);
                    setPreviewDragState({
                      mode: "move",
                      itemId: item.id,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      startX: item.x,
                      startY: item.y,
                      startWidth: item.width,
                      startHeight: item.height,
                      containerWidth: overlay.clientWidth || 1,
                      containerHeight: overlay.clientHeight || 1,
                    });
                    event.preventDefault();
                  }}
                  onKeyDown={(event) => {
                    if (disabled) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPreferredSelectedItemId(item.id);
                      setItemSettingsOpen(true);
                    }
                  }}
                  className={`absolute rounded-md border-2 p-1 text-[10px] font-bold shadow-sm transition-all ${
                    selectedItemId === item.id
                      ? "border-fuchsia-700 bg-fuchsia-200/80 text-fuchsia-950 ring-2 ring-fuchsia-300"
                      : "border-fuchsia-500/70 bg-fuchsia-100/60 text-fuchsia-900"
                  } ${disabled ? "" : "cursor-pointer"}`}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${item.width}%`,
                    minHeight: `${item.height}%`,
                  }}
                >
                  {item.type === "short_text"
                    ? item.label
                    : item.type === "multiple_choice"
                      ? item.prompt
                      : item.type === "word_search"
                        ? `${item.prompt} (${item.rows}×${item.cols})`
                        : null}
                  {selectedItemId === item.id && !disabled ? (
                    <button
                      type="button"
                      aria-label={t("assignmentWorksheetResizeHandleLabel")}
                      onPointerDown={(event) => {
                        const overlay = previewOverlayRef.current;
                        if (!overlay) return;
                        previewDidDragRef.current = false;
                        event.preventDefault();
                        event.stopPropagation();
                        setPreviewDragState({
                          mode: "resize",
                          itemId: item.id,
                          startClientX: event.clientX,
                          startClientY: event.clientY,
                          startX: item.x,
                          startY: item.y,
                          startWidth: item.width,
                          startHeight: item.height,
                          containerWidth: overlay.clientWidth || 1,
                          containerHeight: overlay.clientHeight || 1,
                        });
                      }}
                      className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full border-2 border-white bg-fuchsia-700 shadow-md"
                    />
                  ) : null}
                </div>
                );
              })}
              {page.items.map((item) => {
                if (item.type === "drag_drop") {
                  return (
                    <div key={`${item.id}-areas`}>
                      {item.choices.map((choice, choiceIndex) =>
                        renderAreaBox({
                          key: `${item.id}-choice-${choice.id}`,
                          area: choice.sourceArea,
                          areaTarget: { kind: "choice", itemId: item.id, areaId: choice.id },
                          label: choice.label || String(choiceIndex + 1),
                          ariaLabel: t("assignmentWorksheetAreaBoxLabel", { count: choiceIndex + 1 }),
                          variant: "source",
                          backgroundUrl: page.backgroundUrl,
                        })
                      )}
                      {item.targets.map((target, targetIndex) =>
                        renderAreaBox({
                          key: `${item.id}-target-${target.id}`,
                          area: target.dropArea,
                          areaTarget: { kind: "target", itemId: item.id, areaId: target.id },
                          label: target.label || String(targetIndex + 1),
                          ariaLabel: t("assignmentWorksheetAreaBoxLabel", { count: targetIndex + 1 }),
                          variant: "target",
                        })
                      )}
                    </div>
                  );
                }
                if (item.type === "drag_select") {
                  return (
                    <div key={`${item.id}-areas`}>
                      {item.choices.map((choice, choiceIndex) =>
                        renderAreaBox({
                          key: `${item.id}-choice-${choice.id}`,
                          area: choice.sourceArea,
                          areaTarget: { kind: "choice", itemId: item.id, areaId: choice.id },
                          label: choice.label || String(choiceIndex + 1),
                          ariaLabel: t("assignmentWorksheetAreaBoxLabel", { count: choiceIndex + 1 }),
                          variant: "source",
                          backgroundUrl: page.backgroundUrl,
                        })
                      )}
                      {renderAreaBox({
                        key: `${item.id}-dropArea`,
                        area: item.dropArea,
                        areaTarget: { kind: "dropArea", itemId: item.id },
                        label: t("assignmentWorksheetDragTargetsLabel"),
                        ariaLabel: t("assignmentWorksheetAreaBoxLabel", { count: 1 }),
                        variant: "target",
                      })}
                    </div>
                  );
                }
                if (item.type === "matching_pairs") {
                  return (
                    <div key={`${item.id}-areas`}>
                      {item.prompts.map((prompt, promptIndex) =>
                        renderAreaBox({
                          key: `${item.id}-prompt-${prompt.id}`,
                          area: prompt.sourceArea,
                          areaTarget: { kind: "prompt", itemId: item.id, areaId: prompt.id },
                          label: prompt.label || String(promptIndex + 1),
                          ariaLabel: t("assignmentWorksheetAreaBoxLabel", { count: promptIndex + 1 }),
                          variant: "source",
                          backgroundUrl: page.backgroundUrl,
                        })
                      )}
                      {item.choices.map((choice, choiceIndex) =>
                        renderAreaBox({
                          key: `${item.id}-choice-${choice.id}`,
                          area: choice.sourceArea,
                          areaTarget: { kind: "choice", itemId: item.id, areaId: choice.id },
                          label: choice.label || String(choiceIndex + 1),
                          ariaLabel: t("assignmentWorksheetAreaBoxLabel", { count: choiceIndex + 1 }),
                          variant: "source",
                          backgroundUrl: page.backgroundUrl,
                        })
                      )}
                    </div>
                  );
                }
                if (item.type === "word_search") {
                  // word_search keeps its generic chip when unselected, so its
                  // marking overlay only appears once the item is selected.
                  if (selectedItemId !== item.id) return null;
                  return (
                    <div
                      key={`${item.id}-areas`}
                      className="absolute"
                      style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        width: `${item.width}%`,
                        height: `${item.height}%`,
                      }}
                    >
                      {/* The marking grid fills the whole box and swallows clicks/drags, so
                          the settings and move handles have to poke outside it to stay reachable. */}
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={t("assignmentWorksheetWordSearchOpenSettings")}
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreferredSelectedItemId(item.id);
                          setItemSettingsOpen(true);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="absolute -top-3 -left-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-fuchsia-700 text-white shadow-md"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={t("assignmentWorksheetWordSearchMoveHandle")}
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => {
                          if (disabled) return;
                          if (event.button !== 0) return;
                          const overlay = previewOverlayRef.current;
                          if (!overlay) return;
                          event.stopPropagation();
                          previewDidDragRef.current = false;
                          setPreferredSelectedItemId(item.id);
                          setPreviewDragState({
                            mode: "move",
                            itemId: item.id,
                            startClientX: event.clientX,
                            startClientY: event.clientY,
                            startX: item.x,
                            startY: item.y,
                            startWidth: item.width,
                            startHeight: item.height,
                            containerWidth: overlay.clientWidth || 1,
                            containerHeight: overlay.clientHeight || 1,
                          });
                          event.preventDefault();
                        }}
                        className="absolute -top-3 -right-3 z-10 flex h-7 w-7 cursor-move items-center justify-center rounded-full border-2 border-white bg-fuchsia-700 text-white shadow-md"
                      >
                        <Move className="h-3.5 w-3.5" />
                      </button>
                      <div
                        className="grid h-full w-full overflow-hidden rounded-md"
                        style={{ gridTemplateColumns: `repeat(${item.cols}, minmax(0, 1fr))` }}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        {Array.from({ length: item.rows * item.cols }).map((_, cellIndex) => {
                          const isAnswer = item.answerCells.includes(cellIndex);
                          return (
                            <button
                              key={`${item.id}-cell-${cellIndex}`}
                              type="button"
                              disabled={disabled}
                              aria-pressed={isAnswer}
                              aria-label={t("assignmentWorksheetAreaBoxLabel", { count: cellIndex + 1 })}
                              onClick={(event) => {
                                event.stopPropagation();
                                updateItem(item.id, (current) => {
                                  if (current.type !== "word_search") return current;
                                  const nextAnswerCells = current.answerCells.includes(cellIndex)
                                    ? current.answerCells.filter((entry) => entry !== cellIndex)
                                    : [...current.answerCells, cellIndex];
                                  return { ...current, answerCells: nextAnswerCells };
                                });
                              }}
                              className={`border border-dashed transition-colors ${
                                isAnswer
                                  ? "border-violet-500 bg-violet-400/50 hover:bg-violet-400/70"
                                  : "border-slate-400/60 bg-white/10 hover:bg-white/30"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center p-6 text-center text-sm font-medium text-slate-400">
            {t("assignmentWorksheetPreviewEmpty")}
          </div>
        )}
      </div>
    </div>
  );

  const renderSelectedItemSettings = () => {
    if (!selectedItem) {
      return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
          {t("assignmentWorksheetSelectItemHint")}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/70 p-3">
          <div>
            <p className="text-sm font-black text-slate-800">
              {t("assignmentWorksheetItemLabel", { count: selectedItemIndex + 1 })}
            </p>
            <p className="text-xs font-medium text-slate-500">
              {selectedItem.type === "short_text"
                ? t("assignmentWorksheetTypeShortText")
                : selectedItem.type === "multiple_choice"
                  ? t("assignmentWorksheetTypeMultipleChoice")
                  : selectedItem.type === "drag_drop"
                    ? t("assignmentWorksheetTypeDragDrop")
                    : selectedItem.type === "drag_select"
                      ? t("assignmentWorksheetTypeDragSelect")
                      : selectedItem.type === "matching_pairs"
                        ? t("assignmentWorksheetTypeMatchingPairs")
                        : selectedItem.type === "word_search"
                          ? t("assignmentWorksheetTypeWordSearch")
                          : t("assignmentWorksheetTypeShortText")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => duplicateItem(selectedItem.id)}
              className="text-slate-500 hover:bg-sky-50 hover:text-sky-600"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => {
                removeItem(selectedItem.id);
                setItemSettingsOpen(false);
              }}
              className="text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedItem.type === "short_text" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetFieldLabel")}</Label>
              <Input
                value={selectedItem.label}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "short_text" ? { ...current, label: e.target.value } : current
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetAcceptedAnswersLabel")}</Label>
              <Textarea
                rows={4}
                disabled={disabled}
                value={selectedItem.answer.accepted.join(", ")}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "short_text"
                      ? {
                          ...current,
                          answer: {
                            ...current.answer,
                            accepted: normalizeWorksheetAcceptedAnswers(e.target.value),
                          },
                        }
                      : current
                  )
                }
              />
            </div>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>{t("assignmentWorksheetReviewModeLabel")}</Label>
                <Select
                  value={selectedItem.answer.reviewMode}
                  onValueChange={(next) =>
                    updateItem(selectedItem.id, (current) =>
                      current.type === "short_text"
                        ? {
                            ...current,
                            answer: { ...current.answer, reviewMode: next as "auto" | "manual" },
                          }
                        : current
                    )
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t("assignmentWorksheetReviewModeAuto")}</SelectItem>
                    <SelectItem value="manual">{t("assignmentWorksheetReviewModeManual")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("assignmentWorksheetPointsLabel")}</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={selectedItem.answer.points}
                  disabled={disabled}
                  onChange={(e) =>
                    updateItem(selectedItem.id, (current) =>
                      current.type === "short_text"
                        ? {
                            ...current,
                            answer: { ...current.answer, points: Number(e.target.value || 1) },
                          }
                        : current
                    )
                  }
                />
              </div>
            </div>
          </div>
        ) : selectedItem.type === "multiple_choice" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetPromptLabel")}</Label>
              <Textarea
                rows={3}
                value={selectedItem.prompt}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "multiple_choice" ? { ...current, prompt: e.target.value } : current
                  )
                }
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedItem.options.map((option, optionIndex) => (
                <div key={`${selectedItem.id}-dialog-option-${optionIndex}`} className="space-y-2">
                  <Label>{t("assignmentWorksheetOptionLabel", { count: optionIndex + 1 })}</Label>
                  <Input
                    value={option}
                    disabled={disabled}
                    onChange={(e) =>
                      updateItem(selectedItem.id, (current) => {
                        if (current.type !== "multiple_choice") return current;
                        const nextOptions = [...current.options];
                        nextOptions[optionIndex] = e.target.value;
                        return { ...current, options: nextOptions };
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>{t("assignmentWorksheetCorrectOptionLabel")}</Label>
                <Select
                  value={String(selectedItem.correctIndex)}
                  onValueChange={(next) =>
                    updateItem(selectedItem.id, (current) =>
                      current.type === "multiple_choice" ? { ...current, correctIndex: Number(next) } : current
                    )
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedItem.options.map((_, optionIndex) => (
                      <SelectItem key={`${selectedItem.id}-dialog-correct-${optionIndex}`} value={String(optionIndex)}>
                        {t("assignmentWorksheetOptionLabel", { count: optionIndex + 1 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("assignmentWorksheetPointsLabel")}</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={selectedItem.points}
                  disabled={disabled}
                  onChange={(e) =>
                    updateItem(selectedItem.id, (current) =>
                      current.type === "multiple_choice" ? { ...current, points: Number(e.target.value || 1) } : current
                    )
                  }
                />
              </div>
            </div>
          </div>
        ) : selectedItem.type === "drag_drop" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetPromptLabel")}</Label>
              <Textarea
                rows={2}
                value={selectedItem.prompt}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "drag_drop" ? { ...current, prompt: e.target.value } : current
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetDragChoicesLabel")}</Label>
              <div className="space-y-2">
                {selectedItem.choices.map((choice, choiceIndex) => (
                  <div key={choice.id} className="flex items-center gap-2">
                    <Input
                      value={choice.label}
                      disabled={disabled}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (current) => {
                          if (current.type !== "drag_drop") return current;
                          const nextChoices = current.choices.map((entry) =>
                            entry.id === choice.id ? { ...entry, label: e.target.value } : entry
                          );
                          return { ...current, choices: nextChoices };
                        })
                      }
                      placeholder={`${t("assignmentWorksheetDragChoicesLabel")} ${choiceIndex + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || selectedItem.choices.length <= 1}
                      aria-label={t("assignmentWorksheetRemoveDragChoice")}
                      onClick={() =>
                        updateItem(selectedItem.id, (current) => {
                          if (current.type !== "drag_drop" || current.choices.length <= 1) return current;
                          const removedId = choice.id;
                          const nextChoices = current.choices.filter((entry) => entry.id !== removedId);
                          const fallbackChoiceId = nextChoices[0]?.id ?? "";
                          const nextTargets = current.targets.map((target) => {
                            const acceptedChoiceIds = target.acceptedChoiceIds?.filter(
                              (id) => id !== removedId
                            );
                            return {
                              ...target,
                              correctChoiceId:
                                target.correctChoiceId === removedId ? fallbackChoiceId : target.correctChoiceId,
                              acceptedChoiceIds:
                                acceptedChoiceIds && acceptedChoiceIds.length > 0 ? acceptedChoiceIds : undefined,
                            };
                          });
                          return { ...current, choices: nextChoices, targets: nextTargets };
                        })
                      }
                      className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || selectedItem.choices.length >= 6}
                  onClick={() =>
                    updateItem(selectedItem.id, (current) => {
                      if (current.type !== "drag_drop" || current.choices.length >= 6) return current;
                      const newChoice = {
                        id: `choice-${crypto.randomUUID()}`,
                        label: `ตัวเลือก ${current.choices.length + 1}`,
                        sourceArea: nextAreaOffset(current.choices.length, 12, 18),
                      };
                      return { ...current, choices: [...current.choices, newChoice] };
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("assignmentWorksheetAddDragSelectChoice")}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetDragTargetsLabel")}</Label>
              <div className="space-y-3">
                {selectedItem.targets.map((target, targetIndex) => (
                  <div key={target.id} className="space-y-2 rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={target.label}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(selectedItem.id, (current) => {
                            if (current.type !== "drag_drop") return current;
                            const nextTargets = current.targets.map((entry) =>
                              entry.id === target.id ? { ...entry, label: e.target.value } : entry
                            );
                            return { ...current, targets: nextTargets };
                          })
                        }
                        placeholder={`${t("assignmentWorksheetDragTargetLabel", { count: targetIndex + 1 })}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled || selectedItem.targets.length <= 1}
                        aria-label={t("assignmentWorksheetRemoveDragTarget")}
                        onClick={() =>
                          updateItem(selectedItem.id, (current) => {
                            if (current.type !== "drag_drop" || current.targets.length <= 1) return current;
                            const nextTargets = current.targets.filter((entry) => entry.id !== target.id);
                            return { ...current, targets: nextTargets };
                          })
                        }
                        className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select
                      value={target.correctChoiceId}
                      onValueChange={(next) =>
                        updateItem(selectedItem.id, (current) => {
                          if (current.type !== "drag_drop") return current;
                          const nextTargets = current.targets.map((entry) =>
                            entry.id === target.id ? { ...entry, correctChoiceId: next } : entry
                          );
                          return { ...current, targets: nextTargets };
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("assignmentWorksheetDragCorrectChoiceLabel")} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedItem.choices.map((choice) => (
                          <SelectItem key={choice.id} value={choice.id}>
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || selectedItem.targets.length >= 6}
                  onClick={() =>
                    updateItem(selectedItem.id, (current) => {
                      if (current.type !== "drag_drop" || current.targets.length >= 6) return current;
                      const newTarget = {
                        id: `target-${crypto.randomUUID()}`,
                        label: `จุดวาง ${current.targets.length + 1}`,
                        correctChoiceId: current.choices[0]?.id ?? "",
                        dropArea: nextAreaOffset(current.targets.length, 58, 22),
                      };
                      return { ...current, targets: [...current.targets, newTarget] };
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("assignmentWorksheetAddDragTarget")}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetPointsLabel")}</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={selectedItem.pointsPerTarget}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "drag_drop" ? { ...current, pointsPerTarget: Number(e.target.value || 1) } : current
                  )
                }
              />
            </div>
          </div>
        ) : selectedItem.type === "drag_select" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetPromptLabel")}</Label>
              <Textarea
                rows={2}
                value={selectedItem.prompt}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "drag_select" ? { ...current, prompt: e.target.value } : current
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetDragChoicesLabel")}</Label>
              <div className="space-y-2">
                {selectedItem.choices.map((choice, choiceIndex) => (
                  <div key={choice.id} className="flex items-center gap-2">
                    <Input
                      value={choice.label}
                      disabled={disabled}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (current) => {
                          if (current.type !== "drag_select") return current;
                          const nextChoices = current.choices.map((entry) =>
                            entry.id === choice.id ? { ...entry, label: e.target.value } : entry
                          );
                          return { ...current, choices: nextChoices };
                        })
                      }
                      placeholder={`${t("assignmentWorksheetDragChoicesLabel")} ${choiceIndex + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || selectedItem.choices.length <= 2}
                      onClick={() =>
                        updateItem(selectedItem.id, (current) => {
                          if (current.type !== "drag_select" || current.choices.length <= 2) return current;
                          const removedId = choice.id;
                          const nextChoices = current.choices.filter((entry) => entry.id !== removedId);
                          const nextCorrect =
                            current.correctChoiceId === removedId
                              ? nextChoices[0]?.id ?? ""
                              : current.correctChoiceId;
                          return { ...current, choices: nextChoices, correctChoiceId: nextCorrect };
                        })
                      }
                      className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || selectedItem.choices.length >= 6}
                  onClick={() =>
                    updateItem(selectedItem.id, (current) => {
                      if (current.type !== "drag_select" || current.choices.length >= 6) return current;
                      const newChoice = {
                        id: `choice-${crypto.randomUUID()}`,
                        label: `ตัวเลือก ${current.choices.length + 1}`,
                        sourceArea: nextAreaOffset(current.choices.length, 12, 18),
                      };
                      return { ...current, choices: [...current.choices, newChoice] };
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("assignmentWorksheetAddDragSelectChoice")}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetDragCorrectChoiceLabel")}</Label>
              <Select
                value={selectedItem.correctChoiceId}
                onValueChange={(next) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "drag_select" ? { ...current, correctChoiceId: next } : current
                  )
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedItem.choices.map((choice) => (
                    <SelectItem key={choice.id} value={choice.id}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetPointsLabel")}</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={selectedItem.points}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "drag_select" ? { ...current, points: Number(e.target.value || 1) } : current
                  )
                }
              />
            </div>
          </div>
        ) : selectedItem.type === "matching_pairs" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetPromptLabel")}</Label>
              <Textarea
                rows={2}
                value={selectedItem.prompt}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "matching_pairs" ? { ...current, prompt: e.target.value } : current
                  )
                }
              />
            </div>
            <div className="grid gap-3">
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Label>{t("assignmentWorksheetMatchingChoicesLabel")}</Label>
                {selectedItem.choices.map((choice, choiceIndex) => (
                  <div key={choice.id} className="space-y-2">
                    <Label>{t("assignmentWorksheetOptionLabel", { count: choiceIndex + 1 })}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={choice.label}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(selectedItem.id, (current) => {
                            if (current.type !== "matching_pairs") return current;
                            const nextChoices = current.choices.map((entry) =>
                              entry.id === choice.id ? { ...entry, label: e.target.value } : entry
                            );
                            return { ...current, choices: nextChoices };
                          })
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled || selectedItem.choices.length <= 2}
                        aria-label={t("assignmentWorksheetMatchingRemoveChoice")}
                        onClick={() =>
                          updateItem(selectedItem.id, (current) => {
                            if (current.type !== "matching_pairs" || current.choices.length <= 2) return current;
                            const removedId = choice.id;
                            const nextChoices = current.choices.filter((entry) => entry.id !== removedId);
                            const fallbackChoiceId = nextChoices[0]?.id ?? "";
                            const nextPrompts = current.prompts.map((prompt) => ({
                              ...prompt,
                              correctChoiceId:
                                prompt.correctChoiceId === removedId ? fallbackChoiceId : prompt.correctChoiceId,
                            }));
                            return { ...current, choices: nextChoices, prompts: nextPrompts };
                          })
                        }
                        className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || selectedItem.choices.length >= 6}
                  onClick={() =>
                    updateItem(selectedItem.id, (current) => {
                      if (current.type !== "matching_pairs" || current.choices.length >= 6) return current;
                      const newChoice = {
                        id: `choice-${crypto.randomUUID()}`,
                        label: `คำตอบ ${current.choices.length + 1}`,
                        sourceArea: nextAreaOffset(current.choices.length, 58, 22),
                      };
                      return { ...current, choices: [...current.choices, newChoice] };
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("assignmentWorksheetMatchingAddChoice")}
                </Button>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Label>{t("assignmentWorksheetMatchingPromptsLabel")}</Label>
                {selectedItem.prompts.map((prompt, promptIndex) => (
                  <div key={prompt.id} className="space-y-2 rounded-lg border border-white bg-white p-2">
                    <div className="flex items-center gap-2">
                      <Label className="flex-1">
                        {t("assignmentWorksheetMatchingPromptLabel", { count: promptIndex + 1 })}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled || selectedItem.prompts.length <= 2}
                        aria-label={t("assignmentWorksheetMatchingRemovePrompt")}
                        onClick={() =>
                          updateItem(selectedItem.id, (current) => {
                            if (current.type !== "matching_pairs" || current.prompts.length <= 2) return current;
                            const nextPrompts = current.prompts.filter((entry) => entry.id !== prompt.id);
                            return { ...current, prompts: nextPrompts };
                          })
                        }
                        className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={prompt.label}
                      disabled={disabled}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (current) => {
                          if (current.type !== "matching_pairs") return current;
                          const nextPrompts = current.prompts.map((entry) =>
                            entry.id === prompt.id ? { ...entry, label: e.target.value } : entry
                          );
                          return { ...current, prompts: nextPrompts };
                        })
                      }
                    />
                    <Select
                      value={prompt.correctChoiceId}
                      onValueChange={(next) =>
                        updateItem(selectedItem.id, (current) => {
                          if (current.type !== "matching_pairs") return current;
                          const nextPrompts = current.prompts.map((entry) =>
                            entry.id === prompt.id ? { ...entry, correctChoiceId: next } : entry
                          );
                          return { ...current, prompts: nextPrompts };
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedItem.choices.map((choice) => (
                          <SelectItem key={`${prompt.id}-${choice.id}`} value={choice.id}>
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || selectedItem.prompts.length >= 6}
                  onClick={() =>
                    updateItem(selectedItem.id, (current) => {
                      if (current.type !== "matching_pairs" || current.prompts.length >= 6) return current;
                      const newPrompt = {
                        id: `prompt-${crypto.randomUUID()}`,
                        label: `โจทย์ ${current.prompts.length + 1}`,
                        correctChoiceId: current.choices[0]?.id ?? "",
                        sourceArea: nextAreaOffset(current.prompts.length, 12, 22),
                      };
                      return { ...current, prompts: [...current.prompts, newPrompt] };
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("assignmentWorksheetMatchingAddPrompt")}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetPointsLabel")}</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={selectedItem.pointsPerPair}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "matching_pairs" ? { ...current, pointsPerPair: Number(e.target.value || 1) } : current
                  )
                }
              />
            </div>
          </div>
        ) : selectedItem.type === "word_search" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetPromptLabel")}</Label>
              <Textarea
                rows={2}
                value={selectedItem.prompt}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "word_search" ? { ...current, prompt: e.target.value } : current
                  )
                }
              />
            </div>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>{t("assignmentWorksheetWordSearchRowsLabel")}</Label>
                <Input
                  type="number"
                  min="4"
                  max="15"
                  value={selectedItem.rows}
                  disabled={disabled}
                  onChange={(e) =>
                    updateItem(selectedItem.id, (current) => {
                      if (current.type !== "word_search") return current;
                      const rows = Math.min(15, Math.max(4, Number(e.target.value || 9)));
                      return resizeWordSearchItem(current, rows, current.cols);
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("assignmentWorksheetWordSearchColsLabel")}</Label>
                <Input
                  type="number"
                  min="4"
                  max="15"
                  value={selectedItem.cols}
                  disabled={disabled}
                  onChange={(e) =>
                    updateItem(selectedItem.id, (current) => {
                      if (current.type !== "word_search") return current;
                      const cols = Math.min(15, Math.max(4, Number(e.target.value || 9)));
                      return resizeWordSearchItem(current, current.rows, cols);
                    })
                  }
                />
              </div>
            </div>
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
              {t("assignmentWorksheetWordSearchMarkOnCanvasHint")}
            </p>
            {selectedItem.answerCells.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                {t("assignmentWorksheetWordSearchNoAnswers")}
              </p>
            ) : (
              <p className="text-xs font-medium text-slate-500">
                {t("assignmentWorksheetWordSearchAnswerCount", {
                  count: selectedItem.answerCells.length,
                })}
              </p>
            )}
            <div className="space-y-2">
              <Label>{t("assignmentWorksheetWordSearchPointsLabel")}</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={selectedItem.pointsPerCell}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(selectedItem.id, (current) =>
                    current.type === "word_search" ? { ...current, pointsPerCell: Number(e.target.value || 1) } : current
                  )
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-4">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedItemIndex >= 0
          ? t("assignmentWorksheetAccessibilitySelectedStatus", {
              count: selectedItemIndex + 1,
              page: safeActivePageIndex + 1,
            })
          : t("assignmentWorksheetAccessibilityNoSelection")}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-bold text-fuchsia-950">{t("assignmentWorksheetSetupLabel")}</Label>
          <p className="text-xs text-fuchsia-900/75">{t("assignmentWorksheetSetupHint")}</p>
        </div>
      </div>

      <div className="rounded-xl border border-fuchsia-200 bg-white/90 p-3 lg:hidden">
        <div className="mb-3">
          <p className="text-sm font-black text-fuchsia-950">{t("assignmentWorksheetToolbarLabel")}</p>
          <p className="text-xs text-fuchsia-900/70">{t("assignmentWorksheetSetupHint")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" disabled={disabled} onClick={addPage}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddPage")}
          </Button>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => setMobileAddSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetToolbarLabel")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-fuchsia-200 bg-white/85 p-3">
        <div className="flex flex-wrap items-center gap-2" aria-label={t("assignmentWorksheetPageNavigationLabel")}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || safeActivePageIndex === 0}
            aria-label={t("worksheetPreviousPageAction")}
            onClick={() => setActivePageIndex((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label={t("worksheetPageTabsLabel")}
          >
            {value.pages.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                disabled={disabled}
                onClick={() => setActivePageIndex(index)}
                role="tab"
                aria-selected={index === safeActivePageIndex}
                aria-current={index === safeActivePageIndex ? "page" : undefined}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${
                  index === safeActivePageIndex
                    ? "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800"
                    : "border-slate-200 bg-white text-slate-500 hover:border-fuchsia-200"
                }`}
              >
                {t("assignmentWorksheetPageChip", { count: index + 1 })}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || safeActivePageIndex >= value.pages.length - 1}
            aria-label={t("worksheetNextPageAction")}
            onClick={() =>
              setActivePageIndex((current) => Math.min(value.pages.length - 1, current + 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || value.pages.length <= 1}
            onClick={removePage}
            className="text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetRemovePage")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden max-h-[calc(100vh-2rem)] overflow-y-auto lg:sticky lg:top-4 lg:block">
          <div className="space-y-4">
            <div className="rounded-2xl border border-fuchsia-200 bg-white/95 p-4 shadow-sm">
              <div className="mb-4">
                <p className="text-sm font-black text-fuchsia-950">{t("assignmentWorksheetToolbarLabel")}</p>
                <p className="text-xs text-fuchsia-900/70">{t("assignmentWorksheetSetupHint")}</p>
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" disabled={disabled} onClick={addPage} className="w-full justify-start">
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  {t("assignmentWorksheetAddPage")}
                </Button>
                {renderAddItemButtons("grid gap-2")}
              </div>
            </div>
            {renderSelectedItemSettings()}
          </div>
        </aside>
        <div className="min-w-0 space-y-3">
          {renderPreviewPanel()}
          <div className="rounded-xl border border-dashed border-fuchsia-200 bg-white/80 px-4 py-3 text-sm font-medium text-fuchsia-900/70">
            {t("assignmentWorksheetPreviewHint")}
          </div>
        </div>
      </div>

      <Dialog open={itemSettingsOpen && !isDesktopViewport} onOpenChange={setItemSettingsOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("assignmentWorksheetSetupLabel")}</DialogTitle>
            <DialogDescription>{t("assignmentWorksheetSetupHint")}</DialogDescription>
          </DialogHeader>
          {renderSelectedItemSettings()}
        </DialogContent>
      </Dialog>
      <Sheet open={mobileAddSheetOpen} onOpenChange={setMobileAddSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{t("assignmentWorksheetToolbarLabel")}</SheetTitle>
            <SheetDescription>{t("assignmentWorksheetSetupHint")}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {renderAddItemButtons("grid gap-2", () => setMobileAddSheetOpen(false))}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
