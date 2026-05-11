import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_ALT, BRAND_LOGO_PATH } from "@/lib/brand-assets";

const HEIGHT_CLASS = {
    sm: "h-8",
    md: "h-10",
    lg: "h-[52px]",
    /** Auth / split hero */
    xl: "h-32 sm:h-36 md:h-40",
    /** Landing / large hero above fold */
    "2xl": "h-52 sm:h-60 md:h-72 lg:h-80",
    /** Home hero — largest mark */
    "3xl": "h-56 sm:h-64 md:h-80 lg:h-96",
} as const;

const MAX_W_CLASS = {
    sm: "max-w-[min(160px,70vw)]",
    md: "max-w-[min(200px,72vw)]",
    lg: "max-w-[min(240px,72vw)]",
    xl: "max-w-[min(560px,96vw)]",
    "2xl": "max-w-[min(960px,min(98vw,60rem))]",
    "3xl": "max-w-[min(1100px,min(99vw,68rem))]",
} as const;

export type BrandLogoSize = keyof typeof HEIGHT_CLASS;

export function BrandLogo({
    size = "md",
    className,
    priority = false,
}: {
    size?: BrandLogoSize;
    className?: string;
    priority?: boolean;
}) {
    return (
        <Image
            src={BRAND_LOGO_PATH}
            alt={BRAND_LOGO_ALT}
            width={320}
            height={100}
            priority={priority}
            className={cn(
                "w-auto object-contain object-left",
                MAX_W_CLASS[size],
                HEIGHT_CLASS[size],
                className
            )}
        />
    );
}
