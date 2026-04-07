"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    BookOpen,
    Users,
    BarChart3,
    Camera,
    History,
    Settings,
    UserCircle,
    Sparkles,
    Gamepad2,
} from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

const navItems = [
    { icon: LayoutDashboard, labelKey: "dashboard", href: "/dashboard" },
    { icon: BookOpen, labelKey: "mySets", href: "/dashboard/my-sets" },
    { icon: Users, labelKey: "activeClasses", href: "/dashboard/classrooms" },
    { icon: BarChart3, labelKey: "viewReports", href: "/dashboard/reports" },
    { icon: Camera, labelKey: "omrScanner", href: "/dashboard/omr" },
    { icon: History, labelKey: "history", href: "/dashboard/history" },
    { icon: Settings, labelKey: "settings", href: "/dashboard/settings" },
    { icon: UserCircle, labelKey: "profile", href: "/dashboard/profile" },
    { icon: Sparkles, labelKey: "upgradeToPlus", href: "/dashboard/upgrade" },
] as const

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const { t } = useLanguage()

    return (
        <div className={cn("flex h-full w-64 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-sm", className)}>
            <Link
                href="/dashboard"
                className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 px-5 transition-opacity hover:opacity-90"
            >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-200">
                    <Gamepad2 className="h-5 w-5 text-white" aria-hidden />
                </div>
                <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    GameEdu
                </span>
            </Link>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4" aria-label="Main">
                {navItems.map((item) => {
                    const isActive =
                        item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname === item.href || pathname.startsWith(`${item.href}/`)
                    const label = t(item.labelKey)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                                isActive
                                    ? "bg-indigo-50 text-indigo-800 shadow-sm ring-1 ring-indigo-100"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-5 w-5 shrink-0",
                                    isActive ? "text-indigo-600" : "text-slate-400"
                                )}
                                aria-hidden
                            />
                            <span className="truncate">{label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
