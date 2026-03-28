"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coins,
  FlaskConical,
  Info,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Sword,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { EFFECT_DISPLAY_TH, SET_DISPLAY_TH } from "@/lib/game/rpg-copy";

interface Item {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  type: string;
  tier?: string | null;
  price: number;
  currency?: string | null;
  slot?: string | null;
  // Base stats (DB column names)
  baseHp?: number | null;
  baseAtk?: number | null;
  baseDef?: number | null;
  baseSpd?: number | null;
  baseCrit?: number | null;
  baseLuck?: number | null;
  baseMag?: number | null;
  baseMp?: number | null;
  // Effect & set
  effects?: unknown;
  setId?: string | null;
  // Consumable flags
  staminaRestore?: number | null;
  manaRestore?: number | null;
  hpRestorePercent?: number | null;
  buffAtk?: number | null;
  buffDef?: number | null;
  buffGoldMinutes?: number | null;
  buffXpMinutes?: number | null;
  farmingBuffType?: string | null;
  farmingBuffTurns?: number | null;
  isLevelUp?: boolean | null;
}

interface ShopTabProps {
  studentId: string;
  onUpdate?: () => void;
  currentGold?: number;
  currentPoints?: number;
  onPurchaseSuccess?: (data: { gold?: number; points?: number }) => void;
}

type FilterCategory = "EQUIPMENT" | "CONSUMABLE";

interface EffectDetail {
  label: string;
  value: string;
  accent: string;
}

const categoryOptions: Array<{
  key: FilterCategory;
  label: string;
  icon: typeof Sparkles;
  active: string;
  inactive: string;
}> = [
  {
    key: "EQUIPMENT",
    label: "อุปกรณ์",
    icon: Sword,
    active: "bg-amber-500 text-white border-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.4)]",
    inactive: "bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-600",
  },
  {
    key: "CONSUMABLE",
    label: "ยาและบัฟ",
    icon: FlaskConical,
    active: "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]",
    inactive: "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600",
  },
];

const slotOptions = [
  { key: "ALL",       label: "ทั้งหมด" },
  { key: "WEAPON",    label: "⚔️ อาวุธ" },
  { key: "OFFHAND",   label: "🛡️ มืองาม" },
  { key: "HEAD",      label: "⛑️ หมวก" },
  { key: "BODY",      label: "👘 เกราะ" },
  { key: "GLOVES",    label: "🧤 ถุงมือ" },
  { key: "BOOTS",     label: "👢 รองเท้า" },
  { key: "ACCESSORY", label: "💍 เครื่องประดับ" },
];

const tierOptions = ["ALL", "COMMON", "RARE", "EPIC", "LEGENDARY"] as const;

function getTierTone(tier?: string) {
  switch (tier) {
    case "RARE":
      return {
        border: "border-sky-200",
        badge: "bg-sky-50 text-sky-700 border-sky-200",
        glow: "shadow-[0_18px_40px_-24px_rgba(14,165,233,0.55)]",
      };
    case "EPIC":
      return {
        border: "border-violet-200",
        badge: "bg-violet-50 text-violet-700 border-violet-200",
        glow: "shadow-[0_18px_40px_-24px_rgba(139,92,246,0.55)]",
      };
    case "LEGENDARY":
      return {
        border: "border-amber-200",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        glow: "shadow-[0_18px_40px_-24px_rgba(245,158,11,0.55)]",
      };
    default:
      return {
        border: "border-emerald-200",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        glow: "shadow-[0_18px_40px_-24px_rgba(16,185,129,0.45)]",
      };
  }
}

