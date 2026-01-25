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
        <div className="bg-green-950 p-4 shadow-md z-10 flex justify-between items-center text-green-100 border-b-4 border-green-800 w-full relative font-mono">
            {/* Rank */}
            <div className="flex flex-col items-start w-24">
                <span className="text-xs font-bold text-green-500 uppercase">Rank</span>
                <span className="text-2xl font-black text-green-300 leading-none">
                    #{player.score || "-"}
                </span>
            </div>

            {endTime && (
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-green-900 px-4 py-1 rounded-full border border-green-700">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className={`font-mono font-bold text-xl ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-green-100'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            )}

            {cryptoGoal && (
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center w-1/3 max-w-[200px] mt-8 md:mt-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Bitcoin className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Goal: {cryptoGoal.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-green-900 rounded-full overflow-hidden border border-green-800">
                        <div
                            className="h-full bg-yellow-400 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, (cryptoAmount / cryptoGoal) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="bg-green-900 rounded-lg px-6 py-2 border-2 border-green-600/50 flex items-center gap-3 min-w-[120px] justify-end">
                <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-yellow-600 shadow-inner flex items-center justify-center text-[10px] text-yellow-900 font-bold shrink-0">
                    ₿
                </div>
                <span className="text-2xl font-black text-green-300">{cryptoAmount.toLocaleString()}</span>
            </div>
        </div>
    )
}
