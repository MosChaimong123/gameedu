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

/** ชิ้นคอนเฟตตีแบบสุ่ม — ระเบิดออกจากกลางจอตอนได้บิงโกใหม่ */
function ConfettiBurst() {
    // สุ่มครั้งเดียวตอน mount — ใช้ lazy initializer ของ useState (pure ระหว่าง render)
    const [pieces] = useState(() =>
        Array.from({ length: 28 }, (_, i) => {
            const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4
            const dist = 120 + Math.random() * 160
            const colors = ["#a855f7", "#d946ef", "#f43f8a", "#c4b5fd", "#fde047", "#22d3ee"]
            return {
                id: i,
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                rot: Math.random() * 540 - 270,
                color: colors[i % colors.length],
                delay: Math.random() * 0.12,
                size: 7 + Math.random() * 7,
            }
        })
    )
    return (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden">
            {pieces.map((p) => (
                <motion.span
                    key={p.id}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
                    animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.4, rotate: p.rot }}
                    transition={{ duration: 1.3, delay: p.delay, ease: "easeOut" }}
                    style={{
                        position: "absolute",
                        width: p.size,
                        height: p.size * 1.4,
                        borderRadius: 2,
                        background: p.color,
                    }}
                />
            ))}
        </div>
    )
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
        const timer = setTimeout(() => setBingoFlash(false), 1800)
        return () => clearTimeout(timer)
    }, [bingoFlash])

    const locked = answeredIndex !== null && answeredIndex === questionIndex
    const hasQuestion = question !== null
    const markedCount = marked.filter(Boolean).length

    const handleTap = (cellIndex: number) => {
        if (!hasQuestion || locked) return
        if (marked[cellIndex]) return
        if (card[cellIndex] === BINGO_FREE_LABEL) return
        setAnsweredIndex(questionIndex)
        onMark(cellIndex)
    }

    return (
        <div
            className="relative z-10 flex h-full min-h-0 w-full flex-col px-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-4"
            style={{
                background:
                    "radial-gradient(120% 80% at 18% -8%, rgba(168,85,247,0.22), transparent 58%)," +
                    "radial-gradient(120% 80% at 92% 8%, rgba(217,70,239,0.20), transparent 55%)," +
                    "linear-gradient(180deg,#0a0418,#140a28 55%,#0c0620)",
            }}
        >
            {/* แถบโจทย์ */}
            <motion.div
                key={questionIndex ?? "wait"}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="mb-3 shrink-0 rounded-2xl border border-violet-400/30 bg-violet-950/50 px-4 py-3 text-center shadow-[0_8px_30px_-12px_rgba(168,85,247,0.6)] backdrop-blur-md"
            >
                {hasQuestion ? (
                    <>
                        <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-fuchsia-300/90">
                            {t("playBingoTapTheAnswer")}
                            {question.total > 0 && (
                                <span className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(question.total, 8) }).map((_, i) => (
                                        <span
                                            key={i}
                                            className={cn(
                                                "h-1.5 w-3 rounded-full transition-colors",
                                                i <= question.index % 8
                                                    ? "bg-fuchsia-400"
                                                    : "bg-white/15"
                                            )}
                                        />
                                    ))}
                                    <span className="ml-1 text-white/40">
                                        {question.index + 1}/{question.total}
                                    </span>
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
                    <div className="py-2 text-sm font-bold text-violet-200/70">
                        {t("playBingoWaitingForHost")}
                    </div>
                )}
            </motion.div>

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
                            <motion.button
                                key={i}
                                type="button"
                                onClick={() => handleTap(i)}
                                disabled={!hasQuestion || locked || isMarked || isFree}
                                whileTap={!isMarked && !isFree && hasQuestion && !locked ? { scale: 0.9 } : undefined}
                                animate={
                                    isWrongTap
                                        ? { x: [0, -7, 7, -5, 5, 0] }
                                        : isMarked && !isFree
                                          ? { scale: [1.18, 1] }
                                          : { scale: 1 }
                                }
                                transition={
                                    isWrongTap
                                        ? { duration: 0.4 }
                                        : { type: "spring", stiffness: 400, damping: 18 }
                                }
                                className={cn(
                                    "relative flex aspect-square items-center justify-center rounded-xl p-1 text-center text-[11px] font-bold leading-tight sm:text-xs md:text-sm",
                                    isFree
                                        ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900 shadow-[0_6px_18px_-6px_rgba(251,191,36,0.8)] ring-1 ring-inset ring-amber-200/60"
                                        : isMarked
                                          ? "bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow-[0_6px_20px_-6px_rgba(217,70,239,0.85)] ring-1 ring-inset ring-fuchsia-200/50"
                                          : isWrongTap
                                            ? "bg-gradient-to-br from-rose-500 to-red-600 text-white ring-1 ring-inset ring-red-300/50"
                                            : "bg-white text-slate-800 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] ring-1 ring-inset ring-white/20 hover:bg-violet-100 active:bg-violet-200",
                                    !hasQuestion && !isMarked && !isFree && "opacity-60"
                                )}
                            >
                                <span className="line-clamp-3 break-words px-0.5">
                                    {isFree ? "★" : label}
                                </span>
                                {isMarked && !isFree && (
                                    <motion.span
                                        initial={{ scale: 0, rotate: -40 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 14 }}
                                        className="absolute right-0.5 top-0.5 text-fuchsia-100"
                                    >
                                        ✓
                                    </motion.span>
                                )}
                            </motion.button>
                        )
                    })}
                </div>
            </div>

            {/* แถบสถานะล่าง */}
            <div className="mt-3 flex shrink-0 items-center gap-3 rounded-2xl border border-violet-400/25 bg-violet-950/50 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_30px_-14px_rgba(168,85,247,0.7)] backdrop-blur-md">
                <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="text-base">🏆</span>
                    <span className="text-white/80">{t("playBingoRankLabel")}</span>
                    <span className="text-brand-yellow">#{rank}</span>
                </span>
                <div className="flex-1" />
                <span className="flex items-center gap-1.5 text-fuchsia-300">
                    <span className="text-base">✦</span>
                    {t("playBingoLinesLabel", { count: completedLines })}
                </span>
                <span className="hidden text-[11px] font-medium text-white/40 min-[360px]:inline">
                    {markedCount}/{card.length}
                </span>
            </div>

            {/* เอฟเฟกต์บิงโก + คอนเฟตตี */}
            <AnimatePresence>
                {bingoFlash && (
                    <>
                        <ConfettiBurst />
                        <motion.div
                            initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 1.3, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 16 }}
                            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                        >
                            <div className="rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 px-10 py-6 text-5xl font-black uppercase tracking-wider text-white shadow-[0_0_50px_rgba(217,70,239,0.9)]">
                                {t("playBingoLineComplete")}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
