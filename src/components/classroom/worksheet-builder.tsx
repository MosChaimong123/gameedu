"use client";

import { useState } from "react";
import { Copy, ChevronLeft, ChevronRight, FilePlus2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";
import { MediaUpload } from "@/components/media-upload";
import { useLanguage } from "@/components/providers/language-provider";
import {
  buildDefaultWorksheetData,
  normalizeWorksheetAcceptedAnswers,
  type WorksheetData,
  type WorksheetItem,
  type WorksheetPage,
} from "@/lib/worksheet-schema";

type Props = {
  value: WorksheetData;
  onChange: (value: WorksheetData) => void;
  disabled?: boolean;
};

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

function createFillBlankItem(): WorksheetItem {
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "fill_blank",
    prompt: "Fill in the blanks",
    x: 12,
    y: 42,
    width: 54,
    height: 14,
    pointsPerBlank: 1,
    blanks: [
      {
        id: `blank-${crypto.randomUUID()}`,
        label: "Blank 1",
        placeholder: "",
        answer: {
          mode: "normalized",
          accepted: ["answer one"],
        },
      },
      {
        id: `blank-${crypto.randomUUID()}`,
        label: "Blank 2",
        placeholder: "",
        answer: {
          mode: "normalized",
          accepted: ["answer two"],
        },
      },
    ],
  };
}

function createDragDropItem(): WorksheetItem {
  const choiceAId = `choice-${crypto.randomUUID()}`;
  const choiceBId = `choice-${crypto.randomUUID()}`;
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "drag_drop",
    prompt: "Drag each choice to the correct target",
    x: 12,
    y: 60,
    width: 58,
    height: 18,
    pointsPerTarget: 1,
    choices: [
      { id: choiceAId, label: "Choice A" },
      { id: choiceBId, label: "Choice B" },
    ],
    targets: [
      { id: `target-${crypto.randomUUID()}`, label: "Target 1", correctChoiceId: choiceAId },
      { id: `target-${crypto.randomUUID()}`, label: "Target 2", correctChoiceId: choiceBId },
    ],
  };
}

function createMatchingPairsItem(): WorksheetItem {
  const choiceAId = `choice-${crypto.randomUUID()}`;
  const choiceBId = `choice-${crypto.randomUUID()}`;
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "matching_pairs",
    prompt: "Match each prompt with the correct answer",
    x: 12,
    y: 78,
    width: 58,
    height: 18,
    pointsPerPair: 1,
    choices: [
      { id: choiceAId, label: "Answer A" },
      { id: choiceBId, label: "Answer B" },
    ],
    prompts: [
      { id: `prompt-${crypto.randomUUID()}`, label: "Prompt 1", correctChoiceId: choiceAId },
      { id: `prompt-${crypto.randomUUID()}`, label: "Prompt 2", correctChoiceId: choiceBId },
    ],
  };
}

function createMediaPromptItem(mediaType: "audio" | "video"): WorksheetItem {
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "media_prompt",
    prompt: mediaType === "audio" ? "Listen and answer" : "Watch and answer",
    mediaType,
    mediaUrl: "",
    placeholder: "",
    x: 12,
    y: 82,
    width: 58,
    height: 18,
    answer: {
      mode: "normalized",
      accepted: ["answer"],
      points: 1,
    },
  };
}

