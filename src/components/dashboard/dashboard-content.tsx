"use client"

import { DashboardContinueWorking } from "@/components/dashboard/dashboard-continue-working"
import { DashboardKpiRow } from "@/components/dashboard/dashboard-kpi-row"
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { TopInsights, type DashboardInsightMission, type DashboardInsightNews } from "@/components/dashboard/top-insights"
import type { TeacherDashboardSummary } from "@/lib/services/teacher/get-teacher-dashboard-summary"
import { motion } from "framer-motion"

export function DashboardContent({
    role,
    summary,
    insightsNews,
    insightsMissions,
}: {
    role: string
    /** Teacher headline counts; null for students. */
    summary: TeacherDashboardSummary | null
    insightsNews: DashboardInsightNews[]
    insightsMissions: DashboardInsightMission[]
}) {
    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-x-hidden bg-slate-50/50">
            <div className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-indigo-500/5 blur-[120px]"
                />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-purple-500/5 blur-[120px]"
                />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-8">
                <QuickActions
                    role={role}
                    kpiSlot={summary ? <DashboardKpiRow summary={summary} /> : null}
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {summary ? <DashboardContinueWorking items={summary.pendingItems} /> : null}
                        {summary ? <DashboardRecentActivity games={summary.recentGames} /> : null}
                    </div>
                    <TopInsights role={role} news={insightsNews} missions={insightsMissions} />
                </div>
            </div>
        </div>
    )
}
