"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from "react";
import type {
  StudentWorksheetPage,
  StudentWorksheetItem,
  WorksheetStudentAnswerValue,
  WorksheetStudentAnswers,
} from "@/lib/worksheet-schema";

function asStringRecord(value: WorksheetStudentAnswerValue | undefined): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function asDragDropRecord(value: WorksheetStudentAnswerValue | undefined): Record<string, string | string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function flattenDragDropPlacements(placements: Record<string, string | string[]>): string[] {
  return Object.values(placements).flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
}

function isAreaBasedDragSelectItem(
  item: StudentWorksheetItem
): item is Extract<StudentWorksheetItem, { type: "drag_select" }> & {
  choices: Array<{
    id: string;
    label: string;
    sourceArea: { x: number; y: number; width: number; height: number };
  }>;
  dropArea: { x: number; y: number; width: number; height: number };
} {
  return (
    item.type === "drag_select" &&
    Array.isArray(item.choices) &&
    item.choices.length > 0 &&
    item.choices.every(
      (choice) =>
        "sourceArea" in choice &&
        Boolean(choice.sourceArea) &&
        typeof choice.sourceArea?.x === "number"
    ) &&
    "dropArea" in item &&
    Boolean(item.dropArea) &&
    typeof (item as Record<string, unknown>).dropArea === "object" &&
    typeof ((item as Record<string, unknown>).dropArea as Record<string, unknown>).x === "number"
  );
}

function isAreaBasedDragDropItem(
  item: StudentWorksheetItem
): item is Extract<StudentWorksheetItem, { type: "drag_drop" }> & {
  choices: Array<{
    id: string;
    label: string;
    sourceArea: { x: number; y: number; width: number; height: number };
  }>;
  targets: Array<{
    id: string;
    label: string;
    acceptedChoiceIds?: string[];
    dropArea: { x: number; y: number; width: number; height: number };
  }>;
} {
  return (
    item.type === "drag_drop" &&
    Array.isArray(item.choices) &&
    item.choices.length > 0 &&
    item.choices.every(
      (choice) =>
        "sourceArea" in choice &&
        Boolean(choice.sourceArea) &&
        typeof choice.sourceArea?.x === "number"
    ) &&
    Array.isArray(item.targets) &&
    item.targets.length > 0 &&
    item.targets.every(
      (target) =>
        "dropArea" in target &&
        Boolean(target.dropArea) &&
        typeof target.dropArea?.x === "number"
    )
  );
}

function isAreaBasedMatchingPairsItem(
  item: StudentWorksheetItem
): item is Extract<StudentWorksheetItem, { type: "matching_pairs" }> & {
  choices: Array<{
    id: string;
    label: string;
    sourceArea: { x: number; y: number; width: number; height: number };
  }>;
  prompts: Array<{
    id: string;
    label: string;
    sourceArea: { x: number; y: number; width: number; height: number };
  }>;
} {
  return (
    item.type === "matching_pairs" &&
    Array.isArray(item.choices) &&
    item.choices.length > 0 &&
    item.choices.every(
      (choice) =>
        "sourceArea" in choice &&
        Boolean(choice.sourceArea) &&
        typeof choice.sourceArea?.x === "number"
    ) &&
    Array.isArray(item.prompts) &&
    item.prompts.length > 0 &&
    item.prompts.every(
      (prompt) =>
        "sourceArea" in prompt &&
        Boolean(prompt.sourceArea) &&
        typeof prompt.sourceArea?.x === "number"
    )
  );
}

export function getAreaBackgroundStyle(
  backgroundUrl: string,
  area: { x: number; y: number; width: number; height: number }
): CSSProperties {
  const backgroundPositionX =
    area.width >= 100 ? "0%" : `${(area.x / Math.max(1, 100 - area.width)) * 100}%`;
  const backgroundPositionY =
    area.height >= 100 ? "0%" : `${(area.y / Math.max(1, 100 - area.height)) * 100}%`;

  return {
    backgroundImage: `url(${backgroundUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${(100 / Math.max(1, area.width)) * 100}% ${(100 / Math.max(1, area.height)) * 100}%`,
    backgroundPosition: `${backgroundPositionX} ${backgroundPositionY}`,
  };
}

