"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DashboardMenuImage } from "@/lib/dashboard-menu-assets";

export type DashboardMenuHeroCardProps = {
    title: string;
    description: string;
    readyLabel: string;
    badgeEmoji: string;
    image: DashboardMenuImage;
    itemVariants?: Variants;
    onActivate: () => void;
};

export function DashboardMenuHeroCard({
    title,
    description,
    readyLabel,
    badgeEmoji,
    image,
    itemVariants,
    onActivate,
}: DashboardMenuHeroCardProps) {
    return (
        <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-[2rem] border border-brand-pink/30 bg-brand-pink shadow-2xl shadow-brand-pink/20 transition-shadow hover:shadow-brand-pink/30"
        >
            <button
                type="button"
                className={cn(
                    "relative flex w-full min-w-0 flex-col items-center gap-5 overflow-hidden rounded-[2rem] p-5 text-left",
                    "sm:gap-6 sm:p-6",
                    "md:flex-row md:items-center md:justify-between md:gap-8 md:p-10",
                    "lg:p-12"
                )}
                onClick={onActivate}
            >
                <motion.div
                    className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15"
                    aria-hidden
                    animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.5, 0.35] }}
                    transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                />
                <motion.div
                    className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-brand-cyan/25"
                    aria-hidden
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.4 }}
                />

                <div className="relative z-10 flex w-full min-w-0 flex-col items-center gap-4 text-center sm:gap-5 md:max-w-[55%] md:items-start md:text-left">
                    <div>
                        <h2 className="mb-2 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                            {title}
                        </h2>
                        <p className="max-w-md text-base font-medium text-white/85 sm:text-lg">{description}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/90 shadow-sm md:hidden">
                        <span aria-hidden>{badgeEmoji}</span>
                        {readyLabel}
                    </span>
                </div>

                <motion.div className="relative z-10 flex w-full max-w-md shrink-0 items-center justify-center gap-3 min-[380px]:gap-4 sm:max-w-none sm:gap-5 md:w-auto md:gap-6">
                    <motion.div
                        className={cn(
                            "relative shrink-0 overflow-hidden",
                            "h-[clamp(8.5rem,40vmin,11.25rem)] w-[clamp(8.5rem,40vmin,11.25rem)]",
                            "min-[380px]:h-[clamp(9rem,36vmin,11.75rem)] min-[380px]:w-[clamp(9rem,36vmin,11.75rem)]",
                            "sm:h-[clamp(9.75rem,32vmin,13rem)] sm:w-[clamp(9.75rem,32vmin,13rem)]",
                            "md:h-[clamp(10.5rem,28vmin,14rem)] md:w-[clamp(10.5rem,28vmin,14rem)]",
                            "lg:h-[clamp(11.5rem,24vmin,15.5rem)] lg:w-[clamp(11.5rem,24vmin,15.5rem)]",
                            "xl:h-[clamp(12.5rem,22vmin,17rem)] xl:w-[clamp(12.5rem,22vmin,17rem)]",
                            "2xl:h-[17.5rem] 2xl:w-[17.5rem]"
                        )}
                        aria-hidden
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    >
                        <Image
                            src={image.src}
                            alt=""
                            width={640}
                            height={640}
                            sizes="(max-width: 480px) 42vw, (max-width: 768px) 36vw, (max-width: 1024px) 30vw, (max-width: 1536px) 26vw, 320px"
                            className="h-full w-full object-contain object-center drop-shadow-[0_16px_28px_rgb(0_0_0_/_0.28)]"
                            priority
                        />
                    </motion.div>
                    <div
                        className={cn(
                            "flex shrink-0 items-center justify-center rounded-full bg-white text-brand-pink shadow-2xl transition-transform group-hover:scale-105 group-active:scale-95",
                            "h-[clamp(3.75rem,18vmin,4.75rem)] w-[clamp(3.75rem,18vmin,4.75rem)]",
                            "min-[380px]:h-20 min-[380px]:w-20",
                            "sm:h-[clamp(4.5rem,14vmin,5.75rem)] sm:w-[clamp(4.5rem,14vmin,5.75rem)]",
                            "md:h-28 md:w-28",
                            "lg:h-32 lg:w-32"
                        )}
                    >
                        <Play
                            className="ml-0.5 h-[clamp(1.75rem,8vmin,2.25rem)] w-[clamp(1.75rem,8vmin,2.25rem)] fill-current min-[380px]:h-9 min-[380px]:w-9 sm:h-10 sm:w-10 md:h-11 md:w-11"
                            aria-hidden
                        />
                    </div>
                </motion.div>

                <span className="absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white/90 shadow-lg md:inline-flex">
                    <span aria-hidden>{badgeEmoji}</span>
                    {readyLabel}
                </span>
            </button>
        </motion.div>
    );
}
