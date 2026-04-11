"use client"

import { useRouter } from "next/navigation"
import {
    Play,
    BarChart,
    Users,
    Settings,
    Gamepad2,
    Trophy,
    History as HistoryIcon,
    Camera,
    BookOpen,
    UserCircle,
    Sparkles,
} from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { motion, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface QuickActionsProps {
    role?: string
}

export const QuickActions = ({ role }: QuickActionsProps) => {
    const router = useRouter()
    const { t } = useLanguage()
    const isStudent = role === "STUDENT"

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    }

    /** Shared gradient vocabulary: emerald (insights), rose (people), cyan (tools), indigo (library), violet (history), slate (settings), amber (upgrade CTA). */
    const teacherActions = [
        {
            key: "viewReports",
            icon: BarChart,
            mascot: "🕵️",
            color: "from-emerald-500 to-teal-600",
            textColor: "text-emerald-100",
            path: "/dashboard/reports",
            descKey: "checkProgress",
        },
        {
            key: "activeClasses",
            icon: Users,
            mascot: "🧑‍🏫",
            color: "from-rose-500 to-pink-600",
            textColor: "text-rose-100",
            path: "/dashboard/classrooms",
            descKey: "manageStudents",
        },
        {
            key: "omrScanner",
            icon: Camera,
            mascot: "🤖",
            color: "from-cyan-500 to-blue-600",
            textColor: "text-cyan-100",
            path: "/dashboard/omr",
            descKey: "scanAnswers",
        },
        {
            key: "mySets",
            icon: BookOpen,
            mascot: "🧙",
            color: "from-indigo-500 to-violet-600",
            textColor: "text-indigo-100",
            path: "/dashboard/my-sets",
            descKey: "manageSetsDesc",
        },
    ]

    const studentActions = [
        {
            key: "profile",
            icon: UserCircle,
            mascot: "🧑",
            color: "from-indigo-500 to-violet-600",
            textColor: "text-indigo-100",
            path: "/dashboard/profile",
            descKey: "profileQuickDesc",
        },
        {
            key: "history",
            icon: HistoryIcon,
            mascot: "🧭",
            color: "from-violet-500 to-purple-700",
            textColor: "text-violet-100",
            path: "/dashboard/history",
            descKey: "pastGames",
        },
        {
            key: "settings",
            icon: Settings,
            mascot: "👨‍🔧",
            color: "from-slate-500 to-slate-700",
            textColor: "text-slate-100",
            path: "/dashboard/settings",
            descKey: "preferences",
        },
        {
            key: "upgradeToPlus",
            icon: Sparkles,
            mascot: "🧚",
            color: "from-amber-500 to-orange-600",
            textColor: "text-amber-100",
            path: "/dashboard/upgrade",
            descKey: "getMoreTokens",
        },
    ]

    const actions = isStudent ? studentActions : teacherActions

    return (
        <motion.div 
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Game Play Hero Button */}
            <motion.div 
                variants={itemVariants}
                className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-1 shadow-2xl transition-all hover:shadow-indigo-500/25"
            >
                <div 
                    className="relative flex flex-col md:flex-row items-center justify-between overflow-hidden rounded-[1.9rem] bg-slate-900/40 p-8 md:p-12 backdrop-blur-xl cursor-pointer"
                    onClick={() => router.push(isStudent ? "/play" : "/dashboard/my-sets")}
                >
                    {/* Animated background shapes */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-700" />
                    <div className="absolute right-8 top-8 hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-2xl shadow-xl backdrop-blur-md md:flex">
                        {isStudent ? "🎒" : "👑"}
                    </div>
                    <div className="absolute bottom-6 right-32 hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-white/80 shadow-lg backdrop-blur-md lg:flex">
                        {isStudent ? "พร้อมลุยด่าน" : "พร้อมเปิดเกม"}
                    </div>

                    <div className="relative z-10 flex flex-col items-center md:items-start gap-6 text-center md:text-left">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 shadow-xl backdrop-blur-md ring-1 ring-white/20 transition-transform group-hover:scale-110 group-hover:rotate-3">
                            <Gamepad2 className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                                {isStudent ? t("joinGame") : t("gamePlay")}
                            </h2>
                            <p className="text-lg text-indigo-100/80 font-medium max-w-md">
                                {isStudent ? t("enterCode") : t("teacherHeroDesc")}
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 mt-8 md:mt-0">
                        <div className="flex items-center justify-center h-24 w-24 rounded-full bg-white text-indigo-600 shadow-2xl transition-all group-hover:scale-110 group-active:scale-95">
                            <Play className="h-10 w-10 fill-current ml-1" />
                        </div>
                    </div>

                    {/* Decorative floating icons */}
                    <div className="absolute top-10 right-1/4 opacity-10 animate-bounce">
                        <Trophy className="h-12 w-12 text-white" />
                    </div>
                </div>
            </motion.div>

            {/* Other Actions Grid */}
            <div
                className={cn(
                    "grid grid-cols-1 gap-6 sm:grid-cols-2",
                    actions.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
                )}
            >
                {actions.map((action) => (
                    <motion.div
                        key={action.key}
                        variants={itemVariants}
                        className={`group relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${action.color} p-[1px] shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
                        onClick={() => router.push(action.path)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {/* Glassy Overlay */}
                        <div className="relative h-full w-full overflow-hidden rounded-[1.95rem] bg-slate-900/10 p-6 backdrop-blur-md">
                            {/* Animated Background Gem */}
                            <div className={`absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-150 group-hover:bg-white/20`} />
                            <div className="absolute bottom-4 right-4 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xl shadow-lg backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
                                {action.mascot}
                            </div>
                            
                            <div className="absolute right-2 top-2 opacity-5 transition-all group-hover:opacity-15 group-hover:scale-110 group-hover:rotate-12">
                                <action.icon className="h-24 w-24" />
                            </div>

                            <div className="relative z-10 flex flex-col items-start gap-4">
                                <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-md shadow-xl ring-1 ring-white/30 transition-transform group-hover:scale-110 group-hover:rotate-3">
                                    <action.icon className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <div className="mb-1 flex items-center gap-2">
                                        <h3 className="text-2xl font-black tracking-tight text-white leading-none">{t(action.key)}</h3>
                                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/85 shadow-sm">
                                            {action.mascot}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${action.textColor} font-medium opacity-80 line-clamp-1`}>
                                        {t(action.descKey)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}
