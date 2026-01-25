"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GoldQuestPlayer } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Props = {
    players: GoldQuestPlayer[];
    events?: { source: string, target: string, type: "SWAP" | "STEAL", amount?: number }[];
    timeLeft: number;
    onEndGame?: () => void;
    goldGoal?: number;
    pin: string;
}

export function GoldQuestHostView({ players, events = [], timeLeft, onEndGame, goldGoal, pin }: Props) {
    const sortedPlayers = [...players].sort((a, b) => b.gold - a.gold);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const totalGold = players.reduce((acc, p) => acc + p.gold, 0);

    return (
        <div className="flex-1 bg-[url('https://media.blooket.com/image/upload/v1613002626/Backgrounds/goldQuest.jpg')] bg-cover bg-center flex relative overflow-hidden">
            {/* Overlay for readability if needed */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Left: Stats & Timer */}
            <div className="w-64 p-6 flex flex-col gap-6 z-10">
                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 text-white border-2 border-amber-500 shadow-xl">
                    <h2 className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-1">
                        {goldGoal ? "GOLD GOAL" : "TIME LEFT"}
                    </h2>
                    <div className="text-4xl font-black font-mono tracking-wider">
                        {goldGoal ? (
                            <div className="flex flex-col gap-2">
                                <span className="text-2xl text-amber-300">{goldGoal.toLocaleString()}</span>
                                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-1">
                                    {/* Show progress of top player */}
                                    <div
                                        className="h-full bg-amber-500 transition-all duration-500"
                                        style={{ width: `${sortedPlayers.length > 0 ? Math.min(100, (sortedPlayers[0].gold / goldGoal) * 100) : 0}%` }}
                                    />
                                </div>
                                <div className="text-xs text-slate-400 font-sans tracking-normal">Top: {sortedPlayers[0]?.gold.toLocaleString() || 0}</div>
                            </div>
                        ) : (
                            formatTime(timeLeft)
                        )}
                    </div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 text-white border-2 border-blue-500 shadow-xl flex-1">
                    <h2 className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-4">Live Feed</h2>
                    <div className="space-y-3 overflow-hidden mask-linear-fade relative h-full">
                        <AnimatePresence>
                            {events.slice(-5).reverse().map((event, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-sm bg-white/10 rounded p-2"
                                >
                                    <span className="font-bold text-amber-300">{event.source}</span>
                                    <span className="mx-1 text-slate-300">
                                        {event.type === "STEAL" ? "stole from" : "swapped with"}
                                    </span>
                                    <span className="font-bold text-red-300">{event.target}</span>
                                    {/* {event.amount && <span className="block text-xs text-amber-500 font-bold">+{event.amount} Gold</span>} */}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Center: Main Leaderboard */}
            <div className="flex-1 p-6 z-10 flex flex-col justify-center max-w-4xl mx-auto w-full">
                <h1 className="text-center font-black text-5xl text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] mb-8 tracking-tight italic">
                    LEADERBOARD
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
                                transition={{
                                    type: "spring",
                                    stiffness: 700,
                                    damping: 30
                                }}
                                className={cn(
                                    "flex items-center p-4 rounded-xl border-b-4 shadow-lg transition-colors relative overflow-hidden",
                                    index === 0 ? "bg-amber-400 border-amber-600 text-amber-900" :
                                        index === 1 ? "bg-slate-300 border-slate-500 text-slate-900" :
                                            index === 2 ? "bg-amber-700 border-amber-900 text-amber-100" :
                                                "bg-white border-slate-200 text-slate-800"
                                )}
                            >
                                {/* Rank Shine Effect for Top 3 */}
                                {index < 3 && (
                                    <motion.div
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "200%" }}
                                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                                        className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
                                    />
                                )}

                                <div className="font-black text-3xl w-12 text-center opacity-50 italic">
                                    #{index + 1}
                                </div>
                                <div className="flex-1 font-bold text-2xl truncate px-4">
                                    {player.name}
                                </div>
                                <div className="font-black text-3xl font-mono flex items-center gap-2">
                                    {/* Gold Icon */}
                                    <div className={cn(
                                        "w-8 h-8 rounded-full border-2 shadow-inner flex items-center justify-center text-xs font-bold",
                                        index === 0 ? "bg-yellow-300 border-yellow-500 text-yellow-800" :
                                            "bg-yellow-400 border-yellow-600 text-yellow-800"
                                    )}>
                                        $
                                    </div>
                                    <motion.span
                                        key={player.gold}
                                        initial={{ scale: 1.2, color: "#10b981" }}
                                        animate={{ scale: 1, color: "inherit" }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {player.gold.toLocaleString()}
                                    </motion.span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Right: Join Info / QR (optional, maybe collapsed) */}
            <div className="w-64 p-6 flex flex-col justify-between items-end z-10 text-white/50 text-right">
                <div>
                    <Button
                        onClick={onEndGame}
                        variant="destructive"
                        className="font-bold border-2 border-red-700 shadow-[0_4px_0_rgb(185,28,28)] active:shadow-none active:translate-y-1"
                    >
                        End Game Now
                    </Button>
                </div>

                <div>
                    <div className="font-bold">Total Gold</div>
                    <div className="text-2xl font-black text-white mb-8">
                        {players.reduce((acc, p) => acc + p.gold, 0).toLocaleString()}
                    </div>

                    <div className="text-sm font-bold uppercase tracking-wider mb-1">Join Code</div>
                    <div className="text-4xl font-black text-white">{pin}</div>
                </div>
            </div>
        </div>
    )
}
