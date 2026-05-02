"use client";

import { useEffect, useMemo, useState } from "react";
import { Backpack, X } from "lucide-react";
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
    groupBattleItemsByCategory,
    shopItemDescKey,
    shopItemNameKey,
    type ShopItem,
} from "@/lib/shop-items";
import { useLanguage } from "@/components/providers/language-provider";
import { validateBattleLoadout } from "@/lib/battle-loadout";

function countOwned(inventory: string[], itemId: string): number {
    let n = 0;
    for (const x of inventory) {
        if (x === itemId) n += 1;
    }
    return n;
}

function toggleSelection(
    current: string[],
    itemId: string,
    inventory: string[]
): string[] {
    if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
    }
    const next = [...current, itemId];
    const v = validateBattleLoadout(next, inventory);
    if (!v.ok) return current;
    return v.normalizedIds;
}

/** แสดงไอเทมต่อสู้ในกระเป๋าแบบตารางช่อง (ไม่มีระบบชุดป้องกันเมื่อถูกท้าสู้) */
export function BattleItemBagPanel({
    inventory,
    className,
}: {
    inventory: string[];
    className?: string;
}) {
    const { t } = useLanguage();

    const ownedBattle = useMemo(() => {
        const rows: { item: ShopItem; count: number }[] = [];
        for (const item of BATTLE_ITEMS) {
            const c = countOwned(inventory, item.id);
            if (c > 0) rows.push({ item, count: c });
        }
        return rows;
    }, [inventory]);

    return (
        <div
            className={cn(
                "rounded-2xl border-4 border-amber-900/12 bg-gradient-to-b from-amber-100/95 via-amber-50/90 to-orange-100/85 p-4 shadow-[inset_0_2px_14px_rgba(120,53,15,0.08)]",
                className
            )}
        >
            <div className="mb-3 flex items-start gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-amber-800/15 bg-amber-200/40 text-amber-900 shadow-sm">
                    <Backpack className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-black tracking-tight text-amber-950">{t("battleBagTitle")}</p>
                    <p className="text-[10px] font-bold leading-snug text-amber-800/90">{t("battleBagHint")}</p>
                </div>
            </div>
            {ownedBattle.length === 0 ? (
                <p className="rounded-xl border-2 border-dashed border-amber-300/60 bg-amber-950/[0.03] py-8 text-center text-xs font-bold text-amber-800/75">
                    {t("battleBagEmpty")}
                </p>
            ) : (
                <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-amber-900/50">
                        {t("shopBattleItemsSection")}
                    </p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {ownedBattle.map(({ item, count }) => (
                            <div
                                key={item.id}
                                className="relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-amber-900/15 bg-gradient-to-b from-amber-50/90 to-amber-100/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                            >
                                <span className="text-2xl leading-none drop-shadow-sm">{item.icon}</span>
                                <span className="absolute right-0.5 top-0.5 min-w-[1.25rem] rounded-full bg-amber-900 px-1 text-center text-[9px] font-black tabular-nums leading-tight text-amber-50 shadow-sm">
                                    ×{count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
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
    const { t } = useLanguage();
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
                        const owned = items.filter((it) => countOwned(inventory, it.id) > 0);
                        if (owned.length === 0) return null;
                        return (
                            <div key={category}>
                                <p className="mb-1 text-[10px] font-black uppercase text-slate-400">
                                    {t(`shopBattleCategory_${category}` as "shopBattleCategory_stat_boost")}
                                </p>
                                <div className="space-y-1.5">
                                    {owned.map((item) => {
                                        const sel = editing.includes(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() =>
                                                    setEditing((prev) =>
                                                        toggleSelection(prev, item.id, inventory)
                                                    )
                                                }
                                                className={cn(
                                                    "flex w-full items-center gap-2 rounded-xl border p-2 text-left transition",
                                                    sel
                                                        ? "border-rose-400 bg-rose-50"
                                                        : "border-slate-100 bg-white hover:border-slate-200"
                                                )}
                                            >
                                                <span className="text-lg">{item.icon}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-black text-slate-900">
                                                        {t(shopItemNameKey(item.id))}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 line-clamp-2">
                                                        {t(shopItemDescKey(item.id))}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
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
