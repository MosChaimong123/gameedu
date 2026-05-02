"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuestList({ role }: { role?: string }) {
    const { t } = useLanguage();
    const teacherQuests = [
        { id: 1, title: t("questTeacherCreateSet"), reward: 50, completed: false },
        { id: 2, title: t("questTeacherHostSession"), reward: 100, completed: false },
        { id: 3, title: t("questTeacherViewReport"), reward: 30, completed: true },
    ];
    const studentQuests = [
        { id: 1, title: t("questStudentPlay3Matches"), reward: 50, completed: false },
        { id: 2, title: t("questStudentWinGame"), reward: 100, completed: false },
        { id: 3, title: t("questStudentEarnXp"), reward: 30, completed: true },
    ];
    const quests = role === "STUDENT" ? studentQuests : teacherQuests;

    return (
        <Card className="border-2 border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    🎯 {t("dailyMissions")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {quests.map((quest) => (
                    <div key={quest.id} className="group flex items-start gap-3">
                        <div className={`mt-0.5 transition-colors ${quest.completed ? "text-green-500" : "text-slate-300 group-hover:text-slate-400"}`}>
                            {quest.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${quest.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                {quest.title}
                            </p>
                            <div className="mt-0.5 text-xs font-bold text-amber-500">
                                +{quest.reward} {t("tokenLabel")}
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
