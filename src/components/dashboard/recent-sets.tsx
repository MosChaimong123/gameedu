"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Play, Edit, Share2, Folder } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

const RECENT_SETS = [
    { id: 1, title: "Algebra Basics", questions: 10, plays: 45, date: "2 days ago" },
    { id: 2, title: "History of Rome", questions: 15, plays: 12, date: "1 week ago" },
    { id: 3, title: "Science Trivia", questions: 20, plays: 128, date: "2 weeks ago" },
]

export function RecentSets() {
    const { t } = useLanguage()

    return (
        <Card className="border-slate-200 shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-indigo-500" />
                    {t("myLibrary")}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-500">{t("viewAll")}</Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {RECENT_SETS.map((set) => (
                        <div key={set.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex-1 min-w-0 pr-4">
                                <h4 className="text-sm font-semibold text-slate-800 truncate">{set.title}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span>{set.questions} {t("questionsCount")}</span>
                                    <span>•</span>
                                    <span>{set.plays} {t("plays")}</span>
                                    <span>•</span>
                                    <span>{set.date}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="h-8 px-2 text-slate-600">
                                    <Edit className="w-3.5 h-3.5 mr-1" /> {t("edit")}
                                </Button>
                                <Button size="sm" className="h-8 px-2 bg-orange-100 text-orange-700 hover:bg-orange-200 border-0">
                                    <Play className="w-3.5 h-3.5 mr-1" /> {t("host")}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">{t("showingRecentSets")}</p>
                </div>
            </CardContent>
        </Card>
    )
}
