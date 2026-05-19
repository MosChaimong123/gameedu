import { GoldQuestPlayer } from "@/lib/types/game"
import { useEffect, useState } from "react"
import { Clock, Goal } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

type Props = {
    player: GoldQuestPlayer
    endTime: number | null
    goldGoal?: number
}

function getTimeRemaining(endTime: number | null) {
    if (!endTime) return 0
    return Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
}

export function GameHeader({ player, endTime, goldGoal }: Props) {
    const { t } = useLanguage()
    const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(endTime))

    useEffect(() => {
        if (!endTime) return

        const interval = setInterval(() => {
            const left = getTimeRemaining(endTime)
            setTimeLeft(left)

            if (left <= 0) clearInterval(interval)
        }, 1000)

        return () => clearInterval(interval)
    }, [endTime])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, "0")}`
    }

    return (
        <div className="relative z-10 flex w-full items-center justify-between border-b-4 border-slate-700 bg-slate-800 p-2 text-white shadow-md sm:p-4">
            <div className="flex w-16 sm:w-24 flex-col items-start">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">{t("gameHeaderRank")}</span>
                <span className="text-lg sm:text-2xl font-black text-white leading-none">
                    #{player.score || "-"}
                </span>
            </div>

            {endTime && (
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center space-x-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 sm:space-x-2 sm:px-4 sm:py-1">
                    <Clock className="h-3 w-3 text-slate-400 sm:h-4 sm:w-4" />
                    <span
                        className={`font-mono text-sm font-bold sm:text-xl ${timeLeft < 30 ? "animate-pulse text-red-500" : "text-white"}`}
                    >
                        {formatTime(timeLeft)}
                    </span>
                </div>
            )}

            {goldGoal && (
                <div className="absolute left-1/2 flex w-1/3 max-w-[200px] -translate-x-1/2 flex-col items-center">
                    <div className="mb-1 flex items-center gap-2">
                        <Goal className="h-3 w-3 text-amber-400 sm:h-4 sm:w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 sm:text-xs">
                            {t("gameHeaderGoal", { value: goldGoal.toLocaleString() })}
                        </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700 sm:h-2">
                        <div
                            className="h-full bg-amber-500 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, (player.gold / goldGoal) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex min-w-[88px] items-center justify-end gap-1.5 rounded-lg border-2 border-amber-500/50 bg-slate-900 px-2 py-1 sm:min-w-[120px] sm:gap-3 sm:px-6 sm:py-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-600 bg-amber-400 text-[8px] font-bold text-amber-900 shadow-inner sm:h-6 sm:w-6 sm:text-[10px]">
                    $
                </div>
                <span className="text-lg font-black text-amber-400 sm:text-2xl">
                    {(player.gold || 0).toLocaleString()}
                </span>
            </div>
        </div>
    )
}
