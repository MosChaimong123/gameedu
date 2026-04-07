"use client"

import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LogOut, User, Settings, Sparkles, Search, Gamepad2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useState } from "react"

import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/components/providers/language-provider"
import { NotificationTray } from "@/components/dashboard/notification-tray"
import { motion } from "framer-motion"
type TopbarProps = {
    /** When the layout shows a desktop sidebar with the same GameEdu brand, hide this block to avoid duplication. */
    hideLeadingBrand?: boolean
}

export function Topbar({ hideLeadingBrand = false }: TopbarProps) {
    const { data: session } = useSession()
    const { t } = useLanguage()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const q = searchQuery.trim()
        router.push(q ? `/dashboard/my-sets?q=${encodeURIComponent(q)}` : "/dashboard/my-sets")
    }

    return (
        <header className="sticky top-0 z-50 flex h-14 min-h-[3.5rem] items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-md transition-colors duration-500 sm:h-16 sm:px-6">
            {!hideLeadingBrand ? (
                <div className="hidden items-center gap-4 md:flex lg:w-1/4">
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group flex cursor-pointer items-center gap-2"
                        onClick={() => router.push("/dashboard")}
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-200 transition-transform group-hover:rotate-6">
                            <Gamepad2 className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-black tracking-tighter text-transparent">
                            GameEdu
                        </span>
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_10px_purple]"
                        />
                    </motion.div>
                </div>
            ) : (
                <div className="flex shrink-0 items-center md:hidden">
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl py-1 pr-2 text-left transition-opacity hover:opacity-90"
                        onClick={() => router.push("/dashboard")}
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-200">
                            <Gamepad2 className="h-4 w-4 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-lg font-black tracking-tighter text-transparent">
                            GameEdu
                        </span>
                    </button>
                </div>
            )}

            {/* Centered Search Bar */}
            <div className="mx-2 min-w-0 flex-1 sm:mx-4 sm:max-w-lg">
                <form onSubmit={handleSearch} className="relative w-full">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-3" />
                    <Input
                        type="text"
                        placeholder={t("discover") + "..."}
                        className="h-10 w-full touch-manipulation rounded-full border-transparent bg-muted/50 pl-9 text-base transition-all focus-visible:bg-background focus-visible:ring-indigo-500 sm:h-9 sm:pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-0 md:space-x-4">
                {session?.user?.plan === "PLUS" ? (
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">{t("planPlusBadge")}</span>
                    </motion.div>
                ) : (
                    <Button 
                        onClick={() => router.push("/dashboard/upgrade")}
                        className="hidden md:flex bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-sm border-0 h-9 transition-all active:scale-95 shadow-indigo-100"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t("upgradeToPlus")}
                    </Button>
                )}

                <NotificationTray />

                <LanguageToggle />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10 border-2 border-slate-100">
                                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                                <AvatarFallback className="bg-purple-100 text-purple-700">
                                    {session?.user?.name?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-2 rounded-[1.5rem] bg-popover/90 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200" align="end" forceMount>
                        <DropdownMenuLabel className="p-4">
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-indigo-100 shadow-sm">
                                        <AvatarImage src={session?.user?.image || ""} />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black">
                                            {session?.user?.name?.[0]?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-sm font-black leading-none text-slate-800 truncate">{session?.user?.name}</p>
                                        <p className="text-[10px] leading-none text-slate-400 mt-1 truncate">
                                            {session?.user?.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[9px] font-black text-indigo-600 border border-indigo-100 uppercase tracking-tighter">
                                        {session?.user?.role || "STUDENT"}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[9px] font-black text-amber-600 border border-amber-100 uppercase tracking-tighter">
                                        Active
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-100/50 my-1" />
                        <div className="p-1 space-y-1">
                            <DropdownMenuItem 
                                onClick={() => router.push("/dashboard/profile")}
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all focus:bg-indigo-50 focus:text-indigo-600 group"
                            >
                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-focus:bg-indigo-100 transition-colors">
                                    <User className="h-4 w-4 text-slate-500 group-focus:text-indigo-600" />
                                </div>
                                <span className="text-sm font-bold">{t("profile")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => router.push("/dashboard/settings")}
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all focus:bg-indigo-50 focus:text-indigo-600 group"
                            >
                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-focus:bg-indigo-100 transition-colors">
                                    <Settings className="h-4 w-4 text-slate-500 group-focus:text-indigo-600" />
                                </div>
                                <span className="text-sm font-bold">{t("settings")}</span>
                            </DropdownMenuItem>
                        </div>
                        <DropdownMenuSeparator className="bg-slate-100/50 my-1" />
                        <div className="p-1">
                            <DropdownMenuItem 
                                onClick={() => signOut()}
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all focus:bg-red-50 focus:text-red-600 group text-red-500"
                            >
                                <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center group-focus:bg-red-100 transition-colors">
                                    <LogOut className="h-4 w-4 text-red-400 group-focus:text-red-600" />
                                </div>
                                <span className="text-sm font-bold">{t("logout")}</span>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}


