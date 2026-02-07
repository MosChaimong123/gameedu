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
        <div className="h-screen w-full bg-slate-950 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-white">
            {/* Background Image & Warm Overlay */}
            <div className="absolute inset-0 bg-[url('https://media.blooket.com/image/upload/v1613002626/Backgrounds/goldQuest.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950/90 via-slate-900/60 to-amber-950/90" />

            {/* Animated Gold Dust / Particles (using CSS for simplicity) */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse" />

            <div className="relative z-10 w-full h-full p-6 grid grid-cols-12 gap-6">

                {/* LEFT COLUMN: Timer & Feed */}
                <div className="col-span-3 flex flex-col gap-6">
                    {/* Timer/Goal Card */}
                    <div className="bg-black/40 backdrop-blur-xl border-4 border-amber-500/50 rounded-3xl p-6 shadow-[0_0_20px_rgba(245,158,11,0.2)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <div className="w-16 h-16 rounded-full border-4 border-white" />
                        </div>

                        <h2 className="text-amber-400 font-extrabold uppercase tracking-widest text-xs mb-2">
                            {goldGoal ? "GOLD GOAL" : "TIME REMAINING"}
                        </h2>

                        <div className="flex items-baseline gap-2">
                            {goldGoal ? (
                                <div className="w-full">
                                    <div className="text-4xl font-black text-amber-300 mb-2 drop-shadow-md">
                                        {goldGoal.toLocaleString()}
                                    </div>
                                    <div className="w-full h-4 bg-black/50 rounded-full border border-amber-900/50 p-0.5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${sortedPlayers.length > 0 ? Math.min(100, (sortedPlayers[0].gold / goldGoal) * 100) : 0}%` }}
                                            className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-200 rounded-full shadow-[0_0_10px_#f59e0b]"
                                        />
                                    </div>
                                    <div className="mt-3 text-xs font-bold text-amber-200/80 flex justify-between uppercase tracking-wider">
                                        <span>Current Top</span>
                                        <span className="text-white">{sortedPlayers[0]?.gold.toLocaleString() || 0}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-7xl font-black text-white font-mono tracking-tighter drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
                                    {formatTime(timeLeft)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live Feed */}
                    <div className="flex-1 bg-black/40 backdrop-blur-xl border-4 border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden">
                        <h2 className="text-blue-300 font-extrabold uppercase tracking-widest text-xs mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse box-content border-2 border-blue-400/30" />
                            Live Activity
                        </h2>
                        <div className="flex-1 overflow-hidden relative space-y-3 mask-linear-fade">
                            <AnimatePresence mode="popLayout">
                                {events.slice(-8).reverse().map((event, i) => (
                                    <motion.div
                                        layout
                                        key={`${event.source}-${event.target}-${i}`}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-sm bg-slate-900/60 border-l-4 border-amber-500 rounded-r-xl p-3 shadow-sm relative group"
                                    >
                                        <div className="flex flex-wrap items-center gap-1.5 relative z-10">
                                            <span className="font-bold text-amber-300 drop-shadow-sm">{event.source}</span>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase px-1.5 py-0.5 rounded",
                                                event.type === "STEAL" ? "bg-red-500/20 text-red-300" : "bg-blue-500/20 text-blue-300"
                                            )}>
                                                {event.type === "STEAL" ? "stole" : "swapped"}
                                            </span>
                                            <span className="font-bold text-white/90">{event.target}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {events.length === 0 && (
                                <div className="text-amber-500/50 text-center text-sm italic mt-10 font-medium">
                                    Waiting for gold movements...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CENTER COLUMN: Leaderboard */}
                <div className="col-span-6 flex flex-col">
                    <div className="text-center mb-8">
                        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-500 to-amber-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] stroke-text-gold tracking-tighter transform -rotate-1">
                            LEADERBOARD
                        </h1>
                    </div>

                    <div className="flex-1 p-2 space-y-3 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {sortedPlayers.slice(0, 7).map((player, index) => (
                                <motion.div
                                    layout
                                    key={player.id}
                                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className={cn(
                                        "flex items-center p-4 rounded-2xl shadow-xl relative overflow-hidden border-2 transform transition-all",
                                        index === 0 ? "bg-gradient-to-r from-yellow-500 to-amber-600 border-yellow-300 text-white scale-105 z-10" :
                                            index === 1 ? "bg-gradient-to-r from-slate-300 to-slate-400 border-white text-slate-900" :
                                                index === 2 ? "bg-gradient-to-r from-amber-700 to-amber-800 border-amber-600 text-amber-100" :
                                                    "bg-slate-800/80 border-slate-700 text-slate-200"
                                    )}
                                >
                                    {/* Rank Badge */}
                                    <div className={cn(
                                        "min-w-12 h-12 flex items-center justify-center rounded-xl font-black text-2xl mr-4 shadow-inner",
                                        index === 0 ? "bg-black/20 text-white" :
                                            index === 1 ? "bg-white/50 text-slate-800" :
                                                index === 2 ? "bg-black/20 text-amber-200" :
                                                    "bg-slate-900/50 text-slate-500"
                                    )}>
                                        #{index + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-2xl truncate tracking-tight drop-shadow-md">
                                            {player.name}
                                        </div>
                                    </div>

                                    <div className="font-black text-3xl font-mono px-4 flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3)] border-2",
                                            index === 0 ? "bg-yellow-400 border-yellow-200 text-yellow-800" :
                                                "bg-amber-500 border-amber-400 text-amber-900"
                                        )}>$</div>
                                        <span className="drop-shadow-sm">{player.gold.toLocaleString()}</span>
                                    </div>

                                    {/* Shine Effect for #1 */}
                                    {index === 0 && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-shine pointer-events-none" />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* RIGHT COLUMN: Stats & Controls */}
                <div className="col-span-3 flex flex-col gap-6">
                    {/* Game Code */}
                    <div className="bg-black/40 backdrop-blur-xl border-4 border-purple-500/50 rounded-3xl p-8 text-center shadow-[0_0_30px_rgba(168,85,247,0.3)] transform hover:scale-105 transition-transform duration-300">
                        <div className="text-sm font-black uppercase text-purple-300 tracking-[0.3em] mb-4">Join Code</div>
                        <div className="text-7xl font-black text-white tracking-widest drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                            {pin}
                        </div>
                    </div>

                    {/* Total Gold */}
                    <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-3xl p-1 shadow-2xl">
                        <div className="bg-black/30 backdrop-blur-sm rounded-[1.3rem] p-6 text-center h-full border border-amber-400/30">
                            <div className="text-xs font-bold uppercase text-amber-200 tracking-widest mb-2">Total Loot</div>
                            <div className="text-5xl font-black text-white drop-shadow-md">
                                {totalGold.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1" />

                    {/* End Game Button */}
                    <Button
                        onClick={onEndGame}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-2xl py-10 rounded-3xl shadow-[0_8px_0_rgb(153,27,27)] active:shadow-none active:translate-y-2 transition-all uppercase tracking-wider border-2 border-red-400"
                    >
                        End Game
                    </Button>
                </div>

            </div>
        </div>
    )
}
