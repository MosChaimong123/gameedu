"use client"

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Star, Info, Sword, Shield, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { EFFECT_DISPLAY_TH, SET_DISPLAY_TH } from "@/lib/game/effect-bonuses-config";

function effectCopy(effectId: string) {
  return (
    EFFECT_DISPLAY_TH[effectId] ?? {
      desc: "เอฟเฟกต์พิเศษจากไอเทม",
      stats: "",
    }
  );
}

function setCopy(setId: string) {
  return (
    SET_DISPLAY_TH[setId] ?? {
      desc: "เซ็ตอุปกรณ์",
      stats: "",
    }
  );
}

interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  tier: string;
  goldMultiplier: number;
  bossDamageMultiplier: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  baseCrit: number;
  baseLuck: number;
  baseMag: number;
  baseMp: number;
  image: string;
  effects?: string[];
  setId?: string;
  xpMultiplier?: number;
  currency?: string;
  staminaRestore?: number;
  manaRestore?: number;
  hpRestorePercent?: number;
  isPhoenix?: boolean;
  buffAtk?: number;
  buffDef?: number;
  buffSpd?: number;
  buffGoldMinutes?: number;
  buffXpMinutes?: number;
  isTransmute?: boolean;
}

interface ShopTabProps {
  studentId: string;
  currentGold: number;
  currentPoints: number;
  onPurchaseSuccess: (updatedStats: { gold?: number; points?: number }) => void;
}

const getTierStyle = (tier: string) => {
  switch (tier) {
    case 'COMMON': return 'border-slate-200 hover:border-slate-300';
    case 'RARE': return 'border-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]';
    case 'EPIC': return 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]';
    case 'LEGENDARY': return 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)]';
    default: return 'border-slate-200';
  }
};

const getTierBg = (tier: string) => {
  switch (tier) {
    case 'COMMON': return 'bg-slate-100/50 text-slate-600';
    case 'RARE': return 'bg-blue-100/50 text-blue-600';
    case 'EPIC': return 'bg-purple-100/50 text-purple-600';
    case 'LEGENDARY': return 'bg-amber-100/50 text-amber-600';
    default: return 'bg-slate-100/50 text-slate-600';
  }
};

