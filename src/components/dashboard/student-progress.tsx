"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, AlertCircle, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

export function StudentProgress() {
    const { t } = useLanguage()

    return (
        <div className="space-y-6">
            {/* Notifications */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        {t("activityFeed")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="flex gap-3 text-sm">
                        <div className="mt-0.5 text-green-500 bg-green-50 rounded-full p-1 h-fit">
                            <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <div>
                            <p className="text-slate-700"><span className="font-semibold">John D.</span> {t("completed")} <span className="text-indigo-600">Algebra HW</span></p>
                            <span className="text-xs text-slate-400">10 mins ago • {t("score")}: 95%</span>
                        </div>
                    </div>
                    <div className="flex gap-3 text-sm">
                        <div className="mt-0.5 text-green-500 bg-green-50 rounded-full p-1 h-fit">
                            <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <div>
                            <p className="text-slate-700"><span className="font-semibold">Sarah M.</span> {t("completed")} <span className="text-indigo-600">Algebra HW</span></p>
                            <span className="text-xs text-slate-400">1 hour ago • {t("score")}: 88%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Needs Attention */}
            <Card className="border-red-100 bg-red-50/30 shadow-sm">
                <CardHeader className="pb-3 border-b border-red-100">
                    <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {t("needsAttention")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="flex items-start gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-red-400 mt-2" />
                        <div>
                            <p className="text-slate-700 font-medium">Bob Smith</p>
                            <p className="text-xs text-slate-500">{t("strugglingWith")} "Fractions" (Avg: 45%)</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-orange-400 mt-2" />
                        <div>
                            <p className="text-slate-700 font-medium">Emma W.</p>
                            <p className="text-xs text-slate-500">{t("inactiveFor")} 1 week</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
