"use client"

import { QuickActions } from "@/components/dashboard/quick-actions"
import { TopInsights } from "@/components/dashboard/top-insights"
import { motion } from "framer-motion"

export function DashboardContent({ role }: { role: string }) {
    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/50">
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
                <TopInsights role={role} />
                <QuickActions role={role} />
            </div>
        </div>
    )
}
