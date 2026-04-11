"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Trophy, BookOpen, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuizIntegrity } from "@/hooks/use-quiz-integrity";
import type { QuizReviewMode } from "@/lib/quiz-review-policy";
import { useLanguage } from "@/components/providers/language-provider";
import { getLocalizedMessageFromApiErrorBody } from "@/lib/ui-error-messages";
import { formatQuizLoadPlainError } from "@/lib/quiz-load-error-messages";

type QuestionSlice = { id: string; question: string; options: string[] };

interface QuizClientProps {
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
  reviewMode: QuizReviewMode;
}

export function QuizClient({
  assignment,
  classId,
  studentCode,
  themeClass,
  themeStyle,
  reviewMode,
}: QuizClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [total, setTotal] = useState(0);
  const [slide, setSlide] = useState<QuestionSlice | null>(null);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ score: number; correct?: number; total?: number } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [checking, setChecking] = useState(false);

  const integrityActive = !showResult;
  const { getPayload } = useQuizIntegrity(integrityActive);

  useEffect(() => {
    setShowExplain(false);
  }, [currentQ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setQuestionLoading(true);
      setLoadError(null);
      try {
        const qs = new URLSearchParams({
          studentCode,
          index: String(currentQ),
        });
        const res = await fetch(
          `/api/classrooms/${classId}/assignments/${assignment.id}/question?${qs.toString()}`
        );
        if (!res.ok) {
          const ct = res.headers.get("content-type") ?? "";
          let errMessage = t("quizLoadFailed");
          if (ct.includes("application/json")) {
            try {
              const body = (await res.json()) as unknown;
              errMessage = getLocalizedMessageFromApiErrorBody(body, t, {
                fallbackTranslationKey: "quizLoadFailed",
              });
            } catch {
              errMessage = formatQuizLoadPlainError(`HTTP ${res.status}`, t);
            }
          } else {
            const text = await res.text();
            errMessage = formatQuizLoadPlainError(text || `HTTP ${res.status}`, t);
          }
          throw new Error(errMessage);
        }
        const data = (await res.json()) as {
          total: number;
          question: QuestionSlice;
        };
        if (cancelled) return;
        setTotal(data.total);
        setSlide(data.question);
        setAnswers((prev) => (prev.length === data.total ? prev : new Array(data.total).fill(-1)));
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t("quizLoadFailed"));
          setSlide(null);
        }
      } finally {
        if (!cancelled) setQuestionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, assignment.id, studentCode, currentQ, fetchNonce, t]);

  const isLastQ = total > 0 && currentQ === total - 1;
  const progress = total > 0 ? ((currentQ + 1) / total) * 100 : 0;

  const selectOption = useCallback(
    async (idx: number) => {
      if (answers[currentQ] !== -1 || checking || !slide || questionLoading) return;
      setChecking(true);
      try {
        const res = await fetch(
          `/api/classrooms/${classId}/assignments/${assignment.id}/check-answer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentCode,
              questionIndex: currentQ,
              selectedIndex: idx,
            }),
          }
        );
        if (!res.ok) return;
        setAnswers((prev) => {
          const next = [...prev];
          next[currentQ] = idx;
          return next;
        });
        setShowExplain(true);
      } finally {
        setChecking(false);
      }
    },
    [answers, checking, slide, questionLoading, classId, assignment.id, studentCode, currentQ]
  );

  async function submitQuiz() {
    const unanswered = answers.some((a) => a < 0);
    if (unanswered) {
      setLoadError(t("quizAnswerAllBeforeSubmit"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/assignments/${assignment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode,
          answers,
          integrity: getPayload(),
        }),
      });
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        const msg = getLocalizedMessageFromApiErrorBody(data, t, {
          fallbackTranslationKey: "quizSubmitFailed",
        });
        setLoadError(msg);
        return;
      }
      const payload = data as {
        score: number;
        correct?: number;
        total?: number;
      };
      setResult({
        score: payload.score,
        correct: typeof payload.correct === "number" ? payload.correct : undefined,
        total: typeof payload.total === "number" ? payload.total : undefined,
      });
      setShowResult(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    setShowExplain(false);
    if (!isLastQ) {
      setCurrentQ((p) => p + 1);
      return;
    }
    await submitQuiz();
  }

  if (showResult && result) {
    const showBreakdown = reviewMode === "end_only" && typeof result.correct === "number" && typeof result.total === "number";
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl duration-300 animate-in zoom-in-95">
          <div
            className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-white ${themeClass}`}
            style={themeStyle}
          >
            <Trophy className="h-12 w-12" />
          </div>
          <h1 className="mb-1 text-2xl font-black text-slate-800">{t("quizCompleteTitle")}</h1>
          <p className="mb-6 text-slate-400">{assignment.name}</p>

          <div className={`mb-6 rounded-2xl p-6 text-white ${themeClass}`} style={themeStyle}>
            <p className="text-sm text-white/70">{t("quizScoreLabel")}</p>
            <p className="text-6xl font-black">{result.score}</p>
            <p className="text-sm text-white/70">/ {assignment.maxScore}</p>
          </div>

          {showBreakdown ? (
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                <p className="text-2xl font-black text-green-600">{result.correct}</p>
                <p className="text-xs text-green-500">{t("quizCorrectLabel")}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-2xl font-black text-red-500">{(result.total ?? 0) - (result.correct ?? 0)}</p>
                <p className="text-xs text-red-400">{t("quizWrongLabel")}</p>
              </div>
            </div>
          ) : (
            <p className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {t("quizNoBreakdownNote")}
            </p>
          )}

          <Button
            onClick={() => router.back()}
            className={`h-12 w-full rounded-xl font-bold text-white ${themeClass}`}
            style={themeStyle}
          >
            {t("quizBackToMine")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={`px-6 py-4 ${themeClass}`} style={themeStyle}>
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <BookOpen className="h-5 w-5" />
            <span className="font-bold">{assignment.name}</span>
          </div>
          <span className="text-sm font-semibold text-white/80">{total > 0 ? `${currentQ + 1} / ${total}` : "—"}</span>
        </div>
        <div className="mx-auto mt-3 max-w-2xl">
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm leading-snug text-amber-950 shadow-sm" role="note">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <p>
            <span className="font-bold">{t("quizIntegrityLabel")}</span>
            {t("quizIntegrityBody")}
          </p>
        </div>
        {assignment.description?.trim() ? (
          <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm leading-relaxed text-slate-600 shadow-sm">
            {assignment.description.trim()}
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="mb-4 font-bold text-red-800">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLoadError(null);
                setFetchNonce((n) => n + 1);
              }}
            >
              {t("quizRetry")}
            </Button>
          </div>
        ) : questionLoading || !slide ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm font-semibold">{t("quizLoading")}</p>
          </div>
        ) : (
          <>
            <div className="mb-5 select-none rounded-3xl border border-slate-100 bg-white p-6 shadow-md duration-300 animate-in slide-in-from-right-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("quizQuestionN", { n: currentQ + 1 })}</p>
              <h2 className="text-xl font-bold leading-relaxed text-slate-800">{slide.question}</h2>
            </div>

            <div className="select-none space-y-3">
              {slide.options.map((opt, idx) => {
                const answered = answers[currentQ] !== -1;
                const isSelected = answers[currentQ] === idx;
                const cardClass = answered
                  ? isSelected
                    ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                    : "bg-white border-slate-100 text-slate-400 cursor-default"
                  : "bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:shadow-md cursor-pointer";

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectOption(idx)}
                    disabled={answered || checking}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${cardClass}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-semibold">{opt}</span>
                  </button>
                );
              })}
            </div>

            {showExplain && (
              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  onClick={() => handleNext()}
                  disabled={submitting}
                  className={`h-12 rounded-xl px-8 font-bold text-white ${themeClass}`}
                  style={themeStyle}
                >
                  {isLastQ ? (
                    submitting ? t("quizSaving") : t("quizSubmitAnswers")
                  ) : (
                    <>
                      {t("quizNextQuestion")} <ChevronRight className="ml-1 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

