"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Eye, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/providers/language-provider";
import type { WorksheetItem } from "@/lib/worksheet-schema";
import { parseWorksheetDataFromAssignmentPayload } from "@/lib/worksheet-assignment";
import {
  parseWorksheetSubmissionContent,
  type WorksheetSubmissionContent,
  type WorksheetSubmissionItemResult,
} from "@/lib/worksheet-review";

type WorksheetAssignmentLike = {
  id: string;
  name: string;
  maxScore: number;
  quizData?: unknown;
};

type WorksheetSubmissionLike = {
  id: string;
  score: number;
  content: string | null;
  submittedAt: Date | string;
};

interface WorksheetSubmissionReviewDialogProps {
  classId: string;
  assignment: WorksheetAssignmentLike;
  studentName: string;
  submission: WorksheetSubmissionLike;
  triggerClassName?: string;
  pendingCountOverride?: number;
}

function renderAnswerValue(
  item: WorksheetItem,
  rawAnswer: unknown,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (item.type === "short_text" || item.type === "media_prompt") {
    return typeof rawAnswer === "string" && rawAnswer.trim().length > 0
      ? rawAnswer
      : t("worksheetReviewEmptyAnswer");
  }

  if (item.type === "file_upload" || item.type === "speaking") {
    return typeof rawAnswer === "string" && rawAnswer.trim().length > 0
      ? rawAnswer
      : t("worksheetReviewEmptyAnswer");
  }

  if (item.type === "multiple_choice") {
    const choice =
      typeof rawAnswer === "number" && rawAnswer >= 0 && rawAnswer < item.options.length
        ? item.options[rawAnswer]
        : null;
    return choice ?? t("worksheetReviewEmptyAnswer");
  }

  if (item.type === "fill_blank") {
    const answers = Array.isArray(rawAnswer) ? rawAnswer : [];
    return item.blanks.map((blank, index) => ({
      label: blank.label,
      value:
        typeof answers[index] === "string" && answers[index].trim().length > 0
          ? answers[index]
          : t("worksheetReviewEmptyAnswer"),
    }));
  }

  if (item.type === "drag_drop") {
    const placements =
      rawAnswer && typeof rawAnswer === "object" && !Array.isArray(rawAnswer)
        ? rawAnswer
        : {};
    return item.targets.map((target) => {
      const choiceId = typeof placements[target.id] === "string" ? placements[target.id] : "";
      const selected = item.choices.find((choice) => choice.id === choiceId)?.label;
      const expected = item.choices.find((choice) => choice.id === target.correctChoiceId)?.label;
      return {
        label: target.label,
        value: selected ?? t("worksheetReviewEmptyAnswer"),
        expected: expected ?? "",
      };
    });
  }

  if (item.type === "matching_pairs") {
    const pairings =
      rawAnswer && typeof rawAnswer === "object" && !Array.isArray(rawAnswer)
        ? rawAnswer
        : {};
    return item.prompts.map((prompt) => {
      const choiceId = typeof pairings[prompt.id] === "string" ? pairings[prompt.id] : "";
      const selected = item.choices.find((choice) => choice.id === choiceId)?.label;
      const expected = item.choices.find((choice) => choice.id === prompt.correctChoiceId)?.label;
      return {
        label: prompt.label,
        value: selected ?? t("worksheetReviewEmptyAnswer"),
        expected: expected ?? "",
      };
    });
  }

  if (item.type === "checklist") {
    const flags = Array.isArray(rawAnswer) ? rawAnswer : [];
    const selected = item.options
      .filter((_, index) => Boolean(flags[index]))
      .map((option) => option.label);
    return selected.length > 0 ? selected : [t("worksheetReviewEmptyAnswer")];
  }

  return t("worksheetReviewEmptyAnswer");
}

function getWorksheetItemTypeLabel(
  item: WorksheetItem,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  switch (item.type) {
    case "short_text":
      return t("assignmentWorksheetTypeShortText");
    case "multiple_choice":
      return t("assignmentWorksheetTypeMultipleChoice");
    case "fill_blank":
      return t("assignmentWorksheetTypeFillBlank");
    case "drag_drop":
      return t("assignmentWorksheetTypeDragDrop");
    case "matching_pairs":
      return t("assignmentWorksheetTypeMatchingPairs");
    case "media_prompt":
      return item.mediaType === "audio"
        ? t("assignmentWorksheetTypeAudioPrompt")
        : t("assignmentWorksheetTypeVideoPrompt");
    case "checklist":
      return t("assignmentWorksheetTypeChecklist");
    case "file_upload":
      return t("assignmentWorksheetTypeFileUpload");
    case "speaking":
      return t("assignmentWorksheetTypeSpeaking");
    default:
      return item.type;
  }
}

