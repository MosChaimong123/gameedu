import Link from "next/link"
import { Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"

type PublicBrandMarkProps = {
    /** `default`: gradient mark on light bg. `onDark`: for gradient/hero panels (white text). */
    variant?: "default" | "onDark"
    href?: string
    className?: string
    size?: "sm" | "md" | "lg"
}

const sizeConfig = {
    sm: { box: "h-8 w-8", icon: "h-4 w-4", text: "text-lg" },
    md: { box: "h-9 w-9", icon: "h-5 w-5", text: "text-xl" },
    lg: { box: "h-11 w-11", icon: "h-6 w-6", text: "text-2xl" },
} as const

export function PublicBrandMark({
    variant = "default",
    href,
    className,
    size = "md",
}: PublicBrandMarkProps) {
    const s = sizeConfig[size]
    const inner = (
        <>
            <div
                className={cn(
                    "flex shrink-0 items-center justify-center rounded-xl shadow-md",
                    s.box,
                    variant === "onDark"
                        ? "bg-white/20 ring-1 ring-white/30"
                        : "bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-200/50"
                )}
            >
                <Gamepad2 className={cn(s.icon, "text-white")} aria-hidden />
            </div>
            <span
                className={cn(
                    "font-black tracking-tighter",
                    s.text,
                    variant === "onDark"
                        ? "text-white"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                )}
            >
                GameEdu
            </span>
        </>
    )

    const wrap = cn("inline-flex items-center gap-2.5", className)

    if (href) {
        return (
            <Link href={href} className={wrap}>
                {inner}
            </Link>
        )
    }
    return <div className={wrap}>{inner}</div>
}
