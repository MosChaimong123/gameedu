"use client";

import { useState, type ComponentType } from "react";
import {
    ShoppingBag,
    Coins,
    CheckCircle2,
    Shirt,
    Swords,
    TrendingUp,
    Shield,
    Sparkles,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    SHOP_ITEMS,
    BATTLE_ITEMS,
    RARITY_COLOR,
    FRAME_GOLD_RATE_MULTIPLIER_BY_RARITY,
    getFallbackShopItemDesc,
    getFallbackShopItemName,
    groupBattleItemsByCategory,
    shopItemDescKey,
    shopItemNameKey,
    type ShopBattleItemCategory,
    type ShopItem,
    type ShopItemRarity,
} from "@/lib/shop-items";
import { useLanguage } from "@/components/providers/language-provider";
import { getLocalizedMessageFromApiErrorBody } from "@/lib/ui-error-messages";
import { FrameRing } from "@/components/ui/frame-visual";

const RARITY_I18N_KEY: Record<ShopItemRarity, string> = {
    common: "shopRarityCommon",
    rare: "shopRarityRare",
    epic: "shopRarityEpic",
    legendary: "shopRarityLegendary",
};

const FRAME_RARITY_ORDER: Record<ShopItemRarity, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
};

const FRAME_ELEMENT_ORDER: Record<string, number> = {
    fire: 1,
    water: 2,
    earth: 3,
    wind: 4,
    thunder: 5,
    light: 6,
    dark: 7,
};

const FRAME_ELEMENT_META: Record<
    string,
    { emoji: string; colorClass: string; th: string; en: string }
> = {
    fire: { emoji: "🔥", colorClass: "text-rose-600", th: "ธาตุไฟ", en: "Fire" },
    water: { emoji: "💧", colorClass: "text-sky-600", th: "ธาตุน้ำ", en: "Water" },
    earth: { emoji: "🪨", colorClass: "text-lime-700", th: "ธาตุดิน", en: "Earth" },
    wind: { emoji: "🌪️", colorClass: "text-cyan-600", th: "ธาตุลม", en: "Wind" },
    thunder: { emoji: "⚡", colorClass: "text-amber-600", th: "ธาตุสายฟ้า", en: "Thunder" },
    light: { emoji: "✨", colorClass: "text-yellow-600", th: "ธาตุแสง", en: "Light" },
    dark: { emoji: "🌙", colorClass: "text-violet-600", th: "ธาตุความมืด", en: "Dark" },
};

const BATTLE_CATEGORY_ICON: Record<ShopBattleItemCategory, ComponentType<{ className?: string }>> = {
    stat_boost: TrendingUp,
    status: Shield,
    reward: Sparkles,
};

interface ShopDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loginCode: string;
    gold: number;
    inventory: string[];
    equippedFrame: string | null;
    onBuy: (itemId: string, newGold: number, newInventory: string[]) => void;
    onEquip: (itemId: string | null) => void;
}

