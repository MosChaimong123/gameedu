"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { BingoPlayer } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"
import { Eye, EyeOff, ArrowRight, Target, Users, Maximize2, Minimize2, Check } from "lucide-react"

type Props = {
    players: BingoPlayer[]
    timeLeft: number
    linesToWin?: number
    currentQuestion: { question: string; index: number; total: number } | null
    currentAnswer: string | null
    currentOptions?: string[] | null
    onNextQuestion: () => void
    onEndGame?: () => void
    pin: string
}

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

/** ตัวย่อสำหรับ avatar — อักษรตัวแรกของชื่อ (รองรับไทย/อังกฤษ) */
function initials(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return "?"
    return Array.from(trimmed).slice(0, 2).join("")
}

const MEDAL: Record<number, { row: string; chip: string; avatar: string; text: string }> = {
    0: {
        row: "scale-[1.03] border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950",
        chip: "bg-amber-900/20 text-amber-950",
        avatar: "bg-amber-900/30 text-amber-950",
        text: "text-amber-950",
    },
    1: {
        row: "border-slate-200 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-900",
        chip: "bg-slate-900/15 text-slate-900",
        avatar: "bg-slate-600 text-slate-100",
        text: "text-slate-900",
    },
    2: {
        row: "border-orange-300 bg-gradient-to-r from-orange-300 to-amber-600 text-orange-950",
        chip: "bg-orange-950/20 text-orange-950",
        avatar: "bg-orange-950/30 text-orange-100",
        text: "text-orange-950",
    },
}

