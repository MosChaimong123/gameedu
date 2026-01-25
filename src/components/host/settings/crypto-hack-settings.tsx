"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GameSettings } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Check, Clock, Bitcoin, ChevronLeft } from "lucide-react"

interface CryptoHackSettingsProps {
    onHost: (settings: GameSettings) => void;
    onBack: () => void;
}

export function CryptoHackSettings({ onHost, onBack }: CryptoHackSettingsProps) {
    const [winCondition, setWinCondition] = useState<"TIME" | "GOLD">("TIME") // Reuse GOLD type for now, semantics mapping GOLD -> CRYPTO
    const [timeMinutes, setTimeMinutes] = useState(7)
    const [cryptoGoal, setCryptoGoal] = useState(10000) // Lower default for crypto maybe? Or high if "satoshis"? Matches image 10M? Let's stick to 10k for now.

    // Toggles
    const [showInstructions, setShowInstructions] = useState(true)
    const [allowLateJoin, setAllowLateJoin] = useState(true)
    const [useRandomNames, setUseRandomNames] = useState(false)
    const [allowStudentAccounts, setAllowStudentAccounts] = useState(true)

    const handleHost = () => {
        onHost({
            winCondition,
            timeLimitMinutes: timeMinutes,
            goldGoal: cryptoGoal, // Map to goldGoal field in schema for now
            showInstructions,
            allowLateJoin,
            useRandomNames,
            allowStudentAccounts
        })
    }

    return (
        <div className="min-h-screen bg-green-500 font-sans flex items-center justify-center p-4">
            {/* Main Card */}
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center relative animate-in zoom-in-95 duration-300">

                {/* Back Button */}
                <button onClick={onBack} className="absolute top-4 left-4 p-2 hover:bg-slate-100 rounded-full transition-colors z-10">
                    <ChevronLeft className="w-6 h-6 text-slate-500" />
                </button>

                {/* Header */}
                <div className="bg-slate-900 w-full py-6 text-center shadow-lg mb-6">
                    <h1 className="text-3xl font-black text-green-400 drop-shadow-md">Crypto Hack</h1>
                </div>

                <div className="px-8 pb-8 w-full flex flex-col gap-6">

                    {/* Host Button */}
                    <div className="w-full">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center mb-2">Ready to Play?</div>
                        <Button
                            onClick={handleHost}
                            className="w-full py-8 text-2xl font-black bg-green-500 hover:bg-green-600 text-white shadow-[0_4px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none rounded-xl transition-all"
                        >
                            Host Now
                        </Button>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Win Condition Selector */}
                    <div className="flex gap-4">
                        <div
                            onClick={() => setWinCondition("TIME")}
                            className={cn(
                                "flex-1 cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2 border-4 transition-all",
                                winCondition === "TIME"
                                    ? "bg-cyan-500 border-cyan-600 text-white shadow-md transform scale-105"
                                    : "bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Clock className="w-8 h-8" />
                            <span className="font-bold text-lg">Time</span>
                            <span className="text-xs text-center opacity-80">Game ends after time</span>
                        </div>
                        <div
                            onClick={() => setWinCondition("GOLD")}
                            className={cn(
                                "flex-1 cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2 border-4 transition-all",
                                winCondition === "GOLD"
                                    ? "bg-green-500 border-green-600 text-white shadow-md transform scale-105"
                                    : "bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Bitcoin className="w-8 h-8" />
                            <span className="font-bold text-lg">Crypto</span>
                            <span className="text-xs text-center opacity-80">Game ends at goal</span>
                        </div>
                    </div>

                    {/* Condition Input */}
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                        {winCondition === "TIME" ? (
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-slate-600">Time (minutes)</label>
                                <Input
                                    type="number"
                                    value={timeMinutes}
                                    onChange={(e) => setTimeMinutes(Number(e.target.value))}
                                    className="w-24 text-center font-bold text-lg h-12 border-slate-300"
                                    min={1}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-slate-600">Crypto Goal</label>
                                <Input
                                    type="number"
                                    value={cryptoGoal}
                                    onChange={(e) => setCryptoGoal(Number(e.target.value))}
                                    className="w-32 text-center font-bold text-lg h-12 border-slate-300"
                                    step={100}
                                />
                            </div>
                        )}
                    </div>

                    {/* Toggles List */}
                    <div className="space-y-3">
                        <ToggleItem label="Show Instructions" checked={showInstructions} onChange={setShowInstructions} />
                        <ToggleItem label="Allow Late Joining" checked={allowLateJoin} onChange={setAllowLateJoin} />
                        <ToggleItem label="Use Random Names" checked={useRandomNames} onChange={setUseRandomNames} />
                        <ToggleItem label="Allow Student Accounts" checked={allowStudentAccounts} onChange={setAllowStudentAccounts} description="Disabling limits account creation." />
                    </div>

                </div>
            </div>
        </div>
    )
}

function ToggleItem({ label, checked, onChange, description }: { label: string, checked: boolean, onChange: (v: boolean) => void, description?: string }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors select-none"
        >
            <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-lg group-hover:text-green-600 transition-colors">{label}</span>
                {description && <span className="text-xs text-slate-400">{description}</span>}
            </div>

            <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-all border-2",
                checked ? "bg-green-500 border-green-600" : "bg-white border-slate-300"
            )}>
                {checked && <Check className="w-6 h-6 text-white stroke-[4]" />}
            </div>
        </div>
    )
}
