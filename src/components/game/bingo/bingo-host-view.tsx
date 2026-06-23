"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { BingoPlayer } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

type Props = {
    players: BingoPlayer[]
    timeLeft: number
    linesToWin?: number
    currentQuestion: { question: string; index: number; total: number } | null
    currentAnswer: string | null
    onNextQuestion: () => void
    onEndGame?: () => void
    pin: string
}

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function BingoHostView({
    players,
    timeLeft,
    linesToWin,
    currentQuestion,
    currentAnswer,
    onNextQuestion,
    onEndGame,
    pin,
}: Props) {
    const { t } = useLanguage()
    const sortedPlayers = [...players].sort(
        (a, b) => b.completedLines - a.completedLines || b.correctAnswers - a.correctAnswers
    )

    return (
        <div className="h-screen w-full bg-slate-950 relative overflow-hidden font-sans">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-slate-900/70 to-emerald-950/95" />

            <div className="relative z-10 grid h-full min-h-0 w-full grid-cols-12 gap-6 p-6">
                {/* LEFT: current question + control */}
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="rounded-3xl border-4 border-emerald-500/40 bg-black/40 p-6 backdrop-blur-xl">
                        <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                            {linesToWin ? t("hostBingoWinConditionLines") : t("goldQuestHostTimeRemaining")}
                        </h2>
                        {linesToWin ? (
                            <div className="text-5xl font-black text-emerald-300 drop-shadow-md">
                                {t("playBingoLinesLabel", { count: linesToWin })}
                            </div>
                        ) : (
                            <div className="font-mono text-6xl font-black tracking-tighter text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
                                {formatTime(timeLeft)}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 rounded-3xl border-4 border-emerald-500/30 bg-black/40 p-6 backdrop-blur-xl flex flex-col">
                        <h2 className="mb-3 border-b border-white/10 pb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                            {t("hostBingoCurrentQuestionLabel")}
                            {currentQuestion && currentQuestion.total > 0 && (
                                <span className="ml-2 text-white/40">
                                    {currentQuestion.index + 1}/{currentQuestion.total}
                                </span>
                            )}
                        </h2>
                        {currentQuestion ? (
                            <div className="flex flex-1 flex-col">
                                <div className="text-2xl font-black leading-snug text-white">
                                    {currentQuestion.question}
                                </div>
                                {currentAnswer && (
                                    <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-lg font-bold text-emerald-950">
                                        {t("hostBingoAnswerLabel")}: {currentAnswer}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-center text-sm font-bold text-emerald-200/70">
                                {t("hostBingoWaitingFirstQuestion")}
                            </div>
                        )}

                        <Button
                            onClick={onNextQuestion}
                            className="mt-4 w-full rounded-2xl border-2 border-emerald-300 bg-emerald-500 py-8 text-2xl font-black text-white shadow-[0_6px_0_rgb(5,150,105)] transition-all hover:bg-emerald-600 active:translate-y-1 active:shadow-none"
                        >
                            {t("hostBingoNextQuestion")}
                        </Button>
                    </div>
                </div>

                {/* CENTER: leaderboard */}
                <div className="col-span-5 flex min-h-0 flex-col">
                    <div className="mb-4 shrink-0 text-center">
                        <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
                            {t("hostBingoLeaderboard")}
                        </h1>
                    </div>
                    <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-2 sm:space-y-3">
                        <AnimatePresence mode="popLayout">
                            {sortedPlayers.map((player, index) => (
                                <motion.div
                                    layout
                                    key={player.id}
                                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className={cn(
                                        "flex items-center rounded-2xl border-2 p-3 shadow-xl sm:p-4",
                                        index === 0
                                            ? "scale-105 border-emerald-300 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                                            : index === 1
                                              ? "border-white bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900"
                                              : index === 2
                                                ? "border-emerald-700 bg-gradient-to-r from-emerald-700 to-emerald-800 text-emerald-100"
                                                : "border-slate-700 bg-slate-800/80 text-slate-200"
                                    )}
                                >
                                    <div className="mr-4 flex h-12 min-w-12 items-center justify-center rounded-xl bg-black/20 text-2xl font-black">
                                        #{index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">
                                        {player.name}
                                    </div>
                                    <div className="px-4 text-2xl font-black">
                                        {t("playBingoLinesLabel", { count: player.completedLines })}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {sortedPlayers.length === 0 && (
                            <div className="mt-10 text-center text-sm italic text-emerald-500/50">
                                {t("hostWaitingForPlayers")}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: code + end */}
                <div className="col-span-3 flex flex-col gap-6">
                    <div className="rounded-3xl border-4 border-purple-500/50 bg-black/40 p-8 text-center backdrop-blur-xl">
                        <div className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-purple-300">
                            {t("goldQuestHostJoinCode")}
                        </div>
                        <div className="text-6xl font-black tracking-widest text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                            {pin}
                        </div>
                    </div>

                    <div className="flex-1" />

                    <Button
                        onClick={onEndGame}
                        className="w-full rounded-3xl border-2 border-red-400 bg-red-600 py-10 text-2xl font-black uppercase tracking-wider text-white shadow-[0_8px_0_rgb(153,27,27)] transition-all hover:bg-red-700 active:translate-y-2 active:shadow-none"
                    >
                        {t("hostEndGame")}
                    </Button>
                </div>
            </div>
        </div>
    )
}
