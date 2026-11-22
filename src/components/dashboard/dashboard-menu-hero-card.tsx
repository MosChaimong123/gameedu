"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DashboardMenuImage } from "@/lib/dashboard-menu-assets";

export type DashboardMenuHeroAction = {
    label: string;
    onActivate: () => void;
};

export type DashboardMenuHeroCardProps = {
    title: string;
    description: string;
    readyLabel: string;
    badgeEmoji: string;
    image: DashboardMenuImage;
    itemVariants?: Variants;
    primaryAction: DashboardMenuHeroAction;
    secondaryAction?: DashboardMenuHeroAction;
};

/**
 * Compact banner: the dashboard's headline action, kept to a single band so the
 * summary figures and the menu tiles stay above the fold on a 1080p screen.
 */
export function DashboardMenuHeroCard({
    title,
    description,
    readyLabel,
    badgeEmoji,
    image,
    itemVariants,
    primaryAction,
    secondaryAction,
}: DashboardMenuHeroCardProps) {
    return (
        <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-[1.75rem] bg-nav-teach shadow-lg shadow-nav-teach/20"
        >
            <motion.div
                className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10"
                aria-hidden
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />

            <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
                <div className="flex min-w-0 items-center gap-4">
                    <button
                        type="button"
                        onClick={primaryAction.onActivate}
                        aria-label={primaryAction.label}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-nav-teach shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                        <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
                    </button>
                    <div className="min-w-0">
                        <h2 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                            {title}
                        </h2>
                        <p className="mt-0.5 line-clamp-2 text-sm font-medium text-white sm:line-clamp-1">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                            <span aria-hidden>{badgeEmoji}</span>
                            {readyLabel}
                        </span>
                        <button
                            type="button"
                            onClick={primaryAction.onActivate}
                            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-nav-teach shadow-sm transition-transform hover:scale-[1.03] active:scale-95"
                        >
                            {primaryAction.label}
                        </button>
                        {secondaryAction ? (
                            <button
                                type="button"
                                onClick={secondaryAction.onActivate}
                                className="rounded-full border border-white/40 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
                            >
                                {secondaryAction.label}
                            </button>
                        ) : null}
                    </div>

                    <motion.div
                        className={cn(
                            "relative hidden shrink-0 lg:block",
                            "h-24 w-24 xl:h-28 xl:w-28"
                        )}
                        aria-hidden
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    >
                        <Image
                            src={image.src}
                            alt=""
                            width={320}
                            height={320}
                            sizes="112px"
                            className="h-full w-full object-contain object-center drop-shadow-[0_10px_18px_rgb(0_0_0_/_0.25)]"
                            priority
                        />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
