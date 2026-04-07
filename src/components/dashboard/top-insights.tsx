"use client"

import { useLanguage } from "@/components/providers/language-provider"
import { motion } from "framer-motion"
import { Newspaper, Trophy, CheckCircle2, Circle, Zap, Megaphone, ChevronRight } from "lucide-react"

interface TopInsightsProps {
    role?: string
}

const NEWS_ITEMS = [
    {
        id: "1",
        tag: "NEW",
        tagColor: "bg-indigo-500",
        icon: <Zap className="w-3 h-3" />,
        titleKey: "topInsightsNewsTitleSeason4",
        dateKey: "topInsightsNewsDate2hAgo"
    },
    {
        id: "2",
        tag: "INFO",
        tagColor: "bg-blue-500",
        icon: <Megaphone className="w-3 h-3" />,
        titleKey: "topInsightsNewsTitleServerUpdate",
        dateKey: "topInsightsNewsDateToday"
    }
]

const TEACHER_MISSIONS = [
    { id: 1, titleKey: "topInsightsMissionCreateSet", completed: false, reward: 50 },
    { id: 2, titleKey: "topInsightsMissionHostSession", completed: true, reward: 100 }
]

export function TopInsights({ role }: TopInsightsProps) {
    const { t } = useLanguage()
    void role

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* News Section */}
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
                        <button className="text-[10px] font-bold text-white/60 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider">
                            {t("insightsSeeAll")} <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {NEWS_ITEMS.map((item) => (
                            <div key={item.id} className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer group">
                                <div className={`h-10 w-10 ${item.tagColor} rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20 transform group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[9px] font-black text-white/50">{t(item.dateKey)}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white truncate">{t(item.titleKey)}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Decorative bits */}
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                </div>
            </motion.div>

            {/* Missions Section */}
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
                        {TEACHER_MISSIONS.map((mission) => (
                            <div key={mission.id} className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10 group">
                                <div className={mission.completed ? "text-green-400" : "text-white/30"}>
                                    {mission.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-xs font-bold leading-none mb-1 ${mission.completed ? "text-white/40 line-through" : "text-white"}`}>
                                        {t(mission.titleKey)}
                                    </p>
                                    <span className="text-[10px] font-black text-amber-400">
                                        +{mission.reward} {t("tokenLabel")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                </div>
            </motion.div>
        </div>
    )
}