function buildHighlights(item: Item): EffectDetail[] {
  const highlights: EffectDetail[] = [];

  const statPairs: Array<[keyof Item, string, string]> = [
    ["baseAtk",  "ATK", "bg-amber-50 text-amber-700"],
    ["baseDef",  "DEF", "bg-sky-50 text-sky-700"],
    ["baseSpd",  "SPD", "bg-emerald-50 text-emerald-700"],
    ["baseCrit", "CRT", "bg-rose-50 text-rose-700"],
    ["baseLuck", "LUK", "bg-lime-50 text-lime-700"],
    ["baseHp",   "HP",  "bg-pink-50 text-pink-700"],
    ["baseMp",   "MP",  "bg-indigo-50 text-indigo-700"],
    ["baseMag",  "MAG", "bg-fuchsia-50 text-fuchsia-700"],
  ];

  for (const [key, label, accent] of statPairs) {
    const value = item[key];
    if (typeof value === "number" && value > 0) {
      highlights.push({ label, value: `+${value}`, accent });
    }
  }

  // Consumable buff labels
  if (item.farmingBuffType) {
    const buffLabels: Record<string, string> = {
      BUFF_ATK:  "⚔️ ATK +40%",
      BUFF_DEF:  "🛡️ DEF -50% dmg",
      CRIT_BUFF: "🎯 CRIT +30%",
      REGEN:     "🌿 Regen HP",
    };
    highlights.push({ label: buffLabels[item.farmingBuffType] ?? item.farmingBuffType, value: `${item.farmingBuffTurns ?? 3}T`, accent: "bg-emerald-50 text-emerald-700" });
  }
  if (item.buffAtk && item.buffAtk > 0) highlights.push({ label: "⚔️ ATK", value: `+${Math.round(item.buffAtk * 100)}%`, accent: "bg-amber-50 text-amber-700" });
  if (item.buffDef && item.buffDef > 0) highlights.push({ label: "🛡️ DEF", value: `+${Math.round(item.buffDef * 100)}%`, accent: "bg-sky-50 text-sky-700" });
  if (item.hpRestorePercent && item.hpRestorePercent > 0) highlights.push({ label: "❤️ HP", value: `+${Math.round(item.hpRestorePercent * 100)}%`, accent: "bg-pink-50 text-pink-700" });
  if (item.staminaRestore && item.staminaRestore > 0) highlights.push({ label: "⚡ Stamina", value: `+${item.staminaRestore}`, accent: "bg-yellow-50 text-yellow-700" });
  if (item.manaRestore && item.manaRestore > 0) highlights.push({ label: "💧 Mana", value: `+${item.manaRestore}`, accent: "bg-indigo-50 text-indigo-700" });
  if (item.isLevelUp) highlights.push({ label: "✨ Level", value: "+1", accent: "bg-violet-50 text-violet-700" });

  return highlights.slice(0, 4);
}