export function BingoHostView({
    players,
    timeLeft,
    linesToWin,
    currentQuestion,
    currentAnswer,
    currentOptions,
    onNextQuestion,
    onEndGame,
    pin,
}: Props) {
    const { t } = useLanguage()
    const sortedPlayers = [...players].sort(
        (a, b) => b.completedLines - a.completedLines || b.correctAnswers - a.correctAnswers
    )

    // เฉลยซ่อนไว้ก่อน — ครูกดโชว์เอง และรีเซ็ตเป็นซ่อนทุกครั้งที่ขึ้นข้อใหม่
    // ใช้แพตเทิร์น adjust-state-during-render แทน effect (กัน cascading render)
    const questionIndex = currentQuestion?.index ?? null
    const [answerShown, setAnswerShown] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [shownIndex, setShownIndex] = useState(questionIndex)
    if (questionIndex !== shownIndex) {
        setShownIndex(questionIndex)
        setAnswerShown(false)
    }

    const options = currentOptions ?? []
    const normalizedAnswer = (currentAnswer ?? "").trim()

    return (
        <div className="relative h-screen w-full overflow-hidden bg-[#0a0418] font-sans">
            {/* ออโรราม่วง-ฟิวเชีย */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(70% 55% at 12% 0%, rgba(168,85,247,0.28), transparent 60%)," +
                        "radial-gradient(70% 55% at 92% 8%, rgba(217,70,239,0.22), transparent 58%)," +
                        "radial-gradient(80% 60% at 50% 110%, rgba(124,58,237,0.18), transparent 60%)",
                }}
            />

            <div className="relative z-10 grid h-full min-h-0 w-full grid-cols-12 gap-6 p-6">
                {/* LEFT: เป้าหมาย/เวลา + โจทย์ + เฉลย */}
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="rounded-3xl border-2 border-violet-400/40 bg-violet-950/40 p-6 shadow-[0_10px_40px_-12px_rgba(168,85,247,0.6)] backdrop-blur-xl">
                        <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-fuchsia-300">
                            {linesToWin ? t("hostBingoWinConditionLines") : t("goldQuestHostTimeRemaining")}
                        </h2>
                        {linesToWin ? (
                            <div className="flex items-center gap-2 text-5xl font-black text-fuchsia-300 drop-shadow-[0_0_18px_rgba(217,70,239,0.6)]">
                                <Target className="h-9 w-9" />
                                {t("playBingoLinesLabel", { count: linesToWin })}
                            </div>
                        ) : (
                            <div className="font-mono text-6xl font-black tracking-tighter text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
                                {formatTime(timeLeft)}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-1 flex-col rounded-3xl border-2 border-violet-400/25 bg-violet-950/40 p-6 shadow-[0_10px_40px_-12px_rgba(168,85,247,0.45)] backdrop-blur-xl">
                        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                            <h2 className="text-xs font-extrabold uppercase tracking-widest text-fuchsia-300">
                                {t("hostBingoCurrentQuestionLabel")}
                                {currentQuestion && currentQuestion.total > 0 && (
                                    <span className="ml-2 text-white/40">
                                        {currentQuestion.index + 1}/{currentQuestion.total}
                                    </span>
                                )}
                            </h2>
                            {currentQuestion && (
                                <button
                                    type="button"
                                    onClick={() => setExpanded(true)}
                                    aria-label={t("hostBingoExpand")}
                                    className="flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200 transition-all hover:bg-violet-500/30"
                                >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                    {t("hostBingoExpand")}
                                </button>
                            )}
                        </div>
                        {currentQuestion ? (
                            <motion.div
                                key={questionIndex ?? "q"}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-1 flex-col"
                            >
                                <div className="text-2xl font-black leading-snug text-white">
                                    {currentQuestion.question}
                                </div>
                                {currentAnswer && (
                                    <div className="mt-4">
                                        <Button
                                            onClick={() => setAnswerShown((s) => !s)}
                                            className={cn(
                                                "inline-flex w-fit items-center gap-2 rounded-xl border-2 px-4 py-2 text-base font-bold transition-all",
                                                answerShown
                                                    ? "border-fuchsia-300 bg-fuchsia-500/90 text-white hover:bg-fuchsia-500"
                                                    : "border-violet-400/50 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
                                            )}
                                        >
                                            {answerShown ? (
                                                <>
                                                    <EyeOff className="h-4 w-4" />
                                                    {t("hostBingoHideAnswer")}
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="h-4 w-4" />
                                                    {t("hostBingoShowAnswer")}
                                                </>
                                            )}
                                        </Button>
                                        <AnimatePresence>
                                            {answerShown && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: -6 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                                                    className="mt-3 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-lg font-bold text-white shadow-[0_8px_24px_-8px_rgba(217,70,239,0.8)]"
                                                >
                                                    {t("hostBingoAnswerLabel")}: {currentAnswer}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-center text-sm font-bold text-violet-200/70">
                                {t("hostBingoWaitingFirstQuestion")}
                            </div>
                        )}

                        <Button
                            onClick={onNextQuestion}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-fuchsia-300 bg-gradient-to-r from-violet-500 to-fuchsia-500 py-8 text-2xl font-black text-white shadow-[0_8px_0_rgb(124,58,237)] transition-all hover:brightness-110 active:translate-y-1 active:shadow-none"
                        >
                            <ArrowRight className="h-7 w-7" />
                            {t("hostBingoNextQuestion")}
                        </Button>
                    </div>
                </div>

                {/* CENTER: กระดานผู้นำ */}
                <div className="col-span-5 flex min-h-0 flex-col">
                    <div className="mb-4 shrink-0 text-center">
                        <h1 className="bg-gradient-to-b from-violet-200 via-fuchsia-400 to-purple-700 bg-clip-text text-5xl font-black tracking-tighter text-transparent drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
                            {t("hostBingoLeaderboard")}
                        </h1>
                    </div>
                    <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-2 sm:space-y-3">
                        <AnimatePresence mode="popLayout">
                            {sortedPlayers.map((player, index) => {
                                const medal = MEDAL[index]
                                return (
                                    <motion.div
                                        layout
                                        key={player.id}
                                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        className={cn(
                                            "flex items-center rounded-2xl border-2 p-3 shadow-xl sm:p-4",
                                            medal
                                                ? medal.row
                                                : "border-violet-700/50 bg-violet-950/60 text-violet-100"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "mr-3 flex h-12 min-w-12 items-center justify-center rounded-xl text-2xl font-black",
                                                medal ? medal.chip : "bg-black/30 text-violet-300"
                                            )}
                                        >
                                            #{index + 1}
                                        </div>
                                        <div
                                            className={cn(
                                                "mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black",
                                                medal ? medal.avatar : "bg-violet-800 text-violet-200"
                                            )}
                                        >
                                            {initials(player.name)}
                                        </div>
                                        <div className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">
                                            {player.name}
                                        </div>
                                        <div className="px-3 text-2xl font-black">
                                            {t("playBingoLinesLabel", { count: player.completedLines })}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                        {sortedPlayers.length === 0 && (
                            <div className="mt-10 text-center text-sm italic text-violet-400/50">
                                {t("hostWaitingForPlayers")}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: รหัส + ผู้เล่น + จบเกม */}
                <div className="col-span-3 flex flex-col gap-6">
                    <div className="rounded-3xl border-2 border-fuchsia-500/50 bg-violet-950/40 p-8 text-center shadow-[0_10px_40px_-12px_rgba(217,70,239,0.7)] backdrop-blur-xl">
                        <div className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-fuchsia-300">
                            {t("goldQuestHostJoinCode")}
                        </div>
                        <div className="text-6xl font-black tracking-widest text-white drop-shadow-[0_0_16px_rgba(217,70,239,0.9)]">
                            {pin}
                        </div>
                    </div>

                    <div className="rounded-3xl border-2 border-violet-400/25 bg-violet-950/40 p-5 text-center backdrop-blur-xl">
                        <div className="text-xs font-black uppercase tracking-widest text-violet-300">
                            {t("hostBingoPlayersLabel")}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-2 text-4xl font-black text-fuchsia-300">
                            <Users className="h-8 w-8" />
                            {players.length}
                        </div>
                    </div>

                    <div className="flex-1" />

                    <Button
                        onClick={onEndGame}
                        className="w-full rounded-3xl border-2 border-red-400 bg-gradient-to-r from-rose-500 to-red-600 py-10 text-2xl font-black uppercase tracking-wider text-white shadow-[0_8px_0_rgb(153,27,27)] transition-all hover:brightness-110 active:translate-y-2 active:shadow-none"
                    >
                        {t("hostEndGame")}
                    </Button>
                </div>
            </div>

            {/* โหมดเต็มจอ — โชว์คำถาม + ตัวเลือก + เฉลย ตัวใหญ่ */}
            <AnimatePresence>
                {expanded && currentQuestion && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col bg-[#0a0418]"
                    >
                        <div
                            className="absolute inset-0"
                            style={{
                                background:
                                    "radial-gradient(60% 50% at 15% 0%, rgba(168,85,247,0.3), transparent 60%)," +
                                    "radial-gradient(60% 50% at 90% 5%, rgba(217,70,239,0.24), transparent 58%)," +
                                    "radial-gradient(80% 60% at 50% 115%, rgba(124,58,237,0.2), transparent 60%)",
                            }}
                        />

                        {/* แถบบน: ลำดับข้อ + ปุ่มย่อ */}
                        <div className="relative z-10 flex shrink-0 items-center justify-between px-8 py-6">
                            <div className="text-xl font-extrabold uppercase tracking-widest text-fuchsia-300">
                                {t("hostBingoCurrentQuestionLabel")}
                                {currentQuestion.total > 0 && (
                                    <span className="ml-3 text-white/40">
                                        {currentQuestion.index + 1}/{currentQuestion.total}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setExpanded(false)}
                                aria-label={t("hostBingoCollapse")}
                                className="flex items-center gap-2 rounded-xl border-2 border-violet-400/50 bg-violet-500/20 px-4 py-2.5 text-base font-bold text-violet-100 transition-all hover:bg-violet-500/35"
                            >
                                <Minimize2 className="h-5 w-5" />
                                {t("hostBingoCollapse")}
                            </button>
                        </div>

                        {/* กลาง: คำถาม + ตัวเลือก */}
                        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-[6vw] pb-6">
                            <motion.div
                                key={questionIndex ?? "q"}
                                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                                className="text-center text-[clamp(2rem,5vw,4.5rem)] font-black leading-tight text-white drop-shadow-[0_4px_20px_rgba(168,85,247,0.5)]"
                            >
                                {currentQuestion.question}
                            </motion.div>

                            {options.length > 0 && (
                                <div className="grid w-full max-w-[80rem] gap-4 sm:grid-cols-2">
                                    {options.map((opt, i) => {
                                        const isAnswer =
                                            answerShown && opt.trim() === normalizedAnswer
                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "flex items-center gap-4 rounded-2xl border-2 px-6 py-5 text-[clamp(1.25rem,2.5vw,2rem)] font-bold transition-all",
                                                    isAnswer
                                                        ? "border-fuchsia-300 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_40px_rgba(217,70,239,0.7)]"
                                                        : "border-violet-400/25 bg-violet-950/50 text-violet-100"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-black",
                                                        isAnswer
                                                            ? "bg-white/25 text-white"
                                                            : "bg-violet-800/60 text-violet-200"
                                                    )}
                                                >
                                                    {isAnswer ? <Check className="h-6 w-6" /> : String.fromCharCode(65 + i)}
                                                </span>
                                                <span className="min-w-0 flex-1">{opt}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ล่าง: โชว์/ซ่อนเฉลย + ถามข้อต่อไป */}
                        <div className="relative z-10 flex shrink-0 items-center justify-center gap-4 px-8 pb-8">
                            {currentAnswer && (
                                <Button
                                    onClick={() => setAnswerShown((s) => !s)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-2xl border-2 px-6 py-6 text-xl font-black transition-all",
                                        answerShown
                                            ? "border-fuchsia-300 bg-fuchsia-500/90 text-white hover:bg-fuchsia-500"
                                            : "border-violet-400/50 bg-violet-500/20 text-violet-100 hover:bg-violet-500/35"
                                    )}
                                >
                                    {answerShown ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                                    {answerShown ? t("hostBingoHideAnswer") : t("hostBingoShowAnswer")}
                                </Button>
                            )}
                            {/* เฉลยข้อความ (เผื่อไม่มี options) */}
                            {currentAnswer && options.length === 0 && (
                                <AnimatePresence>
                                    {answerShown && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-6 text-2xl font-black text-white shadow-[0_8px_30px_-8px_rgba(217,70,239,0.8)]"
                                        >
                                            {t("hostBingoAnswerLabel")}: {currentAnswer}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}
                            <Button
                                onClick={onNextQuestion}
                                className="flex items-center gap-2 rounded-2xl border-2 border-fuchsia-300 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-10 py-6 text-2xl font-black text-white shadow-[0_6px_0_rgb(124,58,237)] transition-all hover:brightness-110 active:translate-y-1 active:shadow-none"
                            >
                                <ArrowRight className="h-7 w-7" />
                                {t("hostBingoNextQuestion")}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
