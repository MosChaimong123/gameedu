import { CryptoHackPlayer } from "@/lib/types/game"
import { useEffect, useState } from "react"
import { Clock, Bitcoin } from "lucide-react"

type Props = {
    player: CryptoHackPlayer
    endTime: number | null
    cryptoGoal?: number
}

export function CryptoHackGameHeader({ player, endTime, cryptoGoal }: Props) {
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

    // Safe access to crypto, default to 0 if undefined (shouldn't happen if typed correctly, but for runtime safety)
    const cryptoAmount = player.crypto || 0;

    return (
        <div className="bg-black/90 backdrop-blur-md p-4 z-50 flex justify-between items-center text-green-100 border-b border-green-500/50 w-full relative font-mono shadow-[0_0_20px_rgba(34,197,94,0.1)]">
            {/* Rank */}
            <div className="flex flex-col items-start w-24">
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Rank</span>
                <span className="text-3xl font-black text-green-400 leading-none drop-shadow-sm">
                    #{player.score || "-"}
                </span>
            </div>

            {endTime && (
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-black/80 px-6 py-2 rounded border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                    <Clock className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className={`font-mono font-bold text-2xl ${timeLeft < 30 ? 'text-red-500' : 'text-green-400'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            )}

            {cryptoGoal && (
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center w-1/3 max-w-[240px]">
                    <div className="flex items-center gap-2 mb-1">
                        <Bitcoin className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Target: {cryptoGoal.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1 bg-green-900/30 overflow-hidden">
                        <div
                            className="h-full bg-green-400 shadow-[0_0_10px_#4ade80] transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, (cryptoAmount / cryptoGoal) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="bg-black rounded px-4 py-2 border border-green-500/50 flex items-center gap-3 min-w-[120px] justify-end shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                <Bitcoin className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-black text-green-400 tracking-wider h-7 flex items-center">{cryptoAmount.toLocaleString()}</span>
            </div>
        </div>
    )
}
