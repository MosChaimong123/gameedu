"use client"

import { QuickActions } from "@/components/dashboard/quick-actions"
import { ProfileCard } from "@/components/dashboard/profile-card"
import { QuestList } from "@/components/dashboard/quest-list"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { TeacherStats } from "@/components/dashboard/teacher-stats"
import { RecentSets } from "@/components/dashboard/recent-sets"
import { StudentProgress } from "@/components/dashboard/student-progress"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/components/providers/language-provider"

export function DashboardContent({ role }: { role: string }) {
    const { t } = useLanguage()
    const isStudent = role === "STUDENT"

    // Teacher View
    if (!isStudent) {
        return (
            <div className="max-w-[1600px] mx-auto space-y-8 p-6 md:p-8">
                {/* Header */}
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                            {t("classroomOverview")}
                        </h1>
                        <p className="text-slate-500 mt-2">
                            {t("manageClassesDesc")}
                        </p>
                    </div>
                    {/* Date/Term indicator could go here */}
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content (Left Column) */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    {/* Quick Actions */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            🚀 {t("quickActions")}
                        </h2>
                        <QuickActions role={role} />
                    </section>

                    {/* Recent Content */}
                    <section>
                        <RecentActivity />
                    </section>

                    {/* News (Moved here for better flow) */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            📰 {t("newsAndUpdates")}
                        </h2>
                        <Card className="border-slate-100 shadow-sm">
                            <CardContent className="p-0">
                                <div className="p-4 border-b hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className="flex gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            NEW
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Season 4 Details Released!</h4>
                                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                Discover new Blooks, improved game modes like Gold Quest, and more rewards for daily logins.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className="flex gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 font-bold text-xs group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                            UPD
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">Maintenance Schedule</h4>
                                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                Servers will be down for briefly maintainance this Friday night. Check users timezone.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </div>

                {/* Sidebar (Right Column) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <ProfileCard role={role} />
                    <QuestList role={role} />
                </div>
            </div>
        </div>
    )
}
