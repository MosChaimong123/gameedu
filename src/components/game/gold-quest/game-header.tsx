import { GoldQuestPlayer } from "@/lib/types/game"
import { useEffect, useState } from "react"
import { Clock, Goal } from "lucide-react"

type Props = {
    player: GoldQuestPlayer
    endTime: number | null
    goldGoal?: number
}

export function GameHeader({ player, endTime, goldGoal }: Props) {
    const [timeLeft, setTimeLeft] = useState(0)

    useEffect(() => {
        if (!endTime) return

        const interval = setInterval(() => {
            const now = Date.now()
            const left = Math.max(0, Math.ceil((endTime - now) / 1000))
            setTimeLeft(left)

            if (left <= 0) clearInterval(interval)
        }, 1000)

        // Initial set
        setTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)))

        return () => clearInterval(interval)
    }, [endTime])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="bg-slate-800 p-4 shadow-md z-10 flex justify-between items-center text-white border-b-4 border-slate-700 w-full relative">
            {/* Timer - Centered potentially, or layout adjusted */}
            <div className="flex flex-col items-start w-24">
                <span className="text-xs font-bold text-slate-400 uppercase">Rank</span>
                <span className="text-2xl font-black text-white leading-none">
                    #{player.score || "-"}
                </span>
            </div>

            {endTime && (
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-slate-900 px-4 py-1 rounded-full border border-slate-700">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className={`font-mono font-bold text-xl ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            )}

            {goldGoal && (
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center w-1/3 max-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                        <Goal className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Goal: {goldGoal.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, (player.gold / goldGoal) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="bg-slate-900 rounded-lg px-6 py-2 border-2 border-amber-500/50 flex items-center gap-3 min-w-[120px] justify-end">
                <div className="w-6 h-6 rounded-full bg-amber-400 border-2 border-amber-600 shadow-inner flex items-center justify-center text-[10px] text-amber-900 font-bold shrink-0">
                    $
                </div>
                <span className="text-2xl font-black text-amber-400">{player.gold.toLocaleString()}</span>
            </div>
        </div>
    )
}
