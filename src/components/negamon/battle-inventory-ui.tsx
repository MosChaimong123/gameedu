"use client";

import { useEffect, useMemo, useState } from "react";
import { Backpack, Pencil, X } from "lucide-react";
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
    RARITY_COLOR,
    getBattleItemById,
    groupBattleItemsByCategory,
    shopItemDescKey,
    shopItemNameKey,
    type ShopItem,
    type ShopItemRarity,
} from "@/lib/shop-items";
import { useLanguage } from "@/components/providers/language-provider";
import { validateBattleLoadout } from "@/lib/battle-loadout";

const RARITY_I18N_KEY: Record<ShopItemRarity, string> = {
    common: "shopRarityCommon",
    rare: "shopRarityRare",
    epic: "shopRarityEpic",
    legendary: "shopRarityLegendary",
};

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

export function BattleItemBagPanel({
    loginCode,
    inventory,
    battleLoadout,
    onLoadoutSaved,
    className,
}: {
    loginCode: string;
    inventory: string[];
    battleLoadout: string[];
    onLoadoutSaved?: (next: string[]) => void;
    className?: string;
}) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<string[]>(battleLoadout);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!open) setEditing([...battleLoadout]);
    }, [battleLoadout, open]);

    const ownedBattle = useMemo(() => {
        const rows: { item: ShopItem; count: number }[] = [];
        for (const item of BATTLE_ITEMS) {
            const c = countOwned(inventory, item.id);
            if (c > 0) rows.push({ item, count: c });
        }
        return rows;
    }, [inventory]);

    function openEdit() {
        setEditing([...battleLoadout]);
        setOpen(true);
    }

    async function savePreset() {
        setBusy(true);
        try {
            const res = await fetch(`/api/student/${loginCode}/battle-loadout`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemIds: editing }),
            });
            const data = (await res.json()) as { battleLoadout?: string[]; error?: { message?: string } };
            if (!res.ok) {
                setToast(data.error?.message ?? t("battleErrInvalidLoadout"));
                setTimeout(() => setToast(null), 2500);
                return;
            }
            const next = data.battleLoadout ?? editing;
            onLoadoutSaved?.(next);
            setToast(t("battleLoadoutSaved"));
            setTimeout(() => setToast(null), 2000);
            setOpen(false);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div
            className={cn(
                "rounded-2xl border-2 border-amber-100 bg-gradient-to-br from-amber-50/90 to-orange-50/60 p-4",
                className
            )}
        >
            <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Backpack className="h-4 w-4" />
                </span>
                <div>
                    <p className="text-xs font-black text-amber-950">{t("battleBagTitle")}</p>
                    <p className="text-[10px] font-bold text-amber-700/90">{t("battleBagHint")}</p>
                </div>
            </div>
            {toast && (
                <p className="mb-2 rounded-lg bg-white/80 px-2 py-1 text-center text-[11px] font-bold text-emerald-700">
                    {toast}
                </p>
            )}
            {ownedBattle.length === 0 ? (
                <p className="text-center text-xs font-bold text-amber-800/70">{t("battleBagEmpty")}</p>
            ) : (
                <ul className="mb-3 space-y-1 text-[11px] font-bold text-amber-900">
                    {ownedBattle.map(({ item, count }) => (
                        <li key={item.id} className="flex justify-between gap-2">
                            <span>
                                {item.icon} {t(shopItemNameKey(item.id))}
                            </span>
                            <span className="tabular-nums text-amber-700">×{count}</span>
                        </li>
                    ))}
                </ul>
            )}
            <div className="rounded-xl border border-amber-200/80 bg-white/70 p-2.5">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-amber-800/80">
                    {t("battleLoadoutPreset")}
                </p>
                {battleLoadout.length === 0 ? (
                    <p className="text-[11px] font-bold text-amber-700/70">—</p>
                ) : (
                    <ul className="space-y-1">
                        {battleLoadout.map((id) => {
                            const item = getBattleItemById(id);
                            return (
                                <li key={id} className="flex items-center gap-1 text-[11px] font-bold text-amber-950">
                                    <span>{item?.icon}</span>
                                    <span>{item ? t(shopItemNameKey(id)) : id}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 w-full rounded-xl border-amber-300 text-xs font-black text-amber-900"
                    onClick={openEdit}
                >
                    <Pencil className="mr-1 h-3 w-3" />
                    {t("battleLoadoutEdit")}
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black">{t("battleLoadoutEdit")}</DialogTitle>
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
                                                            ? "border-violet-400 bg-violet-50"
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
                                                    <span
                                                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase"
                                                        style={{
                                                            backgroundColor: `${RARITY_COLOR[item.rarity]}22`,
                                                            color: RARITY_COLOR[item.rarity],
                                                        }}
                                                    >
                                                        {t(RARITY_I18N_KEY[item.rarity])}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 pt-2">
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
                            className="flex-1 rounded-xl bg-amber-500 font-black text-white hover:bg-amber-600"
                            disabled={busy}
                            onClick={() => void savePreset()}
                        >
                            {t("battlePresetSave")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
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
        if (open) setEditing([...initialSelection]);
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
                        aria-label="Close"
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
