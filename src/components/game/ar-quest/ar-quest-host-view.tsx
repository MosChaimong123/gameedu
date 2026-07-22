"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import type { ArQuestPlayer } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Camera, Hand, StopCircle, Trophy, Users } from "lucide-react"

export function ArQuestHostView({
    players,
    timeLeft,
    onEndGame,
    pin,
}: {
    players: ArQuestPlayer[]
    timeLeft: number
    onEndGame: () => void
    pin: string
}) {
    const sortedPlayers = [...players].sort((a, b) => b.arScore - a.arScore)
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60

    return (
        <div className="flex min-h-[100dvh] flex-col bg-slate-950 p-4 text-white sm:p-6">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-200/20 bg-white/10 p-4 backdrop-blur">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">AR Quest Live</p>
                    <h1 className="mt-1 text-3xl font-black">PIN {pin}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge icon={<Camera className="h-4 w-4" />} label="Local Camera" />
                    <StatusBadge icon={<Hand className="h-4 w-4" />} label="Hand Tracking" />
                    <StatusBadge label={`${minutes}:${seconds.toString().padStart(2, "0")}`} />
                    <Button
                        onClick={onEndGame}
                        className="rounded-xl bg-red-600 font-black text-white hover:bg-red-500"
                    >
                        <StopCircle className="mr-2 h-4 w-4" />
                        End
                    </Button>
                </div>
            </header>

            <main className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_22rem]">
                <section className="relative overflow-hidden rounded-lg border border-cyan-200/20 bg-slate-900">
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(34,211,238,0.18),transparent_42%),linear-gradient(300deg,rgba(244,63,138,0.18),transparent_42%)]" />
                    <div className="relative flex h-full min-h-[28rem] items-center justify-center p-6 text-center">
                        <div>
                            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-200/30">
                                <Hand className="h-14 w-14" />
                            </div>
                            <h2 className="text-4xl font-black">AR Quest กำลังเล่น</h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-white/70">
                                นักเรียนตอบคำถามด้วยการเลือกคำตอบจากหน้าจอเล่น ตอนนี้ engine เก็บคะแนน, streak และอันดับแบบ live แล้ว
                            </p>
                        </div>
                    </div>
                </section>

                <aside className="rounded-lg border border-white/10 bg-white p-4 text-slate-950">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-black">อันดับ</h2>
                        <Users className="h-5 w-5 text-brand-pink" />
                    </div>
                    <div className="space-y-2">
                        {sortedPlayers.map((player, index) => (
                            <div
                                key={player.id || player.name}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2",
                                    index === 0 ? "bg-amber-100 text-amber-950" : "bg-slate-100"
                                )}
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                                    {index + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-black">{player.name}</span>
                                <span className="flex items-center gap-1 text-sm font-black text-brand-pink">
                                    <Trophy className="h-4 w-4" />
                                    {player.arScore}
                                </span>
                            </div>
                        ))}
                        {sortedPlayers.length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400">
                                รอนักเรียนเข้าห้อง
                            </div>
                        )}
                    </div>
                </aside>
            </main>
        </div>
    )
}

function StatusBadge({ icon, label }: { icon?: React.ReactNode; label: string }) {
    return (
        <span className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-sm font-black text-white">
            {icon}
            {label}
        </span>
    )
}
