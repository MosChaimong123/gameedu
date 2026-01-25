"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CryptoHackPlayer } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Bitcoin } from "lucide-react"

type Props = {
    players: CryptoHackPlayer[];
    events?: { source: string, target: string, type: string, amount?: number }[];
    timeLeft: number;
    onEndGame?: () => void;
    cryptoGoal?: number;
    pin: string;
}

export function CryptoHackHostView({ players, events = [], timeLeft, onEndGame, cryptoGoal, pin }: Props) {
    const sortedPlayers = [...players].sort((a, b) => b.crypto - a.crypto);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const totalCrypto = players.reduce((acc, p) => acc + p.crypto, 0);

    return (
        <div className="flex-1 bg-green-950 flex relative overflow-hidden font-mono">
            {/* Matrix-like Background */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent)",
                backgroundSize: "50px 50px"
            }}></div>

            {/* Left: Stats & Timer */}
            <div className="w-64 p-6 flex flex-col gap-6 z-10">
                <div className="bg-black/50 backdrop-blur-md rounded-lg p-4 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <h2 className="text-green-500 font-bold uppercase tracking-widest text-xs mb-1">
                        {cryptoGoal ? "CRYPTO TARGET" : "SYSTEM TIME"}
                    </h2>
                    <div className="text-4xl font-black tracking-wider">
                        {cryptoGoal ? (
                            <div className="flex flex-col gap-2">
                                <span className="text-2xl text-green-300">₿ {cryptoGoal.toLocaleString()}</span>
                                <div className="w-full h-2 bg-green-900 rounded-full overflow-hidden mt-1 border border-green-700">
                                    {/* Show progress of top player */}
                                    <div
                                        className="h-full bg-green-400 shadow-[0_0_10px_#4ade80]"
                                        style={{ width: `${sortedPlayers.length > 0 ? Math.min(100, (sortedPlayers[0].crypto / cryptoGoal) * 100) : 0}%` }}
                                    />
                                </div>
                                <div className="text-xs text-green-600 font-sans tracking-normal">Top Agent: {sortedPlayers[0]?.crypto.toLocaleString() || 0}</div>
                            </div>
                        ) : (
                            formatTime(timeLeft)
                        )}
                    </div>
                </div>

                <div className="bg-black/50 backdrop-blur-md rounded-lg p-4 text-green-400 border border-green-500/50 shadow-xl flex-1">
                    <h2 className="text-green-500 font-bold uppercase tracking-widest text-xs mb-4">Network Log</h2>
                    <div className="space-y-3 overflow-hidden relative h-full">
                        <AnimatePresence>
                            {events.slice(-5).reverse().map((event, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs font-mono border-l-2 border-green-500 pl-2 py-1"
                                >
                                    <span className="text-green-300 font-bold">{event.source}</span>
                                    <span className="mx-1 text-green-600">
                                        {event.type === "HACK" ? "hacked" : "accessed"}
                                    </span>
                                    <span className="text-red-400 font-bold">{event.target}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Center: Main Leaderboard */}
            <div className="flex-1 p-6 z-10 flex flex-col justify-center max-w-4xl mx-auto w-full">
                <h1 className="text-center font-black text-5xl text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)] mb-8 tracking-tighter uppercase">
                    Network Status
                </h1>

                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {sortedPlayers.slice(0, 5).map((player, index) => (
                            <motion.div
                                layout
                                key={player.id}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className={cn(
                                    "flex items-center p-4 rounded-none border-l-4 shadow-lg transition-colors relative overflow-hidden backdrop-blur-sm",
                                    index === 0 ? "bg-green-900/40 border-green-400 text-green-100 ring-1 ring-green-500/50" :
                                        index === 1 ? "bg-emerald-900/30 border-emerald-600 text-emerald-100" :
                                            index === 2 ? "bg-teal-900/20 border-teal-700 text-teal-100" :
                                                "bg-black/40 border-slate-700 text-slate-300"
                                )}
                            >
                                <div className="font-black text-3xl w-12 text-center opacity-50 font-mono">
                                    #{index + 1}
                                </div>
                                <div className="flex-1 font-bold text-2xl truncate px-4 font-mono tracking-tight">
                                    {player.name}
                                    {player.password && <span className="ml-2 text-xs text-green-700 border border-green-800 px-1 rounded">SECURED</span>}
                                </div>
                                <div className="font-black text-3xl font-mono flex items-center gap-2 text-green-400">
                                    <Bitcoin className="w-6 h-6 animate-pulse" />
                                    <motion.span
                                        key={player.crypto}
                                        initial={{ scale: 1.2, color: "#fff" }}
                                        animate={{ scale: 1, color: "inherit" }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {player.crypto.toLocaleString()}
                                    </motion.span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Right: Join Info */}
            <div className="w-64 p-6 flex flex-col justify-between items-end z-10 text-green-500/50 text-right font-mono">
                <div>
                    <Button
                        onClick={onEndGame}
                        variant="destructive"
                        className="font-bold border border-red-900 bg-red-950/50 hover:bg-red-900 text-red-500 shadow-[0_0_10px_rgba(220,38,38,0.2)]"
                    >
                        TERMINATE SESSION
                    </Button>
                </div>

                <div>
                    <div className="font-bold text-xs uppercase">Total Mined</div>
                    <div className="text-2xl font-black text-green-400 mb-8 drop-shadow">
                        ₿ {players.reduce((acc, p) => acc + p.crypto, 0).toLocaleString()}
                    </div>

                    <div className="text-xs font-bold uppercase tracking-wider mb-1">Access Code</div>
                    <div className="text-4xl font-black text-green-400 drop-shadow-[0_0_5px_#4ade80]">{pin}</div>
                </div>
            </div>
        </div>
    )
}
