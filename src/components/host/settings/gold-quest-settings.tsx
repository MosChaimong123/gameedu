"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DEFAULT_NEGAMON_BATTLE_TUNING,
    type GameSettings,
    type NegamonBattleTuning,
} from "@/lib/types/game"
import { cn } from "@/lib/utils"
import { Check, Clock, Coins } from "lucide-react"
import { PageBackLink } from "@/components/ui/page-back-link"
import { useLanguage } from "@/components/providers/language-provider"

interface GoldQuestSettingsProps {
    onHost: (settings: GameSettings) => void;
    onBack: () => void;
    /** โหมด Negamon Battle — ซ่อนเงื่อนไข Gold และอธิบายกฎจบเกม */
    forNegamonBattle?: boolean;
    /** จาก query `?classroomId=` — แสดงว่าหลังจบแมตช์จะซิงค์ EXP เข้าห้อง (เมื่อ Negamon เปิดในห้อง) */
    linkedClassroomId?: string | null;
}

export function GoldQuestSettings({
    onHost,
    onBack,
    forNegamonBattle = false,
    linkedClassroomId = null,
}: GoldQuestSettingsProps) {
    const { t } = useLanguage()
    const [winCondition, setWinCondition] = useState<"TIME" | "GOLD">("TIME")
    const [timeMinutes, setTimeMinutes] = useState(7)
    const [goldGoal, setGoldGoal] = useState(1000000)

    // Toggles
    const [showInstructions, setShowInstructions] = useState(true)
    const [allowLateJoin, setAllowLateJoin] = useState(true)
    const [useRandomNames, setUseRandomNames] = useState(false)
    const [allowStudentAccounts, setAllowStudentAccounts] = useState(true)
    const [negamonTune, setNegamonTune] = useState<NegamonBattleTuning>({
        ...DEFAULT_NEGAMON_BATTLE_TUNING,
    })

    const handleHost = () => {
        const base: GameSettings = {
            winCondition: forNegamonBattle ? "TIME" : winCondition,
            timeLimitMinutes: timeMinutes,
            goldGoal,
            showInstructions,
            allowLateJoin,
            useRandomNames,
            allowStudentAccounts,
        }
        if (forNegamonBattle) {
            base.negamonBattle = { ...negamonTune }
        }
        onHost(base)
    }

    return (
        <div className="min-h-screen bg-cyan-400 font-sans flex items-center justify-center p-4">
            {/* Main Card */}
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center relative animate-in zoom-in-95 duration-300">

                <PageBackLink
                    onClick={onBack}
                    labelKey="hostBackSelectMode"
                    variant="minimal"
                    className="absolute left-3 top-3 z-10 border border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm [&>span]:max-sm:sr-only"
                />

                {/* Header */}
                <div className="bg-purple-700 w-full py-6 text-center shadow-lg mb-6">
                    <h1 className="text-3xl font-black text-white drop-shadow-md">
                        {forNegamonBattle ? t("hostNegamonBattleTitle") : t("hostGoldQuestTitle")}
                    </h1>
                    {forNegamonBattle && (
                        <p className="mt-2 px-4 text-sm font-semibold text-white/90">{t("hostNegamonSettingsSubtitle")}</p>
                    )}
                </div>

                <div className="px-8 pb-8 w-full flex flex-col gap-6">

                    {/* Host Button */}
                    <div className="w-full">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center mb-2">
                            {t("hostReadyToPlay")}
                        </div>
                        <Button
                            onClick={handleHost}
                            className="w-full py-8 text-2xl font-black bg-cyan-500 hover:bg-cyan-600 text-white shadow-[0_4px_0_rgb(8,145,178)] active:translate-y-1 active:shadow-none rounded-xl transition-all"
                        >
                            {t("hostHostNow")}
                        </Button>
                    </div>

                    <hr className="border-slate-200" />

                    {forNegamonBattle && linkedClassroomId ? (
                        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/90 p-4 text-sm font-semibold leading-relaxed text-emerald-950">
                            <p className="font-black text-emerald-900">{t("hostSyncExpTitle")}</p>
                            <p className="mt-2 text-emerald-900/90">{t("hostSyncExpBody")}</p>
                        </div>
                    ) : null}

                    {forNegamonBattle ? (
                        <div className="rounded-xl border-2 border-violet-200 bg-violet-50/80 p-4 text-sm leading-relaxed text-violet-950">
                            <p className="font-bold text-violet-900">{t("hostNegamonRulesTitle")}</p>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-violet-900/90">
                                <li>{t("hostNegamonRule1")}</li>
                                <li>{t("hostNegamonRule2")}</li>
                                <li>{t("hostNegamonRule3")}</li>
                            </ul>
                        </div>
                    ) : null}

                    {/* Win Condition Selector */}
                    {!forNegamonBattle ? (
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
                            <span className="font-bold text-lg">{t("hostWinConditionTime")}</span>
                        </div>
                        <div
                            onClick={() => setWinCondition("GOLD")}
                            className={cn(
                                "flex-1 cursor-pointer rounded-xl p-4 flex flex-col items-center gap-2 border-4 transition-all",
                                winCondition === "GOLD"
                                    ? "bg-amber-400 border-amber-600 text-white shadow-md transform scale-105"
                                    : "bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Coins className="w-8 h-8" />
                            <span className="font-bold text-lg">{t("hostWinConditionGold")}</span>
                        </div>
                    </div>
                    ) : null}

                    {/* Condition Input */}
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                        {forNegamonBattle || winCondition === "TIME" ? (
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-slate-600">
                                    {forNegamonBattle ? t("hostTimeMinutesNegamon") : t("hostTimeMinutes")}
                                </label>
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
                                <label className="font-bold text-slate-600">{t("hostGoldGoal")}</label>
                                <Input
                                    type="number"
                                    value={goldGoal}
                                    onChange={(e) => setGoldGoal(Number(e.target.value))}
                                    className="w-32 text-center font-bold text-lg h-12 border-slate-300"
                                    step={1000}
                                />
                            </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2 text-center">
                            {forNegamonBattle
                                ? t("hostHintTimeEndsNegamon")
                                : winCondition === "TIME"
                                  ? t("hostHintTimeEnds")
                                  : t("hostHintGoldEnds")}
                        </p>
                    </div>

                    {forNegamonBattle ? (
                        <div className="space-y-3 rounded-xl border-2 border-violet-100 bg-violet-50/60 p-4">
                            <p className="text-sm font-bold text-violet-900">{t("hostNegamonBalanceTitle")}</p>
                            <p className="text-xs text-violet-800/80">{t("hostNegamonBalanceBody")}</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-600">{t("hostNegamonStartHp")}</span>
                                    <Input
                                        type="number"
                                        min={10}
                                        max={500}
                                        value={negamonTune.startHp}
                                        onChange={(e) =>
                                            setNegamonTune((prev) => ({
                                                ...prev,
                                                startHp: Number(e.target.value),
                                            }))
                                        }
                                        className="font-bold"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-600">{t("hostNegamonRoundSeconds")}</span>
                                    <Input
                                        type="number"
                                        min={5}
                                        max={120}
                                        value={negamonTune.roundSeconds}
                                        onChange={(e) =>
                                            setNegamonTune((prev) => ({
                                                ...prev,
                                                roundSeconds: Number(e.target.value),
                                            }))
                                        }
                                        className="font-bold"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-600">{t("hostNegamonBetweenSeconds")}</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={negamonTune.betweenSeconds}
                                        onChange={(e) =>
                                            setNegamonTune((prev) => ({
                                                ...prev,
                                                betweenSeconds: Number(e.target.value),
                                            }))
                                        }
                                        className="font-bold"
                                    />
                                </div>
                                <div className="col-span-2 flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-600">{t("hostNegamonFastAnswerWindow")}</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={negamonTune.fastAnswerSeconds}
                                        onChange={(e) =>
                                            setNegamonTune((prev) => ({
                                                ...prev,
                                                fastAnswerSeconds: Number(e.target.value),
                                            }))
                                        }
                                        className="font-bold"
                                    />
                                </div>
                            </div>
                            <p className="pt-1 text-xs font-bold text-slate-500">{t("hostNegamonDamageAdvanced")}</p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-500">{t("hostStatPower")}</span>
                                    <Input
                                        type="number"
                                        min={5}
                                        max={200}
                                        value={negamonTune.movePower}
                                        onChange={(e) =>
                                            setNegamonTune((prev) => ({
                                                ...prev,
                                                movePower: Number(e.target.value),
                                            }))
                                        }
                                        className="text-center text-sm font-bold"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-500">{t("hostStatAtk")}</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={200}
                                        value={negamonTune.attackerAtk}
                                        onChange={(e) =>
                                            setNegamonTune((prev) => ({
                                                ...prev,
                                                attackerAtk: Number(e.target.value),
                                            }))
                                        }
                                        className="text-center text-sm font-bold"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-500">{t("hostStatDef")}</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={200}
                                        value={negamonTune.defenderDef}
                                        onChange={(e) =>
                                            setNegamonTune((prev) => ({
                                                ...prev,
                                                defenderDef: Number(e.target.value),
                                            }))
                                        }
                                        className="text-center text-sm font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Toggles List */}
                    <div className="space-y-3">
                        <ToggleItem
                            label={t("hostToggleShowInstructions")}
                            checked={showInstructions}
                            onChange={setShowInstructions}
                        />
                        <ToggleItem
                            label={t("hostToggleLateJoin")}
                            checked={allowLateJoin}
                            onChange={setAllowLateJoin}
                            description={forNegamonBattle ? t("hostNegamonLateJoinHint") : undefined}
                        />
                        <ToggleItem
                            label={t("hostToggleRandomNames")}
                            checked={useRandomNames}
                            onChange={setUseRandomNames}
                        />
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

function ToggleItem({ label, checked, onChange, description }: { label: string, checked: boolean, onChange: (v: boolean) => void, description?: string }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors select-none"
        >
            <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-lg group-hover:text-cyan-600 transition-colors">{label}</span>
                {description && <span className="text-xs text-slate-400">{description}</span>}
            </div>

            <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-all border-2",
                checked ? "bg-cyan-500 border-cyan-600" : "bg-white border-slate-300"
            )}>
                {checked && <Check className="w-6 h-6 text-white stroke-[4]" />}
            </div>
        </div>
    )
}
