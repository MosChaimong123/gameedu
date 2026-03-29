"use client"

import { useRouter } from "next/navigation"
import { 
    Play, 
    BarChart, 
    Users, 
    ShoppingBag, 
    Settings,
    Gamepad2,
    Trophy,
    Search,
    History as HistoryIcon,
    Camera
} from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { motion, Variants } from "framer-motion"

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

    const teacherActions = [
        {
            key: "viewReports",
            icon: BarChart,
            color: "from-emerald-400 to-green-600",
            textColor: "text-emerald-100",
            path: "/dashboard/reports",
            descKey: "checkProgress"
        },
        {
            key: "activeClasses",
            icon: Users,
            color: "from-pink-500 to-rose-500",
            textColor: "text-pink-100",
            path: "/dashboard/classrooms",
            descKey: "manageStudents"
        },
        {
            key: "omrScanner",
            icon: Camera,
            color: "from-cyan-400 to-blue-600",
            textColor: "text-cyan-100",
            path: "/dashboard/omr",
            descKey: "scanAnswers"
        },
        {
            key: "market",
            icon: ShoppingBag,
            color: "from-amber-400 to-orange-500",
            textColor: "text-amber-100",
            path: "/dashboard/market",
            descKey: "buyItems"
        }
    ]

    const studentActions = [
        {
            key: "discover",
            icon: Search,
            color: "from-teal-400 to-emerald-500",
            textColor: "text-teal-100",
            path: "/dashboard/discover",
            descKey: "findPublicGames"
        },
        {
            key: "market",
            icon: ShoppingBag,
            color: "from-amber-400 to-orange-500",
            textColor: "text-amber-100",
            path: "/dashboard/market",
            descKey: "buyItems"
        },
        {
            key: "history",
            icon: HistoryIcon,
            color: "from-violet-400 to-purple-600",
            textColor: "text-violet-100",
            path: "/dashboard/history",
            descKey: "pastGames"
        },
        {
            key: "settings",
            icon: Settings,
            color: "from-slate-400 to-slate-600",
            textColor: "text-slate-100",
            path: "/dashboard/settings",
            descKey: "preferences"
        }
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
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${actions.length === 3 ? '3' : '4'} gap-6`}>
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
                            
                            <div className="absolute right-2 top-2 opacity-5 transition-all group-hover:opacity-15 group-hover:scale-110 group-hover:rotate-12">
                                <action.icon className="h-24 w-24" />
                            </div>

                            <div className="relative z-10 flex flex-col items-start gap-4">
                                <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-md shadow-xl ring-1 ring-white/30 transition-transform group-hover:scale-110 group-hover:rotate-3">
                                    <action.icon className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight text-white mb-1 leading-none">{t(action.key)}</h3>
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
