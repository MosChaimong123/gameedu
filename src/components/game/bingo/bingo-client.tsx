"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { BINGO_FREE_LABEL } from "@/lib/game-engine/bingo-card"
import type { BingoClientState } from "@/app/play/game/play-game-types"

interface BingoClientProps {
    state: BingoClientState
    /** อันดับสด (1 = นำ) */
    rank: number
    onMark: (cellIndex: number) => void
    t: (key: string, params?: Record<string, string | number>) => string
}

export function BingoClient({ state, rank, onMark, t }: BingoClientProps) {
    const { size, card, marked, completedLines, question, lastMark } = state

    // ล็อกหลังแตะไปแล้ว 1 ครั้งต่อข้อ — ปลดล็อกเมื่อ index ของโจทย์เปลี่ยน
    const [answeredIndex, setAnsweredIndex] = useState<number | null>(null)
    const questionIndex = question?.index ?? null

    // แจ้งบิงโกใหม่ — ตั้ง flash ตอน lastMark เปลี่ยน (set state during render ตามแพตเทิร์น React)
    const [shownMark, setShownMark] = useState(lastMark)
    const [bingoFlash, setBingoFlash] = useState(false)
    if (lastMark !== shownMark) {
        setShownMark(lastMark)
        setBingoFlash(Boolean(lastMark?.newBingo))
    }
    useEffect(() => {
        if (!bingoFlash) return
        const timer = setTimeout(() => setBingoFlash(false), 1600)
        return () => clearTimeout(timer)
    }, [bingoFlash])

    const locked = answeredIndex !== null && answeredIndex === questionIndex
    const hasQuestion = question !== null

    const handleTap = (cellIndex: number) => {
        if (!hasQuestion || locked) return
        if (marked[cellIndex]) return
        if (card[cellIndex] === BINGO_FREE_LABEL) return
        setAnsweredIndex(questionIndex)
        onMark(cellIndex)
    }

    return (
        <div className="relative z-10 flex h-full min-h-0 w-full flex-col px-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-4">
            {/* แถบโจทย์ */}
            <div className="mb-3 shrink-0 rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
                {hasQuestion ? (
                    <>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan/80">
                            {t("playBingoTapTheAnswer")}
                            {question.total > 0 && (
                                <span className="ml-2 text-white/40">
                                    {question.index + 1}/{question.total}
                                </span>
                            )}
                        </div>
                        {question.image && (
                            <div className="relative mx-auto mt-2 h-24 w-full max-w-[16rem] overflow-hidden rounded-xl">
                                <Image src={question.image} alt="" fill className="object-contain" />
                            </div>
                        )}
                        <div className="mt-1 text-base font-black leading-snug text-white sm:text-lg">
                            {question.question}
                        </div>
                    </>
                ) : (
                    <div className="py-2 text-sm font-bold text-white/70">{t("playBingoWaitingForHost")}</div>
                )}
            </div>

            {/* การ์ดบิงโก */}
            <div className="flex min-h-0 flex-1 items-center justify-center">
                <div
                    className="grid w-full max-w-[min(92vw,30rem)] gap-1.5 sm:gap-2"
                    style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                >
                    {card.map((label, i) => {
                        const isMarked = marked[i]
                        const isFree = label === BINGO_FREE_LABEL
                        const isWrongTap =
                            lastMark !== null &&
                            !lastMark.correct &&
                            lastMark.cellIndex === i &&
                            answeredIndex === questionIndex
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleTap(i)}
                                disabled={!hasQuestion || locked || isMarked || isFree}
                                className={cn(
                                    "relative flex aspect-square items-center justify-center rounded-lg p-1 text-center text-[11px] font-bold leading-tight transition-all sm:text-xs md:text-sm",
                                    "ring-1 ring-inset",
                                    isFree
                                        ? "bg-amber-400/90 text-amber-950 ring-amber-300"
                                        : isMarked
                                          ? "bg-emerald-500 text-white ring-emerald-300"
                                          : isWrongTap
                                            ? "bg-red-500/80 text-white ring-red-300"
                                            : "bg-white text-slate-800 ring-white/20 hover:bg-brand-cyan/20 active:scale-95",
                                    !hasQuestion && !isMarked && !isFree && "opacity-60"
                                )}
                            >
                                <span className="line-clamp-3 break-words px-0.5">
                                    {isFree ? "★" : label}
                                </span>
                                {isMarked && !isFree && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute right-0.5 top-0.5 text-emerald-100"
                                    >
                                        ✓
                                    </motion.span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* แถบสถานะล่าง */}
            <div className="mt-3 flex shrink-0 items-center justify-between rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
                <span className="text-white/80">
                    {t("playBingoRankLabel")} <span className="text-brand-yellow">#{rank}</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-300">
                    {t("playBingoLinesLabel", { count: completedLines })}
                </span>
            </div>

            {/* เอฟเฟกต์บิงโก */}
            <AnimatePresence>
                {bingoFlash && (
                    <motion.div
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                    >
                        <div className="rounded-3xl bg-emerald-500/95 px-10 py-6 text-5xl font-black uppercase tracking-wider text-white shadow-2xl">
                            {t("playBingoLineComplete")}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
