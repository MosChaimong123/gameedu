"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DashboardMenuImage } from "@/lib/dashboard-menu-assets";

export type DashboardMenuTileProps = {
    title: string;
    description: string;
    panelClass: string;
    textClass: string;
    image: DashboardMenuImage;
    disabled?: boolean;
    lockedLabel: string;
    itemVariants?: Variants;
    onActivate: () => void;
};

export function DashboardMenuTile({
    title,
    description,
    panelClass,
    textClass,
    image,
    disabled = false,
    lockedLabel,
    itemVariants,
    onActivate,
}: DashboardMenuTileProps) {
    return (
        <motion.div variants={itemVariants} className="relative overflow-visible">
            <motion.div
                role="button"
                tabIndex={disabled ? -1 : 0}
                className={cn(
                    "group relative z-10 mt-16 flex min-h-[13rem] flex-col justify-end overflow-visible rounded-[1.75rem] border border-white/15 px-5 pb-5 pt-10 shadow-[0_18px_40px_-18px_rgb(15_23_42_/_0.45)] transition-shadow sm:mt-[4.5rem] sm:min-h-[14.5rem] sm:rounded-[2rem] sm:px-6 sm:pb-6 sm:pt-11",
                    panelClass,
                    disabled ? "cursor-not-allowed opacity-90" : "cursor-pointer hover:shadow-[0_22px_48px_-16px_rgb(15_23_42_/_0.5)]"
                )}
                onClick={() => {
                    if (disabled) return;
                    onActivate();
                }}
                onKeyDown={(event) => {
                    if (disabled) return;
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onActivate();
                    }
                }}
                whileHover={disabled ? undefined : { y: -4 }}
                whileTap={disabled ? undefined : { scale: 0.98 }}
            >
                {/* กึ่งกลางขอบบนการ์ด: ครึ่งบนอยู่นอกพื้น ครึ่งล่างทับเข้าในการ์ด (ตามรูปอ้างอิง) */}
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex justify-center -mt-[5.25rem] sm:-mt-24 md:-mt-[6.375rem]"
                    aria-hidden
                >
                    <motion.div
                        className="relative mx-auto h-[10.5rem] w-[min(88%,13.5rem)] sm:h-[12rem] sm:w-[min(82%,15rem)] md:h-[12.75rem] md:w-[min(78%,15.75rem)]"
                        animate={disabled ? undefined : { y: [0, -4, 0] }}
                        transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    >
                        <Image
                            src={image.src}
                            alt=""
                            width={480}
                            height={480}
                            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 22vw, 18vw"
                            className="h-full w-full object-contain object-bottom object-center drop-shadow-[0_16px_24px_rgb(0_0_0_/_0.28)]"
                        />
                    </motion.div>
                </div>

                <motion.div
                    className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[58%] bg-white/10"
                    aria-hidden
                />

                <div className="relative z-10 mt-auto space-y-1.5">
                    <h3 className="text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
                        {title}
                    </h3>
                    <p className={cn("line-clamp-2 text-sm font-medium leading-snug", textClass)}>
                        {description}
                    </p>
                </div>

                {disabled ? (
                    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[inherit] bg-slate-950/50">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/95 px-3 py-1.5 text-xs font-bold text-brand-navy shadow-md">
                            <Lock className="h-3.5 w-3.5" aria-hidden />
                            {lockedLabel}
                        </span>
                    </div>
                ) : null}
            </motion.div>
        </motion.div>
    );
}
