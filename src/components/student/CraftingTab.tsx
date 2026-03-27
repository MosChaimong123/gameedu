"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hammer, RefreshCw, ArrowUp, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { CRAFT_REQUIREMENTS, MATERIAL_TIERS, MATERIAL_TIER_MAP } from "@/lib/game/crafting-system";

// ─── Icons ────────────────────────────────────────────────────────────────────

const MATERIAL_ICONS: Record<string, string> = {
  "Stone Fragment": "🪨",
  "Wolf Fang": "🦷",
  "Iron Ore": "⚙️",
  "Forest Herb": "🌿",
  "Dragon Scale": "🐉",
  "Shadow Essence": "🌑",
  "Thunder Crystal": "⚡",
  "Void Shard": "🌀",
  "Phoenix Feather": "🔥",
  "Abyssal Core": "💀",
  "Celestial Dust": "✨",
  "Ancient Relic": "🏺",
};

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  COMMON:    { bg: "bg-slate-50",   border: "border-slate-200",  text: "text-slate-700",  badge: "bg-slate-200 text-slate-600" },
  RARE:      { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-200 text-blue-700" },
  EPIC:      { bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-200 text-purple-700" },
  LEGENDARY: { bg: "bg-amber-50",   border: "border-amber-300",  text: "text-amber-700",  badge: "bg-amber-200 text-amber-700" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaterialEntry {
  type: string;
  quantity: number;
  tier: string;
}

interface CraftingTabProps {
  code: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CraftingTab({ code }: CraftingTabProps) {
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [craftingTier, setCraftingTier] = useState<string | null>(null);
  const [craftingMaterial, setCraftingMaterial] = useState<string | null>(null);
  const [transmutingTier, setTransmutingTier] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch(`/api/student/${code}/materials`);
      const data = await res.json() as { materials?: MaterialEntry[] };
      setMaterials(data.materials ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [code]);

  useEffect(() => { void fetchMaterials(); }, [fetchMaterials]);

  const materialMap = Object.fromEntries(materials.map((m) => [m.type, m.quantity]));

  // ── Craft ────────────────────────────────────────────────────────────────
  const handleCraft = async (materialType: string) => {
    if (craftingMaterial) return;
    setCraftingMaterial(materialType);
    const targetTier = MATERIAL_TIER_MAP[materialType as keyof typeof MATERIAL_TIER_MAP];
    try {
      const res = await fetch(`/api/student/${code}/craft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialType, targetTier }),
      });
      const data = await res.json() as { item?: { item?: { name?: string } }; error?: string };
      if (data.item) {
        toast({ title: "🔨 Craft สำเร็จ!", description: `ได้รับ: ${data.item.item?.name ?? "ไอเทม"}`, className: "bg-emerald-600 text-white" });
        void fetchMaterials();
      } else {
        toast({ title: "Craft ไม่สำเร็จ", description: data.error ?? "เกิดข้อผิดพลาด", variant: "destructive" });
      }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setCraftingMaterial(null); }
  };

  // ── Transmute ─────────────────────────────────────────────────────────────
  const handleTransmute = async (fromTier: string) => {
    if (transmutingTier) return;
    setTransmutingTier(fromTier);
    try {
      const res = await fetch(`/api/student/${code}/transmute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromTier }),
      });
      const data = await res.json() as { success?: boolean; received?: { type: string }; error?: string };
      if (data.success) {
        toast({ title: "🔮 Transmute สำเร็จ!", description: `ได้รับ: ${MATERIAL_ICONS[data.received?.type ?? ""] ?? ""} ${data.received?.type}`, className: "bg-purple-600 text-white" });
        void fetchMaterials();
      } else {
        toast({ title: "Transmute ไม่สำเร็จ", description: data.error ?? "เกิดข้อผิดพลาด", variant: "destructive" });
      }
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setTransmutingTier(null); }
  };

  // ── Tier totals for transmute check ──────────────────────────────────────
  const tierTotals: Record<string, number> = {};
  for (const [tier, list] of Object.entries(MATERIAL_TIERS)) {
    tierTotals[tier] = (list as string[]).reduce((sum, t) => sum + (materialMap[t] ?? 0), 0);
  }

  const allTiers = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const;
  const transmuteTiers = ["COMMON", "RARE", "EPIC"] as const;

  return (
    <div className="space-y-6">
      {/* ── Material Inventory ── */}
      <GlassCard className="p-5" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            คลังวัสดุ
          </h3>
          <button onClick={() => { setLoading(true); void fetchMaterials(); }} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm font-bold">ยังไม่มีวัสดุ</p>
            <p className="text-xs mt-1">สะสมจากการฟาร์มและ Quest</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {allTiers.flatMap((tier) =>
              (MATERIAL_TIERS[tier] as string[]).map((type) => {
                const qty = materialMap[type] ?? 0;
                if (qty === 0) return null;
                const c = TIER_COLORS[tier];
                return (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border ${c.bg} ${c.border}`}
                  >
                    <span className="text-2xl">{MATERIAL_ICONS[type] ?? "📦"}</span>
                    <span className="text-[10px] font-black text-center leading-tight text-slate-700 line-clamp-2">{type}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${c.badge}`}>×{qty}</span>
                  </motion.div>
                );
              }).filter(Boolean)
            )}
          </div>
        )}
      </GlassCard>

      {/* ── Recipe Book ── */}
      <GlassCard className="p-5" hover={false}>
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mb-4">
          <Hammer className="w-4 h-4 text-rose-500" />
          สูตร Craft
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allTiers.map((tier) => {
            const req = CRAFT_REQUIREMENTS[tier];
            const c = TIER_COLORS[tier];
            const materialsInTier = req.materials as string[];
            // Check if player has enough of any single material type
            const craftableMaterials = materialsInTier.filter((m) => (materialMap[m] ?? 0) >= req.quantity);

            return (
              <div key={tier} className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-black uppercase ${c.text}`}>{tier}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                    ใช้ {req.quantity} ชิ้น → ไอเทมสุ่ม
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {materialsInTier.map((m) => {
                    const qty = materialMap[m] ?? 0;
                    const enough = qty >= req.quantity;
                    return (
                      <div key={m} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${enough ? "bg-white border-emerald-300 text-emerald-700" : "bg-white/60 border-slate-200 text-slate-400"}`}>
                        <span>{MATERIAL_ICONS[m] ?? "📦"}</span>
                        <span>{m}</span>
                        <span className="font-black">{qty}/{req.quantity}</span>
                      </div>
                    );
                  })}
                </div>
                {craftableMaterials.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {craftableMaterials.map((m) => (
                      <motion.button
                        key={m}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCraft(m)}
                        disabled={craftingMaterial === m}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-sm transition-all ${
                          craftingMaterial === m
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600"
                        }`}
                      >
                        {craftingMaterial === m ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Hammer className="w-3 h-3" />
                        )}
                        Craft ({MATERIAL_ICONS[m] ?? ""} {m})
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-medium">วัสดุไม่เพียงพอ</p>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ── Transmutation ── */}
      <GlassCard className="p-5" hover={false}>
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mb-1">
          <ArrowUp className="w-4 h-4 text-purple-500" />
          Transmute (เล่นแร่แปรธาตุ)
        </h3>
        <p className="text-xs text-slate-500 mb-4">ใช้วัสดุ 3 ชิ้น (รวมทุกชนิดในระดับเดียวกัน) → วัสดุระดับถัดไป 1 ชิ้น (สุ่ม)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {transmuteTiers.map((fromTier) => {
            const toTierIndex = ["COMMON", "RARE", "EPIC", "LEGENDARY"].indexOf(fromTier) + 1;
            const toTier = ["COMMON", "RARE", "EPIC", "LEGENDARY"][toTierIndex];
            const total = tierTotals[fromTier] ?? 0;
            const canTransmute = total >= 3;
            const cFrom = TIER_COLORS[fromTier];
            const cTo = TIER_COLORS[toTier];

            return (
              <div key={fromTier} className={`rounded-2xl border p-4 ${cFrom.bg} ${cFrom.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-black ${cFrom.text}`}>{fromTier}</span>
                  <span className="text-slate-400 text-xs">→</span>
                  <span className={`text-xs font-black ${cTo.text}`}>{toTier}</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  มีอยู่ <span className="font-black text-slate-700">{total}</span>/3 ชิ้น
                </p>
                <motion.button
                  whileHover={canTransmute && !transmutingTier ? { scale: 1.03 } : {}}
                  whileTap={canTransmute && !transmutingTier ? { scale: 0.97 } : {}}
                  onClick={() => handleTransmute(fromTier)}
                  disabled={!canTransmute || !!transmutingTier}
                  className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    canTransmute && !transmutingTier
                      ? "bg-purple-500 text-white hover:bg-purple-600 shadow-sm"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {transmutingTier === fromTier ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <ArrowUp className="w-3 h-3" />
                  )}
                  Transmute
                </motion.button>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
