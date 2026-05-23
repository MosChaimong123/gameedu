"use client";

import { useMemo } from "react";
import { Backpack, Coins, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { shopItemDescKey, shopItemNameKey } from "@/lib/shop-items";
import { getNegamonBattleItemCatalog } from "@/lib/game-negamon";
import type { GameItemEffect } from "@/lib/game-core";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

function countItems(ids: string[]): Record<string, number> {
    return ids.reduce<Record<string, number>>((acc, id) => {
        acc[id] = (acc[id] ?? 0) + 1;
        return acc;
    }, {});
}

function effectLabel(effect: GameItemEffect): string {
    if (effect.kind === "stat_boost") return `${effect.stat.toUpperCase()} x${effect.multiplier}`;
    if (effect.kind === "status_immunity") return `Immune ${effect.status}`;
    if (effect.kind === "gold_bonus") return `Gold +${effect.amount}`;
    if (effect.kind === "gold_multiplier") return `Gold x${effect.multiplier}`;
    if (effect.kind === "restore_hp") return `HP +${effect.percent}%`;
    if (effect.kind === "restore_energy") return `EN +${effect.amount}`;
    return `Unlock ${effect.skillId}`;
}

function EffectIcon({ effect }: { effect: GameItemEffect }) {
    if (effect.kind === "gold_bonus" || effect.kind === "gold_multiplier") return <Coins className="h-3.5 w-3.5" />;
    if (effect.kind === "status_immunity") return <ShieldCheck className="h-3.5 w-3.5" />;
    if (effect.kind === "restore_energy") return <Zap className="h-3.5 w-3.5" />;
    return <Sparkles className="h-3.5 w-3.5" />;
}

export function InventoryItemPanel({
    inventory,
    className,
}: {
    inventory: string[];
    className?: string;
}) {
    const { t } = useLanguage();
    const counts = useMemo(() => countItems(inventory), [inventory]);
    const ownedItems = useMemo(
        () => getNegamonBattleItemCatalog().filter((item) => (counts[item.id] ?? 0) > 0),
        [counts]
    );

    return (
        <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Inventory V2
                    </p>
                    <h3 className="text-lg font-black text-slate-950">Battle Items</h3>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <Backpack className="h-4 w-4" />
                </span>
            </div>

            {ownedItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                    <p className="text-sm font-black text-slate-600">No battle items</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">Shop items will appear here after purchase.</p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {ownedItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl">
                                    {item.icon}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-sm font-black leading-tight text-slate-950">
                                            {t(shopItemNameKey(item.id))}
                                        </p>
                                        <Badge variant="outline" className="rounded-md text-[9px] font-black">
                                            x{counts[item.id]}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-md text-[9px] font-black">
                                            {item.rarity}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                                        {t(shopItemDescKey(item.id))}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {item.effects.map((effect, index) => (
                                            <span
                                                key={`${item.id}-${index}`}
                                                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-black text-slate-600"
                                            >
                                                <EffectIcon effect={effect} />
                                                {effectLabel(effect)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
