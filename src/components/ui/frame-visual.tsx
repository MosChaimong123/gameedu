"use client";

import type { CSSProperties, ReactNode } from "react";
import type { FramePreview } from "@/lib/shop-items";
import { cn } from "@/lib/utils";

/** Highlight + vignette over base gradient — reads as enamel / foil, not flat fill. */
function bezelLayeredBackground(baseGradient: string | undefined): Pick<CSSProperties, "backgroundImage"> {
    const base = baseGradient?.trim() || "linear-gradient(180deg, #94a3b8, #64748b)";
    return {
        backgroundImage: [
            "radial-gradient(ellipse 125% 90% at 12% 4%, rgba(255,255,255,0.42), transparent 55%)",
            "radial-gradient(ellipse 100% 85% at 94% 94%, rgba(15,23,42,0.17), transparent 48%)",
            base,
        ].join(", "),
    };
}

const SIZE_CLASSES = {
    sm: "h-12 w-12 min-h-[3rem] min-w-[3rem]",
    md: "h-16 w-16 min-h-[4rem] min-w-[4rem]",
    lg: "h-28 w-28 min-h-[7rem] min-w-[7rem]",
    /** Student profile hero avatar (~132–144px) */
    xl: "h-[132px] w-[132px] min-h-[132px] min-w-[132px] sm:h-[144px] sm:w-[144px] sm:min-h-[9rem] sm:min-w-[9rem]",
};

function mergeShadow(preview: FramePreview): string | undefined {
    const parts = [preview.shadow, preview.haloShadow].filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
}

