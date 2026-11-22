"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/providers/language-provider"
import { motion, Variants } from "framer-motion"
import { cn } from "@/lib/utils"
import { getDashboardMenuImage } from "@/lib/dashboard-menu-assets"
import { getDashboardTiles, isNavItemLocked } from "@/lib/navigation/dashboard-nav"
import { NAV_GROUP_TILE_STYLES } from "@/lib/navigation/dashboard-nav-styles"
import { DashboardMenuHeroCard } from "@/components/dashboard/dashboard-menu-hero-card"
import { DashboardMenuTile } from "@/components/dashboard/dashboard-menu-tile"
import { ComingSoonDialog } from "@/components/dashboard/coming-soon-dialog"

interface QuickActionsProps {
    role?: string
    /** Headline counts, rendered between the hero band and the menu tiles. */
    kpiSlot?: ReactNode
}

export const QuickActions = ({ role, kpiSlot }: QuickActionsProps) => {
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

    const actions = getDashboardTiles(role)
    const heroImage = getDashboardMenuImage(isStudent ? "heroStudent" : "heroTeacher")
    const [lockedTileKey, setLockedTileKey] = useState<string | null>(null)
    const lockedTile = actions.find((action) => action.key === lockedTileKey) ?? null

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
                primaryAction={{
                    label: isStudent ? t("joinGame") : t("heroHostGame"),
                    onActivate: () => router.push(isStudent ? "/play" : "/dashboard/my-sets"),
                }}
                secondaryAction={
                    isStudent
                        ? undefined
                        : {
                              label: t("heroCreateSet"),
                              onActivate: () => router.push("/dashboard/create-set"),
                          }
                }
            />

            {kpiSlot ? <motion.div variants={itemVariants}>{kpiSlot}</motion.div> : null}

            <motion.div
                className={cn(
                    "grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14",
                    actions.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
                )}
            >
                {actions.map((action) => {
                    const locked = isNavItemLocked(action)
                    const style = NAV_GROUP_TILE_STYLES[action.group]
                    return (
                        <DashboardMenuTile
                            key={action.key}
                            itemVariants={itemVariants}
                            title={t(action.labelKey)}
                            description={t(action.descKey)}
                            panelClass={style.panelClass}
                            textClass={style.textClass}
                            image={getDashboardMenuImage(action.assetKey)}
                            disabled={locked}
                            lockedLabel={t("hostComingSoon")}
                            onActivate={() => router.push(action.href)}
                            onLockedActivate={() => setLockedTileKey(action.key)}
                        />
                    )
                })}
            </motion.div>

            <ComingSoonDialog
                open={Boolean(lockedTile)}
                onOpenChange={(open) => {
                    if (!open) setLockedTileKey(null)
                }}
                title={lockedTile ? t(lockedTile.labelKey) : ""}
                description={lockedTile ? t(lockedTile.comingSoonBodyKey ?? lockedTile.descKey) : ""}
            />
        </motion.div>
    )
}
