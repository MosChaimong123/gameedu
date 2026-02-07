"use client"
// Force Rebuild

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
    // Deduplicate players by ID to prevent key duplicate errors
    const uniquePlayers = Array.from(new Map(players.map(p => [p.id, p])).values());
    const sortedPlayers = [...uniquePlayers].sort((a, b) => b.crypto - a.crypto);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const totalCrypto = players.reduce((acc, p) => acc + p.crypto, 0);

    return (
        <div className="h-screen w-full bg-black relative overflow-hidden font-mono text-green-400 selection:bg-green-900 selection:text-white">
            {/* Cyberpunk Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: "linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)",
                backgroundSize: "40px 40px"
            }} />

            {/* CRT Scanline Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://media.istockphoto.com/id/1130691526/vector/scanlines-vector-grunge-texture-overlay.jpg?s=612x612&w=0&k=20&c=6c0-6d0-6d0-6d0')] bg-repeat" />

            <div className="relative z-10 w-full h-full p-6 grid grid-cols-12 gap-6">

                {/* LEFT COLUMN: System Status */}
                <div className="col-span-3 flex flex-col gap-6">
                    {/* Time / Target */}
                    <div className="bg-black/80 border border-green-500/50 rounded p-6 shadow-[0_0_20px_rgba(34,197,94,0.1)] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 animate-pulse" />
                        <h2 className="text-green-600 font-bold uppercase tracking-widest text-xs mb-2 flex justify-between">
                            <span>{cryptoGoal ? "TARGET PROTOCOL" : "SYSTEM UPTIME"}</span>
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                        </h2>

                        {cryptoGoal ? (
                            <div className="w-full">
                                <div className="text-3xl font-black text-green-400 mb-2 truncate">
                                    ₿ {cryptoGoal.toLocaleString()}
                                </div>
                                <div className="w-full h-2 bg-green-900/30 border border-green-500/30 rounded-none overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 shadow-[0_0_10px_#22c55e]"
                                        style={{ width: `${sortedPlayers.length > 0 ? Math.min(100, (sortedPlayers[0].crypto / cryptoGoal) * 100) : 0}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-xs text-green-700 flex justify-between font-bold">
                                    <span>TOP AGENT</span>
                                    <span>{sortedPlayers[0]?.crypto.toLocaleString() || 0}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-6xl font-black text-green-500 tracking-tighter drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                                {formatTime(timeLeft)}
                            </div>
                        )}
                    </div>

                    {/* Network Log */}
                    <div className="flex-1 bg-black/80 border border-green-500/30 rounded p-4 flex flex-col overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500" />
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-green-500" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500" />

                        <h2 className="text-green-600 font-bold uppercase tracking-widest text-xs mb-4 border-b border-green-900 pb-2">
                            &gt; NETWORK_LOG
                        </h2>
                        <div className="flex-1 overflow-hidden relative space-y-2 font-mono text-xs">
                            <AnimatePresence mode="popLayout">
                                {events.slice(-10).reverse().map((event, i) => (
                                    <motion.div
                                        layout
                                        key={`${event.source}-${event.target}-${i}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex flex-wrap items-center gap-1 text-green-300"
                                    >
                                        <span className="text-green-500">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                                        <span className="font-bold text-green-200">{event.source}</span>
                                        <span className={cn(
                                            "uppercase text-[10px] px-1 rounded bg-opacity-20",
                                            event.type === "HACK" ? "bg-red-500 text-red-400" : "bg-blue-500 text-blue-400"
                                        )}>
                                            {event.type}
                                        </span>
                                        <span className="text-green-200">{event.target}</span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {events.length === 0 && (
                                <div className="text-green-900 text-center italic mt-10 animate-pulse">
                                    LISTENING FOR TRAFFIC...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CENTER COLUMN: Leaderboard */}
                <div className="col-span-6 flex flex-col">
                    <div className="text-center mb-6 relative">
                        <h1 className="text-5xl font-black text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)] tracking-tighter uppercase glitch-text" data-text="NETWORK STATUS">
                            NETWORK STATUS
                        </h1>
                    </div>

                    <div className="flex-1 bg-green-950/10 border-x border-green-500/10 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {sortedPlayers.slice(0, 7).map((player, index) => (
                                <motion.div
                                    layout
                                    key={player.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "flex items-center p-4 border-l-4 transition-all relative overflow-hidden group bg-black/40",
                                        index === 0 ? "border-green-400 bg-green-900/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]" :
                                            index === 1 ? "border-green-600 bg-green-900/10" :
                                                index === 2 ? "border-green-800 bg-green-900/5" :
                                                    "border-green-900/50 hover:border-green-700"
                                    )}
                                >
                                    <div className="font-black text-2xl w-12 text-center text-green-700 font-mono">
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <div className="font-bold text-xl truncate tracking-tight text-green-300 group-hover:text-green-100 transition-colors">
                                            {player.name}
                                        </div>
                                        {/* Icons/Status */}
                                    </div>
                                    <div className="font-black text-2xl font-mono px-4 flex items-center gap-3 text-green-400">
                                        <Bitcoin className={cn("w-5 h-5", index === 0 ? "animate-pulse" : "")} />
                                        <span>{player.crypto.toLocaleString()}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* RIGHT COLUMN: Controls */}
                <div className="col-span-3 flex flex-col gap-6">
                    {/* Access Code */}
                    <div className="bg-black/90 border border-green-500/50 rounded-lg p-6 text-center shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                        <div className="absolute top-2 right-2 text-[10px] text-green-800 border border-green-900 px-1">SECURE</div>
                        <div className="text-xs font-bold uppercase text-green-700 tracking-[0.2em] mb-2">Access Code</div>
                        <div className="text-6xl font-black text-green-400 tracking-widest font-mono drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">
                            {pin}
                        </div>
                    </div>

                    {/* Total Mined */}
                    <div className="bg-black/80 border-t-2 border-green-600/50 rounded-b-lg p-6 text-center">
                        <div className="text-xs font-bold uppercase text-green-700 tracking-widest mb-1">Total Mined</div>
                        <div className="text-4xl font-black text-green-500 flex justify-center items-center gap-2">
                            <Bitcoin className="w-8 h-8" />
                            {totalCrypto.toLocaleString()}
                        </div>
                    </div>

                    <div className="flex-1" />

                    <Button
                        onClick={onEndGame}
                        className="w-full bg-red-950/80 hover:bg-red-600 text-red-500 hover:text-white border border-red-800 font-bold text-xl py-8 rounded shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all uppercase tracking-widest font-mono group relative overflow-hidden"
                    >
                        <span className="relative z-10 group-hover:animate-pulse">TERMINATE SESSION</span>
                        <div className="absolute inset-0 bg-red-600/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </Button>
                </div>

            </div>
        </div>
    )
}
