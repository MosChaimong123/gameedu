"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { NegamonBattlePlayer, NegamonRoundHit } from "@/lib/types/game"
import { useLanguage } from "@/components/providers/language-provider"
import { getPlayerSession } from "@/lib/player-session"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/lib/utils"

export type NegamonBetweenRoundPlayback = {
    hits: NegamonRoundHit[]
    players: NegamonBattlePlayer[]
}

function computePreStrikeHp(players: NegamonBattlePlayer[], hits: NegamonRoundHit[]): Record<string, number> {
    const map: Record<string, number> = {}
    for (const p of players) {
        map[p.name] = p.battleHp
    }
    for (let i = hits.length - 1; i >= 0; i--) {
        const h = hits[i]
        map[h.targetName] = (map[h.targetName] ?? 0) + h.damage
    }
    return map
}

function maxHpFor(players: NegamonBattlePlayer[], name: string): number {
    return players.find((p) => p.name === name)?.maxHp ?? 100
}

export function NegamonBattleTopBar({ player }: { player: NegamonBattlePlayer }) {
    const { t } = useLanguage()
    return (
        <div className="flex w-full items-center justify-between border-b-4 border-violet-600 bg-slate-800 p-4 text-white shadow-md">
            <div className="flex w-24 flex-col items-start">
                <span className="text-xs font-bold uppercase text-slate-400">{t("playNegamonRankLabel")}</span>
                <span className="text-2xl font-black leading-none text-white">#{player.score || "—"}</span>
            </div>
            <div className="min-w-[120px] rounded-lg border-2 border-fuchsia-500/40 bg-slate-900 px-4 py-2 text-right">
                <div className="text-[10px] font-bold uppercase text-fuchsia-300">{t("playNegamonHpLabel")}</div>
                <div className="text-2xl font-black text-fuchsia-200 tabular-nums">
                    {player.battleHp}/{player.maxHp}
                </div>
            </div>
        </div>
    )
}

export function NegamonQuestionHint({ timeLimitSeconds }: { timeLimitSeconds: number }) {
    const { t } = useLanguage()
    return (
        <p className="mb-2 max-w-lg text-center text-xs font-medium leading-relaxed text-violet-200/90 sm:text-sm">
            {t("playNegamonQuestionHint", { seconds: timeLimitSeconds })}
        </p>
    )
}

const HIT_STEP_MS = 520
const HIT_INTRO_DELAY_MS = 400

