"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CalendarDays, FileText, ArrowUpRight } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

export function TeacherStats() {
    const { t } = useLanguage()

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                        {t("activeClasses")}
                    </CardTitle>
                    <Users className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-800">3</div>
                    <p className="text-xs text-slate-500 mt-1">
                        +1 from last month
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                        {t("pendingAssignments")}
                    </CardTitle>
                    <CalendarDays className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-800">5</div>
                    <p className="text-xs text-slate-500 mt-1">
                        {t("dueInDays", { days: 3 })}
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 group cursor-pointer hover:border-indigo-200 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-indigo-600">
                        {t("recentReports")}
                    </CardTitle>
                    <FileText className="h-4 w-4 text-indigo-400" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-slate-800">12</div>
                        <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {t("newSubmissions")}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
