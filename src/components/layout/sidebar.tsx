"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { resolvePlanIdForQuota } from "@/lib/plan/plan-access"
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
} from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { isOmrDashboardEnabled } from "@/lib/omr-dashboard-enabled"
import { BrandLogo } from "@/components/layout/brand-logo"

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
    const omrLive = isOmrDashboardEnabled()
    const { data: session } = useSession()
    const plan = resolvePlanIdForQuota(
        session?.user?.plan,
        session?.user?.planStatus,
        session?.user?.planExpiry
    )
    const hideUpgradeCta = plan === "PRO"

    return (
        <div
            className={cn(
                "flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-sm",
                className
            )}
        >
            <Link
                href="/dashboard"
                className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3 transition-opacity hover:opacity-90"
            >
                <BrandLogo size="md" className="shrink-0" />
                <span className="min-w-0 truncate text-sm font-black leading-tight tracking-tight text-sidebar-foreground">
                    {t("appName")}
                </span>
            </Link>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4" aria-label={t("mainNavigation")}>
                {navItems.map((item) => {
                    const isActive =
                        item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname === item.href || pathname.startsWith(`${item.href}/`)
                    const label = t(item.labelKey)
                    const isUpgrade = item.href === "/dashboard/upgrade"
                    const dimmed = isUpgrade && hideUpgradeCta
                    const omrLocked = item.href === "/dashboard/omr" && !omrLive
                    if (omrLocked) {
                        return (
                            <div
                                key={item.href}
                                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500"
                                aria-disabled="true"
                                title={t("hostComingSoon")}
                            >
                                <item.icon className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                                <span className="min-w-0 flex-1 truncate">{label}</span>
                                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                    {t("hostComingSoon")}
                                </span>
                            </div>
                        )
                    }
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                                isActive
                                    ? "bg-white/10 text-white shadow-sm ring-1 ring-brand-cyan/55"
                                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                                dimmed && "opacity-45"
                            )}
                            title={dimmed ? t("sidebarUpgradeDimmedHint") : undefined}
                        >
                            <item.icon
                                className={cn(
                                    "h-5 w-5 shrink-0",
                                    isActive ? "text-brand-pink" : "text-slate-400"
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
