"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GameSettings } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Check, ChevronLeft, Swords, Shield, Clock } from "lucide-react"

interface BattleTurnSettingsProps {
    onHost: (settings: GameSettings & BattleSettings) => void
    onBack: () => void
}

export interface BattleSettings {
    bossHp: number
    bossAtk: number
    farmingDurationMinutes: number
    enableBossRaid: boolean
    enableSoloFarming: boolean
}

export function BattleTurnSettings({ onHost, onBack }: BattleTurnSettingsProps) {
    const [bossHp, setBossHp] = useState(5000)
    const [bossAtk, setBossAtk] = useState(80)
    const [farmingDurationMinutes, setFarmingDurationMinutes] = useState(10)
    const [enableBossRaid, setEnableBossRaid] = useState(true)
    const [enableSoloFarming, setEnableSoloFarming] = useState(true)
    const [allowLateJoin, setAllowLateJoin] = useState(false)

    const handleHost = () => {
        onHost({
            // Base GameSettings fields
            winCondition: "TIME",
            timeLimitMinutes: farmingDurationMinutes,
            goldGoal: 0,
            allowLateJoin,
            showInstructions: true,
            useRandomNames: false,
            allowStudentAccounts: true,
            // Battle-specific
            bossHp,
            bossAtk,
            farmingDurationMinutes,
            enableBossRaid,
            enableSoloFarming,
        })
    }

    return (
        <div className="min-h-screen bg-red-950 font-sans flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center relative animate-in zoom-in-95 duration-300">

                <button onClick={onBack} className="absolute top-4 left-4 p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-slate-500" />
                </button>

                <div className="bg-red-800 w-full py-6 text-center shadow-lg mb-6">
                    <div className="flex items-center justify-center gap-3">
                        <Swords className="w-8 h-8 text-red-200" />
                        <h1 className="text-3xl font-black text-white drop-shadow-md">Battle RPG</h1>
                        <Swords className="w-8 h-8 text-red-200 scale-x-[-1]" />
                    </div>
                    <p className="text-red-300 text-sm mt-1">Co-op Boss Raid + Solo Farming</p>
                </div>

                <div className="px-8 pb-8 w-full flex flex-col gap-6">

                    <Button
                        onClick={handleHost}
                        className="w-full py-8 text-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_0_rgb(153,27,27)] active:translate-y-1 active:shadow-none rounded-xl transition-all"
                    >
                        Host Now
                    </Button>

                    <hr className="border-slate-200" />

                    {/* Phase toggles */}
                    <div className="flex gap-4">
                        <div
                            onClick={() => setEnableBossRaid(!enableBossRaid)}
                            className={cn(
                                "flex-1 cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2 border-4 transition-all",
                                enableBossRaid
                                    ? "bg-red-600 border-red-700 text-white shadow-md scale-105"
                                    : "bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Swords className="w-8 h-8" />
                            <span className="font-bold text-sm text-center">Boss Raid</span>
                        </div>
                        <div
                            onClick={() => setEnableSoloFarming(!enableSoloFarming)}
                            className={cn(
                                "flex-1 cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2 border-4 transition-all",
                                enableSoloFarming
                                    ? "bg-amber-500 border-amber-600 text-white shadow-md scale-105"
                                    : "bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Shield className="w-8 h-8" />
                            <span className="font-bold text-sm text-center">Solo Farming</span>
                        </div>
                    </div>

                    {/* Boss Config */}
                    {enableBossRaid && (
                        <div className="bg-red-50 p-4 rounded-xl border-2 border-red-200 space-y-3">
                            <p className="font-bold text-red-700 text-sm uppercase tracking-wide">Boss Settings</p>
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-slate-600">Boss HP</label>
                                <Input
                                    type="number"
                                    value={bossHp}
                                    onChange={(e) => setBossHp(Number(e.target.value))}
                                    className="w-28 text-center font-bold text-lg h-12 border-slate-300"
                                    step={500}
                                    min={500}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-slate-600">Boss ATK</label>
                                <Input
                                    type="number"
                                    value={bossAtk}
                                    onChange={(e) => setBossAtk(Number(e.target.value))}
                                    className="w-28 text-center font-bold text-lg h-12 border-slate-300"
                                    step={10}
                                    min={10}
                                />
                            </div>
                        </div>
                    )}

                    {/* Farming Duration */}
                    {enableSoloFarming && (
                        <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                    <label className="font-bold text-slate-600">Farming Time (min)</label>
                                </div>
                                <Input
                                    type="number"
                                    value={farmingDurationMinutes}
                                    onChange={(e) => setFarmingDurationMinutes(Number(e.target.value))}
                                    className="w-24 text-center font-bold text-lg h-12 border-slate-300"
                                    min={3}
                                    max={30}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2 text-center">
                                Solo farming phase duration after boss is defeated.
                            </p>
                        </div>
                    )}

                    {/* Toggles */}
                    <div className="space-y-3">
                        <ToggleItem label="Allow Late Joining" checked={allowLateJoin} onChange={setAllowLateJoin} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function ToggleItem({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors select-none"
        >
            <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-lg group-hover:text-red-600 transition-colors">{label}</span>
                {description && <span className="text-xs text-slate-400">{description}</span>}
            </div>
            <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-all border-2",
                checked ? "bg-red-500 border-red-600" : "bg-white border-slate-300"
            )}>
                {checked && <Check className="w-6 h-6 text-white stroke-[4]" />}
            </div>
        </div>
    )
}
