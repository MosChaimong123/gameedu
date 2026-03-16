"use client"

import { QuickActions } from "@/components/dashboard/quick-actions"
import { ProfileCard } from "@/components/dashboard/profile-card"
import { QuestList } from "@/components/dashboard/quest-list"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { TeacherStats } from "@/components/dashboard/teacher-stats"
import { RecentSets } from "@/components/dashboard/recent-sets"
import { StudentProgress } from "@/components/dashboard/student-progress"
import { NewsFeed } from "@/components/dashboard/news-feed"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/providers/language-provider"

export function DashboardContent({ role }: { role: string }) {
    const { t } = useLanguage()
    const isStudent = role === "STUDENT"

    // Teacher View
    if (!isStudent) {
        return (
            <div className="max-w-[1600px] mx-auto space-y-8 p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                            {t("classroomOverview")}
                        </h1>
                        <p className="text-slate-500 mt-2">
                            {t("manageClassesDesc")}
                        </p>
                    </div>
                    {role === "ADMIN" && (
                        <Card className="bg-red-50 border-red-200 overflow-hidden shrink-0">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-xs font-bold text-red-800">Admin Mode</p>
                                    <p className="text-[10px] text-red-600">You are logged as Administrator</p>
                                </div>
                                <button 
                                    onClick={() => window.location.href = "/admin"}
                                    className="bg-red-600 hover:bg-red-700 text-white rounded-lg h-9 px-4 text-xs font-bold flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap z-[100] relative"
                                >
                                    Switch to Admin
                                </button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Stats Overview */}
                <TeacherStats />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content (Left Column) */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Quick Actions */}
                        <section>
                            <h2 className="text-lg font-bold text-slate-800 mb-4">{t("quickActions")}</h2>
                            <QuickActions role={role} />
                        </section>

                        {/* My Library */}
                        <section>
                            <RecentSets />
                        </section>
                    </div>

                    {/* Sidebar (Right Column) */}
                    <div className="lg:col-span-4">
                        <StudentProgress />
                    </div>
                </div>
            </div>
        )
    }

    // Student View
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 p-6 md:p-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 to-purple-600 p-8 md:p-12 text-white shadow-xl">
                {/* Abstract Shapes Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                        {t("studentHeroTitle")}
                    </h1>
                    <p className="text-indigo-100 text-lg md:text-xl font-medium leading-relaxed opacity-90">
                        {t("studentHeroDesc")}
                    </p>
                </div>
            </div>
        </div>
    )
}
