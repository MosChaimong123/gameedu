"use client";

import type { ComponentType } from "react";
import {
    BatteryCharging,
    Coins,
    FlaskConical,
    Gem,
    GraduationCap,
    Shield,
    ShieldCheck,
    Sparkles,
    Target,
    Wind,
    Zap,
    type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopBattleItemCategory } from "@/lib/shop-items";

type BattleItemKind = "held" | "usable" | "reward";

type BattleItemKindMeta = {
    titleKey: string;
    hintKey: string;
    chipClassName: string;
    iconClassName: string;
    icon: ComponentType<LucideProps>;
};

type BattleItemVisualMeta = {
    icon: ComponentType<LucideProps>;
    frameClassName: string;
    iconClassName: string;
    glowClassName: string;
};

const KIND_META: Record<BattleItemKind, BattleItemKindMeta> = {
    held: {
        titleKey: "shopBattleCategory_held",
        hintKey: "shopBattleCategory_held_hint",
        chipClassName: "border-sky-200 bg-sky-50 text-sky-700",
        iconClassName: "text-sky-700",
        icon: Shield,
    },
    usable: {
        titleKey: "shopBattleCategory_usable",
        hintKey: "shopBattleCategory_usable_hint",
        chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
        iconClassName: "text-emerald-700",
        icon: FlaskConical,
    },
    reward: {
        titleKey: "shopBattleCategory_reward",
        hintKey: "shopBattleCategory_reward_hint",
        chipClassName: "border-violet-200 bg-violet-50 text-violet-700",
        iconClassName: "text-violet-700",
        icon: Sparkles,
    },
};

const ITEM_VISUAL_META: Record<string, BattleItemVisualMeta> = {
    held_guard_core: {
        icon: Shield,
        frameClassName: "border-sky-200 bg-sky-50",
        iconClassName: "text-sky-700",
        glowClassName: "shadow-[0_10px_24px_rgba(14,165,233,0.18)]",
    },
    held_swift_anklet: {
        icon: Wind,
        frameClassName: "border-cyan-200 bg-cyan-50",
        iconClassName: "text-cyan-700",
        glowClassName: "shadow-[0_10px_24px_rgba(6,182,212,0.18)]",
    },
    held_scope_prism: {
        icon: Target,
        frameClassName: "border-fuchsia-200 bg-fuchsia-50",
        iconClassName: "text-fuchsia-700",
        glowClassName: "shadow-[0_10px_24px_rgba(192,38,211,0.18)]",
    },
    held_echo_battery: {
        icon: BatteryCharging,
        frameClassName: "border-amber-200 bg-amber-50",
        iconClassName: "text-amber-700",
        glowClassName: "shadow-[0_10px_24px_rgba(245,158,11,0.18)]",
    },
    held_clear_mind_charm: {
        icon: ShieldCheck,
        frameClassName: "border-indigo-200 bg-indigo-50",
        iconClassName: "text-indigo-700",
        glowClassName: "shadow-[0_10px_24px_rgba(99,102,241,0.18)]",
    },
    use_vital_vial: {
        icon: FlaskConical,
        frameClassName: "border-emerald-200 bg-emerald-50",
        iconClassName: "text-emerald-700",
        glowClassName: "shadow-[0_10px_24px_rgba(16,185,129,0.18)]",
    },
    use_charge_capsule: {
        icon: Zap,
        frameClassName: "border-yellow-200 bg-yellow-50",
        iconClassName: "text-yellow-700",
        glowClassName: "shadow-[0_10px_24px_rgba(234,179,8,0.18)]",
    },
    reward_lucky_coin: {
        icon: Coins,
        frameClassName: "border-amber-200 bg-amber-50",
        iconClassName: "text-amber-700",
        glowClassName: "shadow-[0_10px_24px_rgba(245,158,11,0.18)]",
    },
    reward_scholar_seal: {
        icon: GraduationCap,
        frameClassName: "border-violet-200 bg-violet-50",
        iconClassName: "text-violet-700",
        glowClassName: "shadow-[0_10px_24px_rgba(139,92,246,0.18)]",
    },
    reward_trait_crystal: {
        icon: Gem,
        frameClassName: "border-rose-200 bg-rose-50",
        iconClassName: "text-rose-700",
        glowClassName: "shadow-[0_10px_24px_rgba(244,63,94,0.18)]",
    },
};

export function getBattleItemKindMeta(categoryOrKind: ShopBattleItemCategory | BattleItemKind): BattleItemKindMeta {
    return KIND_META[categoryOrKind as BattleItemKind] ?? KIND_META.held;
}

export function BattleItemKindBadge({
    kind,
    label,
    className,
}: {
    kind: ShopBattleItemCategory | BattleItemKind;
    label: string;
    className?: string;
}) {
    const meta = getBattleItemKindMeta(kind);
    const Icon = meta.icon;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                meta.chipClassName,
                className
            )}
        >
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

export function BattleItemVisual({
    itemId,
    className,
    iconClassName,
}: {
    itemId: string;
    className?: string;
    iconClassName?: string;
}) {
    const meta = ITEM_VISUAL_META[itemId] ?? {
        icon: Sparkles,
        frameClassName: "border-slate-200 bg-slate-50",
        iconClassName: "text-slate-700",
        glowClassName: "shadow-[0_10px_24px_rgba(148,163,184,0.16)]",
    };
    const Icon = meta.icon;

    return (
        <span
            className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                meta.frameClassName,
                meta.glowClassName,
                className
            )}
        >
            <Icon className={cn("h-5 w-5", meta.iconClassName, iconClassName)} />
        </span>
    );
}