// Parse a word_search answer string "3,7,12" into a set of selected cell indexes.
function parseWordSearchAnswer(value: WorksheetStudentAnswerValue | undefined): Set<number> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return new Set();
  }
  return new Set(
    value
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((entry) => Number.isInteger(entry) && entry >= 0)
  );
}

type Props = {
  page: StudentWorksheetPage;
  answers: WorksheetStudentAnswers;
  setAnswers?: Dispatch<SetStateAction<WorksheetStudentAnswers>>;
  draggingChoiceId?: string | null;
  setDraggingChoiceId?: (choiceId: string | null) => void;
  assignDragChoice?: (itemId: string, targetId: string, choiceId: string) => void;
  clearDragChoice?: (itemId: string, targetId: string) => void;
  readOnly?: boolean;
  className?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export function WorksheetStudentPageRenderer({
  page,
  answers,
  setAnswers,
  draggingChoiceId = null,
  setDraggingChoiceId,
  assignDragChoice,
  clearDragChoice,
  readOnly = false,
  className,
  t,
}: Props) {
  const interactive = !readOnly && Boolean(setAnswers);
  const dragDropItemsWithAreas = page.items.filter(isAreaBasedDragDropItem);
  const dragSelectItemsWithAreas = page.items.filter(isAreaBasedDragSelectItem);
  const matchingPairsItemsWithAreas = page.items.filter(isAreaBasedMatchingPairsItem);
  const containerRef = useRef<HTMLDivElement>(null);
  const [matchingDrag, setMatchingDrag] = useState<{
    itemId: string;
    promptId: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  const updateAnswers = (updater: (prev: WorksheetStudentAnswers) => WorksheetStudentAnswers) => {
    if (!setAnswers) return;
    setAnswers(updater);
  };

  // Drive the matching-pairs "draw a line" drag from window pointer events (like
  // the teacher canvas does) rather than pointer capture — this keeps working
  // when the pointer leaves the small anchor dot and never throws.
  useEffect(() => {
    if (!matchingDrag || !setAnswers) return;
    const { itemId, promptId, startX, startY } = matchingDrag;
    const item = matchingPairsItemsWithAreas.find((entry) => entry.id === itemId);
    if (!item) return;

    const toPercent = (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      // Bail on a zero-sized container (e.g. mid-layout) rather than dividing by
      // ~0 and producing garbage coordinates that make the connection miss.
      if (!rect || rect.width < 1 || rect.height < 1) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      };
    };

    const handleMove = (event: PointerEvent) => {
      const point = toPercent(event.clientX, event.clientY);
      if (!point) return;
      setMatchingDrag((current) =>
        current && current.promptId === promptId ? { ...current, x: point.x, y: point.y } : current
      );
    };

    const handleUp = (event: PointerEvent) => {
      const point = toPercent(event.clientX, event.clientY);
      setMatchingDrag(null);
      if (!point) return;
      const movedDistance = Math.hypot(point.x - startX, point.y - startY);
      if (movedDistance < 2) {
        // A tap on the dot clears any existing connection for this prompt.
        setAnswers((prev) => {
          const next = { ...asStringRecord(prev[itemId]) };
          delete next[promptId];
          return { ...prev, [itemId]: next };
        });
        return;
      }
      const target = item.choices.find((choice) => {
        const choiceX = choice.sourceArea.x;
        const choiceY = choice.sourceArea.y + choice.sourceArea.height / 2;
        return Math.hypot(point.x - choiceX, point.y - choiceY) < 8;
      });
      if (target) {
        setAnswers((prev) => ({
          ...prev,
          [itemId]: { ...asStringRecord(prev[itemId]), [promptId]: target.id },
        }));
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // Only re-attach when a new drag begins (identity of the dragged prompt),
    // not on every pointer move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingDrag?.itemId, matchingDrag?.promptId, setAnswers]);

  const assignAreaDragChoice = (
    itemId: string,
    targetId: string,
    choiceId: string,
    options?: { append?: boolean; acceptedChoiceIds?: string[] }
  ) => {
    const acceptedChoiceIds = options?.acceptedChoiceIds ?? [];
    if (acceptedChoiceIds.length > 0 && !acceptedChoiceIds.includes(choiceId)) {
      return;
    }

    if (!options?.append) {
      assignDragChoice?.(itemId, targetId, choiceId);
      return;
    }

    updateAnswers((prev) => {
      const currentPlacements = { ...asDragDropRecord(prev[itemId]) };
      for (const [placementTargetId, placementValue] of Object.entries(currentPlacements)) {
        const placementChoiceIds = Array.isArray(placementValue) ? placementValue : [placementValue];
        const nextPlacementChoiceIds = placementChoiceIds.filter((entry) => entry !== choiceId);
        if (nextPlacementChoiceIds.length === 0) {
          delete currentPlacements[placementTargetId];
        } else {
          currentPlacements[placementTargetId] =
            Array.isArray(placementValue) ? nextPlacementChoiceIds : nextPlacementChoiceIds[0];
        }
      }

      const currentTargetValue = currentPlacements[targetId];
      const currentTargetChoiceIds = Array.isArray(currentTargetValue)
        ? currentTargetValue
        : typeof currentTargetValue === "string"
          ? [currentTargetValue]
          : [];
      currentPlacements[targetId] = [...currentTargetChoiceIds, choiceId];
      return {
        ...prev,
        [itemId]: currentPlacements,
      };
    });
  };

  return (
    <div ref={containerRef} className={className ?? "absolute inset-0"}>
      {dragSelectItemsWithAreas.map((item) => {
        const selectedChoiceId = typeof answers[item.id] === "string" ? answers[item.id] : "";
        return (
          <div key={`${item.id}-drag-select-layer`} className="absolute inset-0">
            {/* Single drop zone */}
            <div
              className="absolute overflow-hidden rounded-xl border-2 border-dashed border-sky-300 bg-white/80 shadow-md"
              style={{
                left: `${item.dropArea.x}%`,
                top: `${item.dropArea.y}%`,
                width: `${item.dropArea.width}%`,
                height: `${item.dropArea.height}%`,
              }}
              onDragOver={(e) => interactive && e.preventDefault()}
              onDrop={(e) => {
                if (!interactive) return;
                e.preventDefault();
                const droppedChoiceId = e.dataTransfer.getData("text/plain") || draggingChoiceId;
                if (droppedChoiceId) {
                  updateAnswers((prev) => ({ ...prev, [item.id]: droppedChoiceId }));
                }
                setDraggingChoiceId?.(null);
              }}
            >
              {selectedChoiceId ? (() => {
                const choice = item.choices.find((c) => c.id === selectedChoiceId);
                if (!choice?.sourceArea) return null;
                return (
                  <div
                    className="absolute inset-0 rounded-xl border-2 border-emerald-400 shadow-md"
                    style={getAreaBackgroundStyle(page.backgroundUrl, choice.sourceArea)}
                  />
                );
              })() : (
                <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-medium text-slate-400">
                  {item.prompt}
                </div>
              )}
            </div>
            {/* Source choices */}
            {item.choices.map((choice) => {
              if (!choice.sourceArea) return null;
              const used = selectedChoiceId === choice.id;
              return (
                <div
                  key={`${choice.id}-ds-source`}
                  className="absolute rounded-xl border border-slate-300 bg-white/95 shadow-sm"
                  style={{
                    left: `${choice.sourceArea.x}%`,
                    top: `${choice.sourceArea.y}%`,
                    width: `${choice.sourceArea.width}%`,
                    height: `${choice.sourceArea.height}%`,
                  }}
                >
                  {!used ? (
                    <button
                      type="button"
                      draggable={interactive}
                      disabled={!interactive}
                      onDragStart={(e) => {
                        if (!interactive) return;
                        e.dataTransfer.setData("text/plain", choice.id);
                        setDraggingChoiceId?.(choice.id);
                      }}
                      onDragEnd={() => setDraggingChoiceId?.(null)}
                      className="absolute inset-0 overflow-hidden rounded-xl border-2 border-fuchsia-400 shadow-md"
                      style={getAreaBackgroundStyle(page.backgroundUrl, choice.sourceArea)}
                    >
                      <span className="sr-only">{choice.label}</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
      {dragDropItemsWithAreas.map((item) => {
        const placements = asDragDropRecord(answers[item.id]);
        return (
          <div key={`${item.id}-image-drag-layer`} className="absolute inset-0">
            {item.targets.map((target) => {
              if (!target.dropArea) return null;
              const targetPlacement = placements[target.id];
              const assignedChoiceIds = Array.isArray(targetPlacement)
                ? targetPlacement
                : typeof targetPlacement === "string"
                  ? [targetPlacement]
                  : [];
              const acceptedChoiceIds = target.acceptedChoiceIds ?? [];
              const isGroupTarget = acceptedChoiceIds.length > 1;
              const assignedChoices = assignedChoiceIds
                .map((choiceId) => item.choices.find((choice) => choice.id === choiceId))
                .filter((choice): choice is (typeof item.choices)[number] => Boolean(choice?.sourceArea));

              return (
                <div
                  key={`${target.id}-drop-area`}
                  onDragOver={(e) => interactive && e.preventDefault()}
                  onDrop={(e) => {
                    if (!interactive) return;
                    e.preventDefault();
                    const droppedChoiceId = e.dataTransfer.getData("text/plain") || draggingChoiceId;
                    if (droppedChoiceId) {
                      assignAreaDragChoice(item.id, target.id, droppedChoiceId, {
                        append: isGroupTarget,
                        acceptedChoiceIds,
                      });
                    }
                    setDraggingChoiceId?.(null);
                  }}
                  className="absolute overflow-hidden rounded-xl border-2 border-dashed border-sky-300 bg-white/80 shadow-md"
                  style={{
                    left: `${target.dropArea.x}%`,
                    top: `${target.dropArea.y}%`,
                    width: `${target.dropArea.width}%`,
                    height: `${target.dropArea.height}%`,
                  }}
                >
                  {assignedChoices.length > 0 ? (
                    <div className="absolute inset-0 grid auto-cols-fr grid-flow-col gap-1 p-1">
                      {assignedChoices.map((choice) => (
                        <div
                          key={`${target.id}-${choice.id}`}
                          className="min-w-0 rounded-lg border border-white/80 shadow-sm"
                          style={getAreaBackgroundStyle(page.backgroundUrl, choice.sourceArea)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-medium text-slate-400">
                      {target.label}
                    </div>
                  )}
                </div>
              );
            })}
            {item.choices.map((choice) => {
              if (!choice.sourceArea) return null;
              const used = flattenDragDropPlacements(placements).includes(choice.id);
              return (
                <div
                  key={`${choice.id}-source-hole`}
                  className="absolute rounded-xl border border-slate-300 bg-white/95 shadow-sm"
                  style={{
                    left: `${choice.sourceArea.x}%`,
                    top: `${choice.sourceArea.y}%`,
                    width: `${choice.sourceArea.width}%`,
                    height: `${choice.sourceArea.height}%`,
                  }}
                >
                  {!used ? (
                    <button
                      type="button"
                      draggable={interactive}
                      disabled={!interactive}
                      onDragStart={(e) => {
                        if (!interactive) return;
                        e.dataTransfer.setData("text/plain", choice.id);
                        setDraggingChoiceId?.(choice.id);
                      }}
                      onDragEnd={() => setDraggingChoiceId?.(null)}
                      className="absolute inset-0 overflow-hidden rounded-xl border-2 border-fuchsia-400 shadow-md"
                      style={getAreaBackgroundStyle(page.backgroundUrl, choice.sourceArea)}
                    >
                      <span className="sr-only">{choice.label}</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
      {page.items
        .filter((item): item is Extract<StudentWorksheetItem, { type: "word_search" }> => item.type === "word_search")
        .map((item) => {
          const selectedCells = parseWordSearchAnswer(answers[item.id]);
          const toggleCell = (cellIndex: number) => {
            if (!interactive) return;
            updateAnswers((prev) => {
              const next = parseWordSearchAnswer(prev[item.id]);
              if (next.has(cellIndex)) {
                next.delete(cellIndex);
              } else {
                next.add(cellIndex);
              }
              return {
                ...prev,
                [item.id]: Array.from(next)
                  .sort((a, b) => a - b)
                  .join(","),
              };
            });
          };

          return (
            <div
              key={`${item.id}-word-search`}
              className="absolute grid select-none overflow-hidden rounded-md"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                height: `${item.height}%`,
                gridTemplateColumns: `repeat(${item.cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: item.rows * item.cols }).map((_, cellIndex) => {
                const isSelected = selectedCells.has(cellIndex);
                return (
                  <button
                    key={`${item.id}-cell-${cellIndex}`}
                    type="button"
                    disabled={!interactive}
                    aria-pressed={isSelected}
                    aria-label={item.prompt}
                    onClick={() => toggleCell(cellIndex)}
                    className={`border border-dashed transition-colors ${
                      isSelected
                        ? "border-amber-500 bg-amber-300/60"
                        : "border-slate-400/70 hover:bg-white/25"
                    }`}
                  />
                );
              })}
            </div>
          );
        })}
      {matchingPairsItemsWithAreas.map((item) => {
        const pairings = asStringRecord(answers[item.id]);
        const promptDot = (prompt: (typeof item.prompts)[number]) => ({
          x: prompt.sourceArea.x + prompt.sourceArea.width,
          y: prompt.sourceArea.y + prompt.sourceArea.height / 2,
        });
        const choiceDot = (choice: (typeof item.choices)[number]) => ({
          x: choice.sourceArea.x,
          y: choice.sourceArea.y + choice.sourceArea.height / 2,
        });

        const startPointerToPercent = (event: ReactPointerEvent) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect || rect.width < 1 || rect.height < 1) return { x: 0, y: 0 };
          return {
            x: ((event.clientX - rect.left) / rect.width) * 100,
            y: ((event.clientY - rect.top) / rect.height) * 100,
          };
        };

        const dragging = matchingDrag?.itemId === item.id ? matchingDrag : null;

        return (
          <div key={`${item.id}-matching-layer`} className="absolute inset-0">
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {item.prompts.map((prompt) => {
                const choiceId = pairings[prompt.id];
                const choice = choiceId ? item.choices.find((entry) => entry.id === choiceId) : null;
                if (!choice) return null;
                const from = promptDot(prompt);
                const to = choiceDot(choice);
                return (
                  <line
                    key={`${prompt.id}-line`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#10b981"
                    strokeWidth={0.5}
                    strokeLinecap="round"
                  />
                );
              })}
              {dragging
                ? (() => {
                    const prompt = item.prompts.find((entry) => entry.id === dragging.promptId);
                    if (!prompt) return null;
                    const from = promptDot(prompt);
                    return (
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={dragging.x}
                        y2={dragging.y}
                        stroke="#0ea5e9"
                        strokeWidth={0.5}
                        strokeDasharray="2 1.5"
                        strokeLinecap="round"
                      />
                    );
                  })()
                : null}
            </svg>
            {item.prompts.map((prompt) => {
              const dot = promptDot(prompt);
              const isConnected = Boolean(pairings[prompt.id]);
              return (
                <div key={`${prompt.id}-prompt-box`}>
                  <div
                    className="absolute overflow-hidden rounded-lg border-2 border-fuchsia-400 bg-white/90 shadow-sm"
                    style={{
                      left: `${prompt.sourceArea.x}%`,
                      top: `${prompt.sourceArea.y}%`,
                      width: `${prompt.sourceArea.width}%`,
                      height: `${prompt.sourceArea.height}%`,
                      ...getAreaBackgroundStyle(page.backgroundUrl, prompt.sourceArea),
                    }}
                  >
                    <span className="sr-only">{prompt.label}</span>
                  </div>
                  <button
                    type="button"
                    disabled={!interactive}
                    aria-label={prompt.label}
                    aria-pressed={isConnected}
                    onPointerDown={(event) => {
                      if (!interactive) return;
                      event.preventDefault();
                      const point = startPointerToPercent(event);
                      setMatchingDrag({
                        itemId: item.id,
                        promptId: prompt.id,
                        startX: point.x,
                        startY: point.y,
                        x: point.x,
                        y: point.y,
                      });
                    }}
                    className={`absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white shadow-md transition-colors ${
                      isConnected ? "bg-emerald-500" : "bg-fuchsia-500"
                    }`}
                    style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                  />
                </div>
              );
            })}
            {item.choices.map((choice) => {
              const dot = choiceDot(choice);
              return (
                <div key={`${choice.id}-choice-box`}>
                  <div
                    className="absolute overflow-hidden rounded-lg border-2 border-sky-400 bg-white/90 shadow-sm"
                    style={{
                      left: `${choice.sourceArea.x}%`,
                      top: `${choice.sourceArea.y}%`,
                      width: `${choice.sourceArea.width}%`,
                      height: `${choice.sourceArea.height}%`,
                      ...getAreaBackgroundStyle(page.backgroundUrl, choice.sourceArea),
                    }}
                  >
                    <span className="sr-only">{choice.label}</span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-500 shadow-md"
                    style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
      {page.items.map((item) => (
        item.type === "drag_drop" || item.type === "word_search" || item.type === "matching_pairs" ? null : (
        <div
          key={item.id}
          className="absolute rounded-xl border border-slate-200 bg-white/92 p-2 shadow-md backdrop-blur-sm"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.width}%`,
            minHeight: `${item.height}%`,
          }}
        >
          {item.type === "short_text" ? (
            <label className="block space-y-1">
              <span className="block text-[11px] font-bold text-slate-700">{item.label}</span>
              <input
                value={typeof answers[item.id] === "string" ? String(answers[item.id]) : ""}
                disabled={!interactive}
                onChange={(e) =>
                  updateAnswers((prev) => ({
                    ...prev,
                    [item.id]: e.target.value,
                  }))
                }
                placeholder={item.placeholder ?? ""}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none ring-0 focus:border-fuchsia-300 disabled:bg-white disabled:text-slate-400"
              />
            </label>
          ) : item.type === "multiple_choice" ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold leading-snug text-slate-700">{item.prompt}</p>
              <select
                aria-label={item.prompt}
                disabled={!interactive}
                value={typeof answers[item.id] === "number" ? String(answers[item.id]) : ""}
                onChange={(e) =>
                  updateAnswers((prev) => ({
                    ...prev,
                    [item.id]: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-fuchsia-300 disabled:text-slate-400"
              >
                <option value="">{t("assignmentWorksheetMatchingSelectChoice")}</option>
                {item.options.map((option, optionIndex) => (
                  <option key={`${item.id}-${optionIndex}`} value={optionIndex}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        )
      ))}
    </div>
  );
}