export function NegamonBetweenRoundsView({ playback }: { playback: NegamonBetweenRoundPlayback | null }) {
    const { t } = useLanguage()
    const { play } = useSound()
    const selfName = getPlayerSession()?.name?.trim() ?? ""

    const hits = playback?.hits ?? []
    const players = playback?.players ?? []

    const [displayHp, setDisplayHp] = useState<Record<string, number>>({})
    const [activeHitIdx, setActiveHitIdx] = useState<number>(-2)
    const [shakeName, setShakeName] = useState<string | null>(null)
    /** ค้างไว้ให้ตัวเลขดาเมจลอยเล่นครบแม้ shake จะจบก่อน */
    const [damageFloatIdx, setDamageFloatIdx] = useState<number | null>(null)

    useEffect(() => {
        if (!playback?.players.length) {
            queueMicrotask(() => {
                setDisplayHp({})
                setActiveHitIdx(-2)
                setShakeName(null)
                setDamageFloatIdx(null)
            })
            return
        }

        const { hits: hList, players: plist } = playback
        const cancelledRef = { current: false }
        const timeoutIds: ReturnType<typeof setTimeout>[] = []

        const later = (fn: () => void, ms: number) => {
            const id = setTimeout(() => {
                if (!cancelledRef.current) fn()
            }, ms)
            timeoutIds.push(id)
        }

        if (!hList.length) {
            queueMicrotask(() => {
                setDisplayHp(Object.fromEntries(plist.map((p) => [p.name, p.battleHp])))
                setActiveHitIdx(-1)
            })
            return () => {
                cancelledRef.current = true
                timeoutIds.forEach(clearTimeout)
            }
        }

        const pre = computePreStrikeHp(plist, hList)
        queueMicrotask(() => {
            setDisplayHp(pre)
            setActiveHitIdx(-1)
            setShakeName(null)
            setDamageFloatIdx(null)
        })

        const chain = (idx: number) => {
            if (cancelledRef.current) return
            if (idx >= hList.length) {
                setActiveHitIdx(hList.length)
                setDamageFloatIdx(null)
                return
            }
            const hit = hList[idx]
            setDisplayHp((prev) => ({ ...prev, [hit.targetName]: hit.targetHpAfter }))
            setActiveHitIdx(idx)
            setShakeName(hit.targetName)
            setDamageFloatIdx(idx)
            play("click", { volume: 0.38 })
            later(() => setShakeName(null), 260)
            later(() => setDamageFloatIdx((cur) => (cur === idx ? null : cur)), 780)
            later(() => chain(idx + 1), HIT_STEP_MS)
        }

        later(() => chain(0), HIT_INTRO_DELAY_MS)

        return () => {
            cancelledRef.current = true
            timeoutIds.forEach(clearTimeout)
        }
    }, [playback, play])

    const rosterSorted = useMemo(() => {
        const plist = playback?.players ?? []
        return [...plist].sort((a, b) => {
            if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1
            const ha = displayHp[a.name] ?? a.battleHp
            const hb = displayHp[b.name] ?? b.battleHp
            if (hb !== ha) return hb - ha
            return a.name.localeCompare(b.name)
        })
    }, [playback, displayHp])

    const activeHit = activeHitIdx >= 0 && activeHitIdx < hits.length ? hits[activeHitIdx] : null

    const subtitleBody =
        hits.length > 0 && activeHitIdx >= hits.length
            ? t("playNegamonBetweenAnimDone")
            : t("playNegamonRoundSummaryBody")

    return (
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-4 text-center sm:p-8">
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-lg rounded-3xl border border-violet-500/40 bg-slate-800/90 px-5 py-8 shadow-xl backdrop-blur-sm sm:px-8 sm:py-10"
            >
                <h2 className="text-2xl font-black text-violet-200 sm:text-3xl">{t("playNegamonRoundSummaryTitle")}</h2>

                <AnimatePresence mode="wait">
                    {activeHit ? (
                        <motion.p
                            key={`${activeHitIdx}-${activeHit.attackerName}-${activeHit.targetName}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mt-3 min-h-[1.5rem] text-sm font-bold text-amber-200/95 sm:text-base"
                        >
                            {t("playNegamonBetweenStrikeCaption", {
                                attacker: activeHit.attackerName,
                                target: activeHit.targetName,
                                damage: activeHit.damage,
                            })}
                            {activeHit.fastStrike ? " ⚡" : ""}
                        </motion.p>
                    ) : (
                        <motion.p
                            key={`body-${activeHitIdx}-${hits.length}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-3 min-h-[1.5rem] text-sm text-slate-400 sm:text-base"
                        >
                            {subtitleBody}
                        </motion.p>
                    )}
                </AnimatePresence>

                {players.length > 0 && (
                    <ul className="mt-6 max-h-[min(42vh,320px)] space-y-3 overflow-y-auto pr-1 text-left">
                        {rosterSorted.map((p) => {
                            const hp = displayHp[p.name] ?? p.battleHp
                            const maxHp = maxHpFor(players, p.name)
                            const pct = maxHp > 0 ? Math.min(100, Math.max(0, (hp / maxHp) * 100)) : 0
                            const isMe = p.name === selfName
                            const shaking = shakeName === p.name
                            return (
                                <li key={p.name}>
                                    <motion.div
                                        animate={
                                            shaking
                                                ? { x: [0, -7, 7, -5, 5, 0] }
                                                : { x: 0 }
                                        }
                                        transition={{ duration: 0.32, ease: "easeOut" }}
                                        className={cn(
                                            "relative overflow-visible rounded-xl border-2 px-3 py-2.5 transition-colors",
                                            p.eliminated
                                                ? "border-slate-600/80 bg-slate-900/60 opacity-70"
                                                : "border-violet-500/35 bg-slate-900/80",
                                            isMe && "ring-2 ring-fuchsia-400/50 ring-offset-2 ring-offset-slate-900"
                                        )}
                                    >
                                        <AnimatePresence>
                                            {damageFloatIdx !== null &&
                                                p.name === hits[damageFloatIdx]?.targetName && (
                                                    <motion.span
                                                        key={`dmg-${damageFloatIdx}-${p.name}`}
                                                        initial={{ opacity: 1, y: 4, scale: 0.85 }}
                                                        animate={{ opacity: 0, y: -36, scale: 1.1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.75, ease: "easeOut" }}
                                                        className="pointer-events-none absolute right-3 top-1 z-10 text-lg font-black tabular-nums text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                                                    >
                                                        −{hits[damageFloatIdx].damage}
                                                    </motion.span>
                                                )}
                                        </AnimatePresence>
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={cn(
                                                    "truncate text-sm font-black",
                                                    p.eliminated ? "text-slate-500 line-through" : "text-white"
                                                )}
                                            >
                                                {p.name}
                                                {isMe ? (
                                                    <span className="ml-1.5 text-[10px] font-bold uppercase text-fuchsia-300">
                                                        ({t("playNegamonBetweenYouTag")})
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="shrink-0 tabular-nums text-xs font-bold text-fuchsia-200">
                                                {hp}/{maxHp}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950">
                                            <motion.div
                                                className={cn(
                                                    "h-full rounded-full",
                                                    p.eliminated ? "bg-slate-600" : "bg-gradient-to-r from-fuchsia-500 to-violet-500"
                                                )}
                                                initial={false}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                                            />
                                        </div>
                                        {p.eliminated && (
                                            <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-red-400">
                                                {t("playNegamonKoShort")}
                                            </span>
                                        )}
                                    </motion.div>
                                </li>
                            )
                        })}
                    </ul>
                )}

                {hits.length === 0 && players.length === 0 && (
                    <p className="mt-4 text-slate-300">{t("playNegamonRoundSummaryBody")}</p>
                )}
            </motion.div>
        </div>
    )
}