function createChecklistItem(): WorksheetItem {
  return {
    id: `ws-item-${crypto.randomUUID()}`,
    type: "checklist",
    prompt: "Select all correct answers",
    x: 12,
    y: 88,
    width: 56,
    height: 18,
    pointsPerCorrect: 1,
    options: [
      { id: `check-${crypto.randomUUID()}`, label: "Option 1", correct: true },
      { id: `check-${crypto.randomUUID()}`, label: "Option 2", correct: false },
      { id: `check-${crypto.randomUUID()}`, label: "Option 3", correct: false },
    ],
  };
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

  const fallbackPage = buildDefaultWorksheetData().pages[0];
  const safeActivePageIndex = Math.min(activePageIndex, Math.max(0, value.pages.length - 1));
  const page = value.pages[safeActivePageIndex] ?? fallbackPage;

  const updatePages = (pages: WorksheetPage[]) => {
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
  };

  const updateCurrentPage = (updater: (currentPage: WorksheetPage) => WorksheetPage) => {
    updatePages(
      value.pages.map((entry, index) => (index === safeActivePageIndex ? updater(entry) : entry))
    );
  };

  const updateItem = (itemId: string, updater: (item: WorksheetItem) => WorksheetItem) => {
    updateCurrentPage((currentPage) => ({
      ...currentPage,
      items: currentPage.items.map((item) => (item.id === itemId ? updater(item) : item)),
    }));
  };

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

  const setBackgroundUrl = (backgroundUrl: string) => {
    updateCurrentPage((currentPage) => ({
      ...currentPage,
      backgroundUrl,
    }));
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
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-bold text-fuchsia-950">{t("assignmentWorksheetSetupLabel")}</Label>
          <p className="text-xs text-fuchsia-900/75">{t("assignmentWorksheetSetupHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={disabled} onClick={addPage}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddPage")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addItem(createShortTextItem())}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddShortText")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addItem(createMultipleChoiceItem())}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddMultipleChoice")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addItem(createFillBlankItem())}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddFillBlank")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addItem(createDragDropItem())}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddDragDrop")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addItem(createMatchingPairsItem())}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddMatchingPairs")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addItem(createMediaPromptItem("audio"))}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddAudioPrompt")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addItem(createMediaPromptItem("video"))}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddVideoPrompt")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addItem(createChecklistItem())}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("assignmentWorksheetAddChecklist")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-fuchsia-200 bg-white/85 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || safeActivePageIndex === 0}
            onClick={() => setActivePageIndex((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-1 flex-wrap gap-2">
            {value.pages.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                disabled={disabled}
                onClick={() => setActivePageIndex(index)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${
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

      <div className="space-y-2">
        <Label className="text-sm font-bold text-fuchsia-950">
          {t("assignmentWorksheetBackgroundLabel")}
        </Label>
        <ImageUpload value={page.backgroundUrl} onChange={setBackgroundUrl} disabled={disabled} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-3">
          {page.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-fuchsia-200 bg-white/80 p-6 text-center text-sm font-medium text-fuchsia-900/70">
              {t("assignmentWorksheetEmptyState")}
            </div>
          ) : (
            page.items.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-fuchsia-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {t("assignmentWorksheetItemLabel", { count: index + 1 })}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {item.type === "short_text"
                        ? t("assignmentWorksheetTypeShortText")
                        : item.type === "multiple_choice"
                          ? t("assignmentWorksheetTypeMultipleChoice")
                          : item.type === "fill_blank"
                            ? t("assignmentWorksheetTypeFillBlank")
                            : item.type === "drag_drop"
                              ? t("assignmentWorksheetTypeDragDrop")
                              : item.type === "matching_pairs"
                                ? t("assignmentWorksheetTypeMatchingPairs")
                                : item.type === "checklist"
                                  ? t("assignmentWorksheetTypeChecklist")
                                  : item.type === "media_prompt"
                                    ? item.mediaType === "audio"
                                      ? t("assignmentWorksheetTypeAudioPrompt")
                                      : t("assignmentWorksheetTypeVideoPrompt")
                                    : t("assignmentWorksheetTypeShortText")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => duplicateItem(item.id)}
                      className="text-slate-400 hover:bg-sky-50 hover:text-sky-600"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("assignmentWorksheetPosX")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.x}
                      disabled={disabled}
                      onChange={(e) =>
                        updateItem(item.id, (current) => ({
                          ...current,
                          x: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("assignmentWorksheetPosY")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.y}
                      disabled={disabled}
                      onChange={(e) =>
                        updateItem(item.id, (current) => ({
                          ...current,
                          y: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("assignmentWorksheetWidth")}</Label>
                    <Input
                      type="number"
                      min="5"
                      max="100"
                      value={item.width}
                      disabled={disabled}
                      onChange={(e) =>
                        updateItem(item.id, (current) => ({
                          ...current,
                          width: Number(e.target.value || 5),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("assignmentWorksheetHeight")}</Label>
                    <Input
                      type="number"
                      min="3"
                      max="40"
                      value={item.height}
                      disabled={disabled}
                      onChange={(e) =>
                        updateItem(item.id, (current) => ({
                          ...current,
                          height: Number(e.target.value || 3),
                        }))
                      }
                    />
                  </div>
                </div>

                {item.type === "short_text" ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetFieldLabel")}</Label>
                      <Input
                        value={item.label}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "short_text"
                              ? { ...current, label: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetPlaceholderLabel")}</Label>
                      <Input
                        value={item.placeholder}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "short_text"
                              ? { ...current, placeholder: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("assignmentWorksheetAcceptedAnswersLabel")}</Label>
                        <Textarea
                          rows={3}
                          disabled={disabled}
                          value={item.answer.accepted.join(", ")}
                          onChange={(e) =>
                            updateItem(item.id, (current) =>
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
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>{t("assignmentWorksheetCheckModeLabel")}</Label>
                          <Select
                            value={item.answer.mode}
                            onValueChange={(next) =>
                              updateItem(item.id, (current) =>
                                current.type === "short_text"
                                  ? {
                                      ...current,
                                      answer: {
                                        ...current.answer,
                                        mode: next as "exact" | "normalized",
                                      },
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
                              <SelectItem value="normalized">
                                {t("assignmentWorksheetCheckModeNormalized")}
                              </SelectItem>
                              <SelectItem value="exact">
                                {t("assignmentWorksheetCheckModeExact")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("assignmentWorksheetPointsLabel")}</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={item.answer.points}
                            disabled={disabled}
                            onChange={(e) =>
                              updateItem(item.id, (current) =>
                                current.type === "short_text"
                                  ? {
                                      ...current,
                                      answer: {
                                        ...current.answer,
                                        points: Number(e.target.value || 1),
                                      },
                                    }
                                  : current
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : item.type === "multiple_choice" ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetPromptLabel")}</Label>
                      <Textarea
                        rows={2}
                        value={item.prompt}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "multiple_choice"
                              ? { ...current, prompt: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {item.options.map((option, optionIndex) => (
                        <div key={`${item.id}-option-${optionIndex}`} className="space-y-2">
                          <Label>{t("assignmentWorksheetOptionLabel", { count: optionIndex + 1 })}</Label>
                          <Input
                            value={option}
                            disabled={disabled}
                            onChange={(e) =>
                              updateItem(item.id, (current) => {
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
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("assignmentWorksheetCorrectOptionLabel")}</Label>
                        <Select
                          value={String(item.correctIndex)}
                          onValueChange={(next) =>
                            updateItem(item.id, (current) =>
                              current.type === "multiple_choice"
                                ? { ...current, correctIndex: Number(next) }
                                : current
                            )
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {item.options.map((_, optionIndex) => (
                              <SelectItem key={`${item.id}-correct-${optionIndex}`} value={String(optionIndex)}>
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
                          value={item.points}
                          disabled={disabled}
                          onChange={(e) =>
                            updateItem(item.id, (current) =>
                              current.type === "multiple_choice"
                                ? { ...current, points: Number(e.target.value || 1) }
                                : current
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : item.type === "fill_blank" ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetPromptLabel")}</Label>
                      <Textarea
                        rows={2}
                        value={item.prompt}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "fill_blank"
                              ? { ...current, prompt: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("assignmentWorksheetBlankPointsLabel")}</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={item.pointsPerBlank}
                          disabled={disabled}
                          onChange={(e) =>
                            updateItem(item.id, (current) =>
                              current.type === "fill_blank"
                                ? { ...current, pointsPerBlank: Number(e.target.value || 1) }
                                : current
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("assignmentWorksheetBlankCountLabel")}</Label>
                        <Input
                          type="number"
                          min="2"
                          max="6"
                          value={item.blanks.length}
                          disabled={disabled}
                          onChange={(e) =>
                            updateItem(item.id, (current) => {
                              if (current.type !== "fill_blank") return current;
                              const requestedCount = Math.min(6, Math.max(2, Number(e.target.value || 2)));
                              if (requestedCount === current.blanks.length) return current;
                              if (requestedCount < current.blanks.length) {
                                return {
                                  ...current,
                                  blanks: current.blanks.slice(0, requestedCount),
                                };
                              }

                              const nextBlanks = [...current.blanks];
                              while (nextBlanks.length < requestedCount) {
                                nextBlanks.push({
                                  id: `blank-${crypto.randomUUID()}`,
                                  label: `Blank ${nextBlanks.length + 1}`,
                                  placeholder: "",
                                  answer: {
                                    mode: "normalized",
                                    accepted: [`answer ${nextBlanks.length + 1}`],
                                  },
                                });
                              }
                              return {
                                ...current,
                                blanks: nextBlanks,
                              };
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-3">
                      {item.blanks.map((blank, blankIndex) => (
                        <div
                          key={blank.id}
                          className="space-y-3 rounded-xl border border-fuchsia-200 bg-white p-3"
                        >
                          <div className="text-xs font-black uppercase tracking-wide text-fuchsia-700">
                            {t("assignmentWorksheetBlankLabel", { count: blankIndex + 1 })}
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t("assignmentWorksheetFieldLabel")}</Label>
                              <Input
                                value={blank.label}
                                disabled={disabled}
                                onChange={(e) =>
                                  updateItem(item.id, (current) => {
                                    if (current.type !== "fill_blank") return current;
                                    const nextBlanks = current.blanks.map((entry, entryIndex) =>
                                      entryIndex === blankIndex
                                        ? { ...entry, label: e.target.value }
                                        : entry
                                    );
                                    return { ...current, blanks: nextBlanks };
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("assignmentWorksheetPlaceholderLabel")}</Label>
                              <Input
                                value={blank.placeholder}
                                disabled={disabled}
                                onChange={(e) =>
                                  updateItem(item.id, (current) => {
                                    if (current.type !== "fill_blank") return current;
                                    const nextBlanks = current.blanks.map((entry, entryIndex) =>
                                      entryIndex === blankIndex
                                        ? { ...entry, placeholder: e.target.value }
                                        : entry
                                    );
                                    return { ...current, blanks: nextBlanks };
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t("assignmentWorksheetAcceptedAnswersLabel")}</Label>
                              <Textarea
                                rows={3}
                                disabled={disabled}
                                value={blank.answer.accepted.join(", ")}
                                onChange={(e) =>
                                  updateItem(item.id, (current) => {
                                    if (current.type !== "fill_blank") return current;
                                    const nextBlanks = current.blanks.map((entry, entryIndex) =>
                                      entryIndex === blankIndex
                                        ? {
                                            ...entry,
                                            answer: {
                                              ...entry.answer,
                                              accepted: normalizeWorksheetAcceptedAnswers(e.target.value),
                                            },
                                          }
                                        : entry
                                    );
                                    return { ...current, blanks: nextBlanks };
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("assignmentWorksheetCheckModeLabel")}</Label>
                              <Select
                                value={blank.answer.mode}
                                onValueChange={(next) =>
                                  updateItem(item.id, (current) => {
                                    if (current.type !== "fill_blank") return current;
                                    const nextBlanks = current.blanks.map((entry, entryIndex) =>
                                      entryIndex === blankIndex
                                        ? {
                                            ...entry,
                                            answer: {
                                              ...entry.answer,
                                              mode: next as "exact" | "normalized",
                                            },
                                          }
                                        : entry
                                    );
                                    return { ...current, blanks: nextBlanks };
                                  })
                                }
                                disabled={disabled}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normalized">
                                    {t("assignmentWorksheetCheckModeNormalized")}
                                  </SelectItem>
                                  <SelectItem value="exact">
                                    {t("assignmentWorksheetCheckModeExact")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : item.type === "drag_drop" ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetPromptLabel")}</Label>
                      <Textarea
                        rows={2}
                        value={item.prompt}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "drag_drop"
                              ? { ...current, prompt: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetDragPointsLabel")}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={item.pointsPerTarget}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "drag_drop"
                              ? { ...current, pointsPerTarget: Number(e.target.value || 1) }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="space-y-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-3">
                      <div className="text-xs font-black uppercase tracking-wide text-fuchsia-700">
                        {t("assignmentWorksheetDragChoicesLabel")}
                      </div>
                      {item.choices.map((choice, choiceIndex) => (
                        <div key={choice.id} className="space-y-2 rounded-xl border border-fuchsia-200 bg-white p-3">
                          <Label>{t("assignmentWorksheetOptionLabel", { count: choiceIndex + 1 })}</Label>
                          <Input
                            value={choice.label}
                            disabled={disabled}
                            onChange={(e) =>
                              updateItem(item.id, (current) => {
                                if (current.type !== "drag_drop") return current;
                                const nextChoices = current.choices.map((entry, entryIndex) =>
                                  entryIndex === choiceIndex ? { ...entry, label: e.target.value } : entry
                                );
                                return { ...current, choices: nextChoices };
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                      <div className="text-xs font-black uppercase tracking-wide text-sky-700">
                        {t("assignmentWorksheetDragTargetsLabel")}
                      </div>
                      {item.targets.map((target, targetIndex) => (
                        <div key={target.id} className="space-y-3 rounded-xl border border-sky-200 bg-white p-3">
                          <div className="space-y-2">
                            <Label>{t("assignmentWorksheetDragTargetLabel", { count: targetIndex + 1 })}</Label>
                            <Input
                              value={target.label}
                              disabled={disabled}
                              onChange={(e) =>
                                updateItem(item.id, (current) => {
                                  if (current.type !== "drag_drop") return current;
                                  const nextTargets = current.targets.map((entry, entryIndex) =>
                                    entryIndex === targetIndex ? { ...entry, label: e.target.value } : entry
                                  );
                                  return { ...current, targets: nextTargets };
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("assignmentWorksheetDragCorrectChoiceLabel")}</Label>
                            <Select
                              value={target.correctChoiceId}
                              onValueChange={(next) =>
                                updateItem(item.id, (current) => {
                                  if (current.type !== "drag_drop") return current;
                                  const nextTargets = current.targets.map((entry, entryIndex) =>
                                    entryIndex === targetIndex ? { ...entry, correctChoiceId: next } : entry
                                  );
                                  return { ...current, targets: nextTargets };
                                })
                              }
                              disabled={disabled}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {item.choices.map((choice) => (
                                  <SelectItem key={`${target.id}-${choice.id}`} value={choice.id}>
                                    {choice.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : item.type === "matching_pairs" ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetPromptLabel")}</Label>
                      <Textarea
                        rows={2}
                        value={item.prompt}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "matching_pairs"
                              ? { ...current, prompt: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetMatchingPointsLabel")}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={item.pointsPerPair}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "matching_pairs"
                              ? { ...current, pointsPerPair: Number(e.target.value || 1) }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="space-y-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-3">
                      <div className="text-xs font-black uppercase tracking-wide text-fuchsia-700">
                        {t("assignmentWorksheetMatchingChoicesLabel")}
                      </div>
                      {item.choices.map((choice, choiceIndex) => (
                        <div key={choice.id} className="space-y-2 rounded-xl border border-fuchsia-200 bg-white p-3">
                          <Label>{t("assignmentWorksheetOptionLabel", { count: choiceIndex + 1 })}</Label>
                          <Input
                            value={choice.label}
                            disabled={disabled}
                            onChange={(e) =>
                              updateItem(item.id, (current) => {
                                if (current.type !== "matching_pairs") return current;
                                const nextChoices = current.choices.map((entry, entryIndex) =>
                                  entryIndex === choiceIndex ? { ...entry, label: e.target.value } : entry
                                );
                                return { ...current, choices: nextChoices };
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                      <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                        {t("assignmentWorksheetMatchingPromptsLabel")}
                      </div>
                      {item.prompts.map((prompt, promptIndex) => (
                        <div key={prompt.id} className="space-y-3 rounded-xl border border-emerald-200 bg-white p-3">
                          <div className="space-y-2">
                            <Label>{t("assignmentWorksheetMatchingPromptLabel", { count: promptIndex + 1 })}</Label>
                            <Input
                              value={prompt.label}
                              disabled={disabled}
                              onChange={(e) =>
                                updateItem(item.id, (current) => {
                                  if (current.type !== "matching_pairs") return current;
                                  const nextPrompts = current.prompts.map((entry, entryIndex) =>
                                    entryIndex === promptIndex ? { ...entry, label: e.target.value } : entry
                                  );
                                  return { ...current, prompts: nextPrompts };
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("assignmentWorksheetMatchingCorrectChoiceLabel")}</Label>
                            <Select
                              value={prompt.correctChoiceId}
                              onValueChange={(next) =>
                                updateItem(item.id, (current) => {
                                  if (current.type !== "matching_pairs") return current;
                                  const nextPrompts = current.prompts.map((entry, entryIndex) =>
                                    entryIndex === promptIndex ? { ...entry, correctChoiceId: next } : entry
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
                                {item.choices.map((choice) => (
                                  <SelectItem key={`${prompt.id}-${choice.id}`} value={choice.id}>
                                    {choice.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : item.type === "media_prompt" ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetPromptLabel")}</Label>
                      <Textarea
                        rows={2}
                        value={item.prompt}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "media_prompt"
                              ? { ...current, prompt: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetMediaSourceLabel")}</Label>
                      <MediaUpload
                        value={item.mediaUrl}
                        mediaType={item.mediaType}
                        onChange={(nextUrl) =>
                          updateItem(item.id, (current) =>
                            current.type === "media_prompt"
                              ? { ...current, mediaUrl: nextUrl }
                              : current
                          )
                        }
                        disabled={disabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetPlaceholderLabel")}</Label>
                      <Input
                        value={item.placeholder}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "media_prompt"
                              ? { ...current, placeholder: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("assignmentWorksheetAcceptedAnswersLabel")}</Label>
                        <Textarea
                          rows={3}
                          disabled={disabled}
                          value={item.answer.accepted.join(", ")}
                          onChange={(e) =>
                            updateItem(item.id, (current) =>
                              current.type === "media_prompt"
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
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>{t("assignmentWorksheetCheckModeLabel")}</Label>
                          <Select
                            value={item.answer.mode}
                            onValueChange={(next) =>
                              updateItem(item.id, (current) =>
                                current.type === "media_prompt"
                                  ? {
                                      ...current,
                                      answer: {
                                        ...current.answer,
                                        mode: next as "exact" | "normalized",
                                      },
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
                              <SelectItem value="normalized">
                                {t("assignmentWorksheetCheckModeNormalized")}
                              </SelectItem>
                              <SelectItem value="exact">
                                {t("assignmentWorksheetCheckModeExact")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("assignmentWorksheetPointsLabel")}</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={item.answer.points}
                            disabled={disabled}
                            onChange={(e) =>
                              updateItem(item.id, (current) =>
                                current.type === "media_prompt"
                                  ? {
                                      ...current,
                                      answer: {
                                        ...current.answer,
                                        points: Number(e.target.value || 1),
                                      },
                                    }
                                  : current
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetPromptLabel")}</Label>
                      <Textarea
                        rows={2}
                        value={item.prompt}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "checklist"
                              ? { ...current, prompt: e.target.value }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("assignmentWorksheetChecklistPointsLabel")}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={item.pointsPerCorrect}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem(item.id, (current) =>
                            current.type === "checklist"
                              ? { ...current, pointsPerCorrect: Number(e.target.value || 1) }
                              : current
                          )
                        }
                      />
                    </div>
                    <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                      {item.options.map((option, optionIndex) => (
                        <div key={option.id} className="rounded-xl border border-amber-200 bg-white p-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                            <div className="space-y-2">
                              <Label>{t("assignmentWorksheetOptionLabel", { count: optionIndex + 1 })}</Label>
                              <Input
                                value={option.label}
                                disabled={disabled}
                                onChange={(e) =>
                                  updateItem(item.id, (current) => {
                                    if (current.type !== "checklist") return current;
                                    const nextOptions = current.options.map((entry, entryIndex) =>
                                      entryIndex === optionIndex
                                        ? { ...entry, label: e.target.value }
                                        : entry
                                    );
                                    return { ...current, options: nextOptions };
                                  })
                                }
                              />
                            </div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={option.correct}
                                disabled={disabled}
                                onChange={(e) =>
                                  updateItem(item.id, (current) => {
                                    if (current.type !== "checklist") return current;
                                    const nextOptions = current.options.map((entry, entryIndex) =>
                                      entryIndex === optionIndex
                                        ? { ...entry, correct: e.target.checked }
                                        : entry
                                    );
                                    return { ...current, options: nextOptions };
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              <span>{t("assignmentWorksheetChecklistCorrectLabel")}</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-fuchsia-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">{t("assignmentWorksheetPreviewLabel")}</p>
                <p className="text-xs text-slate-500">{t("assignmentWorksheetPreviewHint")}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
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
                  <div className="absolute inset-0">
                    {page.items.map((item) => (
                      <div
                        key={`${item.id}-preview`}
                        className="absolute rounded-md border-2 border-fuchsia-500/70 bg-fuchsia-100/60 p-1 text-[10px] font-bold text-fuchsia-900 shadow-sm"
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
                            : item.type === "fill_blank"
                              ? `${item.prompt} (${item.blanks.length})`
                              : item.type === "drag_drop"
                                ? `${item.prompt} (${item.targets.length})`
                                : item.type === "matching_pairs"
                                  ? `${item.prompt} (${item.prompts.length})`
                                  : item.type === "media_prompt"
                                    ? `${item.prompt} (${item.mediaType})`
                                    : `${item.prompt} (${item.options.length})`}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center p-6 text-center text-sm font-medium text-slate-400">
                  {t("assignmentWorksheetPreviewEmpty")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
