"use client"

import React, { useMemo, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { isNegamonBattleHostEnabled } from "@/lib/negamon-battle-host-enabled"
import { PageBackLink } from "@/components/ui/page-back-link"

type GameModeBase = {
    id: string
    titleKey: string
    descKey: string
    imageSrc: string
    playersKey: string
    durationKey: string
    color: string
    previewAccent: string
    active: boolean
}

type GameMode = {
    id: string
    title: string
    description: string
    players: string
    time: string
    icon: React.ReactNode
    color: string
    previewAccent: string
    active: boolean
}

type IconElementProps = {
    className?: string
}

function renderModeIcon(icon: React.ReactNode) {
    if (!React.isValidElement<IconElementProps>(icon)) {
        return icon
    }

    return React.cloneElement(icon, {
        className: cn(icon.props.className, "h-full w-full object-cover"),
    })
}

const MODE_DEFS: GameModeBase[] = [
    {
        id: "gold-quest",
        titleKey: "hostModeGoldQuestTitle",
        descKey: "hostModeGoldQuestDesc",
        imageSrc: "/assets/gold-quest-v2.png",
        playersKey: "hostModePlayers2to60",
        durationKey: "hostModeDurationGoldQuest",
        color: "bg-gradient-to-br from-indigo-900/90 to-violet-950 border-amber-400/80",
        previewAccent: "from-amber-500/30 to-indigo-900/80",
        active: true,
    },
    {
        id: "crypto-hack",
        titleKey: "hostModeCryptoTitle",
        descKey: "hostModeCryptoDesc",
        imageSrc: "/assets/crypto-hack-v2.png",
        playersKey: "hostModePlayers2to60",
        durationKey: "hostModeDurationCrypto",
        color: "bg-gradient-to-br from-emerald-900/90 to-slate-950 border-emerald-400/70",
        previewAccent: "from-emerald-500/25 to-slate-900/90",
        active: true,
    },
    {
        id: "negamon-battle",
        titleKey: "hostModeNegamonTitle",
        descKey: "hostModeNegamonDesc",
        imageSrc: "/assets/tower-defense.png",
        playersKey: "hostModePlayers2to60",
        durationKey: "hostModeDurationNegamon",
        color: "bg-gradient-to-br from-fuchsia-900/90 to-slate-950 border-fuchsia-400/70",
        previewAccent: "from-fuchsia-500/30 to-violet-950/90",
        active: isNegamonBattleHostEnabled(),
    },
    {
        id: "fishing-frenzy",
        titleKey: "hostModeFishingTitle",
        descKey: "hostModeFishingDesc",
        imageSrc: "/assets/fishing-frenzy-v2.png",
        playersKey: "hostModePlayers2to60",
        durationKey: "hostModeDurationFishing",
        color: "bg-gradient-to-br from-sky-900/90 to-indigo-950 border-sky-400/60",
        previewAccent: "from-sky-500/20 to-indigo-950/90",
        active: false,
    },
    {
        id: "tower-defense",
        titleKey: "hostModeTowerTitle",
        descKey: "hostModeTowerDesc",
        imageSrc: "/assets/tower-defense.png",
        playersKey: "hostModePlayers1to60",
        durationKey: "hostModeDurationTower",
        color: "bg-gradient-to-br from-violet-700/90 to-indigo-950 border-violet-300/50",
        previewAccent: "from-violet-600/30 to-indigo-950/90",
        active: false,
    },
    {
        id: "cafe",
        titleKey: "hostModeCafeTitle",
        descKey: "hostModeCafeDesc",
        imageSrc: "/assets/cafe.png",
        playersKey: "hostModePlayers2to60",
        durationKey: "hostModeDurationCafe",
        color: "bg-gradient-to-br from-rose-700/90 to-slate-950 border-rose-300/50",
        previewAccent: "from-rose-500/25 to-slate-900/90",
        active: false,
    },
    {
        id: "factory",
        titleKey: "hostModeFactoryTitle",
        descKey: "hostModeFactoryDesc",
        imageSrc: "/assets/factory.png",
        playersKey: "hostModePlayers2to60",
        durationKey: "hostModeDurationFactory",
        color: "bg-gradient-to-br from-indigo-700/90 to-slate-950 border-indigo-300/50",
        previewAccent: "from-indigo-500/30 to-slate-950/90",
        active: false,
    },
    {
        id: "racing",
        titleKey: "hostModeRacingTitle",
        descKey: "hostModeRacingDesc",
        imageSrc: "/assets/racing.png",
        playersKey: "hostModePlayers2to60",
        durationKey: "hostModeDurationRacing",
        color: "bg-gradient-to-br from-orange-700/90 to-slate-950 border-orange-300/50",
        previewAccent: "from-orange-500/25 to-slate-950/90",
        active: false,
    },
]

interface GameModeSelectorProps {
    onSelect: (modeId: string) => void
    /** กลับไปหน้าก่อน (เช่น ชุดคำถามของฉัน) */
    onBack: () => void
}

export function GameModeSelector({ onSelect, onBack }: GameModeSelectorProps) {
    const { t, language } = useLanguage()
    const modes: GameMode[] = useMemo(
        () =>
            MODE_DEFS.map((def) => {
                const title = t(def.titleKey)
                return {
                    id: def.id,
                    color: def.color,
                    previewAccent: def.previewAccent,
                    active: def.active,
                    title,
                    description: t(def.descKey),
                    players: t(def.playersKey),
                    time: t(def.durationKey),
                    icon: (
                        <Image
                            src={def.imageSrc}
                            alt={title}
                            width={512}
                            height={512}
                            className="h-full w-full object-contain drop-shadow-lg rounded-2xl"
                        />
                    ),
                }
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is not referentially stable; refresh when language changes.
        [language]
    )

    const [selectedId, setSelectedId] = useState<string>("gold-quest")
    const selectedMode = modes.find((m) => m.id === selectedId) || modes[0]

    return (
        <div className="min-h-[100dvh] w-full overflow-x-hidden bg-gradient-to-b from-slate-100 via-white to-indigo-50/70 font-sans lg:min-h-screen">
            <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row lg:items-stretch">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.35]"
                    style={{
                        backgroundImage: "radial-gradient(rgb(99 102 241 / 0.15) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                    }}
                />

                <div className="relative z-10 flex h-full min-h-0 flex-col px-3 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
                    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center">
                        <PageBackLink
                            onClick={onBack}
                            labelKey="navBackMySets"
                            className="shrink-0 self-start shadow-sm shadow-slate-200/50"
                        />
                        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 text-center shadow-sm shadow-indigo-100/50 backdrop-blur-sm sm:py-5">
                            <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl md:text-3xl">
                                {t("hostSelectModeTitle")}
                            </h1>
                            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                                {t("hostSelectModeSubtitle")}
                            </p>
                        </div>
                    </div>

                    <div className="custom-scrollbar grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pb-6 [grid-auto-rows:minmax(0,auto)] sm:gap-3 sm:pb-8 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:gap-4">
                        {modes.map((mode) => (
                            <button
                                key={mode.id}
                                type="button"
                                onClick={() => setSelectedId(mode.id)}
                                className={cn(
                                    "group relative aspect-[4/3] rounded-2xl text-left transition-all duration-200",
                                    "border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
                                    selectedId === mode.id
                                        ? "z-10 scale-[1.02] border-indigo-500 shadow-lg shadow-indigo-200/60 ring-2 ring-indigo-200/80"
                                        : "border-transparent opacity-90 hover:z-10 hover:scale-[1.02] hover:opacity-100"
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl p-3 shadow-md",
                                        mode.color
                                    )}
                                >
                                    <div className="flex w-full flex-1 items-center justify-center p-3">
                                        <div className="relative flex aspect-square h-auto w-[4.5rem] min-[400px]:w-24 sm:w-28 items-center justify-center overflow-hidden rounded-[1.25rem] bg-black/20 shadow-lg ring-1 ring-white/10 sm:rounded-[1.5rem]">
                                            {renderModeIcon(mode.icon)}
                                        </div>
                                    </div>
                                    <span className="line-clamp-2 px-0.5 text-center text-base font-black leading-tight tracking-wide text-white drop-shadow-md min-[400px]:text-lg sm:px-1 sm:text-xl md:text-2xl">
                                        {mode.title}
                                    </span>
                                    {!mode.active && (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/55 backdrop-blur-[1px]">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/95 px-3 py-1.5 text-xs font-bold text-indigo-900 shadow-md">
                                                <Lock className="h-3.5 w-3.5" />
                                                {t("hostComingSoon")}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <aside className="flex w-full shrink-0 flex-col border-t border-slate-200/90 bg-white/95 shadow-[0_-8px_40px_-12px_rgba(79,70,229,0.15)] backdrop-blur-md lg:max-w-md lg:w-[min(100%,420px)] lg:border-l lg:border-t-0 lg:shadow-2xl xl:max-w-[min(420px,32vw)]">
                <div
                    className={cn(
                        "relative flex min-h-[13rem] flex-col items-center justify-center gap-3 overflow-hidden px-4 pt-6 sm:h-64 sm:px-6 sm:pt-8",
                        selectedMode.color.replace(/\/[0-9]+/g, "").replace(/border-[\w-]+/g, "")
                    )}
                >
                    <div
                        className={cn("absolute inset-0 opacity-40", "bg-gradient-to-br", selectedMode.previewAccent)}
                    />
                    <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light">
                        <div
                            className="h-full w-full"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.12), transparent 45%)",
                            }}
                        />
                    </div>

                    <div className="relative z-10 flex aspect-square w-32 max-w-[40vw] items-center justify-center overflow-hidden rounded-[2rem] bg-white/10 shadow-2xl ring-1 ring-white/25 backdrop-blur-md sm:w-48 sm:rounded-[2.5rem]">
                        {renderModeIcon(selectedMode.icon)}
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-xl font-black tracking-tight text-white drop-shadow-sm sm:text-2xl md:text-3xl">
                            {selectedMode.title}
                        </h2>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/70">
                            {t("hostModeMetaSubtitle", {
                                players: selectedMode.players,
                                duration: selectedMode.time,
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 flex-col p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 md:p-8">
                    <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-600 sm:mb-8 sm:text-base md:text-lg">
                        {selectedMode.description}
                    </p>

                    <Button
                        size="lg"
                        className={cn(
                            "w-full rounded-2xl py-6 text-lg font-bold shadow-md transition-all sm:py-7 sm:text-xl md:py-8 md:text-2xl",
                            selectedMode.active
                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200/50 hover:from-indigo-700 hover:to-purple-700 active:translate-y-0.5"
                                : "cursor-not-allowed bg-slate-200 text-slate-500 shadow-none"
                        )}
                        disabled={!selectedMode.active}
                        onClick={() => {
                            if (selectedMode.active) onSelect(selectedMode.id)
                        }}
                    >
                        {selectedMode.active ? t("hostHostGame") : t("hostComingSoon")}
                    </Button>
                </div>
            </aside>
            </div>
        </div>
    )
}
