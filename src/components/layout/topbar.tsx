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
import { LogOut, User, Menu, Settings, Sparkles, Search, ArrowLeft } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/components/providers/language-provider"

export function Topbar() {
    const { data: session } = useSession()
    const { t } = useLanguage()
    const router = useRouter()
    const pathname = usePathname()
    const [searchQuery, setSearchQuery] = useState("")

    // Don't show back button on main dashboard or landing page
    const showBackButton = pathname !== "/dashboard" && pathname !== "/"

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/dashboard/discover?q=${encodeURIComponent(searchQuery)}`)
        }
    }

    return (
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
            <div className="flex items-center gap-4 hidden md:flex lg:w-1/4">
                {showBackButton && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => router.back()}
                        title={t("back") || "Back"}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <h2 className="text-lg font-semibold text-slate-800 truncate">
                    {t("welcomeBack")}, {session?.user?.name || t("student")}!
                </h2>
            </div>

            {/* Centered Search Bar */}
            <div className="flex-1 max-w-lg mx-4">
                <form onSubmit={handleSearch} className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder={t("discover") + "..."}
                        className="w-full pl-10 bg-slate-100/50 border-transparent focus-visible:ring-indigo-500 focus-visible:bg-white rounded-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="flex items-center space-x-4">
                <Button className="hidden md:flex bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-sm border-0 h-9">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t("upgradeToPlus")}
                </Button>

                <LanguageToggle />

                <div className="hidden md:flex items-center px-3 py-1 bg-yellow-100 rounded-full border border-yellow-200">
                    <span className="text-xs font-bold text-yellow-700 mr-1">T</span>
                    <span className="text-sm font-bold text-yellow-800">0</span>
                </div>

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
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>{t("profile")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" /> {/* Ensure Settings is imported from lucide-react */}
                            <span>{t("settings")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{t("logout")}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}


