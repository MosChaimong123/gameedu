"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Star, Info, Sword, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";

interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  goldMultiplier: number;
  bossDamageMultiplier: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  image: string;
}

interface ShopTabProps {
  studentId: string;
  currentGold: number;
  onPurchaseSuccess: (newGold: number) => void;
}

export function ShopTab({ studentId, currentGold, onPurchaseSuccess }: ShopTabProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/shop")
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
      })
      .catch((err) => {
        console.error("Shop Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  const handleBuy = async (item: Item) => {
    if (currentGold < item.price) {
      toast({
        title: "ทองไม่พอ!",
        description: "ขยันเรียนและส่งงานเพื่อรับทองเพิ่มนะครับ",
        variant: "destructive",
      });
      return;
    }

    setBuyingId(item.id);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, studentId }),
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
        onPurchaseSuccess(data.gold);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">ตลาดร้านขายของ</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Premium Equipment Shop</p>
        </div>
        <div className="bg-amber-100/50 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="font-black text-amber-700">{Math.floor(currentGold).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <GlassCard className="h-full flex flex-col group overflow-hidden">
              <div className="p-6 flex-1 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-5xl mb-4 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  {item.image}
                </div>
                
                <div className="mb-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                    item.type === 'WEAPON' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    item.type === 'ARMOR' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {item.type}
                  </span>
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
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">💰 +{(item.goldMultiplier * 100)}%</span>
                        )}
                        {item.bossDamageMultiplier > 0 && (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">🔥 +{(item.bossDamageMultiplier * 100)}%</span>
                        )}
                      </div>
                      {item.goldMultiplier === 0 && item.bossDamageMultiplier === 0 && item.baseHp === 0 && item.baseAtk === 0 && item.baseDef === 0 && (
                        <span className="text-slate-400 italic">No Special Effects</span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleBuy(item)}
                    disabled={buyingId === item.id}
                    className={`w-full h-12 rounded-2xl font-black text-white transition-all shadow-lg active:scale-95 ${
                      currentGold >= item.price
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:shadow-orange-200'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {buyingId === item.id ? (
                      <span className="animate-pulse">กำลังซื้อ...</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>💰 {item.price.toLocaleString()}</span>
                        <div className="w-px h-4 bg-white/20" />
                        <span>ซื้อเลย</span>
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
  );
}
