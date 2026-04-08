"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { isNegamonIconImageUrl } from "@/lib/negamon-icon";

export interface NegamonFormIconProps {
    icon: string;
    /** ใช้เป็น alt ของรูป / aria-label ของ emoji */
    label?: string;
    className?: string;
    emojiClassName?: string;
    imageClassName?: string;
    width?: number;
    height?: number;
}

export function NegamonFormIcon({
    icon,
    label = "",
    className,
    emojiClassName,
    imageClassName,
    width = 56,
    height = 56,
}: NegamonFormIconProps) {
    if (!icon) return null;

    if (isNegamonIconImageUrl(icon)) {
        return (
            <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
                <Image
                    src={icon}
                    alt={label || "Monster"}
                    width={width}
                    height={height}
                    unoptimized
                    className={cn("max-h-full max-w-full object-contain", imageClassName)}
                />
            </span>
        );
    }

    return (
        <span
            className={cn("inline-flex shrink-0 items-center justify-center leading-none", className, emojiClassName)}
            role="img"
            aria-label={label || undefined}
        >
            {icon}
        </span>
    );
}
