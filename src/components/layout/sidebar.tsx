"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Library, Search, ShoppingBag, Joystick, BarChart, Settings, LogOut } from "lucide-react"

import { useLanguage } from "@/components/providers/language-provider"

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const { t } = useLanguage()

    const sidebarItems = [
        { icon: LayoutDashboard, label: t("dashboard"), href: "/dashboard" },
        { icon: Library, label: t("mySets"), href: "/dashboard/my-sets" },
        { icon: Search, label: t("discover"), href: "/dashboard/discover" },
        { icon: ShoppingBag, label: t("market"), href: "/dashboard/market" },
        { icon: Joystick, label: t("blooks"), href: "/dashboard/blooks" },
        { icon: BarChart, label: t("history"), href: "/dashboard/history" },
        { icon: Settings, label: t("settings"), href: "/dashboard/settings" },
    ]

    return (
        <div className={cn("flex h-full w-64 flex-col border-r bg-white", className)}>
            <div className="flex h-16 items-center px-6 border-b">
                <span className="text-2xl font-extrabold text-purple-600 tracking-tight">GamEdu</span>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                                    isActive
                                        ? "bg-purple-50 text-purple-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-purple-600" : "text-slate-400")} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="border-t p-4">
                <div className="rounded-lg bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-800">{t("upgradeToPlus")}</h4>
                    <p className="mt-1 text-xs text-slate-500">{t("getMoreTokens")}</p>
                    <button className="mt-3 w-full rounded-md bg-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500">
                        {t("upgradeNow")}
                    </button>
                </div>
            </div>
        </div>
    )
}
