"use client"

import { QuickActions } from "@/components/dashboard/quick-actions"
import { TopInsights } from "@/components/dashboard/top-insights"

import { motion } from "framer-motion"

export function DashboardContent({ role }: { role: string }) {
    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/50">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" 
                />
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" 
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto space-y-8 p-6 md:p-8 lg:p-12">
                <TopInsights role={role} />
                <QuickActions role={role} />
            </div>
        </div>
    )
}
