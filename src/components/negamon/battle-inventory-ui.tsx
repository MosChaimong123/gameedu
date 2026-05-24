"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    BATTLE_ITEMS,
    getFallbackShopItemDesc,
    getFallbackShopItemName,
    groupBattleItemsByCategory,
    shopItemDescKey,
    shopItemNameKey,
    type ShopItem,
} from "@/lib/shop-items";
import { useLanguage } from "@/components/providers/language-provider";
import { validateBattleLoadout } from "@/lib/battle-loadout";
import { BattleItemKindBadge, BattleItemVisual, getBattleItemKindMeta } from "@/components/game/negamon/item-visuals";

function countOwned(inventory: string[], itemId: string): number {
    let count = 0;
    for (const ownedItemId of inventory) {
        if (ownedItemId === itemId) count += 1;
    }
    return count;
}

function toggleSelection(current: string[], itemId: string, inventory: string[]): string[] {
    if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
    }
    const next = [...current, itemId];
    const validation = validateBattleLoadout(next, inventory);
    if (!validation.ok) return current;
    return validation.normalizedIds;
}

function itemLabel(item: ShopItem, t: (key: string) => string, language: "th" | "en"): string {
    const key = shopItemNameKey(item.id);
    const translated = t(key);
    return translated === key ? getFallbackShopItemName(item.id, language) : translated;
}

function itemDesc(item: ShopItem, t: (key: string) => string, language: "th" | "en"): string {
    const key = shopItemDescKey(item.id);
    const translated = t(key);
    return translated === key ? getFallbackShopItemDesc(item.id, language) : translated;
}

export function BattlePrepDialog({
    open,
    onOpenChange,
    inventory,
    initialSelection,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    inventory: string[];
    initialSelection: string[];
    onConfirm: (ids: string[]) => void;
}) {
    const { t, language } = useLanguage();
    const [editing, setEditing] = useState<string[]>(initialSelection);

    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(() => setEditing([...initialSelection]), 0);
        return () => window.clearTimeout(timer);
    }, [open, initialSelection]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-base font-black">{t("battlePrepTitle")}</DialogTitle>
                    <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                        onClick={() => onOpenChange(false)}
                        aria-label={t("close")}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </DialogHeader>
                <p className="text-[11px] font-bold text-slate-500">{t("battlePrepHint")}</p>
                <div className="max-h-[50vh] space-y-3 overflow-y-auto py-2">
                    {groupBattleItemsByCategory(BATTLE_ITEMS).map(({ category, items }) => {
                        if (category === "reward") return null;
                        const owned = items.filter((item) => countOwned(inventory, item.id) > 0);
                        if (owned.length === 0) return null;
                        const kindMeta = getBattleItemKindMeta(category);

                        return (
                            <div key={category} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-900">{t(kindMeta.titleKey)}</p>
                                        <p className="text-[10px] font-medium text-slate-500">{t(kindMeta.hintKey)}</p>
                                    </div>
                                    <BattleItemKindBadge kind={category} label={t(kindMeta.titleKey)} />
                                </div>

                                {owned.map((item) => {
                                    const selected = editing.includes(item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setEditing((prev) => toggleSelection(prev, item.id, inventory))}
                                            className={cn(
                                                "flex w-full items-center gap-2 rounded-xl border p-2 text-left transition",
                                                selected
                                                    ? "border-rose-400 bg-rose-50"
                                                    : "border-slate-100 bg-white hover:border-slate-200"
                                            )}
                                        >
                                            <BattleItemVisual itemId={item.id} className="h-10 w-10" iconClassName="h-4.5 w-4.5" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-black text-slate-900">{itemLabel(item, t, language)}</p>
                                                <p className="text-[10px] text-slate-500 line-clamp-2">
                                                    {itemDesc(item, t, language)}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 rounded-xl font-black"
                        onClick={() => setEditing([])}
                    >
                        {t("battlePrepClear")}
                    </Button>
                    <Button
                        type="button"
                        className="flex-1 rounded-xl bg-rose-500 font-black text-white hover:bg-rose-600"
                        onClick={() => {
                            onConfirm(editing);
                            onOpenChange(false);
                        }}
                    >
                        {t("battlePrepFight")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
