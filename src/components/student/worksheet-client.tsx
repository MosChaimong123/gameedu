"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import type {
  StudentWorksheetPage,
  WorksheetStudentAnswers,
} from "@/lib/worksheet-schema";
import { TeachingMediaReferenceList } from "@/components/media/teaching-media-reference-list";
import type { TeachingMediaReference } from "@/lib/teaching-media-reference";
import { WorksheetStudentPageRenderer } from "@/components/worksheet/worksheet-student-page-renderer";

function asDragDropRecord(value: unknown): Record<string, string | string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, string | string[]>;
}

function asStringRecord(value: unknown): Record<string, string> {
  const record = asDragDropRecord(value);
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

interface WorksheetClientProps {
  assignment: {
    id: string;
    name: string;
    maxScore: number;
    description?: string | null;
    mediaReferences?: TeachingMediaReference[];
  };
  classId: string;
  studentCode: string;
  themeClass: string;
  themeStyle: React.CSSProperties;
  showScoreToStudent: boolean;
  allowResubmit: boolean;
  hasPreviousSubmission: boolean;
  pages: StudentWorksheetPage[];
}

export function WorksheetClient({
  assignment,
  classId,
  studentCode,
  themeClass,
  themeStyle,
  showScoreToStudent,
  allowResubmit,
  hasPreviousSubmission,
  pages,
}: WorksheetClientProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<WorksheetStudentAnswers>({});
  const [draggingChoiceId, setDraggingChoiceId] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; maxScore: number; expBonus: number } | null>(null);

  const allItems = pages.flatMap((page) => page.items);
  const activePage = pages[activePageIndex] ?? pages[0];
  const statusMessage = loadError;

  const hasUnanswered = allItems.some((item) => {
    const value = answers[item.id];
    if (item.type === "short_text") {
      return typeof value !== "string" || value.trim().length === 0;
    }
    if (item.type === "multiple_choice") {
      return typeof value !== "number";
    }
    if (item.type === "drag_drop") {
      const placements = asDragDropRecord(value);
      return item.targets.some((target) => {
        const expectedCount = target.acceptedChoiceIds?.length ?? 1;
        const placement = placements[target.id];
        const placedChoiceIds = Array.isArray(placement)
          ? placement
          : typeof placement === "string" && placement.trim().length > 0
            ? [placement]
            : [];
        return placedChoiceIds.length < expectedCount;
      });
    }
    if (item.type === "drag_select") {
      const selected = typeof value === "string" ? value.trim() : "";
      return selected.length === 0;
    }
    if (item.type === "matching_pairs") {
      const pairings = asStringRecord(value);
      return item.prompts.some((prompt) => typeof pairings[prompt.id] !== "string" || pairings[prompt.id].trim().length === 0);
    }
    if (item.type === "word_search") {
      // Students may submit with however many words they managed to find.
      return false;
    }
    return false;
  });

  function assignDragChoice(itemId: string, targetId: string, choiceId: string) {
    setAnswers((prev) => {
      const currentPlacements = { ...asDragDropRecord(prev[itemId]) };

      for (const [placementTargetId, placementValue] of Object.entries(currentPlacements)) {
        const placementChoiceIds = Array.isArray(placementValue) ? placementValue : [placementValue];
        const nextChoiceIds = placementChoiceIds.filter((entry) => entry !== choiceId);
        if (nextChoiceIds.length === 0) {
          delete currentPlacements[placementTargetId];
        } else {
          currentPlacements[placementTargetId] =
            Array.isArray(placementValue) ? nextChoiceIds : nextChoiceIds[0];
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
      const currentPlacements = { ...asDragDropRecord(prev[itemId]) };
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
        | { score: number; maxScore: number; showScoreToStudent: boolean; expBonus?: number }
        | { message?: string };
      if (!res.ok) {
        setLoadError(t("worksheetSubmitFailed"));
        return;
      }
      if ("score" in payload && payload.showScoreToStudent) {
        setResult({ score: payload.score, maxScore: payload.maxScore, expBonus: payload.expBonus ?? 0 });
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
          {result.expBonus > 0 ? (
            <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700">
              {t("worksheetExpRewardLabel", { amount: result.expBonus })}
            </div>
          ) : null}
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
    <main className="min-h-screen bg-slate-50" aria-labelledby="worksheet-title">
      <div className={`px-6 py-4 ${themeClass}`} style={themeStyle}>
        <div className="mx-auto flex max-w-5xl items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h1 id="worksheet-title" className="font-bold">{assignment.name}</h1>
          </div>
          <span className="text-sm font-semibold text-white/80">
            {t("worksheetItemsCount", { count: allItems.length })}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage ?? ""}
        </div>

        {assignment.description?.trim() ? (
          <section
            aria-labelledby="worksheet-description-title"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm"
          >
            <h2 id="worksheet-description-title" className="sr-only">
              {t("worksheetDescriptionLabel")}
            </h2>
            {assignment.description.trim()}
          </section>
        ) : null}

        <TeachingMediaReferenceList references={assignment.mediaReferences} />

        {allowResubmit && hasPreviousSubmission ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm">
            {t("worksheetResubmitNotice")}
          </div>
        ) : null}

        <nav
          aria-label={t("worksheetPageNavigationLabel")}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("worksheetPageTabsLabel")}>
            {pages.map((page, index) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePageIndex(index)}
                role="tab"
                aria-selected={index === activePageIndex}
                aria-current={index === activePageIndex ? "page" : undefined}
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
              aria-label={t("worksheetPreviousPageAction")}
              onClick={() => setActivePageIndex((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={activePageIndex >= pages.length - 1}
              aria-label={t("worksheetNextPageAction")}
              onClick={() => setActivePageIndex((current) => Math.min(pages.length - 1, current + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>

        {activePage ? (
          <section
            key={activePage.id}
            aria-labelledby={`worksheet-page-title-${activePage.id}`}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"
          >
            <div
              id={`worksheet-page-title-${activePage.id}`}
              className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-600"
            >
              {t("worksheetPageLabel", { count: activePage.pageNumber })}
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePage.backgroundUrl}
                alt={`Worksheet page ${activePage.pageNumber}`}
                className="block w-full"
              />
              <WorksheetStudentPageRenderer
                className="absolute inset-0"
                page={activePage}
                answers={answers}
                setAnswers={setAnswers}
                draggingChoiceId={draggingChoiceId}
                setDraggingChoiceId={setDraggingChoiceId}
                assignDragChoice={assignDragChoice}
                clearDragChoice={clearDragChoice}
                t={t}
              />
            </div>
          </section>
        ) : null}

        {loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
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
    </main>
  );
}
