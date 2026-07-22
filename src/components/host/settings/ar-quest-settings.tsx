"use client"

import { useState } from "react"
import { Camera, Clock, Hand, Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageBackLink } from "@/components/ui/page-back-link"
import type { GameSettings } from "@/lib/types/game"
import { cn } from "@/lib/utils"

type PlaySurface = "teacher" | "student"

export function ArQuestSettings({
    onHost,
    onBack,
}: {
    onHost: (settings: GameSettings) => void
    onBack: () => void
}) {
    const [timeMinutes, setTimeMinutes] = useState(7)
    const [playSurface, setPlaySurface] = useState<PlaySurface>("student")
    const [allowLateJoin, setAllowLateJoin] = useState(true)
    const [allowStudentAccounts, setAllowStudentAccounts] = useState(true)

    const handleHost = () => {
        onHost({
            winCondition: "TIME",
            timeLimitMinutes: timeMinutes,
            goldGoal: 1000000,
            showInstructions: true,
            allowLateJoin,
            useRandomNames: false,
            allowStudentAccounts,
            arQuest: {
                playSurface,
                inputMode: "local-camera",
                trackingMode: "hand",
            },
        })
    }

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 p-4 text-white">
            <div className="relative w-full max-w-lg rounded-lg border border-cyan-200/20 bg-white p-5 text-slate-950 shadow-2xl sm:p-7">
                <PageBackLink
                    onClick={onBack}
                    labelKey="hostBackSelectMode"
                    variant="minimal"
                    className="absolute left-3 top-3 z-10 border border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm [&>span]:max-sm:sr-only"
                />
                <div className="mb-6 rounded-lg bg-cyan-950 px-5 py-7 text-center text-white">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-200/30">
                        <Hand className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl font-black">AR Quest</h1>
                    <p className="mt-2 text-sm font-semibold text-cyan-100/80">Local Camera + Hand Tracking</p>
                </div>

                <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {([
                            { id: "student" as const, icon: Smartphone, label: "จอนักเรียน" },
                            { id: "teacher" as const, icon: Monitor, label: "จอครู" },
                        ]).map((option) => {
                            const Icon = option.icon
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setPlaySurface(option.id)}
                                    className={cn(
                                        "flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border-2 text-sm font-black transition",
                                        playSurface === option.id
                                            ? "border-brand-pink bg-pink-50 text-brand-pink shadow-md"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200"
                                    )}
                                >
                                    <Icon className="h-7 w-7" />
                                    {option.label}
                                </button>
                            )
                        })}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 font-black text-slate-700">
                                <Clock className="h-5 w-5 text-cyan-600" />
                                เวลาเล่น
                            </label>
                            <Input
                                type="number"
                                min={1}
                                value={timeMinutes}
                                onChange={(event) => setTimeMinutes(Number(event.target.value))}
                                className="h-12 w-24 text-center text-lg font-black"
                            />
                        </div>
                        <p className="mt-2 text-center text-xs font-semibold text-slate-500">นาที</p>
                    </div>

                    <div className="grid gap-3">
                        <ToggleRow label="อนุญาตเข้าเล่นระหว่างเกม" checked={allowLateJoin} onChange={setAllowLateJoin} />
                        <ToggleRow label="อนุญาตบัญชีนักเรียน" checked={allowStudentAccounts} onChange={setAllowStudentAccounts} />
                    </div>

                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4 text-sm font-semibold leading-relaxed text-cyan-950">
                        <div className="mb-2 flex items-center gap-2 font-black">
                            <Camera className="h-4 w-4" />
                            เฟส 1
                        </div>
                        ใช้กล้องในเครื่องและ hand tracking layer จากหน้า AR Quest ก่อน จากนั้นเชื่อม MediaPipe จริงในเฟสถัดไป
                    </div>

                    <Button
                        onClick={handleHost}
                        className="w-full rounded-xl bg-brand-pink py-7 text-xl font-black text-white shadow-md shadow-pink-200 hover:opacity-95"
                    >
                        Host AR Quest
                    </Button>
                </div>
            </div>
        </div>
    )
}

function ToggleRow({
    label,
    checked,
    onChange,
}: {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left font-bold text-slate-700"
        >
            <span>{label}</span>
            <span
                className={cn(
                    "h-7 w-12 rounded-full p-1 transition",
                    checked ? "bg-cyan-500" : "bg-slate-300"
                )}
            >
                <span
                    className={cn(
                        "block h-5 w-5 rounded-full bg-white shadow transition",
                        checked && "translate-x-5"
                    )}
                />
            </span>
        </button>
    )
}
