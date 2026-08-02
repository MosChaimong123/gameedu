"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { OMRScanner } from "@/components/omr/omr-scanner";
import { Button } from "@/components/ui/button";
import { PageBackLink } from "@/components/ui/page-back-link";
import { OpenCVProvider } from "@/components/omr/opencv-provider";
import { processOMR, type OmrProcessResult } from "@/lib/omr-logic";
import type { OmrDetectedAnswer, OmrGradedAnswer } from "@/lib/omr-grading";
import {
  OMR_OPTION_LABELS_TH,
  OMR_OPTION_VALUES,
  OMR_QUESTION_COUNT,
  isOmrStudentCode,
  type OmrOptionValue,
} from "@/lib/omr-template";
import { getLocalizedOmrErrorMessageFromResponse } from "@/lib/omr-ui-messages";
import { tryLocalizeFetchNetworkFailureMessage } from "@/lib/ui-error-messages";
import { useLanguage } from "@/components/providers/language-provider";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { isOmrDashboardEnabled } from "@/lib/omr-dashboard-enabled";
import { parseOmrScannerQaFlags } from "@/lib/omr-scanner-fallbacks";

type OMRQuizSet = {
  id: string;
  title: string;
  questionCount: number;
  classId: string | null;
  classroom?: { id: string; name: string } | null;
};

type SavedGrading = {
  score: number;
  total: number;
  studentName: string;
  studentCode: string;
  answers: OmrGradedAnswer[];
};

const QA_PROCESS_SUCCESS_DATA: OmrDetectedAnswer[] = Array.from(
  { length: OMR_QUESTION_COUNT },
  (_, index) => ({
    question: index + 1,
    answer: "A",
    confidence: 1,
    ambiguous: false,
  })
);

function optionLabel(value: OmrOptionValue | null) {
  if (!value) return "-";
  const index = OMR_OPTION_VALUES.indexOf(value);
  return OMR_OPTION_LABELS_TH[index] ?? value;
}