function ItemResultBadge({
  result,
  t,
}: {
  result: WorksheetSubmissionItemResult | undefined;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!result) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
        <CircleDashed className="h-3.5 w-3.5" />
        {t("worksheetReviewStatusUnknown")}
      </span>
    );
  }

  if (result.needsReview) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        <CircleDashed className="h-3.5 w-3.5" />
        {t("worksheetReviewStatusPending")}
      </span>
    );
  }

  if (result.correct) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("worksheetReviewStatusCorrect")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
      <XCircle className="h-3.5 w-3.5" />
      {t("worksheetReviewStatusIncorrect")}
    </span>
  );
}

export function WorksheetSubmissionReviewDialog({
  classId,
  assignment,
  studentName,
  submission,
  triggerClassName,
  pendingCountOverride,
}: WorksheetSubmissionReviewDialogProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reviewState, setReviewState] = useState<WorksheetSubmissionContent | null>(null);
  const [submissionScore, setSubmissionScore] = useState(submission.score);
  const [manualScores, setManualScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const worksheet = useMemo(
    () => parseWorksheetDataFromAssignmentPayload(assignment.quizData),
    [assignment.quizData]
  );
  const review = useMemo(
    () => parseWorksheetSubmissionContent(submission.content),
    [submission.content]
  );

  useEffect(() => {
    setReviewState(review);
    setSubmissionScore(submission.score);
  }, [review, submission.score]);

  useEffect(() => {
    if (!reviewState) {
      setManualScores({});
      return;
    }
    setManualScores(
      Object.fromEntries(
        reviewState.itemResults
          .filter((item) => item.needsReview)
          .map((item) => [item.itemId, String(item.score)])
      )
    );
  }, [reviewState]);

  const itemResultMap = useMemo(() => {
    return new Map((reviewState?.itemResults ?? []).map((item) => [item.itemId, item]));
  }, [reviewState?.itemResults]);

  const pendingCount = useMemo(() => {
    return reviewState?.itemResults.filter((item) => item.needsReview).length ?? 0;
  }, [reviewState?.itemResults]);

  const submittedAt = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(submission.submittedAt));

  const saveManualReview = async () => {
    const payload = Object.fromEntries(
      Object.entries(manualScores).map(([itemId, raw]) => [itemId, Number(raw || 0)])
    );

    setSaving(true);
    try {
      const response = await fetch(
        `/api/classrooms/${classId}/assignments/${assignment.id}/worksheet/submissions/${submission.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemScores: payload }),
        }
      );

      if (!response.ok) {
        throw new Error("save_failed");
      }

      const updated = (await response.json()) as { score: number; content: string };
      const parsed = parseWorksheetSubmissionContent(updated.content);
      if (parsed) {
        setReviewState(parsed);
      }
      setSubmissionScore(updated.score);
    } finally {
      setSaving(false);
    }
  };

  if (!worksheet || !reviewState) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className={triggerClassName}>
        <Eye className="mr-1 h-4 w-4" />
        {t("worksheetReviewOpenAction")}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClassName}
          aria-label={t("worksheetReviewOpenForStudentAction", { student: studentName })}
        >
          <Eye className="mr-1 h-4 w-4" />
          {t("worksheetReviewOpenAction")}
          {(pendingCountOverride ?? pendingCount) > 0 ? (
            <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
              {pendingCountOverride ?? pendingCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
        <DialogContent
          className="flex max-h-[90vh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0"
          aria-describedby="worksheet-review-summary"
        >
        <DialogHeader className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <DialogTitle className="text-xl font-black text-slate-900">
            {t("worksheetReviewTitle")}
          </DialogTitle>
          <DialogDescription id="worksheet-review-summary" className="text-sm text-slate-600">
            {t("worksheetReviewSubtitle", {
              assignment: assignment.name,
              student: studentName,
            })}
          </DialogDescription>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">
              {t("worksheetReviewScorePill", {
                current: submissionScore,
                max: assignment.maxScore,
              })}
            </span>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">
              {t("worksheetReviewSubmittedAt", { date: submittedAt })}
            </span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
              {t("worksheetReviewPagesPill", { count: worksheet.pages.length })}
            </span>
            {pendingCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                {t("worksheetReviewPendingPill", { count: pendingCount })}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-100 px-4 py-4 sm:px-6">
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {saving ? t("worksheetReviewSavingAction") : ""}
          </div>
          {worksheet.pages.map((page, pageIndex) => (
            <section
              key={page.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {t("worksheetReviewPageTitle", { count: pageIndex + 1 })}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {t("worksheetReviewItemsPill", { count: page.items.length })}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {page.width} x {page.height}
                  </span>
                </div>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="relative aspect-[3/4] w-full">
                    <Image
                      src={page.backgroundUrl}
                      alt={t("assignmentWorksheetPreviewImageAlt")}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {page.items.map((item, itemIndex) => {
                    const result = itemResultMap.get(item.id);
                    const answer = renderAnswerValue(item, reviewState.answers[item.id], t);

                    return (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {t("assignmentWorksheetItemLabel", { count: itemIndex + 1 })}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              {getWorksheetItemTypeLabel(item, t)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ItemResultBadge result={result} t={t} />
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                              {t("worksheetReviewScorePill", {
                                current: result?.score ?? 0,
                                max: result?.maxScore ?? 0,
                              })}
                            </span>
                          </div>
                        </div>

                        {"label" in item && typeof item.label === "string" ? (
                          <p className="mb-2 text-sm font-semibold text-slate-700">{item.label}</p>
                        ) : null}
                        {"prompt" in item && typeof item.prompt === "string" ? (
                          <p className="mb-2 text-sm font-semibold text-slate-700">{item.prompt}</p>
                        ) : null}

                        {item.type === "media_prompt" ? (
                          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                            {item.mediaType === "audio" ? (
                              <audio controls className="w-full" src={item.mediaUrl} />
                            ) : (
                              <video controls className="max-h-56 w-full rounded-xl" src={item.mediaUrl} />
                            )}
                          </div>
                        ) : item.type === "speaking" && typeof answer === "string" && answer !== t("worksheetReviewEmptyAnswer") ? (
                          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                            <audio controls className="w-full" src={answer} />
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          {typeof answer === "string" ? (
                            (item.type === "file_upload" || item.type === "speaking") &&
                            answer !== t("worksheetReviewEmptyAnswer") ? (
                              <a
                                href={answer}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 underline-offset-2 hover:underline"
                              >
                                {item.type === "file_upload"
                                  ? t("worksheetReviewOpenUploadedFile")
                                  : t("worksheetReviewOpenUploadedAudio")}
                              </a>
                            ) : (
                              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                                {answer}
                              </div>
                            )
                          ) : Array.isArray(answer) && answer.every((entry) => typeof entry === "string") ? (
                            <div className="flex flex-wrap gap-2">
                              {answer.map((entry, index) => (
                                <span
                                  key={`${item.id}-${index}`}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                                >
                                  {entry}
                                </span>
                              ))}
                            </div>
                          ) : Array.isArray(answer) ? (
                            <div className="space-y-2">
                              {answer.map((entry, index) => (
                                <div
                                  key={`${item.id}-${index}`}
                                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
                                >
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    {entry.label}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-slate-800">
                                    {entry.value}
                                  </p>
                                  {"expected" in entry && entry.expected ? (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {t("worksheetReviewExpectedPrefix")} {entry.expected}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        {result?.needsReview ? (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-amber-900">
                                {t("worksheetReviewManualLabel")}
                              </p>
                              <span className="text-xs font-semibold text-amber-700">
                                {t("worksheetReviewManualHint", { max: result.maxScore })}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={result.maxScore}
                                value={manualScores[item.id] ?? String(result.score)}
                                onChange={(event) =>
                                  setManualScores((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                className="h-10 w-28 rounded-xl border border-amber-300 bg-white px-3 text-sm font-semibold text-slate-800"
                              />
                              <Button type="button" size="sm" onClick={saveManualReview} disabled={saving}>
                                {saving ? t("worksheetReviewSavingAction") : t("worksheetReviewSaveAction")}
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-4">
                          <div className="rounded-xl bg-white px-3 py-2">X {item.x}%</div>
                          <div className="rounded-xl bg-white px-3 py-2">Y {item.y}%</div>
                          <div className="rounded-xl bg-white px-3 py-2">W {item.width}%</div>
                          <div className="rounded-xl bg-white px-3 py-2">H {item.height}%</div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
