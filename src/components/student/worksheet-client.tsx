"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import type {
  StudentWorksheetPage,
  WorksheetStudentAnswerValue,
  WorksheetStudentAnswers,
} from "@/lib/worksheet-schema";

function asStringRecord(value: WorksheetStudentAnswerValue | undefined): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

interface WorksheetClientProps {
  assignment: {
    id: string;
    name: string;
    maxScore: number;
    description?: string | null;
  };
  classId: string;
  studentCode: string;
  themeClass: string;
  themeStyle: React.CSSProperties;
  showScoreToStudent: boolean;
  pages: StudentWorksheetPage[];
}

export function WorksheetClient({
  assignment,
  classId,
  studentCode,
  themeClass,
  themeStyle,
  showScoreToStudent,
  pages,
}: WorksheetClientProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<WorksheetStudentAnswers>({});
  const [draggingChoiceId, setDraggingChoiceId] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null);

  const allItems = pages.flatMap((page) => page.items);
  const activePage = pages[activePageIndex] ?? pages[0];

  const hasUnanswered = allItems.some((item) => {
    const value = answers[item.id];
    if (item.type === "short_text") {
      return typeof value !== "string" || value.trim().length === 0;
    }
    if (item.type === "fill_blank") {
      return (
        !Array.isArray(value) ||
        value.length !== item.blanks.length ||
        value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)
      );
    }
    if (item.type === "drag_drop") {
      const placements = asStringRecord(value);
      return item.targets.some((target) => typeof placements[target.id] !== "string" || placements[target.id].trim().length === 0);
    }
    if (item.type === "matching_pairs") {
      const pairings = asStringRecord(value);
      return item.prompts.some((prompt) => typeof pairings[prompt.id] !== "string" || pairings[prompt.id].trim().length === 0);
    }
    if (item.type === "media_prompt") {
      return typeof value !== "string" || value.trim().length === 0;
    }
    if (item.type === "checklist") {
      return (
        !Array.isArray(value) ||
        value.length !== item.options.length ||
        !value.some((entry) => entry === true)
      );
    }
    return typeof value !== "number";
  });

  function assignDragChoice(itemId: string, targetId: string, choiceId: string) {
    setAnswers((prev) => {
      const currentPlacements = { ...asStringRecord(prev[itemId]) };

      for (const [placementTargetId, placementChoiceId] of Object.entries(currentPlacements)) {
        if (placementChoiceId === choiceId) {
          delete currentPlacements[placementTargetId];
        }
      }

      currentPlacements[targetId] = choiceId;
      return {
        ...prev,
        [itemId]: currentPlacements,
      };
    });
  }

  function clearDragChoice(itemId: string, targetId: string) {
    setAnswers((prev) => {
      const currentPlacements = { ...asStringRecord(prev[itemId]) };
      delete currentPlacements[targetId];
      return {
        ...prev,
        [itemId]: currentPlacements,
      };
    });
  }

  async function handleSubmit() {
    if (hasUnanswered) {
      setLoadError(t("worksheetAnswerAllBeforeSubmit"));
      return;
    }

    setSubmitting(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/classrooms/${classId}/assignments/${assignment.id}/worksheet/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentCode,
            answers,
          }),
        }
      );
      const payload = (await res.json()) as
        | { score: number; maxScore: number; showScoreToStudent: boolean }
        | { message?: string };
      if (!res.ok) {
        setLoadError(t("worksheetSubmitFailed"));
        return;
      }
      if ("score" in payload && payload.showScoreToStudent) {
        setResult({ score: payload.score, maxScore: payload.maxScore });
        return;
      }
      router.push(`/student/${studentCode}`);
    } catch (error) {
      console.error(error);
      setLoadError(t("worksheetSubmitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result && showScoreToStudent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl">
          <div
            className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-white ${themeClass}`}
            style={themeStyle}
          >
            <Trophy className="h-12 w-12" />
          </div>
          <h1 className="mb-1 text-2xl font-black text-slate-800">{t("worksheetCompleteTitle")}</h1>
          <p className="mb-6 text-slate-400">{assignment.name}</p>
          <div className={`mb-6 rounded-2xl p-6 text-white ${themeClass}`} style={themeStyle}>
            <p className="text-sm text-white/70">{t("worksheetScoreLabel")}</p>
            <p className="text-6xl font-black">{result.score}</p>
            <p className="text-sm text-white/70">/ {result.maxScore}</p>
          </div>
          <Button
            onClick={() => router.push(`/student/${studentCode}`)}
            className={`h-12 w-full rounded-xl font-bold text-white ${themeClass}`}
            style={themeStyle}
          >
            {t("worksheetBackToMine")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={`px-6 py-4 ${themeClass}`} style={themeStyle}>
        <div className="mx-auto flex max-w-5xl items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span className="font-bold">{assignment.name}</span>
          </div>
          <span className="text-sm font-semibold text-white/80">
            {t("worksheetItemsCount", { count: allItems.length })}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {assignment.description?.trim() ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            {assignment.description.trim()}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {pages.map((page, index) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePageIndex(index)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${
                  index === activePageIndex
                    ? "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800"
                    : "border-slate-200 bg-white text-slate-500 hover:border-fuchsia-200"
                }`}
              >
                {t("assignmentWorksheetPageChip", { count: index + 1 })}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={activePageIndex === 0}
              onClick={() => setActivePageIndex((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={activePageIndex >= pages.length - 1}
              onClick={() => setActivePageIndex((current) => Math.min(pages.length - 1, current + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {activePage ? (
          <div key={activePage.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-600">
              {t("worksheetPageLabel", { count: activePage.pageNumber })}
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePage.backgroundUrl}
                alt={`Worksheet page ${activePage.pageNumber}`}
                className="block w-full"
              />
              <div className="absolute inset-0">
                {activePage.items.map((item) => (
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
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder={item.placeholder ?? ""}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none ring-0 focus:border-fuchsia-300"
                        />
                      </label>
                    ) : item.type === "multiple_choice" ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold leading-snug text-slate-700">{item.prompt}</p>
                        <div className="space-y-1.5">
                          {item.options.map((option, optionIndex) => {
                            const active = answers[item.id] === optionIndex;
                            return (
                              <button
                                key={`${item.id}-${optionIndex}`}
                                type="button"
                                onClick={() =>
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [item.id]: optionIndex,
                                  }))
                                }
                                className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs font-semibold transition-colors ${
                                  active
                                    ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-fuchsia-200"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : item.type === "fill_blank" ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold leading-snug text-slate-700">{item.prompt}</p>
                        <div className="space-y-2">
                          {item.blanks.map((blank, blankIndex) => {
                            const rawAnswers = answers[item.id];
                            const itemAnswers = Array.isArray(rawAnswers) ? rawAnswers : [];
                            const blankValue =
                              typeof itemAnswers[blankIndex] === "string" ? itemAnswers[blankIndex] : "";

                            return (
                              <label key={blank.id} className="block space-y-1">
                                <span className="block text-[11px] font-semibold text-slate-600">
                                  {blank.label}
                                </span>
                                <input
                                  value={blankValue}
                                  onChange={(e) =>
                                    setAnswers((prev) => {
                                      const prevRaw = prev[item.id];
                                      const prevItemAnswers: string[] = Array.isArray(prevRaw)
                                        ? prevRaw.filter((entry): entry is string => typeof entry === "string")
                                        : [];
                                      while (prevItemAnswers.length < item.blanks.length) {
                                        prevItemAnswers.push("");
                                      }
                                      prevItemAnswers[blankIndex] = e.target.value;
                                      return {
                                        ...prev,
                                        [item.id]: prevItemAnswers,
                                      };
                                    })
                                  }
                                  placeholder={blank.placeholder ?? ""}
                                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none ring-0 focus:border-fuchsia-300"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : item.type === "drag_drop" ? (
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold leading-snug text-slate-700">{item.prompt}</p>
                        <div className="flex flex-wrap gap-2">
                          {item.choices.map((choice) => {
                            const placements = asStringRecord(answers[item.id]);
                            const used = Object.values(placements).includes(choice.id);
                            return (
                              <button
                                key={choice.id}
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", choice.id);
                                  setDraggingChoiceId(choice.id);
                                }}
                                onDragEnd={() => setDraggingChoiceId(null)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                                  used
                                    ? "border-slate-200 bg-slate-100 text-slate-400"
                                    : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:border-fuchsia-300"
                                }`}
                              >
                                {choice.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-2">
                          {item.targets.map((target) => {
                            const placements = asStringRecord(answers[item.id]);
                            const choiceId = typeof placements[target.id] === "string" ? placements[target.id] : "";
                            const assignedChoice = item.choices.find((choice) => choice.id === choiceId);

                            return (
                              <div
                                key={target.id}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const droppedChoiceId = e.dataTransfer.getData("text/plain") || draggingChoiceId;
                                  if (droppedChoiceId) {
                                    assignDragChoice(item.id, target.id, droppedChoiceId);
                                  }
                                  setDraggingChoiceId(null);
                                }}
                                className="rounded-xl border border-dashed border-sky-200 bg-sky-50/70 p-2"
                              >
                                <div className="mb-2 text-[11px] font-semibold text-slate-600">{target.label}</div>
                                {assignedChoice ? (
                                  <div className="flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2">
                                    <span className="text-xs font-bold text-sky-700">{assignedChoice.label}</span>
                                    <button
                                      type="button"
                                      onClick={() => clearDragChoice(item.id, target.id)}
                                      className="text-[10px] font-bold text-red-500"
                                    >
                                      {t("assignmentWorksheetDragClearAction")}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-sky-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-400">
                                    {t("assignmentWorksheetDragDropHere")}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : item.type === "matching_pairs" ? (
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold leading-snug text-slate-700">{item.prompt}</p>
                        <div className="space-y-2">
                          {item.prompts.map((prompt) => {
                            const pairings = asStringRecord(answers[item.id]);
                            const selectedChoiceId =
                              typeof pairings[prompt.id] === "string" ? pairings[prompt.id] : "";

                            return (
                              <div key={prompt.id} className="space-y-1 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2">
                                <div className="text-[11px] font-semibold text-slate-700">{prompt.label}</div>
                                <select
                                  value={selectedChoiceId}
                                  onChange={(e) =>
                                    setAnswers((prev) => {
                                      const prevPairings = { ...asStringRecord(prev[item.id]) };
                                      prevPairings[prompt.id] = e.target.value;
                                      return {
                                        ...prev,
                                        [item.id]: prevPairings,
                                      };
                                    })
                                  }
                                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-fuchsia-300"
                                >
                                  <option value="">{t("assignmentWorksheetMatchingSelectChoice")}</option>
                                  {item.choices.map((choice) => (
                                    <option key={`${prompt.id}-${choice.id}`} value={choice.id}>
                                      {choice.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : item.type === "media_prompt" ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold leading-snug text-slate-700">{item.prompt}</p>
                        {item.mediaType === "video" ? (
                          <video
                            src={item.mediaUrl}
                            controls
                            className="max-h-32 w-full rounded-lg border border-slate-200 bg-black/5"
                          />
                        ) : (
                          <audio src={item.mediaUrl} controls className="w-full" />
                        )}
                        <input
                          value={typeof answers[item.id] === "string" ? String(answers[item.id]) : ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder={item.placeholder ?? ""}
                          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none ring-0 focus:border-fuchsia-300"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold leading-snug text-slate-700">{item.prompt}</p>
                        <div className="space-y-2">
                          {item.options.map((option, optionIndex) => {
                            const rawAnswers = answers[item.id];
                            const checklistAnswers = Array.isArray(rawAnswers) ? rawAnswers : [];
                            const checked = checklistAnswers[optionIndex] === true;

                            return (
                              <label
                                key={option.id}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setAnswers((prev) => {
                                      const prevRaw = prev[item.id];
                                      const nextAnswers: boolean[] = Array.isArray(prevRaw)
                                        ? prevRaw.map((entry) => entry === true)
                                        : Array.from({ length: item.options.length }, () => false);
                                      while (nextAnswers.length < item.options.length) {
                                        nextAnswers.push(false);
                                      }
                                      nextAnswers[optionIndex] = e.target.checked;
                                      return {
                                        ...prev,
                                        [item.id]: nextAnswers,
                                      };
                                    })
                                  }
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                <span>{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className={`h-12 rounded-xl px-8 font-bold text-white ${themeClass}`}
            style={themeStyle}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("worksheetSubmitting")}
              </>
            ) : (
              t("worksheetSubmitAction")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
