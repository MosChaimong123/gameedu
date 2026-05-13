"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/providers/language-provider"
import { motion, Variants } from "framer-motion"
import { cn } from "@/lib/utils"
import { isOmrDashboardEnabled } from "@/lib/omr-dashboard-enabled"
import {
    getDashboardMenuImage,
    type DashboardMenuAssetKey,
} from "@/lib/dashboard-menu-assets"
import { DashboardMenuHeroCard } from "@/components/dashboard/dashboard-menu-hero-card"
import { DashboardMenuTile } from "@/components/dashboard/dashboard-menu-tile"

interface QuickActionsProps {
    role?: string
}

type QuickActionDef = {
    key: string
    assetKey: DashboardMenuAssetKey
    panelClass: string
    textClass: string
    path: string
    descKey: string
    disabled?: boolean
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
                staggerChildren: 0.1,
            },
        },
    }

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
            },
        },
    }

    const omrLive = isOmrDashboardEnabled()

    const teacherActions: QuickActionDef[] = [
        {
            key: "viewReports",
            assetKey: "viewReports",
            panelClass: "bg-amber-600",
            textClass: "text-amber-100/90",
            path: "/dashboard/reports",
            descKey: "checkProgress",
        },
        {
            key: "activeClasses",
            assetKey: "activeClasses",
            panelClass: "bg-emerald-600",
            textClass: "text-emerald-100/90",
            path: "/dashboard/classrooms",
            descKey: "manageStudents",
        },
        {
            key: "omrScanner",
            assetKey: "omrScanner",
            panelClass: "bg-sky-600",
            textClass: "text-sky-100/90",
            path: "/dashboard/omr",
            descKey: omrLive ? "scanAnswers" : "hostComingSoon",
            disabled: !omrLive,
        },
        {
            key: "mySets",
            assetKey: "mySets",
            panelClass: "bg-lime-600",
            textClass: "text-lime-100/90",
            path: "/dashboard/my-sets",
            descKey: "manageSetsDesc",
        },
    ]

    const studentActions: QuickActionDef[] = [
        {
            key: "profile",
            assetKey: "profile",
            panelClass: "bg-fuchsia-600",
            textClass: "text-fuchsia-100/90",
            path: "/dashboard/profile",
            descKey: "profileQuickDesc",
        },
        {
            key: "history",
            assetKey: "history",
            panelClass: "bg-sky-600",
            textClass: "text-sky-100/90",
            path: "/dashboard/history",
            descKey: "pastGames",
        },
        {
            key: "settings",
            assetKey: "settings",
            panelClass: "bg-slate-600",
            textClass: "text-slate-100/90",
            path: "/dashboard/settings",
            descKey: "preferences",
        },
        {
            key: "upgradeToPlus",
            assetKey: "upgrade",
            panelClass: "bg-amber-600",
            textClass: "text-amber-100/90",
            path: "/dashboard/upgrade",
            descKey: "getMoreTokens",
        },
    ]

    const actions = isStudent ? studentActions : teacherActions
    const heroImage = getDashboardMenuImage(isStudent ? "heroStudent" : "heroTeacher")

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <DashboardMenuHeroCard
                itemVariants={itemVariants}
                title={isStudent ? t("joinGame") : t("gamePlay")}
                description={isStudent ? t("enterCode") : t("teacherHeroDesc")}
                readyLabel={isStudent ? t("quickActionsStudentReady") : t("quickActionsTeacherReady")}
                badgeEmoji={isStudent ? "🎒" : "👑"}
                image={heroImage}
                onActivate={() => router.push(isStudent ? "/play" : "/dashboard/my-sets")}
            />

            <motion.div
                className={cn(
                    "grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14",
                    actions.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
                )}
            >
                {actions.map((action) => {
                    const locked = Boolean(action.disabled)
                    return (
                        <DashboardMenuTile
                            key={action.key}
                            itemVariants={itemVariants}
                            title={locked ? t("hostComingSoon") : t(action.key)}
                            description={locked ? t("hostComingSoon") : t(action.descKey)}
                            panelClass={action.panelClass}
                            textClass={action.textClass}
                            image={getDashboardMenuImage(action.assetKey)}
                            disabled={locked}
                            lockedLabel={t("hostComingSoon")}
                            onActivate={() => router.push(action.path)}
                        />
                    )
                })}
            </motion.div>
        </motion.div>
    )
}
