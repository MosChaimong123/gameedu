"use client"

import { useLanguage } from "@/components/providers/language-provider"
import { motion } from "framer-motion"
import { Newspaper, Trophy, CheckCircle2, Circle, Zap, Megaphone, ChevronRight } from "lucide-react"

export type DashboardInsightNews = {
    id: string
    title: string
    body: string
    tag: string | null
    tagColor: string | null
    mascot: string | null
    publishedAt: string
}

export type DashboardInsightMission = {
    id: string
    title: string
    reward: number
    completed: boolean
    mascot: string | null
}

interface TopInsightsProps {
    role?: string
    news: DashboardInsightNews[]
    missions: DashboardInsightMission[]
}

export function TopInsights({ role, news, missions }: TopInsightsProps) {
    const { t } = useLanguage()
    void role

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-indigo-600 p-1 shadow-xl"
            >
                <div className="relative h-full w-full overflow-hidden rounded-[1.9rem] bg-slate-900/10 p-6 backdrop-blur-xl">
                    <div className="relative z-10 flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Newspaper className="w-5 h-5 text-indigo-300" />
                            {t("newsAndUpdates")}
                        </h3>
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1">
                            {t("insightsSeeAll")} <ChevronRight className="w-3 h-3" />
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {news.length === 0 ? (
                            <p className="text-sm font-medium text-white/70 md:col-span-2">{t("topInsightsEmptyNews")}</p>
                        ) : (
                            news.map((item) => {
                                const tagColor = item.tagColor?.trim() || "bg-indigo-500"
                                const published = new Date(item.publishedAt)
                                const dateLabel = Number.isNaN(published.getTime())
                                    ? ""
                                    : published.toLocaleDateString(undefined, { dateStyle: "medium" })
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer group"
                                    >
                                        <div
                                            className={`h-10 w-10 ${tagColor} rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20 transform group-hover:scale-110 transition-transform`}
                                        >
                                            {item.tag === "INFO" ? (
                                                <Megaphone className="w-3 h-3" />
                                            ) : (
                                                <Zap className="w-3 h-3" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                {dateLabel ? (
                                                    <span className="text-[9px] font-black text-white/50">{dateLabel}</span>
                                                ) : null}
                                                {item.mascot ? (
                                                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80">
                                                        {item.mascot}
                                                    </span>
                                                ) : null}
                                                {item.tag ? (
                                                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-white/70">
                                                        {item.tag}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                                            {item.body ? (
                                                <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{item.body}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-purple-600 p-1 shadow-xl"
            >
                <div className="relative h-full w-full overflow-hidden rounded-[1.9rem] bg-slate-900/10 p-6 backdrop-blur-xl">
                    <h3 className="text-xl font-black text-white flex items-center gap-2 mb-4 relative z-10">
                        <Trophy className="w-5 h-5 text-purple-300" />
                        {t("dailyMissions")}
                    </h3>

                    <div className="space-y-3 relative z-10">
                        {missions.length === 0 ? (
                            <p className="text-sm font-medium text-white/70">{t("topInsightsEmptyMissions")}</p>
                        ) : (
                            missions.map((mission) => (
                                <div
                                    key={mission.id}
                                    className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10 group"
                                >
                                    <div className={mission.completed ? "text-green-400" : "text-white/30"}>
                                        {mission.completed ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <Circle className="w-5 h-5" />
                                        )}
                                    </div>
                                    {mission.mascot ? (
                                        <div className="rounded-full bg-white/10 px-2.5 py-1 text-sm shadow-sm">
                                            {mission.mascot}
                                        </div>
                                    ) : null}
                                    <div className="flex-1">
                                        <p
                                            className={`text-xs font-bold leading-none mb-1 ${
                                                mission.completed ? "text-white/40 line-through" : "text-white"
                                            }`}
                                        >
                                            {mission.title}
                                        </p>
                                        <span className="text-[10px] font-black text-amber-400">
                                            +{mission.reward} {t("tokenLabel")}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                </div>
            </motion.div>
        </div>
    )
}