export function ShopTab({ 
  studentId, 
  onUpdate,
  currentGold,
  currentPoints,
  onPurchaseSuccess
}: ShopTabProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("EQUIPMENT");
  const [selectedSlot, setSelectedSlot] = useState("ALL");
  const [selectedTier, setSelectedTier] = useState<(typeof tierOptions)[number]>("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<Record<string, number>>({});
  const [gold, setGold] = useState(currentGold || 0);
  const [gems, setGems] = useState(0);
  const [points, setPoints] = useState(currentPoints || 0);

  // Sync internal state with props if they change
  useEffect(() => {
    if (currentGold !== undefined) setGold(currentGold);
  }, [currentGold]);

  useEffect(() => {
    if (currentPoints !== undefined) setPoints(currentPoints);
  }, [currentPoints]);

  const loadShop = useCallback(async (options?: { silent?: boolean }) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shop?studentId=${studentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "โหลดร้านค้าไม่สำเร็จ");
      }

      setItems(data.items || []);
      setGold(data.gold || 0);
      setGems(data.gems || 0);
      setPoints(data.points || 0);
      if (!options?.silent) {
        toast({
          title: "อัปเดตรายการแล้ว",
          description: "โหลดสินค้าและยอดเงินล่าสุด",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "โหลดร้านค้าไม่สำเร็จ";
      toast({
        title: "โหลดร้านค้าไม่สำเร็จ",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    void loadShop({ silent: true });
  }, [loadShop]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory === "CONSUMABLE" && item.type !== "CONSUMABLE") return false;
      if (selectedCategory === "EQUIPMENT" && item.type === "CONSUMABLE") return false;

      // Slot filter (equipment only)
      if (selectedCategory === "EQUIPMENT" && selectedSlot !== "ALL") {
        if ((item.slot ?? item.type) !== selectedSlot) return false;
      }

      // Tier filter
      if (selectedTier !== "ALL" && (item.tier || "COMMON") !== selectedTier) return false;

      return true;
    });
  }, [items, selectedCategory, selectedSlot, selectedTier]);

  const handleBuy = async (item: Item) => {
    try {
      setBuyingId(item.id);
      const amount = item.type === "CONSUMABLE" ? quantity[item.id] || 1 : 1;

      const response = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          itemId: item.id,
          quantity: amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ซื้อไอเทมไม่สำเร็จ");
      }

      setGold(data.gold ?? gold);
      setGems(data.gems ?? gems);
      setPoints(data.points ?? points);

      if (onPurchaseSuccess) {
        onPurchaseSuccess({
          gold: data.gold,
          points: data.points
        });
      }

      toast({
        title: "ซื้อสำเร็จ",
        description: `ได้รับ ${item.name}${amount > 1 ? ` x${amount}` : ""}`,
      });

      onUpdate?.();
      void loadShop({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ซื้อไอเทมไม่สำเร็จ";
      toast({
        title: "ซื้อไม่สำเร็จ",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBuyingId(null);
    }
  };

  const currencyLabel = (item: Item) => {
    if (item.currency === "GEMS") return "เพชร";
    if (item.currency === "POINTS") return "แต้ม";
    return "ทอง";
  };
  const currencyAmount = (item: Item) => {
    if (item.currency === "GEMS") return gems;
    if (item.currency === "POINTS") return points;
    return gold;
  };
  const handleBuyAmount = (item: Item) => item.type === "CONSUMABLE" ? quantity[item.id] || 1 : 1;

  return (
    <div className="space-y-6 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,190,92,0.25),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(244,248,255,0.92))] p-6 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.35)]"
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(255,183,77,0.26),rgba(125,211,252,0.14),rgba(167,139,250,0.12))]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              Premium Equipment Shop
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">ตลาดร้านขายของ</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                เลือกอุปกรณ์ ยา และของเสริมเพื่อเตรียมตัวก่อนออกลุยด่าน
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white/88 px-4 py-3 shadow-[0_16px_35px_-28px_rgba(234,88,12,0.7)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Gold</p>
                <p className="text-lg font-black text-orange-600">{gold.toLocaleString()}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void loadShop()}
              disabled={loading}
              title="โหลดร้านค้าใหม่"
              aria-label="โหลดร้านค้าใหม่"
              className="h-12 w-12 rounded-2xl border-white/80 bg-white/85 text-slate-500 shadow-[0_16px_35px_-28px_rgba(15,23,42,0.75)] hover:bg-white disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        {/* Category: อุปกรณ์ / ยาและบัฟ */}
        <div className="flex gap-2">
          {categoryOptions.map((option) => {
            const Icon = option.icon;
            const isActive = selectedCategory === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => { setSelectedCategory(option.key); setSelectedSlot("ALL"); setSelectedTier("ALL"); }}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all duration-150 ${
                  isActive ? option.active : option.inactive
                }`}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Slot filter — equipment only */}
        {selectedCategory === "EQUIPMENT" && (
          <div className="flex flex-wrap items-center gap-2">
            {slotOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedSlot(option.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedSlot === option.key
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Tier filter */}
        <div className="flex flex-wrap items-center gap-2">
          {tierOptions.map((tier) => {
            const colors: Record<string, string> = {
              ALL:       "border-slate-400 bg-slate-700 text-white",
              COMMON:    "border-slate-400 bg-slate-500 text-white",
              RARE:      "border-sky-500 bg-sky-500 text-white",
              EPIC:      "border-violet-500 bg-violet-500 text-white",
              LEGENDARY: "border-amber-500 bg-amber-500 text-white",
            };
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedTier === tier
                    ? colors[tier]
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {tier === "ALL" ? "ทั้งหมด" : tier}
              </button>
            );
          })}
        </div>
      </motion.section>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[360px] animate-pulse rounded-[28px] border border-white/70 bg-white/70 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => {
            const tone = getTierTone(item.tier ?? undefined);
            const isConsumable = item.type === "CONSUMABLE";
            const amount = isConsumable ? quantity[item.id] || 1 : 1;
            const totalPrice = item.price * amount;
            const insufficient = currencyAmount(item) < totalPrice;

            const tierColor: Record<string, string> = {
              LEGENDARY: "bg-amber-50 border-amber-200",
              EPIC:      "bg-violet-50 border-violet-200",
              RARE:      "bg-sky-50 border-sky-200",
              COMMON:    "bg-white border-slate-200",
            };
            const tierBadge: Record<string, string> = {
              LEGENDARY: "bg-amber-100 text-amber-700",
              EPIC:      "bg-violet-100 text-violet-700",
              RARE:      "bg-sky-100 text-sky-700",
              COMMON:    "bg-slate-100 text-slate-500",
            };
            const cardBg = tierColor[item.tier ?? "COMMON"] ?? tierColor.COMMON;
            const badge = tierBadge[item.tier ?? "COMMON"] ?? tierBadge.COMMON;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex flex-col rounded-2xl border p-4 ${cardBg} shadow-sm hover:shadow-md transition-shadow`}
              >
                {/* Top row: image + info */}
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm">
                    {item.image && !item.image.startsWith('/') ? (
                      <span className="text-3xl">{item.image}</span>
                    ) : item.image ? (
                      <img src={item.image} alt={item.name} className="h-10 w-10 object-contain" />
                    ) : (
                      <Sparkles className="h-7 w-7 text-slate-300" />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${badge}`}>
                        {item.tier || "COMMON"}
                      </span>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">
                        {isConsumable ? "ยา/บัฟ" : item.slot ?? item.type}
                      </span>
                    </div>
                    <h3 className="mt-0.5 text-base font-black text-slate-900 leading-tight truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 leading-snug line-clamp-1 mt-0.5">
                      {item.description ?? "—"}
                    </p>
                  </div>

                  {/* Info button */}
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="shrink-0 rounded-full p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>

                {/* Quantity selector (consumable only) */}
                {isConsumable && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((c) => ({ ...c, [item.id]: Math.max(1, (c[item.id] || 1) - 1) }))}
                      className="h-8 w-8 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:border-slate-300 transition text-sm"
                    >−</button>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={amount}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        if (Number.isNaN(raw)) {
                          setQuantity((c) => ({ ...c, [item.id]: 1 }));
                          return;
                        }
                        const clamped = Math.min(9999, Math.max(1, Math.floor(raw)));
                        setQuantity((c) => ({ ...c, [item.id]: clamped }));
                      }}
                      className="h-8 w-14 rounded-xl border border-slate-200 bg-white text-center font-bold text-slate-900 text-sm outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((c) => ({ ...c, [item.id]: Math.min(9999, (c[item.id] || 1) + 1) }))}
                      className="h-8 w-8 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:border-slate-300 transition text-sm"
                    >+</button>
                  </div>
                )}

                {/* Bottom row: price + buy */}
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/80 border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {item.currency === "GEMS" ? (
                      <Star className="h-4 w-4 text-violet-500" />
                    ) : item.currency === "POINTS" ? (
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <Coins className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="font-black text-slate-900 text-sm">{totalPrice.toLocaleString()}</span>
                    <span className="text-xs text-slate-400">{currencyLabel(item)}</span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleBuy(item)}
                    disabled={buyingId === item.id || insufficient}
                    className={`h-8 rounded-xl px-4 text-xs font-bold ${
                      insufficient
                        ? "bg-slate-200 text-slate-400"
                        : item.currency === "GEMS"
                          ? "bg-violet-500 hover:bg-violet-600 text-white"
                          : item.currency === "POINTS"
                            ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                            : "bg-amber-500 hover:bg-amber-600 text-white"
                    }`}
                  >
                    {buyingId === item.id ? "..." : insufficient ? "เงินไม่พอ" : "ซื้อเลย"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <p className="text-lg font-bold text-slate-800">ไม่พบไอเทมที่ตรงกับตัวกรองนี้</p>
          <p className="mt-2 text-sm text-slate-500">ลองสลับประเภท ช่องสวมใส่ หรือระดับความหายากดูอีกครั้ง</p>
        </div>
      )}

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.96))] shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {selectedItem.tier || "COMMON"} • {selectedItem.slot || selectedItem.type}
                  </p>
                  <h3 className="mt-1 text-3xl font-black text-slate-900">
                    {selectedItem.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedItem.description || "รายละเอียดไอเทม"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {buildHighlights(selectedItem).map((highlight) => (
                    <div
                      key={`${selectedItem.id}-${highlight.label}-detail`}
                      className={`rounded-2xl px-4 py-3 ${highlight.accent}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                        {highlight.label}
                      </p>
                      <p className="mt-1 text-lg font-black">{highlight.value}</p>
                    </div>
                  ))}
                </div>

                {selectedItem.setId && (() => {
                  const setInfo = SET_DISPLAY_TH[selectedItem.setId!];
                  return (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{setInfo?.icon ?? "🎁"}</span>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">ชุดไอเทม · Set Bonus</p>
                      </div>
                      <p className="mt-1 text-sm font-bold text-amber-900">
                        {setInfo?.desc ?? selectedItem.setId}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-amber-700">
                        {setInfo?.stats ?? "—"}
                      </p>
                    </div>
                  );
                })()}

                {Array.isArray(selectedItem.effects) && selectedItem.effects.length > 0 && (
                  <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Special Effects</p>
                    <ul className="mt-2 space-y-1">
                      {(selectedItem.effects as string[]).map((eff) => {
                        const info = EFFECT_DISPLAY_TH[eff];
                        return (
                          <li key={eff} className="text-xs text-indigo-800">
                            <span className="font-bold">{info?.stats ?? eff}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-[24px] bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ราคา</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {selectedItem.price.toLocaleString()} {currencyLabel(selectedItem)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleBuy(selectedItem)}
                    disabled={buyingId === selectedItem.id || currencyAmount(selectedItem) < selectedItem.price}
                    className="h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-sm font-bold hover:from-amber-600 hover:to-orange-600"
                  >
                    {buyingId === selectedItem.id ? "กำลังซื้อ..." : "ซื้อไอเทมนี้"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
