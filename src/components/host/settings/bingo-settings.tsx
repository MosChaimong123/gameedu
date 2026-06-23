"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GameSettings } from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Check, Clock, Grid3x3 } from "lucide-react"
import { PageBackLink } from "@/components/ui/page-back-link"
import { useLanguage } from "@/components/providers/language-provider"

interface BingoSettingsProps {
    onHost: (settings: GameSettings) => void
    onBack: () => void
}

const CARD_SIZES: Array<3 | 4 | 5> = [3, 4, 5]

export function BingoSettings({ onHost, onBack }: BingoSettingsProps) {
    const { t } = useLanguage()
    const [cardSize, setCardSize] = useState<3 | 4 | 5>(4)
    const [winCondition, setWinCondition] = useState<"TIME" | "LINES">("LINES")
    const [timeMinutes, setTimeMinutes] = useState(10)
    const [linesToWin, setLinesToWin] = useState(3)

    const [showInstructions, setShowInstructions] = useState(true)
    const [allowLateJoin, setAllowLateJoin] = useState(true)
    const [useRandomNames, setUseRandomNames] = useState(false)
    const [allowStudentAccounts, setAllowStudentAccounts] = useState(true)

    const handleHost = () => {
        onHost({
            winCondition,
            timeLimitMinutes: timeMinutes,
            goldGoal: 0,
            cardSize,
            bingoLinesToWin: linesToWin,
            showInstructions,
            allowLateJoin,
            useRandomNames,
            allowStudentAccounts,
        })
    }

    return (
        <div className="min-h-screen bg-emerald-400 font-sans flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center relative animate-in zoom-in-95 duration-300">
                <PageBackLink
                    onClick={onBack}
                    labelKey="hostBackSelectMode"
                    variant="minimal"
                    className="absolute left-3 top-3 z-10 border border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm [&>span]:max-sm:sr-only"
                />

                <div className="bg-emerald-700 w-full py-6 text-center shadow-lg mb-6">
                    <h1 className="text-3xl font-black text-white drop-shadow-md">{t("hostBingoTitle")}</h1>
                    <p className="mt-2 px-4 text-sm font-semibold text-white/90">{t("hostBingoSettingsSubtitle")}</p>
                </div>

                <div className="px-8 pb-8 w-full flex flex-col gap-6">
                    {/* Host Button */}
                    <div className="w-full">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center mb-2">
                            {t("hostReadyToPlay")}
                        </div>
                        <Button
                            onClick={handleHost}
                            className="w-full py-8 text-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_0_rgb(5,150,105)] active:translate-y-1 active:shadow-none rounded-xl transition-all"
                        >
                            {t("hostHostNow")}
                        </Button>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Card Size */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Grid3x3 className="h-5 w-5" />
                            <span className="font-bold">{t("hostBingoCardSizeLabel")}</span>
                        </div>
                        <div className="flex gap-3">
                            {CARD_SIZES.map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => setCardSize(size)}
                                    className={cn(
                                        "flex-1 cursor-pointer rounded-xl p-4 flex flex-col items-center gap-1 border-4 transition-all",
                                        cardSize === size
                                            ? "bg-emerald-500 border-emerald-600 text-white shadow-md scale-105"
                                            : "bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200"
                                    )}
                                >
                                    <span className="font-black text-xl">{`${size}×${size}`}</span>
                                    {size === 5 && (
                                        <span className="text-[10px] font-bold uppercase tracking-wide">
                                            {t("hostBingoFreeCenterNote")}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400">{t("hostBingoCardSizeHint")}</p>
                    </div>

                    {/* Win Condition */}
                    <div className="flex gap-4">
                        <div
                            onClick={() => setWinCondition("LINES")}
                            className={cn(
                                "flex-1 cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2 border-4 transition-all",
                                winCondition === "LINES"
                                    ? "bg-emerald-500 border-emerald-600 text-white shadow-md scale-105"
                                    : "bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Grid3x3 className="w-8 h-8" />
                            <span className="font-bold text-lg">{t("hostBingoWinConditionLines")}</span>
                        </div>
                        <div
                            onClick={() => setWinCondition("TIME")}
                            className={cn(
                                "flex-1 cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2 border-4 transition-all",
                                winCondition === "TIME"
                                    ? "bg-cyan-500 border-cyan-600 text-white shadow-md scale-105"
                                    : "bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Clock className="w-8 h-8" />
                            <span className="font-bold text-lg">{t("hostWinConditionTime")}</span>
                        </div>
                    </div>

                    {/* Condition Input */}
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                        {winCondition === "LINES" ? (
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-slate-600">{t("hostBingoLinesToWinLabel")}</label>
                                <Input
                                    type="number"
                                    value={linesToWin}
                                    onChange={(e) => setLinesToWin(Math.max(1, Number(e.target.value)))}
                                    className="w-24 text-center font-bold text-lg h-12 border-slate-300"
                                    min={1}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-slate-600">{t("hostTimeMinutes")}</label>
                                <Input
                                    type="number"
                                    value={timeMinutes}
                                    onChange={(e) => setTimeMinutes(Math.max(1, Number(e.target.value)))}
                                    className="w-24 text-center font-bold text-lg h-12 border-slate-300"
                                    min={1}
                                />
                            </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2 text-center">
                            {winCondition === "LINES" ? t("hostBingoHintLines") : t("hostBingoHintTime")}
                        </p>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                        <ToggleItem
                            label={t("hostToggleShowInstructions")}
                            checked={showInstructions}
                            onChange={setShowInstructions}
                        />
                        <ToggleItem label={t("hostToggleLateJoin")} checked={allowLateJoin} onChange={setAllowLateJoin} />
                        <ToggleItem label={t("hostToggleRandomNames")} checked={useRandomNames} onChange={setUseRandomNames} />
                        <ToggleItem
                            label={t("hostToggleStudentAccounts")}
                            checked={allowStudentAccounts}
                            onChange={setAllowStudentAccounts}
                            description={t("hostToggleStudentAccountsDesc")}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function ToggleItem({
    label,
    checked,
    onChange,
    description,
}: {
    label: string
    checked: boolean
    onChange: (v: boolean) => void
    description?: string
}) {
    return (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors select-none"
        >
            <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-lg group-hover:text-emerald-600 transition-colors">{label}</span>
                {description && <span className="text-xs text-slate-400">{description}</span>}
            </div>
            <div
                className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center transition-all border-2",
                    checked ? "bg-emerald-500 border-emerald-600" : "bg-white border-slate-300"
                )}
            >
                {checked && <Check className="w-6 h-6 text-white stroke-[4]" />}
            </div>
        </div>
    )
}