export default function OMRInferencePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, language } = useLanguage();
  const [showScanner, setShowScanner] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processResult, setProcessResult] = useState<OmrProcessResult | null>(null);
  const [selectedSet, setSelectedSet] = useState<OMRQuizSet | null>(null);
  const [answers, setAnswers] = useState<OmrDetectedAnswer[]>([]);
  const [studentCode, setStudentCode] = useState("");
  const [savedGrading, setSavedGrading] = useState<SavedGrading | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const omrEnabled = isOmrDashboardEnabled();

  useEffect(() => {
    if (!omrEnabled) router.replace("/dashboard");
  }, [omrEnabled, router]);

  useEffect(() => {
    if (status === "authenticated" && !isTeacherOrAdmin(session.user.role)) {
      router.replace("/dashboard");
    }
  }, [router, session, status]);

  useEffect(() => {
    if (!omrEnabled || status !== "authenticated" || !isTeacherOrAdmin(session.user.role)) {
      return;
    }
    const quizId = new URLSearchParams(window.location.search).get("quizId");
    if (!quizId) {
      setProcessResult({ success: false, messageKey: "omrProcessingError" });
      return;
    }

    fetch(`/api/omr/quizzes/${quizId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await getLocalizedOmrErrorMessageFromResponse(
              response,
              "omrLoadQuizError",
              t,
              language
            )
          );
        }
        return response.json();
      })
      .then((data: OMRQuizSet) => {
        if (data.questionCount !== OMR_QUESTION_COUNT || !data.classId) {
          throw new Error(t("omrErrInvalidPayload"));
        }
        setSelectedSet(data);
        setShowScanner(true);
      })
      .catch((error: unknown) => {
        const raw = error instanceof Error ? error.message : null;
        const networkMessage = tryLocalizeFetchNetworkFailureMessage(raw, t);
        setSaveError(networkMessage ?? raw ?? t("omrLoadQuizError"));
      });
  }, [session, status, language, t, omrEnabled]);

  const applyProcessResult = (result: OmrProcessResult) => {
    setProcessResult(result);
    setSavedGrading(null);
    setSaveError(null);
    if (!result.success) {
      setAnswers([]);
      setStudentCode("");
      return;
    }
    setAnswers(result.data.map((answer) => ({ ...answer })));
    setStudentCode(result.studentCode ?? "");
  };

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setShowScanner(false);
    setIsProcessing(true);
    setProcessResult(null);
    setSavedGrading(null);
    setSaveError(null);

    const qaFlags = parseOmrScannerQaFlags(window.location.search);
    if (qaFlags.forceProcessSuccess) {
      applyProcessResult({
        success: true,
        messageKey: "omrProcessReadyForReview",
        data: QA_PROCESS_SUCCESS_DATA.map((answer) => ({ ...answer })),
        studentCode: "00001",
        studentCodeConfidence: 1,
        ambiguousQuestions: [],
      });
      setIsProcessing(false);
      return;
    }

    const image = new window.Image();
    image.src = imageData;
    image.onload = async () => {
      try {
        // @ts-expect-error window.cv is injected by the OpenCV script at runtime
        applyProcessResult(await processOMR(window.cv, image));
      } catch {
        applyProcessResult({ success: false, messageKey: "omrProcessingError" });
      } finally {
        setIsProcessing(false);
      }
    };
    image.onerror = () => {
      applyProcessResult({ success: false, messageKey: "omrProcessingError" });
      setIsProcessing(false);
    };
  };

  const updateAnswer = (question: number, answer: string) => {
    setAnswers((current) =>
      current.map((item) =>
        item.question === question
          ? {
              ...item,
              answer: answer === "" ? null : (answer as OmrOptionValue),
              confidence: 1,
              ambiguous: false,
            }
          : item
      )
    );
  };

  const saveResult = async () => {
    if (!selectedSet || !isOmrStudentCode(studentCode) || answers.length !== OMR_QUESTION_COUNT) {
      setSaveError(t("omrProcessStudentCodeUnclear"));
      return;
    }
    if (answers.some((answer) => answer.ambiguous)) {
      setSaveError(t("omrAmbiguousCount", { count: answers.filter((answer) => answer.ambiguous).length }));
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const qaFlags = parseOmrScannerQaFlags(window.location.search);
      if (qaFlags.forceSaveResultError) {
        throw new Error(t("omrSaveResultError"));
      }
      const response = await fetch(`/api/omr/quizzes/${selectedSet.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode, answers }),
      });
      if (!response.ok) {
        throw new Error(
          await getLocalizedOmrErrorMessageFromResponse(
            response,
            "omrSaveResultError",
            t,
            language
          )
        );
      }
      const payload = (await response.json()) as { grading: SavedGrading };
      setSavedGrading(payload.grading);
    } catch (error) {
      const raw = error instanceof Error ? error.message : null;
      setSaveError(
        tryLocalizeFetchNetworkFailureMessage(raw, t) ?? raw ?? t("omrSaveResultError")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const scanNext = () => {
    setCapturedImage(null);
    setProcessResult(null);
    setAnswers([]);
    setStudentCode("");
    setSavedGrading(null);
    setSaveError(null);
    setShowScanner(true);
  };

  if (status === "loading" || !omrEnabled) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
      </div>
    );
  }
  if (status === "authenticated" && !isTeacherOrAdmin(session.user.role)) return null;

  const ambiguousCount = answers.filter((answer) => answer.ambiguous).length;
  const reviewAnswers = savedGrading?.answers ?? answers;

  return (
    <OpenCVProvider>
      <div className="flex min-h-[calc(100dvh-6rem)] w-full flex-col items-center rounded-2xl bg-slate-950 p-4 md:p-8">
        <div className="w-full max-w-6xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <PageBackLink href="/dashboard/omr" labelKey="navBackOmr" variant="inverse" />
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  {t("omrScannerTitle")}
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-sky">
                  {selectedSet
                    ? t("omrScannerChecking", { title: selectedSet.title })
                    : t("omrScannerWait")}
                </p>
              </div>
            </div>
            {selectedSet ? (
              <Button
                onClick={scanNext}
                className="h-12 rounded-2xl bg-white px-6 font-black text-slate-900 hover:bg-brand-purple hover:text-white"
              >
                <Camera className="mr-2 h-5 w-5" />
                {t("omrScannerScanNext")}
              </Button>
            ) : null}
          </header>

          {saveError && !capturedImage ? (
            <StatusBanner success={false} message={saveError} />
          ) : null}

          {capturedImage ? (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="relative self-start">
                <Image
                  src={capturedImage}
                  alt={t("omrCapturedSheetAlt")}
                  width={1000}
                  height={1414}
                  unoptimized
                  className="aspect-[1/1.414] w-full rounded-[2rem] border-4 border-white/5 bg-black object-contain shadow-2xl"
                />
                {isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[2rem] bg-black/80 text-white backdrop-blur-md">
                    <Loader2 className="mb-4 h-12 w-12 animate-spin text-brand-sky" />
                    <p className="text-xl font-black">{t("omrScannerProcessing")}</p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-5">
                {processResult ? (
                  <StatusBanner
                    success={processResult.success}
                    message={t(processResult.messageKey)}
                  />
                ) : null}

                {processResult?.success ? (
                  <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 text-white sm:p-7"
                  >
                    <div className="mb-5 flex items-start gap-3">
                      <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-brand-sky" />
                      <div>
                        <h2 className="text-xl font-black">{t("omrReviewTitle")}</h2>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-white/50">
                          {t("omrReviewHint")}
                        </p>
                      </div>
                    </div>

                    {savedGrading ? (
                      <div className="mb-6 rounded-[2rem] bg-gradient-to-br from-brand-purple to-brand-navy p-7 text-center shadow-xl">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
                          {t("omrDetectedStudent", { name: savedGrading.studentName })}
                        </p>
                        <p className="mt-3 text-6xl font-black tabular-nums">
                          {savedGrading.score}
                          <span className="text-2xl text-white/40">/{savedGrading.total}</span>
                        </p>
                        <p className="mt-2 text-sm font-bold text-white/70">
                          {t("omrScannerDataSaved")}
                        </p>
                      </div>
                    ) : (
                      <>
                        <label className="block text-xs font-black uppercase tracking-widest text-white/55">
                          {t("omrStudentCodeLabel")}
                          <input
                            value={studentCode}
                            onChange={(event) =>
                              setStudentCode(event.target.value.replace(/\D/g, "").slice(0, 5))
                            }
                            inputMode="numeric"
                            maxLength={5}
                            placeholder={t("omrStudentCodePlaceholder")}
                            className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-xl font-black tracking-[0.35em] text-white outline-none focus:border-brand-sky"
                          />
                        </label>
                        {ambiguousCount > 0 ? (
                          <p className="mt-3 text-sm font-black text-amber-300">
                            {t("omrAmbiguousCount", { count: ambiguousCount })}
                          </p>
                        ) : null}
                      </>
                    )}

                    <div className="mt-6 max-h-[32rem] overflow-auto rounded-2xl bg-black/15 p-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {reviewAnswers.map((item) => (
                          <div
                            key={item.question}
                            className={`rounded-xl border p-2 text-center ${
                              "isCorrect" in item
                                ? item.isCorrect
                                  ? "border-emerald-400/30 bg-emerald-400/10"
                                  : "border-red-400/30 bg-red-400/10"
                                : item.ambiguous
                                  ? "border-amber-300/50 bg-amber-300/10"
                                  : "border-white/10 bg-white/5"
                            }`}
                          >
                            <span className="text-[10px] font-black text-white/40">
                              Q{item.question}
                            </span>
                            {savedGrading ? (
                              <div className="mt-1 text-xl font-black">
                                {optionLabel(item.answer)}
                              </div>
                            ) : (
                              <select
                                aria-label={`Q${item.question}`}
                                value={item.answer ?? ""}
                                onChange={(event) =>
                                  updateAnswer(item.question, event.target.value)
                                }
                                className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-slate-900 px-1 text-center text-base font-black text-white"
                              >
                                <option value="">-</option>
                                {OMR_OPTION_VALUES.map((value, index) => (
                                  <option key={value} value={value}>
                                    {OMR_OPTION_LABELS_TH[index]}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {!savedGrading ? (
                      <Button
                        onClick={saveResult}
                        disabled={
                          isSaving ||
                          !isOmrStudentCode(studentCode) ||
                          ambiguousCount > 0
                        }
                        className="mt-6 h-14 w-full rounded-2xl bg-brand-sky font-black text-slate-950 hover:bg-white"
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-5 w-5" />
                        )}
                        {isSaving ? t("omrSavingResult") : t("omrConfirmSave")}
                      </Button>
                    ) : null}
                    {saveError ? (
                      <p className="mt-3 text-center text-sm font-bold text-red-300">
                        {saveError}
                      </p>
                    ) : null}
                  </motion.section>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-white/25">
              <div className="mb-7 flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-current">
                <Camera className="h-11 w-11" />
              </div>
              <h2 className="text-3xl font-black">{t("omrScannerNoScanYet")}</h2>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em]">
                {t("omrAwaitingCapture")}
              </p>
            </div>
          )}
        </div>

        {showScanner ? (
          <OMRScanner
            onCapture={handleCapture}
            onClose={() => setShowScanner(false)}
          />
        ) : null}
      </div>
    </OpenCVProvider>
  );
}

function StatusBanner({ success, message }: { success: boolean; message: string }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-[1.5rem] border p-5 ${
        success
          ? "border-emerald-400/20 bg-emerald-400/10"
          : "border-red-400/20 bg-red-400/10"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          success ? "bg-emerald-500" : "bg-red-500"
        }`}
      >
        {success ? (
          <CheckCircle2 className="h-6 w-6 text-white" />
        ) : (
          <AlertCircle className="h-6 w-6 text-white" />
        )}
      </div>
      <p className={`text-sm font-bold ${success ? "text-emerald-200" : "text-red-200"}`}>
        {message}
      </p>
    </div>
  );
}
