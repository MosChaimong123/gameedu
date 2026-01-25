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
import { LogOut, User, Menu } from "lucide-react"

import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/components/providers/language-provider"

export function Topbar() {
    const { data: session } = useSession()
    const { t } = useLanguage()

    return (
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
            <div className="flex items-center">
                {/* Mobile menu trigger could go here */}
                <h2 className="text-lg font-semibold text-slate-800 hidden md:block">
                    {/* Dynamic Title based on route could go here */}
                    {t("welcomeBack")}, {session?.user?.name || t("student")}!
                </h2>
            </div>

            <div className="flex items-center space-x-4">
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

import { Settings } from "lucide-react"
