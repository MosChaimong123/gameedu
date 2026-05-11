import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteMetadata } from "../../../content/public-pages";
import { BrandLogo, type BrandLogoSize } from "./brand-logo";

type PublicBrandMarkProps = {
    /** Kept for API compatibility; logo reads equally on light or dark panels. */
    variant?: "default" | "onDark";
    href?: string;
    className?: string;
    /** Center the mark horizontally (hero panels). */
    centered?: boolean;
    /** Extra classes on the image (e.g. drop-shadow). */
    logoClassName?: string;
    /** Show site name beside the logo (light nav: navy; onDark: white). */
    showTitle?: boolean;
    /** Override label; defaults to `siteMetadata.title`. */
    title?: string;
    size?: BrandLogoSize;
    /** Set on LCP pages (e.g. home). */
    priority?: boolean;
};

export function PublicBrandMark({
    variant = "default",
    href,
    className,
    centered = false,
    logoClassName,
    showTitle = false,
    title,
    size = "md",
    priority = false,
}: PublicBrandMarkProps) {
    const label = title ?? siteMetadata.title;
    const titleClassName = cn(
        "min-w-0 truncate font-black tracking-tight leading-none",
        variant === "onDark" ? "text-white" : "text-brand-navy",
        size === "sm" && "text-sm",
        size === "md" && "text-base sm:text-lg",
        size === "lg" && "text-lg sm:text-xl",
        size === "xl" && "text-xl sm:text-2xl",
        size === "2xl" && "text-2xl sm:text-3xl",
        size === "3xl" && "text-3xl sm:text-4xl"
    );

    const inner = (
        <>
            <BrandLogo
                size={size}
                priority={priority}
                className={cn(
                    centered && "object-center",
                    showTitle && "shrink-0",
                    logoClassName
                )}
            />
            {showTitle ? (
                <span className={titleClassName}>{label}</span>
            ) : (
                <span className="sr-only">{siteMetadata.title}</span>
            )}
        </>
    );

    const wrap = cn(
        "inline-flex min-w-0 items-center",
        showTitle && "gap-2 sm:gap-2.5",
        centered && "w-full justify-center",
        className
    );

    if (href) {
        return (
            <Link href={href} className={wrap}>
                {inner}
            </Link>
        );
    }
    return <div className={wrap}>{inner}</div>;
}