/** Circular / squircle preview ring — shop list & avatar portrait */
export function FrameRing({
    preview,
    size = "sm",
    rounded = "full",
    className,
    children,
}: {
    preview: FramePreview;
    size?: keyof typeof SIZE_CLASSES;
    rounded?: "full" | "avatar";
    className?: string;
    children?: ReactNode;
}) {
    const roundedOuter = rounded === "full" ? "rounded-full" : "rounded-[1.75rem]";
    const roundedInnerGrey =
        rounded === "full" ? "rounded-full" : "rounded-[1.45rem]";
    const bw = preview.borderWidthPx;
    const shadowMerged = mergeShadow(preview);

    const placeholder = (
        <div className={cn("absolute bg-slate-200", roundedInnerGrey)} style={{ inset: Math.max(4, bw + 2) }} />
    );

    if (preview.variant === "t1_minimal") {
        return (
            <div
                className={cn("relative shrink-0 overflow-hidden", SIZE_CLASSES[size], roundedOuter, className)}
                style={{
                    borderWidth: bw,
                    borderStyle: "solid",
                    borderColor: preview.borderColor,
                    boxShadow: shadowMerged,
                    background: "#ffffff",
                }}
            >
                {children ?? placeholder}
            </div>
        );
    }

    if (preview.variant === "t2_dual" || preview.variant === "t3_ascendant") {
        const pad = Math.max(2, Math.round(bw / 2));
        return (
            <div
                className={cn("relative shrink-0 overflow-hidden", SIZE_CLASSES[size], roundedOuter, className)}
                style={{
                    padding: pad,
                    ...bezelLayeredBackground(preview.gradient),
                    boxShadow: shadowMerged,
                }}
            >
                <div className={cn("relative h-full w-full overflow-hidden bg-white shadow-inner", roundedOuter)}>
                    {children ?? (
                        <div className={cn("absolute bg-slate-200", roundedInnerGrey)} style={{ inset: pad + 2 }} />
                    )}
                </div>
                {preview.variant === "t3_ascendant" ? (
                    <>
                        <span
                            className="pointer-events-none absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white"
                            style={{ boxShadow: `0 0 10px ${preview.borderColor}` }}
                        />
                        <span
                            className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white"
                            style={{ boxShadow: `0 0 10px ${preview.borderColor}` }}
                        />
                        <span
                            className="pointer-events-none absolute bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-white"
                            style={{ boxShadow: `0 0 10px ${preview.borderColor}` }}
                        />
                        <span
                            className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-white"
                            style={{ boxShadow: `0 0 10px ${preview.borderColor}` }}
                        />
                    </>
                ) : null}
            </div>
        );
    }

    /* t4_sovereign — rotating conic under a white mask */
    const inset = Math.max(3, bw);
    return (
        <div className={cn("relative shrink-0 overflow-hidden", SIZE_CLASSES[size], roundedOuter, className)}>
            {preview.animated && preview.conicGradient ? (
                <div
                    className={cn(
                        "pointer-events-none absolute inset-0 opacity-95 frame-tier-conic-spin",
                        roundedOuter
                    )}
                    style={{ background: preview.conicGradient }}
                    aria-hidden
                />
            ) : null}
            <div
                className={cn("relative z-[1] h-full w-full", roundedOuter)}
                style={{
                    padding: inset,
                    ...bezelLayeredBackground(preview.gradient),
                    boxShadow: shadowMerged,
                }}
            >
                <div className={cn("relative h-full w-full overflow-hidden bg-white", roundedOuter)}>
                    {children ?? (
                        <div
                            className={cn("absolute bg-slate-200", roundedInnerGrey)}
                            style={{ inset: Math.max(4, inset - 1) }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export function mergeFramePreviewShadow(preview: FramePreview): string | undefined {
    return mergeShadow(preview);
}

/**
 * Rectangular card bezel — classroom grid card & Negamon card outer shell.
 * Outer radius should match design (e.g. rounded-[2rem], rounded-[1.35rem]).
 */
export function FrameCardChrome({
    preview,
    outerClassName,
    innerClassName,
    innerRoundedClassName,
    children,
}: {
    preview: FramePreview;
    outerClassName?: string;
    innerClassName?: string;
    /** e.g. rounded-[1.85rem] inside rounded-[2rem] padded shell */
    innerRoundedClassName: string;
    children: React.ReactNode;
}) {
    const shadowMerged = mergeShadow(preview);
    const pad = preview.borderWidthPx;

    if (preview.variant === "t1_minimal") {
        return (
            <div
                className={cn("relative", outerClassName)}
                style={{
                    borderWidth: pad,
                    borderStyle: "solid",
                    borderColor: preview.borderColor,
                    boxShadow: shadowMerged,
                    background: "#ffffff",
                }}
            >
                <div className={innerClassName}>{children}</div>
            </div>
        );
    }

    if (preview.variant === "t2_dual" || preview.variant === "t3_ascendant") {
        return (
            <div
                className={cn("relative", outerClassName)}
                style={{
                    padding: pad,
                    ...bezelLayeredBackground(preview.gradient),
                    boxShadow: shadowMerged,
                }}
            >
                <div className={cn("bg-white shadow-inner", innerRoundedClassName, innerClassName)}>{children}</div>
                {preview.variant === "t3_ascendant" ? (
                    <>
                        <span
                            className="pointer-events-none absolute left-2 top-2 h-2 w-2 rounded-full bg-white/90"
                            style={{ boxShadow: `0 0 14px ${preview.borderColor}` }}
                        />
                        <span
                            className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-white/90"
                            style={{ boxShadow: `0 0 14px ${preview.borderColor}` }}
                        />
                        <span
                            className="pointer-events-none absolute bottom-2 left-2 h-2 w-2 rounded-full bg-white/90"
                            style={{ boxShadow: `0 0 14px ${preview.borderColor}` }}
                        />
                        <span
                            className="pointer-events-none absolute bottom-2 right-2 h-2 w-2 rounded-full bg-white/90"
                            style={{ boxShadow: `0 0 14px ${preview.borderColor}` }}
                        />
                    </>
                ) : null}
            </div>
        );
    }

    /* t4_sovereign */
    return (
        <div
            className={cn("relative overflow-hidden", outerClassName)}
            style={{ padding: pad, ...bezelLayeredBackground(preview.gradient), boxShadow: shadowMerged }}
        >
            {preview.animated && preview.conicGradient ? (
                <div
                    className="pointer-events-none absolute inset-0 opacity-35 frame-tier-conic-spin"
                    style={{ background: preview.conicGradient }}
                    aria-hidden
                />
            ) : null}
            <div className={cn("relative z-[1] bg-white shadow-inner", innerRoundedClassName, innerClassName)}>
                {children}
            </div>
            <div
                className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.12] frame-tier-shimmer"
                aria-hidden
            />
        </div>
    );
}
