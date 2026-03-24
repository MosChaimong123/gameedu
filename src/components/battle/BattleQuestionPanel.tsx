"use client";

import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CurrentQuestion = {
  id: string;
  question: string;
  options: string[];
  image?: string;
} | null;

type Feedback = { correct: boolean } | null;

type BattleQuestionPanelProps = {
  question: CurrentQuestion;
  feedback: Feedback;
  onAnswer: (index: number) => void;
  accent: "boss" | "farming";
  reducedMotion?: boolean;
};

export function BattleQuestionPanel({
  question,
  feedback,
  onAnswer,
  accent,
  reducedMotion = false,
}: BattleQuestionPanelProps) {
  return (
    <div className="relative w-full max-w-3xl">
      <AnimatePresence mode="wait">
        {feedback ? (
          <motion.div
            key={`feedback-${feedback.correct ? "ok" : "bad"}`}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 14 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -16 }}
            className={cn(
              "flex min-h-[260px] items-center justify-center rounded-[30px] border px-8 text-center shadow-[0_28px_80px_-40px_rgba(15,23,42,0.95)] backdrop-blur-md",
              feedback.correct
                ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200"
                : "border-rose-300/30 bg-rose-500/15 text-rose-200"
            )}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">Answer Result</p>
              <p className="mt-4 text-5xl font-black sm:text-6xl">
                {feedback.correct ? "ถูกต้อง!" : "ผิด!"}
              </p>
            </div>
          </motion.div>
        ) : question ? (
          <motion.div
            key={question.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.98 }}
          >
            <Card className="overflow-hidden rounded-[30px] border-white/10 bg-slate-950/45 p-0 text-white shadow-[0_28px_80px_-40px_rgba(15,23,42,0.95)] backdrop-blur-xl">
              <div className={cn(
                "border-b border-white/10 px-6 py-4",
                accent === "boss"
                  ? "bg-[linear-gradient(90deg,rgba(248,113,113,0.14),rgba(99,102,241,0.08),transparent)]"
                  : "bg-[linear-gradient(90deg,rgba(34,197,94,0.16),rgba(14,165,233,0.08),transparent)]"
              )}>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/45">Question Phase</p>
                <p className="mt-3 text-xl font-bold leading-8 sm:text-2xl">{question.question}</p>
              </div>

              <div className="grid gap-3 p-6 sm:grid-cols-2">
                {question.options.map((option, index) => (
                  <Button
                    key={`${question.id}-${index}`}
                    variant="outline"
                    className={cn(
                      "h-auto min-h-16 rounded-2xl border px-4 py-4 text-left text-base font-semibold text-white transition-all",
                      accent === "boss"
                        ? "border-rose-300/20 bg-slate-900/50 hover:border-rose-300/60 hover:bg-rose-500/15"
                        : "border-emerald-300/20 bg-slate-900/50 hover:border-emerald-300/60 hover:bg-emerald-500/15"
                    )}
                    onClick={() => onAnswer(index)}
                  >
                    <span className="mr-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black">
                      {index + 1}
                    </span>
                    <span className="whitespace-normal">{option}</span>
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[260px] items-center justify-center rounded-[30px] border border-dashed border-white/10 bg-slate-950/35 text-center text-slate-300 backdrop-blur-md"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Stand By</p>
              <p className="mt-4 text-2xl font-black sm:text-3xl">กำลังรอคำถามถัดไป...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
