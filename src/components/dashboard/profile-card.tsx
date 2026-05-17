"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Gamepad2, Building2, Library } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit2, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

// Stat fallbacks
const USER_STATS = {
    level: 1,
    currentXp: 120,
    nextLevelXp: 500,
    totalGames: 0,
    totalSets: 0,
}

type SessionUserWithSchool = {
    name?: string | null
    email?: string | null
    image?: string | null
    school?: string | null
}

export function ProfileCard({ role }: { role?: string }) {
    const { data: session, update } = useSession()
    const { t } = useLanguage()
    const { toast } = useToast()
    const router = useRouter()
    const isStudent = role === "STUDENT"

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [school, setSchool] = useState("")
    const sessionUser = session?.user as SessionUserWithSchool | undefined

    useEffect(() => {
        if (sessionUser) {
            setName(sessionUser.name || "")
            setSchool(sessionUser.school || "")
        }
    }, [sessionUser])

    const handleSave = async () => {
        if (!name.trim()) return
        setLoading(true)
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, school })
            })

            if (res.ok) {
                await update() // Refresh NextAuth session
                toast({
                    title: t("profileSaveSuccessTitle"),
                    description: t("profileSaveSuccessDesc"),
                })
                setOpen(false)
                router.refresh()
            } else {
                throw new Error("Failed")
            }
        } catch {
            toast({
                title: t("profileSaveFailTitle"),
                variant: "destructive",
                description: t("profileSaveTryAgain"),
            })
        } finally {
            setLoading(false)
        }
    }

    const userName = sessionUser?.name || t("profileDisplayNameFallback")
    const userEmail = sessionUser?.email || ""
    const userSchool = session?.user?.school || t("noSchoolSet")
    const userImage = sessionUser?.image || ""

    // Calculate progress percentage
    const progress = (USER_STATS.currentXp / USER_STATS.nextLevelXp) * 100

    return (
        <Card className="border-none shadow-xl bg-card rounded-[2rem] overflow-hidden group">
            {/* Header / Banner */}
            <div className={`h-32 bg-gradient-to-br ${isStudent ? "from-pink-500 via-rose-500 to-orange-400" : "from-indigo-600 via-purple-600 to-fuchsia-500"} relative`}>
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Trophy className="w-20 h-20 text-white transform rotate-12" />
                </div>
                
                <div className="absolute -bottom-12 left-8 h-24 w-24 rounded-[2rem] border-4 border-card bg-card shadow-2xl overflow-hidden ring-4 ring-muted/50">
                    <Avatar className="h-full w-full rounded-none">
                        <AvatarImage src={userImage} />
                        <AvatarFallback className="bg-slate-100 text-slate-400 text-2xl font-black">
                            {userName[0]}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>

            <CardHeader className="pt-16 pb-4 px-8">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-foreground tracking-tight">{userName}</h2>
                        <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white ${isStudent ? "bg-pink-500" : "bg-indigo-600"}`}>
                            {isStudent ? t("profileRoleStudent") : t("profileRoleTeacher")}
                        </div>
                        {!isStudent && (
                            <Dialog open={open} onOpenChange={setOpen}>
                                <DialogTrigger asChild>
                                    <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-indigo-600 transition-all ml-1">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-0 shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                <Edit2 className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            {t("profileEditTeacherTitle")}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold text-slate-600">{t("profileTeacherNameLabel")}</Label>
                                            <Input 
                                                value={name} 
                                                onChange={(e) => setName(e.target.value)}
                                                className="rounded-xl h-12 focus-visible:ring-indigo-500 border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold text-slate-600">{t("profileSchoolNameLabel")}</Label>
                                            <Input 
                                                value={school} 
                                                onChange={(e) => setSchool(e.target.value)}
                                                placeholder={t("profileSchoolPlaceholder")}
                                                className="rounded-xl h-12 focus-visible:ring-indigo-500 border-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">{t("cancel")}</Button>
                                        <Button 
                                            onClick={handleSave} 
                                            disabled={loading}
                                            className="h-11 w-full rounded-xl bg-indigo-600 px-8 font-bold text-white hover:bg-indigo-700 sm:w-auto sm:min-w-[120px]"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("save")}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 font-medium">{userEmail}</p>
                    
                    {!isStudent && (
                         <div className="flex items-center gap-1.5 mt-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 w-fit">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">
                                {userSchool}
                            </span>
                        </div>
                    )}

                    <div className={`flex items-center gap-1.5 mt-1 font-black ${isStudent ? "text-rose-500" : "text-indigo-600"}`}>
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm">{t("profileLevelBadge", { level: USER_STATS.level })}</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 px-8 pb-8">
                {/* XP Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                        <span>{t("profileXpProgress")}</span>
                        <span>{USER_STATS.currentXp} / {USER_STATS.nextLevelXp}</span>
                    </div>
                    <Progress 
                        value={progress} 
                        className="h-2.5 bg-slate-100 rounded-full overflow-hidden" 
                        indicatorClassName={`bg-gradient-to-r ${isStudent ? "from-pink-500 to-orange-400" : "from-indigo-600 to-fuchsia-500"}`} 
                    />
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-4 rounded-2xl border border-border transition-all hover:bg-card hover:shadow-md">
                        <div className="flex items-center gap-2 text-indigo-500 mb-1">
                            <Library className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t("myQuestionSets")}</span>
                        </div>
                        <div className="text-xl font-black text-foreground">{USER_STATS.totalSets}</div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-2xl border border-border transition-all hover:bg-card hover:shadow-md">
                        <div className="flex items-center gap-2 text-emerald-500 mb-1">
                            <Gamepad2 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t("totalGamesPlayed")}</span>
                        </div>
                        <div className="text-xl font-black text-foreground">{USER_STATS.totalGames}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
