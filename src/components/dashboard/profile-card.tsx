"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Gamepad2, Layers } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

// Mock Data for now
const USER_STATS = {
    level: 5,
    currentXp: 750,
    nextLevelXp: 1000,
    totalGames: 12,
    totalSets: 3,
    tokens: 450
}

export function ProfileCard({ role }: { role?: string }) {
    const { t } = useLanguage()
    const isStudent = role === "STUDENT"

    // Calculate progress percentage
    const progress = (USER_STATS.currentXp / USER_STATS.nextLevelXp) * 100

    return (
        <Card className="border-2 border-slate-100 shadow-md overflow-hidden">
            <div className={`h-24 bg-gradient-to-r ${isStudent ? "from-pink-500 to-rose-500" : "from-violet-500 to-fuchsia-500"} relative`}>
                <div className="absolute -bottom-10 left-6 h-20 w-20 rounded-full border-4 border-white bg-slate-200 shadow-md flex items-center justify-center overflow-hidden">
                    {/* Placeholder Avatar */}
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                    />
                </div>
            </div>

            <CardHeader className="pt-12 pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{isStudent ? "Student Player" : "Teacher"}</h2>
                        <p className={`text-sm font-semibold ${isStudent ? "text-pink-600" : "text-violet-600"} flex items-center gap-1`}>
                            <Star className="w-3 h-3 fill-current" /> Level {USER_STATS.level}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* XP Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>XP</span>
                        <span>{USER_STATS.currentXp} / {USER_STATS.nextLevelXp}</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-slate-100" indicatorClassName={`bg-gradient-to-r ${isStudent ? "from-pink-500 to-rose-500" : "from-violet-500 to-fuchsia-500"}`} />
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                        <Layers className="w-5 h-5 text-indigo-500 mb-1" />
                        <span className="text-lg font-bold text-slate-700">{USER_STATS.totalSets}</span>
                        <span className="text-xs text-slate-400 font-medium">{t("createdSets") || "Sets Created"}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                        <Gamepad2 className="w-5 h-5 text-orange-500 mb-1" />
                        <span className="text-lg font-bold text-slate-700">{USER_STATS.totalGames}</span>
                        <span className="text-xs text-slate-400 font-medium">{isStudent ? (t("gamesPlayed") || "Games Played") : (t("gamesHosted") || "Games Hosted")}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
