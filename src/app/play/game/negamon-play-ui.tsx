"use client"

import { motion } from "framer-motion"
import type { NegamonBattlePlayer } from "@/lib/types/game"
import { useLanguage } from "@/components/providers/language-provider"

export function NegamonBattleTopBar({ player }: { player: NegamonBattlePlayer }) {
    const { t } = useLanguage()
    return (
        <div className="flex w-full items-center justify-between border-b-4 border-violet-600 bg-slate-800 p-4 text-white shadow-md">
            <div className="flex w-24 flex-col items-start">
                <span className="text-xs font-bold uppercase text-slate-400">{t("playNegamonRankLabel")}</span>
                <span className="text-2xl font-black leading-none text-white">#{player.score || "—"}</span>
            </div>
            <div className="min-w-[120px] rounded-lg border-2 border-fuchsia-500/40 bg-slate-900 px-4 py-2 text-right">
                <div className="text-[10px] font-bold uppercase text-fuchsia-300">{t("playNegamonHpLabel")}</div>
                <div className="text-2xl font-black text-fuchsia-200 tabular-nums">
                    {player.battleHp}/{player.maxHp}
                </div>
            </div>
        </div>
    )
}

export function NegamonQuestionHint({ timeLimitSeconds }: { timeLimitSeconds: number }) {
    const { t } = useLanguage()
    return (
        <p className="mb-2 max-w-lg text-center text-xs font-medium leading-relaxed text-violet-200/90 sm:text-sm">
            {t("playNegamonQuestionHint", { seconds: timeLimitSeconds })}
        </p>
    )
}

export function NegamonBetweenRoundsView() {
    const { t } = useLanguage()
    return (
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-3xl border border-violet-500/40 bg-slate-800/90 px-8 py-10 shadow-xl backdrop-blur-sm"
            >
                <h2 className="text-3xl font-black text-violet-200">{t("playNegamonRoundSummaryTitle")}</h2>
                <p className="mt-3 max-w-md text-slate-300">{t("playNegamonRoundSummaryBody")}</p>
            </motion.div>
        </div>
    )
}
