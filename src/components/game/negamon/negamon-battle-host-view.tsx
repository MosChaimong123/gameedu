"use client"

import { motion } from "framer-motion"
import type { NegamonBattlePlayer } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Swords } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

type Props = {
    players: NegamonBattlePlayer[]
    timeLeft: number
    onEndGame?: () => void
    pin: string
    battlePhase?: "QUESTION" | "BETWEEN"
    roundIndex?: number
    currentQuestionPreview?: string | null
    battleLogs: string[]
}

export function NegamonBattleHostView({
    players,
    timeLeft,
    onEndGame,
    pin,
    battlePhase = "QUESTION",
    roundIndex = 0,
    currentQuestionPreview,
    battleLogs,
}: Props) {
    const { t } = useLanguage()
    const unique = Array.from(new Map(players.map((p) => [p.id, p])).values())
    const sorted = [...unique].sort((a, b) => b.battleHp - a.battleHp)

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    return (
        <div className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-slate-950 via-violet-950/40 to-slate-950 font-sans text-white">
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                    backgroundImage: "radial-gradient(rgb(167 139 250 / 0.35) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />

            <div className="relative z-10 grid h-full w-full grid-cols-12 gap-4 p-4 md:p-6">
                <div className="col-span-12 flex flex-col gap-3 md:col-span-4">
                    <div className="rounded-2xl border border-violet-500/40 bg-slate-900/80 p-5 shadow-lg shadow-violet-900/20 backdrop-blur-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-300">
                                <Swords className="h-4 w-4" />
                                {t("hostNegamonBattleTitle")}
                            </span>
                            <span className="rounded-full bg-violet-600/30 px-2 py-0.5 text-[10px] font-bold text-violet-100">
                                {t("hostNegamonPinChip", { pin })}
                            </span>
                        </div>
                        <div className="text-5xl font-black tabular-nums tracking-tight text-violet-100">
                            {formatTime(timeLeft)}
                        </div>
                        <p className="mt-2 text-xs font-medium text-slate-400">
                            {t("hostNegamonRoundLine", {
                                round: roundIndex,
                                phase:
                                    battlePhase === "QUESTION"
                                        ? t("hostNegamonPhaseAnswering")
                                        : t("hostNegamonPhaseSummary"),
                            })}
                        </p>
                        <p className="mt-2 text-[10px] leading-snug text-slate-500">{t("hostNegamonRulesShort")}</p>
                        {currentQuestionPreview && (
                            <p className="mt-3 line-clamp-3 rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-snug text-slate-200">
                                {currentQuestionPreview}
                            </p>
                        )}
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                            {t("hostNegamonBattleLogTitle")}
                        </h3>
                        <div className="custom-scrollbar flex max-h-[40vh] flex-col gap-1.5 overflow-y-auto text-xs md:max-h-none">
                            {battleLogs.length === 0 ? (
                                <p className="text-slate-500">{t("hostNegamonLogEmpty")}</p>
                            ) : (
                                battleLogs.map((line, i) => (
                                    <motion.p
                                        key={`${i}-${line.slice(0, 24)}`}
                                        initial={{ opacity: 0, x: -6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="rounded-md bg-black/25 px-2 py-1 text-violet-100/90"
                                    >
                                        {line}
                                    </motion.p>
                                ))
                            )}
                        </div>
                    </div>

                    {onEndGame && (
                        <Button
                            variant="destructive"
                            className="w-full rounded-xl font-bold"
                            onClick={onEndGame}
                        >
                            {t("hostNegamonEndGame")}
                        </Button>
                    )}
                </div>

                <div className="col-span-12 md:col-span-8">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sorted.map((p, idx) => {
                            const pct = p.maxHp > 0 ? Math.round((p.battleHp / p.maxHp) * 100) : 0
                            return (
                                <div
                                    key={p.id || `${p.name}-${idx}`}
                                    className={cn(
                                        "rounded-2xl border p-4 shadow-md transition-colors",
                                        p.eliminated
                                            ? "border-slate-700 bg-slate-900/40 opacity-60"
                                            : "border-violet-500/35 bg-slate-900/70"
                                    )}
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="truncate font-bold text-white">{p.name}</span>
                                        <span className="shrink-0 text-xs font-bold text-violet-200">
                                            {p.eliminated ? "K.O." : `${p.battleHp} HP`}
                                        </span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                p.eliminated ? "bg-slate-600" : "bg-gradient-to-r from-fuchsia-500 to-violet-400"
                                            )}
                                            style={{ width: `${p.eliminated ? 0 : pct}%` }}
                                        />
                                    </div>
                                    {!p.isConnected && (
                                        <p className="mt-2 text-[10px] font-semibold uppercase text-amber-400/90">
                                            {t("hostNegamonDisconnected")}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