export function ShopDialog({
    open,
    onOpenChange,
    loginCode,
    gold,
    inventory,
    equippedFrame,
    onBuy,
    onEquip,
}: ShopDialogProps) {
    const { t, language } = useLanguage();
    const [buying, setBuying] = useState<string | null>(null);
    const [equipping, setEquipping] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    function showToast(msg: string) {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 2500);
    }

    async function handleBuy(item: ShopItem) {
        if (buying) return;
        setBuying(item.id);
        try {
            const res = await fetch(`/api/student/${loginCode}/shop/buy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: item.id }),
            });
            const data = (await res.json()) as unknown;
            if (!res.ok) {
                showToast(getLocalizedMessageFromApiErrorBody(data, t));
            } else {
                const body = data as { newGold: number; inventory: string[] };
                onBuy(item.id, body.newGold, body.inventory);
                showToast(t("shopPurchaseSuccess", { name: itemName(item) }));
            }
        } finally {
            setBuying(null);
        }
    }

    async function handleEquip(itemId: string | null) {
        if (equipping !== null) return;
        setEquipping(itemId ?? "none");
        try {
            const res = await fetch(`/api/student/${loginCode}/shop/equip`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId }),
            });
            if (res.ok) {
                onEquip(itemId);
                showToast(itemId ? t("shopFrameEquippedToast") : t("shopFrameUnequippedToast"));
            }
        } finally {
            setEquipping(null);
        }
    }

    const frames = [...SHOP_ITEMS.filter((i) => i.type === "frame")].sort((a, b) => {
        const byElement =
            (FRAME_ELEMENT_ORDER[a.frameElement ?? ""] ?? 99) -
            (FRAME_ELEMENT_ORDER[b.frameElement ?? ""] ?? 99);
        if (byElement !== 0) return byElement;
        const byTier = (a.frameTier ?? 99) - (b.frameTier ?? 99);
        if (byTier !== 0) return byTier;
        const byRarity = FRAME_RARITY_ORDER[a.rarity] - FRAME_RARITY_ORDER[b.rarity];
        if (byRarity !== 0) return byRarity;
        const byPrice = a.price - b.price;
        if (byPrice !== 0) return byPrice;
        return a.id.localeCompare(b.id);
    });
    const battleItemGroups = groupBattleItemsByCategory(BATTLE_ITEMS);
    const frameGroups = frames.reduce<Array<{ element: string; items: ShopItem[] }>>((acc, item) => {
        const element = item.frameElement ?? "other";
        const last = acc[acc.length - 1];
        if (last && last.element === element) {
            last.items.push(item);
        } else {
            acc.push({ element, items: [item] });
        }
        return acc;
    }, []);

    function itemName(item: ShopItem): string {
        const key = shopItemNameKey(item.id);
        const translated = t(key);
        if (translated !== key) return translated;
        return getFallbackShopItemName(item.id, language);
    }

    function itemDesc(item: ShopItem): string {
        const key = shopItemDescKey(item.id);
        const translated = t(key);
        if (translated !== key) return translated;
        return getFallbackShopItemDesc(item.id, language);
    }

    function renderBuyButton(item: ShopItem) {
        const owned = inventory.includes(item.id);
        const canAfford = gold >= item.price;
        if (item.type === "frame" && owned) {
            return (
                <span className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-black text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> {t("shopOwned")}
                </span>
            );
        }
        return (
            <Button
                size="sm"
                disabled={!canAfford || buying === item.id}
                onClick={() => handleBuy(item)}
                className={cn(
                    "rounded-xl text-xs font-black gap-1",
                    canAfford
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                        : "bg-slate-200 text-slate-400"
                )}
            >
                <Coins className="h-3 w-3" />
                {item.price.toLocaleString()}
            </Button>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl bg-white p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-yellow-50 to-amber-50 border-b border-yellow-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                                <ShoppingBag className="h-5 w-5" />
                            </span>
                            <DialogTitle className="text-lg font-black text-yellow-900">{t("shopDialogTitle")}</DialogTitle>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl border border-yellow-200 bg-white/80 px-3 py-1.5">
                            <span className="text-base">💰</span>
                            <span className="text-sm font-black tabular-nums text-yellow-800">{gold.toLocaleString()} G</span>
                        </div>
                    </div>
                </DialogHeader>

                {/* Toast */}
                {toastMsg && (
                    <div className="mx-6 mt-4 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-center text-sm font-bold text-indigo-700 animate-in fade-in slide-in-from-top-2">
                        {toastMsg}
                    </div>
                )}

                <div className="px-6 py-5 space-y-3 max-h-[65vh] overflow-y-auto">

                    {/* ── Battle Items ── */}
                    <div className="rounded-2xl border-2 border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                                <Swords className="h-3.5 w-3.5" />
                            </span>
                            <div>
                                <p className="text-xs font-black text-rose-800">{t("shopBattleItemsSection")}</p>
                                <p className="text-[10px] font-bold text-rose-400">{t("shopBattleItemsHint")}</p>
                            </div>
                        </div>

                        {battleItemGroups.map(({ category, items }) => {
                            const CatIcon = BATTLE_CATEGORY_ICON[category];
                            const titleKey = `shopBattleCategory_${category}` as const;
                            const hintKey = `shopBattleCategory_${category}_hint` as const;
                            return (
                                <div key={category} className="space-y-2">
                                    <div className="flex items-center gap-2 rounded-xl border border-rose-100/80 bg-white/60 px-2.5 py-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100/90 text-rose-700">
                                            <CatIcon className="h-3.5 w-3.5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black text-rose-900">{t(titleKey)}</p>
                                            <p className="text-[10px] font-bold leading-tight text-rose-500/90">
                                                {t(hintKey)}
                                            </p>
                                        </div>
                                    </div>
                                    {items.map((item) => {
                                        const owned = inventory.includes(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-xl border p-3 transition-all bg-white/80",
                                                    owned ? "border-emerald-200" : "border-slate-100 hover:border-rose-200"
                                                )}
                                            >
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-100 bg-white text-2xl shadow-sm">
                                                    {item.icon}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-sm font-black text-slate-900">
                                                            {itemName(item)}
                                                        </p>
                                                        <span
                                                            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                                            style={{
                                                                backgroundColor: `${RARITY_COLOR[item.rarity]}22`,
                                                                color: RARITY_COLOR[item.rarity],
                                                            }}
                                                        >
                                                            {t(RARITY_I18N_KEY[item.rarity])}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">
                                                        {itemDesc(item)}
                                                    </p>
                                                </div>

                                                <div className="shrink-0">{renderBuyButton(item)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Profile Frames ── */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pt-1">
                        <Shirt className="h-3 w-3" /> {t("shopProfileFramesSection")}
                    </p>

                    {frameGroups.map(({ element, items }) => {
                        const elementMeta = FRAME_ELEMENT_META[element] ?? {
                            emoji: "🧿",
                            colorClass: "text-slate-600",
                            th: "ธาตุพิเศษ",
                            en: "Special",
                        };
                        const elementLabel = language === "th" ? elementMeta.th : elementMeta.en;
                        return (
                            <div key={element} className="space-y-2">
                                <div className="flex items-center gap-2 px-1 pt-1">
                                    <span className={cn("text-base", elementMeta.colorClass)}>{elementMeta.emoji}</span>
                                    <p className={cn("text-xs font-black uppercase tracking-wider", elementMeta.colorClass)}>
                                        {elementLabel}
                                    </p>
                                    <span className="h-px flex-1 bg-slate-200" />
                                </div>

                                {items.map((item) => {
                                    const owned = inventory.includes(item.id);
                                    const equipped = equippedFrame === item.id;
                                    const canAfford = gold >= item.price;
                                    const framePreview = item.preview;

                                    return (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "flex items-center gap-4 rounded-2xl border p-4 transition-all",
                                                equipped
                                                    ? "border-indigo-300 bg-indigo-50/60"
                                                    : "border-slate-100 bg-slate-50/60 hover:border-slate-200"
                                            )}
                                        >
                                            {/* Frame preview ring — tier DNA via FrameRing */}
                                            {framePreview ? (
                                                <FrameRing preview={framePreview} size="sm" rounded="full" />
                                            ) : (
                                                <div className="relative h-12 w-12 shrink-0 rounded-full border-2 border-slate-200 bg-slate-100" />
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-slate-900">{itemName(item)}</p>
                                                    <span
                                                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase"
                                                        style={{
                                                            backgroundColor: `${RARITY_COLOR[item.rarity]}22`,
                                                            color: RARITY_COLOR[item.rarity],
                                                        }}
                                                    >
                                                        {t(RARITY_I18N_KEY[item.rarity])}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] font-bold text-emerald-700">
                                                    {t("shopFrameGoldRateBonus", {
                                                        percent: Math.round(
                                                            (FRAME_GOLD_RATE_MULTIPLIER_BY_RARITY[item.rarity] - 1) * 100
                                                        ),
                                                    })}
                                                </p>
                                            </div>

                                            <div className="shrink-0">
                                                {!owned ? (
                                                    <Button
                                                        size="sm"
                                                        disabled={!canAfford || buying === item.id}
                                                        onClick={() => handleBuy(item)}
                                                        className={cn(
                                                            "rounded-xl text-xs font-black gap-1",
                                                            canAfford
                                                                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                                                : "bg-slate-200 text-slate-400"
                                                        )}
                                                    >
                                                        <Coins className="h-3 w-3" />
                                                        {item.price.toLocaleString()}
                                                    </Button>
                                                ) : equipped ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={equipping !== null}
                                                        onClick={() => handleEquip(null)}
                                                        className="rounded-xl text-xs font-black border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                                    >
                                                        {t("shopUnequip")}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        disabled={equipping !== null}
                                                        onClick={() => handleEquip(item.id)}
                                                        className="rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {t("shopEquip")}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
