"use client"

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Shield, Package, Check, X, Info, Zap, HardHat, Footprints, Hand, Gem, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { EnhancementDialog } from "./EnhancementDialog";

interface StudentItem {
  id: string;
  itemId: string;
  quantity: number;
  isEquipped: boolean;
  enhancementLevel: number;
  item: {
    name: string;
    description: string;
    type: string;
    price: number;
    effectType?: string;
    effectValue?: number;
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
  };
}

interface InventoryTabProps {
  studentId: string;
  gold: number;
  points: number;
  onUpdate: () => void;
  onUpdateStudent?: (updated: Record<string, any>) => void;
}

export function InventoryTab({ studentId, gold, points, onUpdate, onUpdateStudent }: InventoryTabProps) {
  const [items, setItems] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [selectedItemForEnhance, setSelectedItemForEnhance] = useState<StudentItem | null>(null);
  const { toast } = useToast();

  const loadInventory = useCallback(async () => {
    try {
      const res = await fetch(`/api/student/inventory?studentId=${studentId}`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`Error loading inventory for ${studentId}: HTTP ${res.status} ${text}`);
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(`Error loading inventory for ${studentId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadInventory();
  }, [studentId]);

  const handleToggleEquip = async (studentItemId: string, currentEquipped: boolean) => {
    setTogglingId(studentItemId);
    try {
      const res = await fetch("/api/inventory/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentItemId, equip: !currentEquipped }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: !currentEquipped ? "สวมใส่แล้ว! 🛡️" : "ถอดออกแล้ว",
          description: !currentEquipped ? "ได้รับโบนัสพลังพิเศษ" : "พลังโบนัสถูกยกเลิก",
        });
        loadInventory();
        onUpdate(); // Refresh gold rate etc.
      }
    } catch (err) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleEnhance = async (si: StudentItem): Promise<{ success: boolean; newLevel: number }> => {
    setEnhancingId(si.id);
    try {
        const res = await fetch("/api/student/inventory/enhance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentItemId: si.id }),
        });
        const data = await res.json();

        // Always update resources if provided, even on failure (since materials are consumed)
        if (onUpdateStudent && data.newGold !== undefined) {
            onUpdateStudent({
                points: data.newPoints,
                gameStats: { 
                    gold: data.newGold 
                }
            });
        }

        if (data.success) {
            const updatedItems = await fetch(`/api/student/inventory?studentId=${studentId}`).then(r => r.json());
            setItems(updatedItems);
            onUpdate();
            if (onUpdateStudent) {
                onUpdateStudent({
                    items: updatedItems
                });
            }
            return { success: true, newLevel: data.newLevel };
        } else {
            // Materials are still consumed on failure in the API now? 
            // Check API: it does deduct points/gold even if fail? Yes.
            return { success: false, newLevel: si.enhancementLevel };
        }
    } catch (err) {
        console.error(err);
        return { success: false, newLevel: si.enhancementLevel };
    } finally {
        setEnhancingId(null);
    }
  };

  const handleSellItem = async (si: StudentItem) => {
    const sellPrice = Math.floor(si.item.price * 0.5 * (1 + si.enhancementLevel * 0.1));
    if (!confirm(`ต้องการขาย ${si.item.name} ในราคา ${sellPrice.toLocaleString()} ทอง ใช่หรือไม่?`)) return;

    setSellingId(si.id);
    try {
        const res = await fetch("/api/student/inventory/sell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentItemId: si.id }),
        });
        const data = await res.json();

        if (data.success) {
            toast({
                title: "ขายสำเร็จ! 💰",
                description: `ได้รับ ${data.receivedGold.toLocaleString()} ทอง`,
            });
            
            if (onUpdateStudent) {
                onUpdateStudent({
                    gameStats: { gold: data.newGold }
                });
            }
            
            loadInventory();
            onUpdate();
        } else {
            toast({
                title: "ขายไม่สำเร็จ",
                description: data.error,
                variant: "destructive",
            });
        }
    } catch (err) {
        toast({
            title: "เกิดข้อผิดพลาด",
            variant: "destructive",
        });
    } finally {
        setSellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-white/20 animate-pulse rounded-2xl border border-white/50" />
        ))}
      </div>
    );
  }

  // Calculate equipped summary
  const equippedItems = items.filter(i => i.isEquipped);
  const totalGoldBoost = equippedItems.reduce((sum, si) => {
      const levelBonus = 1 + si.enhancementLevel * 0.1;
      return sum + (si.item.goldMultiplier || 0) * levelBonus;
  }, 0);
  const totalBossDmg = equippedItems.reduce((sum, si) => {
      const levelBonus = 1 + si.enhancementLevel * 0.1;
      return sum + (si.item.bossDamageMultiplier || 0) * levelBonus;
  }, 0);

  const totalBonusHp = equippedItems.reduce((sum, si) => {
      const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
      return sum + (si.item.baseHp || 0) * levelBonus;
  }, 0);
  const totalBonusAtk = equippedItems.reduce((sum, si) => {
      const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
      return sum + (si.item.baseAtk || 0) * levelBonus;
  }, 0);
  const totalBonusDef = equippedItems.reduce((sum, si) => {
      const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
      return sum + (si.item.baseDef || 0) * levelBonus;
  }, 0);
  const totalBonusSpd = equippedItems.reduce((sum, si) => {
      const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
      return sum + (si.item.baseSpd || 0) * levelBonus;
  }, 0);
  const totalBonusCrit = equippedItems.reduce((sum, si) => {
      const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
      return sum + (si.item.baseCrit || 0) * levelBonus;
  }, 0);
  const totalBonusLuck = equippedItems.reduce((sum, si) => {
      const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
      return sum + (si.item.baseLuck || 0) * levelBonus;
  }, 0);

  const SLOTS = [
    { type: 'WEAPON', label: 'อาวุธ', icon: Sword },
    { type: 'ARMOR', label: 'ชุดเกราะ', icon: Shield },
    { type: 'HELMET', label: 'หมวก', icon: HardHat },
    { type: 'GLOVES', label: 'ถุงมือ', icon: Hand },
    { type: 'BOOTS', label: 'รองเท้า', icon: Footprints },
    { type: 'NECKLACE', label: 'สร้อยคอ', icon: Gem },
    { type: 'RING', label: 'แหวน', icon: Gem },
  ];

  const getEquippedInSlot = (type: string) => equippedItems.find(ei => ei.item.type === type);

  return (
    <div className="space-y-8">
      {/* ===== Equipment Summary Dashboard ===== */}
      <GlassCard className="p-6 bg-indigo-900/5 border-indigo-200/50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Summary Stats */}
            <div className="space-y-4">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                    โบนัสพลังรวม
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Health</p>
                        <p className="text-xl font-black text-rose-600">+{Math.floor(totalBonusHp)}</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attack</p>
                        <p className="text-xl font-black text-amber-600">+{Math.floor(totalBonusAtk)}</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Defense</p>
                        <p className="text-xl font-black text-indigo-600">+{Math.floor(totalBonusDef)}</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Speed</p>
                        <p className="text-xl font-black text-emerald-600">+{Math.floor(totalBonusSpd)}</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Crit Rate</p>
                        <p className="text-xl font-black text-orange-600">+{Math.round(totalBonusCrit * 100)}%</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Luck</p>
                        <p className="text-xl font-black text-yellow-600">+{Math.round(totalBonusLuck * 100)}%</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gold Boost</p>
                        <p className="text-lg font-black text-amber-600">+{Math.round(totalGoldBoost * 100)}%</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Boss Damage</p>
                        <p className="text-lg font-black text-rose-600">+{Math.round(totalBossDmg * 100)}%</p>
                    </div>
                </div>
            </div>

            {/* Visual Slots Grid */}
            <div className="lg:col-span-2">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {SLOTS.map((slot) => {
                        const equipped = getEquippedInSlot(slot.type);
                        const Icon = slot.icon;
                        return (
                            <div key={slot.type} className="flex flex-col items-center gap-1.5">
                                <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl transition-all relative ${
                                    equipped 
                                        ? 'bg-white border-indigo-400 shadow-lg shadow-indigo-100' 
                                        : 'bg-slate-50 border-dashed border-slate-200 text-slate-200'
                                }`}>
                                    {equipped ? equipped.item.image : <Icon className="w-6 h-6 opacity-40" />}
                                    {equipped && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tighter ${equipped ? 'text-indigo-600' : 'text-slate-300'}`}>
                                    {slot.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      </GlassCard>

      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">กระเป๋าสัมภาระ</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Your Items & Equipment</p>
        </div>
        <div className="bg-indigo-100/50 border border-indigo-200 px-4 py-2 rounded-2xl flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" />
          <span className="font-black text-indigo-700">{items.length} ชิ้น</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-16 text-center bg-white/30 rounded-[2rem] border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-slate-200" />
          </div>
          <p className="font-bold text-slate-400 text-lg">ยังไม่มีไอเทมในกระเป๋า</p>
          <p className="text-sm text-slate-300 mt-1">ไปเลือกซื้อไอเทมเจ๋งๆ ได้ที่ร้านค้าเลย!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((si, idx) => (
            <motion.div
              key={si.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className={`relative overflow-hidden group border-2 transition-all ${
                si.isEquipped ? 'border-indigo-500 shadow-indigo-100' : 'border-transparent'
              }`}>
                {si.isEquipped && (
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white p-2 rounded-bl-2xl shadow-lg z-10">
                    <Check className="w-4 h-4" />
                  </div>
                )}

                <div className="p-5 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl mb-3 shadow-inner group-hover:rotate-6 transition-transform">
                    {si.item.image}
                  </div>

                  <h3 className="font-black text-slate-800 text-sm mb-1">
                    {si.item.name} {si.enhancementLevel > 0 && <span className="text-indigo-600">+{si.enhancementLevel}</span>}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 mb-4">
                    <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {si.item.type}
                    </span>
                    {si.quantity > 1 && (
                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        x{si.quantity}
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-slate-50/50 rounded-xl p-2.5 mb-4 text-[10px] font-bold text-slate-500 flex flex-col gap-1.5 h-auto">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="leading-tight text-slate-800 uppercase tracking-tighter">Stats & Effects</span>
                    </div>
                    <div className="space-y-1">
                        {si.item.baseHp! > 0 && (
                            <div className="flex justify-between items-center text-rose-500">
                                <span>❤️ HP</span>
                                <span className="font-black">+{Math.floor(si.item.baseHp! * (1 + si.enhancementLevel * 0.1))}</span>
                            </div>
                        )}
                        {si.item.baseAtk! > 0 && (
                            <div className="flex justify-between items-center text-amber-600">
                                <span>⚔️ ATK</span>
                                <span className="font-black">+{Math.floor(si.item.baseAtk! * (1 + si.enhancementLevel * 0.1))}</span>
                            </div>
                        )}
                        {si.item.baseDef! > 0 && (
                            <div className="flex justify-between items-center text-indigo-500">
                                <span>🛡️ DEF</span>
                                <span className="font-black">+{Math.floor(si.item.baseDef! * (1 + si.enhancementLevel * 0.1))}</span>
                            </div>
                        )}
                        {si.item.goldMultiplier > 0 && (
                            <div className="flex justify-between items-center text-amber-600">
                                <span>💰 Gold</span>
                                <span className="font-black">+{Math.round(si.item.goldMultiplier * (1 + si.enhancementLevel * 0.1) * 100)}%</span>
                            </div>
                        )}
                        {si.item.bossDamageMultiplier > 0 && (
                            <div className="flex justify-between items-center text-rose-600">
                                <span>🔥 Boss</span>
                                <span className="font-black">+{Math.round(si.item.bossDamageMultiplier * (1 + si.enhancementLevel * 0.1) * 100)}%</span>
                            </div>
                        )}
                        {si.item.baseSpd > 0 && (
                            <div className="flex justify-between items-center text-emerald-600">
                                <span>⚡ SPD</span>
                                <span className="font-black">+{Math.floor(si.item.baseSpd * (1 + si.enhancementLevel * 0.1))}</span>
                            </div>
                        )}
                        {si.item.baseCrit > 0 && (
                            <div className="flex justify-between items-center text-orange-600">
                                <span>🎯 CRT</span>
                                <span className="font-black">+{Math.round(si.item.baseCrit * (1 + si.enhancementLevel * 0.1) * 100)}%</span>
                            </div>
                        )}
                        {si.item.baseLuck > 0 && (
                            <div className="flex justify-between items-center text-yellow-600">
                                <span>🍀 LUK</span>
                                <span className="font-black">+{Math.round(si.item.baseLuck * (1 + si.enhancementLevel * 0.1) * 100)}%</span>
                            </div>
                        )}
                    </div>
                    {si.enhancementLevel > 0 && (
                        <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between items-center text-[8px] text-indigo-500 uppercase tracking-tighter">
                            <span>Level Bonus</span>
                            <span className="font-black">+{si.enhancementLevel * 10}%</span>
                        </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full mb-2">
                       <Button
                        onClick={() => handleToggleEquip(si.id, si.isEquipped)}
                        disabled={togglingId === si.id || enhancingId === si.id || sellingId === si.id}
                        variant="outline"
                        className={`h-9 rounded-xl font-black text-[10px] transition-all ${
                          si.isEquipped
                            ? 'bg-rose-50 text-rose-500 border-rose-100'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {togglingId === si.id ? '...' : (si.isEquipped ? 'ถอดออก' : 'สวมใส่')}
                      </Button>
                      <Button
                        onClick={() => setSelectedItemForEnhance(si)}
                        disabled={enhancingId === si.id || togglingId === si.id || sellingId === si.id}
                        className="h-9 rounded-xl font-black text-[10px] bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1"
                      >
                        <Sword className="w-3 h-3" />
                        ตีบวก
                      </Button>
                  </div>

                  <Button
                    onClick={() => handleSellItem(si)}
                    disabled={sellingId === si.id || enhancingId === si.id || togglingId === si.id}
                    variant="ghost"
                    className="w-full h-8 rounded-xl font-black text-[9px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-1"
                  >
                    <Coins className="w-3 h-3" />
                    ขาย ({Math.floor(si.item.price * 0.5 * (1 + si.enhancementLevel * 0.1)).toLocaleString()} ทอง)
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {selectedItemForEnhance && (
        <EnhancementDialog
          isOpen={!!selectedItemForEnhance}
          onClose={() => setSelectedItemForEnhance(null)}
          item={(() => {
            const currentItem = items.find(i => i.id === selectedItemForEnhance.id) || selectedItemForEnhance;
            return {
              id: currentItem.id,
              name: currentItem.item.name,
              image: currentItem.item.image,
              price: currentItem.item.price,
              enhancementLevel: currentItem.enhancementLevel,
              goldMultiplier: currentItem.item.goldMultiplier,
              bossDamageMultiplier: currentItem.item.bossDamageMultiplier
            };
          })()}
          currentGold={gold}
          currentPoints={points}
          onEnhance={() => handleEnhance(items.find(i => i.id === selectedItemForEnhance.id) || selectedItemForEnhance)}
        />
      )}
    </div>
  );
}
