"use client";

import { useMemo } from "react";
import { Backpack, Coins, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getFallbackShopItemDesc, getFallbackShopItemName, shopItemDescKey, shopItemNameKey } from "@/lib/shop-items";
import { getNegamonBattleItemCatalog } from "@/lib/game-negamon";
import type { GameItemEffect } from "@/lib/game-core";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import { formatNegamonItemEffect, formatNegamonItemRarity } from "./ui-content";
import { BattleItemKindBadge, BattleItemVisual, getBattleItemKindMeta } from "./item-visuals";

function countItems(ids: string[]): Record<string, number> {
    return ids.reduce<Record<string, number>>((acc, id) => {
        acc[id] = (acc[id] ?? 0) + 1;
        return acc;
    }, {});
}


function EffectIcon({ effect }: { effect: GameItemEffect }) {
    if (effect.kind === "gold_bonus" || effect.kind === "gold_multiplier") return <Coins className="h-3.5 w-3.5" />;
    if (effect.kind === "status_immunity") return <ShieldCheck className="h-3.5 w-3.5" />;
    if (effect.kind === "restore_energy") return <Zap className="h-3.5 w-3.5" />;
    return <Sparkles className="h-3.5 w-3.5" />;
}

export function InventoryItemPanel({
    inventory,
    equippedItemIds = [],
    className,
}: {
    inventory: string[];
    equippedItemIds?: string[];
    className?: string;
}) {
    const { t, language } = useLanguage();
    const counts = useMemo(() => countItems(inventory), [inventory]);
    const ownedItems = useMemo(
        () => getNegamonBattleItemCatalog().filter((item) => (counts[item.id] ?? 0) > 0),
        [counts]
    );
    const equipped = useMemo(() => new Set(equippedItemIds), [equippedItemIds]);
    const groupedItems = useMemo(() => {
        const groups = {
            held: [] as typeof ownedItems,
            usable: [] as typeof ownedItems,
            reward: [] as typeof ownedItems,
        };
        for (const item of ownedItems) {
            groups[item.battleKind].push(item);
        }
        return groups;
    }, [ownedItems]);

    return (
        <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        {t("negamonInventoryEyebrow")}
                    </p>
                    <h3 className="text-lg font-black text-slate-950">{t("negamonInventoryTitle")}</h3>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <Backpack className="h-4 w-4" />
                </span>
            </div>

            {ownedItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                    <p className="text-sm font-black text-slate-600">{t("negamonInventoryEmpty")}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{t("negamonInventoryEmptyHint")}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {(["held", "usable", "reward"] as const).map((kind) => {
                        const items = groupedItems[kind];
                        if (items.length === 0) return null;
                        const kindMeta = getBattleItemKindMeta(kind);
                        return (
                            <div key={kind} className="space-y-2">
                                <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-900">{t(kindMeta.titleKey as never)}</p>
                                        <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                                            {t(kindMeta.hintKey as never)}
                                        </p>
                                    </div>
                                    <BattleItemKindBadge kind={kind} label={t(kindMeta.titleKey as never)} />
                                </div>

                                <div className="grid gap-2">
                                    {items.map((item) => (
                                        <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                            <div className="flex items-start gap-3">
                                                <BattleItemVisual itemId={item.id} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <p className="text-sm font-black leading-tight text-slate-950">
                                                            {(() => {
                                                                const key = shopItemNameKey(item.id);
                                                                const translated = t(key);
                                                                return translated === key ? getFallbackShopItemName(item.id, language) : translated;
                                                            })()}
                                                        </p>
                                                        <Badge variant="outline" className="rounded-md text-[9px] font-black">
                                                            x{counts[item.id]}
                                                        </Badge>
                                                        <Badge variant="outline" className="rounded-md text-[9px] font-black">
                                                            {formatNegamonItemRarity(item.rarity, t)}
                                                        </Badge>
                                                        {equipped.has(item.id) ? (
                                                            <Badge className="rounded-md bg-emerald-600 text-[9px] font-black text-white">
                                                                {t("negamonItemEquipped")}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                                                        {(() => {
                                                            const key = shopItemDescKey(item.id);
                                                            const translated = t(key);
                                                            return translated === key ? getFallbackShopItemDesc(item.id, language) : translated;
                                                        })()}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {item.effects.map((effect, index) => (
                                                            <span
                                                                key={`${item.id}-${index}`}
                                                                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-black text-slate-600"
                                                            >
                                                                <EffectIcon effect={effect} />
                                                                {formatNegamonItemEffect(effect, t)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