export function ShopTab({ studentId, currentGold, currentPoints, onPurchaseSuccess }: ShopTabProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<"ALL" | "EQUIPMENT" | "CONSUMABLE">("ALL");
  const [buyQuantity, setBuyQuantity] = useState<Record<string, number>>({});
  const [selectedEffect, setSelectedEffect] = useState<{name: string, type: 'effect' | 'set'} | null>(null);
  const { toast } = useToast();

  const loadShop = useCallback((isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    fetch(`/api/shop?studentId=${studentId}`)
      .then(async (res) => {
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Failed to load shop: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        setItems(data);
        setLoading(false);
        setIsRefreshing(false);
      })
      .catch((err) => {
        console.error("Shop Fetch Error:", err);
        setLoading(false);
        setIsRefreshing(false);
      });
  }, [studentId]);

  useEffect(() => {
    loadShop();
  }, [studentId]);

  const handleBuy = async (item: Item) => {
    const isPoints = item.currency === "POINTS";
    const qty = item.type === 'CONSUMABLE' ? (buyQuantity[item.id] || 1) : 1;
    const canAfford = isPoints ? currentPoints >= item.price * qty : currentGold >= item.price * qty;

    if (!canAfford) {
      toast({
        title: isPoints ? "แต้มพฤติกรรมไม่พอ!" : "ทองไม่พอ!",
        description: isPoints ? "ทำความดีและตั้งใจเรียนเพื่อรับแต้มเพิ่มหน้าชั้นเรียนนะครับ" : "ขยันเรียนและส่งงานเพื่อรับทองเพิ่มนะครับ",
        variant: "destructive",
      });
      return;
    }

    setBuyingId(item.id);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, studentId, quantity: qty }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        toast({
          title: "ซื้อสำเร็จ! 🎉",
          description: `ได้รับ ${item.name} เรียบร้อยแล้ว`,
        });
        onPurchaseSuccess({ gold: data.gold, points: data.points });
        loadShop(); // Refresh shop items to remove/update
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message || "ไม่สามารถซื้อไอเทมได้",
        variant: "destructive",
      });
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-white/20 animate-pulse rounded-3xl border border-white/50" />
        ))}
      </div>
    );
  }

  const EQUIPMENT_TYPES = ['WEAPON', 'ARMOR', 'HELMET', 'GLOVES', 'BOOTS', 'NECKLACE', 'RING', 'ACCESSORY'];

  const filteredItems = items.filter((item) => {
    const tierMatch = filterTier === "ALL" || item.tier === filterTier;
    const categoryMatch = filterCategory === "ALL" 
      || (filterCategory === "EQUIPMENT" && EQUIPMENT_TYPES.includes(item.type))
      || (filterCategory === "CONSUMABLE" && item.type === "CONSUMABLE");
    return tierMatch && categoryMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">ตลาดร้านขายของ</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Premium Equipment Shop</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadShop(true)}
            disabled={isRefreshing}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <div className="flex flex-col items-end gap-1">
             <div className="bg-amber-100/50 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-2">
                <span className="text-xl">💰</span>
                <span className="font-black text-amber-700">{Math.floor(currentGold).toLocaleString()}</span>
             </div>
             <div className="bg-indigo-100/50 border border-indigo-200 px-4 py-1.5 rounded-xl flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                <span className="font-black text-indigo-700 text-xs">{currentPoints.toLocaleString()}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 px-4">
        {[
          { key: 'ALL' as const, label: '🛒 ทั้งหมด', icon: '' },
          { key: 'EQUIPMENT' as const, label: '⚔️ อุปกรณ์สวมใส่', icon: '' },
          { key: 'CONSUMABLE' as const, label: '🧪 ยาวิเศษ', icon: '' },
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={filterCategory === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(key)}
            className={`rounded-2xl text-xs font-black transition-all ${
              filterCategory === key
                ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg'
                : 'text-slate-500 border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Tier Filter */}
      <div className="flex flex-wrap items-center gap-2 px-4 mb-2">
        {['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'].map((tier) => (
          <Button
            key={tier}
            variant={filterTier === tier ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTier(tier)}
            className={`rounded-full text-xs font-bold transition-all ${
              filterTier === tier 
                ? tier === 'COMMON' ? 'bg-slate-600 text-white hover:bg-slate-700'
                : tier === 'RARE' ? 'bg-blue-600 text-white hover:bg-blue-700'
                : tier === 'EPIC' ? 'bg-purple-600 text-white hover:bg-purple-700'
                : tier === 'LEGENDARY' ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-slate-800 text-white hover:bg-slate-900' // ALL
                : 'text-slate-500 border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            {tier === 'ALL' ? 'ทั้งหมด (All)' : tier}
          </Button>
        ))}
      </div>

      <div className="overflow-y-auto max-h-[750px] p-1 pb-10 scroll-smooth">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <GlassCard className={`h-full flex flex-col group overflow-hidden border-2 transition-all duration-300 ${item.type === 'CONSUMABLE' ? 'border-emerald-200 hover:border-emerald-300' : getTierStyle(item.tier)}`}>
              <div className="p-6 flex-1 flex flex-col items-center text-center">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-4 shadow-inner group-hover:scale-110 transition-transform duration-500 ${item.type === 'CONSUMABLE' ? 'bg-emerald-100/50 text-emerald-600' : getTierBg(item.tier)}`}>
                  {item.image}
                </div>
                


                <h3 className="font-black text-slate-800 text-lg mb-1">{item.name}</h3>
                <p className="text-xs text-slate-400 font-medium mb-4">{item.description}</p>

                <div className="w-full mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-600">
                    <Info className="w-3 h-3 text-slate-300" />
                    <span>Effect: </span>
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex flex-wrap justify-center gap-2 mb-1">
                        {item.baseHp > 0 && (
                          <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">❤️ +{item.baseHp}</span>
                        )}
                        {item.baseAtk > 0 && (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">⚔️ +{item.baseAtk}</span>
                        )}
                        {item.baseDef > 0 && (
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">🛡️ +{item.baseDef}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {item.goldMultiplier > 0 && (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 font-black">💰 +{(item.goldMultiplier * 100).toFixed(0)}%</span>
                        )}
                        {item.bossDamageMultiplier > 0 && (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 font-black">🔥 +{(item.bossDamageMultiplier * 100).toFixed(0)}%</span>
                        )}
                        {item.baseSpd > 0 && (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 font-black">⚡ +{item.baseSpd} SPD</span>
                        )}
                        {item.baseCrit > 0 && (
                          <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100 font-black">🎯 +{(item.baseCrit * 100).toFixed(0)}% CRT</span>
                        )}
                        {item.baseLuck > 0 && (
                          <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100 font-black">🍀 +{(item.baseLuck * 100).toFixed(0)}% LUK</span>
                        )}
                        {item.baseMag > 0 && (
                          <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 font-black">🪄 +{item.baseMag} MAG</span>
                        )}
                        {item.baseMp > 0 && (
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 font-black">✨ +{item.baseMp} MP</span>
                        )}
                        {item.xpMultiplier && item.xpMultiplier > 0 ? (
                          <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-100 font-black">🌟 +{(item.xpMultiplier * 100).toFixed(0)}% EXP</span>
                        ) : null}
                        {item.type === 'CONSUMABLE' && item.staminaRestore && item.staminaRestore > 0 && (
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 font-black">🧪 ฟื้นฟู +{item.staminaRestore} Stamina</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.manaRestore && item.manaRestore > 0 && (
                          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-black">💧 ฟื้นฟู +{item.manaRestore} Mana</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.hpRestorePercent && item.hpRestorePercent > 0 && (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 font-black">❤️ HP +{Math.round(item.hpRestorePercent * 100)}%</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.isPhoenix && (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 font-black">🪶 ฟื้นคืนชีพ 50% HP</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.buffAtk && item.buffAtk > 0 && (
                          <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100 font-black">⚔️ ATK +{Math.round(item.buffAtk * 100)}%</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.buffDef && item.buffDef > 0 && (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-black">🛡️ DEF +{Math.round(item.buffDef * 100)}%</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.buffSpd && item.buffSpd > 0 && (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 font-black">⚡ SPD +{Math.round(item.buffSpd * 100)}%</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.buffGoldMinutes && item.buffGoldMinutes > 0 && (
                          <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100 font-black">🪙 Gold ×2 / {item.buffGoldMinutes} นาที</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.buffXpMinutes && item.buffXpMinutes > 0 && (
                          <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-100 font-black">📚 XP ×2 / {item.buffXpMinutes} นาที</span>
                        )}
                        {item.type === 'CONSUMABLE' && item.isTransmute && (
                          <span className="text-stone-600 bg-stone-50 px-2 py-0.5 rounded-lg border border-stone-200 font-black">🪨 5× COMMON → 1× RARE</span>
                        )}
                      </div>

                      {/* Special Effects & Set */}
                      <div className="flex flex-wrap justify-center gap-1">
                        {item.effects && item.effects.length > 0 && item.effects.map(effect => (
                          <span 
                            key={effect} 
                            onClick={() => setSelectedEffect({ name: effect as string, type: 'effect'})}
                            className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors active:scale-95"
                          >
                            ✨ {typeof effect === 'string' ? effect.replace('_', ' ') : effect}
                          </span>
                        ))}
                        {item.setId && (
                          <span 
                            onClick={() => setSelectedEffect({ name: item.setId as string, type: 'set'})}
                            className="text-[9px] bg-indigo-100 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider cursor-pointer hover:bg-indigo-200 transition-colors active:scale-95"
                          >
                            🧩 {item.setId.replace('_', ' ')}
                          </span>
                        )}
                      </div>


                    </div>
                  </div>

                  {/* Quantity selector for consumables */}
                  {item.type === 'CONSUMABLE' && (
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <button
                        onClick={() => setBuyQuantity(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] || 1) - 1) }))}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-lg flex items-center justify-center transition-colors"
                      >-</button>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={buyQuantity[item.id] || 1}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(999, parseInt(e.target.value) || 1));
                          setBuyQuantity(prev => ({ ...prev, [item.id]: val }));
                        }}
                        className="w-16 h-8 text-center text-lg font-black text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setBuyQuantity(prev => ({ ...prev, [item.id]: Math.min(999, (prev[item.id] || 1) + 1) }))}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-lg flex items-center justify-center transition-colors"
                      >+</button>
                    </div>
                  )}

                  <Button
                    onClick={() => handleBuy(item)}
                    disabled={buyingId === item.id}
                    className={`w-full h-12 rounded-2xl font-black text-white transition-all shadow-lg active:scale-95 ${
                      (item.currency === "POINTS" ? currentPoints >= item.price * (item.type === 'CONSUMABLE' ? (buyQuantity[item.id] || 1) : 1) : currentGold >= item.price * (item.type === 'CONSUMABLE' ? (buyQuantity[item.id] || 1) : 1))
                        ? item.currency === "POINTS" 
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-indigo-200'
                            : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:shadow-orange-200'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {buyingId === item.id ? (
                      <span className="animate-pulse">กำลังซื้อ...</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.currency === "POINTS" ? (
                            <>
                                <Star className="w-4 h-4 fill-white" />
                                <span>{(item.price * (item.type === 'CONSUMABLE' ? (buyQuantity[item.id] || 1) : 1)).toLocaleString()} แต้ม</span>
                            </>
                        ) : (
                            <>
                                <span>💰 {(item.price * (item.type === 'CONSUMABLE' ? (buyQuantity[item.id] || 1) : 1)).toLocaleString()}</span>
                            </>
                        )}
                        <div className="w-px h-4 bg-white/20" />
                        <span>ซื้อ{item.type === 'CONSUMABLE' && (buyQuantity[item.id] || 1) > 1 ? ` ${buyQuantity[item.id] || 1} ขวด` : 'เลย'}</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Effect Detail Modal */}
      <AnimatePresence>
        {selectedEffect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
               onClick={() => setSelectedEffect(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedEffect(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
              
              <div className="mb-6 flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                  selectedEffect.type === 'set' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedEffect.type === 'set' ? '🧩' : '✨'}
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-800 tracking-tight">
                    {selectedEffect.name.replace('_', ' ')}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {selectedEffect.type === 'set' ? 'Set Bonus' : 'Passive Effect'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-sm text-slate-600 font-medium">
                    {selectedEffect.type === 'set' 
                      ? setCopy(selectedEffect.name).desc
                      : effectCopy(selectedEffect.name).desc}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    โบนัสตัวเลข (Stats)
                  </h4>
                  <p className="text-sm font-black text-amber-600">
                    {selectedEffect.type === 'set' 
                      ? setCopy(selectedEffect.name).stats
                      : effectCopy(selectedEffect.name).stats}
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={() => setSelectedEffect(null)}
                className="w-full mt-6 bg-slate-900 text-white rounded-2xl h-12 font-black"
              >
                เข้าใจแล้ว
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
