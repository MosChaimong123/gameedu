"use client"

import type { ButtonHTMLAttributes } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

export type PageBackLinkProps = {
    /** เป้าหมายเมื่อใช้เป็นลิงก์ */
    href?: string
    /** ใช้เมื่อต้องการควบคุมเอง (เช่น ออกจากโฟลเดอร์ใน My Sets) — ใส่แล้วไม่ต้องใส่ href */
    onClick?: () => void
    /** ข้อความกำกับ (บนมือถือซ่อนแต่ยังอ่านด้วย screen reader ได้) */
    label?: string
    /** แปลจาก `translations` — ใช้แทน `label` เมื่อต้องการ i18n */
    labelKey?: string
    variant?: "default" | "inverse" | "minimal"
    className?: string
    iconClassName?: string
    /** สำหรับปุ่มแบบ onClick เมื่อต้องการรองรับ HTML5 drag (ไม่ใช้ ...buttonProps เต็มเพื่อไม่ชนกับ onDrag ของ framer-motion) */
    dragZoneProps?: Pick<
        ButtonHTMLAttributes<HTMLButtonElement>,
        "onDragOver" | "onDragLeave" | "onDrop"
    >
}

export function PageBackLink({
    href,
    onClick,
    label,
    labelKey,
    variant = "default",
    className,
    iconClassName,
    dragZoneProps,
}: PageBackLinkProps) {
    const { t } = useLanguage()
    const resolvedLabel = label ?? (labelKey ? t(labelKey) : undefined)
    const a11y = resolvedLabel ?? t("pageBackDefault")
    const aria = resolvedLabel ? undefined : a11y

    const inner = (
        <>
            <ArrowLeft
                className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5",
                    variant === "inverse" && "text-white",
                    iconClassName
                )}
                aria-hidden
            />
            {resolvedLabel ? (
                <span
                    className={cn(
                        "text-sm font-semibold tracking-tight max-sm:sr-only",
                        variant === "inverse" ? "text-white/95" : "text-slate-700"
                    )}
                >
                    {resolvedLabel}
                </span>
            ) : null}
        </>
    )

    const styles = cn(
        "group inline-flex items-center justify-center gap-2 rounded-full transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2",
        variant === "default" &&
            "border border-slate-200/90 bg-white/95 px-4 py-2.5 text-slate-700 shadow-sm shadow-slate-200/40 backdrop-blur-sm hover:border-indigo-200 hover:bg-gradient-to-r hover:from-white hover:to-indigo-50/90 hover:shadow-md",
        variant === "inverse" &&
            "border border-white/25 bg-white/10 px-4 py-2.5 text-white shadow-lg shadow-black/15 backdrop-blur-md hover:border-white/35 hover:bg-white/18",
        variant === "minimal" &&
            "border-0 bg-transparent px-2 py-2 text-slate-600 shadow-none hover:bg-slate-100/90",
        !resolvedLabel && "px-3",
        className
    )

    if (onClick && !href) {
        return (
            <motion.button
                type="button"
                aria-label={aria}
                onClick={onClick}
                className={styles}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                {...dragZoneProps}
            >
                {inner}
            </motion.button>
        )
    }

    if (!href) {
        return null
    }

    return (
        <motion.span className="inline-flex" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href={href} className={styles} aria-label={aria}>
                {inner}
            </Link>
        </motion.span>
    )
}
