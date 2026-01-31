"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Plus, Play, Gamepad2, Search, Library, ShoppingBag, Joystick, BarChart, Settings, Calendar } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

export function QuickActions({ role }: { role?: string }) {
    const router = useRouter()
    const { t } = useLanguage()

    if (role === "STUDENT") {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Join Game */}
                <div
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer col-span-2 md:col-span-1"
                    onClick={() => router.push("/play")}
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                        <Gamepad2 className="h-32 w-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                            <Gamepad2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{t("joinGame") || "Join Game"}</h3>
                            <p className="text-xs md:text-sm text-indigo-100 opacity-90">
                                Enter code to play
                            </p>
                        </div>
                    </div>
                </div>


                {/* Discover */}
                <div
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    onClick={() => router.push("/dashboard/discover")}
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                        <Search className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                            <Search className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{t("discover")}</h3>
                            <p className="text-xs text-teal-100 opacity-90 hidden md:block">
                                Find public games
                            </p>
                        </div>
                    </div>
                </div>

                {/* Market */}
                <div
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    onClick={() => router.push("/dashboard/market")}
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                        <ShoppingBag className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                            <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{t("market")}</h3>
                            <p className="text-xs text-amber-100 opacity-90 hidden md:block">
                                Buy items
                            </p>
                        </div>
                    </div>
                </div>

                {/* Blooks */}
                <div
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-400 to-pink-600 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    onClick={() => router.push("/dashboard/blooks")}
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                        <Joystick className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                            <Joystick className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{t("blooks")}</h3>
                            <p className="text-xs text-rose-100 opacity-90 hidden md:block">
                                Collection
                            </p>
                        </div>
                    </div>
                </div>

                {/* History */}
                <div
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    onClick={() => router.push("/dashboard/history")}
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                        <BarChart className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                            <BarChart className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{t("history")}</h3>
                            <p className="text-xs text-violet-100 opacity-90 hidden md:block">
                                Past games
                            </p>
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    onClick={() => router.push("/dashboard/settings")}
                >
                    <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                        <Settings className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                            <Settings className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{t("settings")}</h3>
                            <p className="text-xs text-slate-100 opacity-90 hidden md:block">
                                Preferences
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Default / Teacher View
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Create Set */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer col-span-2 md:col-span-1"
                onClick={() => router.push("/dashboard/create-set")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <Plus className="h-32 w-32" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <Plus className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{t("createSet") || "Create Set"}</h3>
                        <p className="text-xs text-purple-100 opacity-90 hidden md:block">
                            New question set
                        </p>
                    </div>
                </div>
            </div>

            {/* Host Game */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-red-500 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push("/host")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <Play className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <Play className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{t("host") || "Host Game"}</h3>
                        <p className="text-xs text-orange-100 opacity-90 hidden md:block">
                            Live session
                        </p>
                    </div>
                </div>
            </div>

            {/* Assign Homework */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push("/dashboard/homework")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <Calendar className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{t("assignHomework") || "Homework"}</h3>
                        <p className="text-xs text-blue-100 opacity-90 hidden md:block">
                            Assign tasks
                        </p>
                    </div>
                </div>
            </div>

            {/* View Reports */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push("/dashboard/reports")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <BarChart className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <BarChart className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{t("viewReports") || "Reports"}</h3>
                        <p className="text-xs text-emerald-100 opacity-90 hidden md:block">
                            Check progress
                        </p>
                    </div>
                </div>
            </div>

            {/* My Sets (Library) */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push("/dashboard/my-sets")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <Library className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <Library className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{t("mySets")}</h3>
                        <p className="text-xs text-blue-100 opacity-90 hidden md:block">
                            Manage your library
                        </p>
                    </div>
                </div>
            </div>

            {/* Discover */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push("/dashboard/discover")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <Search className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <Search className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{t("discover")}</h3>
                        <p className="text-xs text-teal-100 opacity-90 hidden md:block">
                            Find public content
                        </p>
                    </div>
                </div>
            </div>

            {/* Market */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push("/dashboard/market")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <ShoppingBag className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{t("market")}</h3>
                        <p className="text-xs text-amber-100 opacity-90 hidden md:block">
                            Buy items
                        </p>
                    </div>
                </div>
            </div>

            {/* Blooks */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-400 to-pink-600 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push("/dashboard/blooks")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <Joystick className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <Joystick className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{t("blooks")}</h3>
                        <p className="text-xs text-rose-100 opacity-90 hidden md:block">
                            Collection
                        </p>
                    </div>
                </div>
            </div>

            {/* Settings */}
            <div
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 p-6 text-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push("/dashboard/settings")}
            >
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transition-transform group-hover:scale-110">
                    <Settings className="h-24 w-24" />
                </div>
                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{t("settings")}</h3>
                        <p className="text-xs text-slate-100 opacity-90 hidden md:block">
                            Preferences
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
