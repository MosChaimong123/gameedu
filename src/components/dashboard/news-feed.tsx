"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/components/providers/language-provider"
import { motion } from "framer-motion"
import { Newspaper, ChevronRight, Zap, Trophy, Megaphone } from "lucide-react"

const NEWS_ITEMS = [
    {
        id: "1",
        tag: "NEW",
        tagColor: "bg-indigo-500",
        icon: <Zap className="w-4 h-4" />,
        titleKey: "newsFeedTitleSeason4Details",
        descriptionKey: "newsFeedDescSeason4Details",
        dateKey: "newsFeedDate2hAgo"
    },
    {
        id: "2",
        tag: "UPD",
        tagColor: "bg-orange-500",
        icon: <Trophy className="w-4 h-4" />,
        titleKey: "newsFeedTitleRankingUpdate",
        descriptionKey: "newsFeedDescRankingUpdate",
        dateKey: "newsFeedDateYesterday"
    },
    {
        id: "3",
        tag: "INFO",
        tagColor: "bg-blue-500",
        icon: <Megaphone className="w-4 h-4" />,
        titleKey: "newsFeedTitleMaintenanceSchedule",
        descriptionKey: "newsFeedDescMaintenanceSchedule",
        dateKey: "newsFeedDate2DaysAgo"
    }
]

export function NewsFeed() {
    const { t } = useLanguage()

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-indigo-500" />
                    {t("newsAndUpdates")}
                </h2>
                <button className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    {t("insightsSeeAll")} <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            <div className="grid gap-4">
                {NEWS_ITEMS.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer bg-card overflow-hidden group">
                            <CardContent className="p-0">
                                <div className="flex items-center p-4 gap-4">
                                    <div className={
                                        `h-12 w-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${item.tagColor} transform group-hover:scale-110 transition-transform`
                                    }>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${item.tagColor}`}>
                                                {item.tag}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold">{t(item.dateKey)}</span>
                                        </div>
                                        <h4 className="font-bold text-foreground truncate group-hover:text-indigo-600 transition-colors">
                                            {t(item.titleKey)}
                                        </h4>
                                        <p className="text-xs text-slate-500 line-clamp-1">
                                            {t(item.descriptionKey)}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </section>
    )
}
