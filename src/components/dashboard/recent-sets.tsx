"use client";

import { Edit, Folder, Play } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentSets() {
    const { t } = useLanguage();
    const recentSets = [
        { id: 1, title: t("recentSetAlgebraBasics"), questions: 10, plays: 45, date: t("relative2DaysAgo") },
        { id: 2, title: t("recentSetHistoryRome"), questions: 15, plays: 12, date: t("relative1WeekAgo") },
        { id: 3, title: t("recentSetScienceTrivia"), questions: 20, plays: 128, date: t("relative2WeeksAgo") },
    ];

    return (
        <Card className="h-full border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <Folder className="h-5 w-5 text-indigo-500" />
                    {t("myLibrary")}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-500">
                    {t("viewAll")}
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {recentSets.map((set) => (
                        <div key={set.id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50">
                            <div className="min-w-0 flex-1 pr-4">
                                <h4 className="truncate text-sm font-semibold text-slate-800">{set.title}</h4>
                                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                    <span>{set.questions} {t("questionsCount")}</span>
                                    <span>•</span>
                                    <span>{set.plays} {t("plays")}</span>
                                    <span>•</span>
                                    <span>{set.date}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="h-8 px-2 text-slate-600">
                                    <Edit className="mr-1 h-3.5 w-3.5" /> {t("edit")}
                                </Button>
                                <Button size="sm" className="h-8 border-0 bg-orange-100 px-2 text-orange-700 hover:bg-orange-200">
                                    <Play className="mr-1 h-3.5 w-3.5" /> {t("host")}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-100 p-4 text-center">
                    <p className="text-xs text-slate-400">{t("showingRecentSets")}</p>
                </div>
            </CardContent>
        </Card>
    );
}
