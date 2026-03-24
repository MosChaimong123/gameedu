"use client"

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Shield, Package, Check, Info, Zap, HardHat, Footprints, Hand, Gem, Coins, Heart, Star, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { EnhancementDialog } from "./EnhancementDialog";
import {
  getStatMultipliers,
  JobTier,
  resolveEffectiveJobKey,
} from "@/lib/game/job-system";
import { StatCalculator } from "@/lib/game/stat-calculator";
import { IdleEngine } from "@/lib/game/idle-engine";
import { EFFECT_DISPLAY_TH, SET_DISPLAY_TH } from "@/lib/game/effect-bonuses-config";
import {
  getNextSetMilestone,
  getReachedSetMilestones,
  getSetDisplayMaxPieces,
} from "@/lib/game/set-bonus-config";
import {
  IDLE_GOLD_BOSS_DISPLAY_BASE_PERCENT,
  sumEquippedBossDamageMultiplierBonus,
  sumEquippedGoldMultiplierBonus,
} from "@/lib/game/equipment-mult-helpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

function effectCopy(effectId: string) {
  return (
    EFFECT_DISPLAY_TH[effectId] ?? {
      desc: "เอฟเฟกต์พิเศษจากอุปกรณ์",
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

const STAT_INFO: Record<string, { title: string; emoji: string; color: string; desc: string; formula: string; tips: string[] }> = {
  HP: {
    title: "HP — พลังชีวิต",
    emoji: "❤️", color: "rose",
    desc: "พลังชีวิตทั้งหมด ถ้า HP ลดเป็น 0 ตายในสนามรบ รับดาเมจจากบอสและมอนสเตอร์",
    formula: "base + level×10 + Σ item.baseHp × (1 + enhance×0.1)",
    tips: [
      "Warrior มี Job mult. HP สูงสุด (×1.4)",
      "ไอเทม Armor, Helmet เพิ่ม HP ได้มากที่สุด",
      "Dragon Set 4 ชิ้น: HP +25%",
    ],
  },
  ATK: {
    title: "ATK — พลังโจมตี",
    emoji: "⚔️", color: "amber",
    desc: "พลังโจมตีกายภาพ ใช้คำนวณดาเมจสกิลของ Warrior, Ranger, Rogue และดาเมจบอสพื้นฐาน",
    formula: "base + level×3 + Σ item.baseAtk × (1 + enhance×0.1)",
    tips: [
      "Ranger มี ATK เพิ่มด้วย Job mult.",
      "Dragon Set 2 ชิ้น: ATK +15%",
      "ดาเมจบอสใช้ max(ATK, MAG)",
    ],
  },
  DEF: {
    title: "DEF — เกราะป้องกัน",
    emoji: "🛡️", color: "indigo",
    desc: "ลดดาเมจที่ได้รับจากการโจมตีกายภาพและสกิล ดาเมจที่รับ = max(1, ATK_ศัตรู − DEF)",
    formula: "dmg_taken = max(1, enemy_ATK − DEF)",
    tips: [
      "Warrior มี DEF สูงสุด (Job ×1.25)",
      "Healer สามารถ stack DEF เพื่อรอดนานขึ้น",
      "Dragon Set 2 ชิ้น: DEF +15%",
    ],
  },
  SPD: {
    title: "SPD — ความเร็ว",
    emoji: "⚡", color: "emerald",
    desc: "กำหนดลำดับการออกเทิร์นในสนามรบ SPD สูงกว่าได้โจมตีก่อน อาจโจมตีได้ 2 ครั้งต่อรอบ",
    formula: "turnOrder = players sorted by SPD DESC",
    tips: [
      "Rogue มี SPD สูงสุด (Job ×1.4)",
      "Thunder Set 2 ชิ้น: SPD ×1.2",
      "SPD ≥ 2× ของศัตรู = โจมตีได้ 2 ครั้งต่อรอบ",
    ],
  },
  CRIT: {
    title: "CRIT — โอกาส Critical",
    emoji: "🎯", color: "orange",
    desc: "โอกาส (%) ที่จะโจมตีติด Critical Hit ทำดาเมจเพิ่ม ×1.5 เทียบกับดาเมจปกติ",
    formula: "crit_dmg = normal_dmg × 1.5  (if rand() < CRIT%)",
    tips: [
      "Rogue มีโอกาส crit สูงสุด (Job ×1.5)",
      "Thunder Set 2 ชิ้น: +10% CRIT rate",
      "Lucky Strike effect: ถ้า LUK > 50% จะเพิ่ม CRIT อีก +5%",
    ],
  },
  LUK: {
    title: "LUK — โชค",
    emoji: "🍀", color: "yellow",
    desc: "ส่งผลต่อโอกาสได้ไอเทม/วัตถุดิบ drop จากมอนสเตอร์ และผลลัพธ์สุ่มในระบบต่างๆ",
    formula: "drop_rate × (1 + LUK)",
    tips: [
      "Rogue มี LUK สูงสุด (Job ×1.5)",
      "Shadow Set 2 ชิ้น: LUK ×1.5",
      "Lucky Strike effect: LUK > 50% → CRIT +5%",
    ],
  },
  MAG: {
    title: "MAG — พลังเวทย์มนตร์",
    emoji: "✨", color: "indigo",
    desc: "พลังโจมตีเวทย์มนตร์ ใช้คำนวณดาเมจสกิลของ Mage/Healer และดาเมจบอสถ้า MAG > ATK",
    formula: "boss_dmg = max(ATK, MAG) × jobBonus × setBonuses",
    tips: [
      "Mage มี MAG สูงสุด (Job ×1.5)",
      "ดาเมจบอสใช้ max(ATK, MAG) — Mage ไม่เสียเปรียบ",
      "Healer ใช้ MAG ฮีลได้ด้วย",
    ],
  },
  MP: {
    title: "MP — Mana Points",
    emoji: "💧", color: "indigo",
    desc: "พลังงานเวทย์ ใช้สำหรับปล่อยสกิล MP จะลดลงทุกครั้งที่ใช้สกิล MP-cost หมดแล้วไม่สามารถใช้สกิลนั้นได้",
    formula: "mp_remaining = maxMp − Σ skill.mpCost",
    tips: [
      "Mage ใช้ MP เยอะ ต้อง equip ไอเทม baseMp",
      "ดื่ม Mana Potion เพื่อฟื้นฟู MP ในสนามรบ",
      "Mana Flow effect: ฟื้นฟู MP อัตโนมัติต่อรอบ",
    ],
  },
  GOLD: {
    title: "GOLD — โบนัสทองรับ",
    emoji: "🪙", color: "amber",
    desc: "เปอร์เซ็นต์ทองที่ได้รับจากบอสและกิจกรรม ค่า base 100% = ทองปกติ bonus เพิ่มจากไอเทม",
    formula: "gold_earned = base_gold × (totalGoldPct ÷ 100)",
    tips: [
      "Gold Finder effect: +15% Gold",
      "Shadow Set 2 ชิ้น: +25% Gold",
      "God's Blessing effect: +10% Gold",
    ],
  },
  BOSS: {
    title: "BOSS — ดาเมจโจมตีบอส",
    emoji: "🔥", color: "rose",
    desc: "เปอร์เซ็นต์เพิ่มดาเมจโจมตี World Boss ยิ่งสูงยิ่งช่วยทีมได้มากในการ raid",
    formula: "boss_dmg = atk_dmg × (totalBossPct ÷ 100)",
    tips: [
      "Dragon Set 4 ชิ้น: Boss Damage +20%",
      "God's Blessing effect: +10% Boss Damage",
      "Legendary Set เต็ม 7 ชิ้น: Boss Damage +40%",
    ],
  },
};

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
    slot?: string;
    price: number;
    tier: string;
    effectType?: string;
    effectValue?: number;
    effects?: string[];
    setId?: string;
    xpMultiplier?: number;
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
    currency?: string;
  };
}

interface InventoryTabProps {
  studentId: string;
  gold: number;
  points: number;
  level: number;
  jobClass?: string;
  jobTier?: string;
  advanceClass?: string | null;
  onUpdate: () => void;
  onUpdateStudent?: (updated: Record<string, any>) => void;
}

export function InventoryTab({
  studentId,
  gold,
  points,
  level,
  jobClass,
  jobTier,
  advanceClass = null,
  onUpdate,
  onUpdateStudent,
}: InventoryTabProps) {
  const [items, setItems] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [selectedItemForEnhance, setSelectedItemForEnhance] = useState<StudentItem | null>(null);
  const [sellConfirmItem, setSellConfirmItem] = useState<StudentItem | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<{name: string, type: 'effect' | 'set'} | null>(null);
  const [selectedEquippedItem, setSelectedEquippedItem] = useState<StudentItem | null>(null);
  const [statInfoKey, setStatInfoKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'equipment' | 'consumable'>('all');
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

  const handleUseItem = async (si: StudentItem, quantity: number = 1) => {
    if (si.item.type !== "CONSUMABLE") return;
    setUsingId(si.id);
    try {
      const res = await fetch("/api/student/inventory/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentItemId: si.id, studentId, quantity }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "ใช้งานสำเร็จ! ✨",
          description: data.message,
        });
        
        if (onUpdateStudent) {
            onUpdateStudent({
                stamina: data.newStamina,
                mana: data.newMana
            });
        }
        
        loadInventory();
        onUpdate();
      } else {
        toast({
          title: "ใช้งานไม่สำเร็จ",
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
      setUsingId(null);
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

  const handleSellItem = (si: StudentItem) => {
    setSellConfirmItem(si);
  };

  const confirmSell = async () => {
    const si = sellConfirmItem;
    if (!si) return;
    setSellConfirmItem(null);

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

  // Calculate equipped summary (combat stats = StatCalculator pipeline; base = no equipment, same job)
  const equippedItems = items.filter(i => i.isEquipped);
  const baseSnapshot = IdleEngine.calculateCharacterStats(
    points,
    [],
    level,
    jobClass ?? null,
    jobTier ?? "BASE",
    advanceClass
  );
  const fullCombat = StatCalculator.compute(
    points,
    equippedItems,
    level,
    jobClass ?? null,
    jobTier ?? "BASE",
    advanceClass
  );
  const itemGoldBonus = sumEquippedGoldMultiplierBonus(equippedItems);
  const itemBossBonus = sumEquippedBossDamageMultiplierBonus(equippedItems);
  const goldBonusTotalPct = Math.round(
    (itemGoldBonus + fullCombat.goldMultiplier) * 100
  );
  const bossBonusTotalPct = Math.round(
    (itemBossBonus + fullCombat.bossDamageMultiplier) * 100
  );

  const unequippedItems = items.filter(si => !si.isEquipped);

  const SLOTS = [
    { type: 'WEAPON', label: 'อาวุธ', icon: Sword },
    { type: 'BODY', label: 'ชุดเกราะ', icon: Shirt },
    { type: 'HEAD', label: 'หมวก', icon: HardHat },
    { type: 'GLOVES', label: 'ถุงมือ', icon: Hand },
    { type: 'BOOTS', label: 'รองเท้า', icon: Footprints },
    { type: 'OFFHAND', label: 'มือรอง', icon: Shield },
    { type: 'ACCESSORY', label: 'เครื่องประดับ', icon: Gem },
  ];

  const getEquippedInSlot = (slotType: string) => equippedItems.find(ei => (ei.item.slot || ei.item.type) === slotType);

  const equippedEffects = Array.from(new Set(equippedItems.flatMap(si => si.item.effects || [])));
  const setCounts = equippedItems.reduce((acc, si) => {
    if (si.item.setId) {
      acc[si.item.setId] = (acc[si.item.setId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const effectiveJobKey = jobClass
    ? resolveEffectiveJobKey({
        jobClass,
        jobTier,
        advanceClass,
      })
    : null;
  const jobMults = effectiveJobKey
    ? getStatMultipliers(effectiveJobKey, jobTier as JobTier)
    : null;

  const filteredItems = unequippedItems.filter(si => {
    if (activeTab === 'equipment') return si.item.type !== 'CONSUMABLE';
    if (activeTab === 'consumable') return si.item.type === 'CONSUMABLE';
    return true;
  });

  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Inventory Hub</p>
            <h3 className="mt-1 text-xl font-black text-slate-800">คลังอุปกรณ์และพลังเสริม</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              จัดการอุปกรณ์ สเตตัส และเอฟเฟกต์ให้พร้อมสำหรับการต่อสู้และการฟาร์ม
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-600">
            Build & Equip
          </div>
        </div>
      </div>
      {/* ===== Equipment Dashboard ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

          {/* Col 1 — Stats */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />สเตตัสโบนัสรวม
              </h3>
              {jobClass && (
                <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" />{jobTier !== "BASE" && advanceClass ? advanceClass : jobClass}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1">
              <StatSummaryItem icon={<Heart className="w-3.5 h-3.5" />} label="HP" baseValue={baseSnapshot.hp} bonusValue={fullCombat.hp - baseSnapshot.hp} color="rose" multiplier={jobMults?.hp} onClick={() => setStatInfoKey("HP")} />
              <StatSummaryItem icon={<Sword className="w-3.5 h-3.5" />} label="ATK" baseValue={baseSnapshot.atk} bonusValue={fullCombat.atk - baseSnapshot.atk} color="amber" multiplier={jobMults?.atk} onClick={() => setStatInfoKey("ATK")} />
              <StatSummaryItem icon={<Shield className="w-3.5 h-3.5" />} label="DEF" baseValue={baseSnapshot.def} bonusValue={fullCombat.def - baseSnapshot.def} color="indigo" multiplier={jobMults?.def} onClick={() => setStatInfoKey("DEF")} />
              <StatSummaryItem icon={<Zap className="w-3.5 h-3.5" />} label="SPD" baseValue={baseSnapshot.spd} bonusValue={fullCombat.spd - baseSnapshot.spd} color="emerald" multiplier={jobMults?.spd} onClick={() => setStatInfoKey("SPD")} />
              <StatSummaryItem icon={<span className="text-[10px] font-black">%</span>} label="CRIT" baseValue={Math.round(baseSnapshot.crit * 100) + '%'} bonusValue={Math.round((fullCombat.crit - baseSnapshot.crit) * 100) + '%'} color="orange" multiplier={jobMults?.crit} onClick={() => setStatInfoKey("CRIT")} />
              <StatSummaryItem icon={<Star className="w-3.5 h-3.5" />} label="LUK" baseValue={Math.round(baseSnapshot.luck * 100) + '%'} bonusValue={Math.round((fullCombat.luck - baseSnapshot.luck) * 100) + '%'} color="yellow" multiplier={jobMults?.luck} onClick={() => setStatInfoKey("LUK")} />
              <StatSummaryItem icon={<Zap className="w-3.5 h-3.5" />} label="MAG" baseValue={baseSnapshot.mag} bonusValue={fullCombat.mag - baseSnapshot.mag} color="indigo" multiplier={jobMults?.mag} onClick={() => setStatInfoKey("MAG")} />
              <StatSummaryItem icon={<span className="text-[10px] font-black">💧</span>} label="MP" baseValue={baseSnapshot.maxMp} bonusValue={fullCombat.maxMp - baseSnapshot.maxMp} color="indigo" multiplier={jobMults?.mp} onClick={() => setStatInfoKey("MP")} />
              <StatSummaryItem icon={<Coins className="w-3.5 h-3.5" />} label="GOLD" baseValue={`${IDLE_GOLD_BOSS_DISPLAY_BASE_PERCENT}%`} bonusValue={`${goldBonusTotalPct}%`} color="amber" onClick={() => setStatInfoKey("GOLD")} />
              <StatSummaryItem icon={<Zap className="w-3.5 h-3.5" />} label="BOSS" baseValue={`${IDLE_GOLD_BOSS_DISPLAY_BASE_PERCENT}%`} bonusValue={`${bossBonusTotalPct}%`} color="rose" onClick={() => setStatInfoKey("BOSS")} />
            </div>
          </div>

          {/* Col 2 — Equipment Doll */}
          <div className="p-5">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 h-full flex flex-col items-center justify-center relative overflow-hidden min-h-[340px]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.04),transparent_70%)] pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-60 bg-amber-100/30 rounded-[3rem] blur-3xl pointer-events-none" />
              <div className="grid grid-cols-3 gap-x-8 gap-y-7 relative z-10 w-full max-w-[260px]">
                {/* Left col */}
                <div className="flex flex-col gap-7 justify-center">
                  {[SLOTS[2], SLOTS[1], SLOTS[3]].map((slot) => {
                    const equipped = getEquippedInSlot(slot.type);
                    const Icon = slot.icon;
                    return (
                      <div key={slot.type} className="flex justify-end">
                        <div onClick={() => equipped && setSelectedEquippedItem(equipped)}
                          title={equipped ? equipped.item.name : slot.label}
                          className={`w-13 h-13 w-[52px] h-[52px] shrink-0 rounded-xl border-2 flex items-center justify-center text-3xl transition-all relative bg-white ${equipped ? 'border-amber-500/80 shadow-[0_0_12px_rgba(251,191,36,0.2)] cursor-pointer hover:border-amber-400' : 'border-dashed border-slate-300'}`}>
                          {equipped ? (
                            <div className="relative w-full h-full flex items-center justify-center">{equipped.item.image}
                              {equipped.enhancementLevel > 0 && <div className="absolute -top-1 -left-1 bg-amber-500 text-white text-[8px] font-black px-1 py-0.5 rounded z-20">+{equipped.enhancementLevel}</div>}
                            </div>
                          ) : <Icon className="w-5 h-5 opacity-20 shrink-0 text-slate-500" />}
                          {equipped && <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center z-20"><Check className="w-2.5 h-2.5 text-white stroke-[3]" /></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Center col — boots */}
                <div className="flex justify-center items-end">
                  {[SLOTS[4]].map((slot) => {
                    const equipped = getEquippedInSlot(slot.type);
                    const Icon = slot.icon;
                    return (
                      <div key={slot.type} className="flex flex-col items-center gap-1.5">
                        <div onClick={() => equipped && setSelectedEquippedItem(equipped)}
                          title={equipped ? equipped.item.name : slot.label}
                          className={`w-[52px] h-[52px] shrink-0 rounded-xl border-2 flex items-center justify-center text-3xl transition-all relative bg-white ${equipped ? 'border-amber-500/80 shadow-[0_0_12px_rgba(251,191,36,0.2)] cursor-pointer hover:border-amber-400' : 'border-dashed border-slate-300'}`}>
                          {equipped ? (
                            <div className="relative w-full h-full flex items-center justify-center">{equipped.item.image}
                              {equipped.enhancementLevel > 0 && <div className="absolute -top-1 -left-1 bg-amber-500 text-white text-[8px] font-black px-1 py-0.5 rounded z-20">+{equipped.enhancementLevel}</div>}
                            </div>
                          ) : <Icon className="w-5 h-5 opacity-20 shrink-0 text-slate-500" />}
                          {equipped && <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center z-20"><Check className="w-2.5 h-2.5 text-white stroke-[3]" /></div>}
                        </div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{slot.label}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Right col */}
                <div className="flex flex-col gap-7 justify-center">
                  {[SLOTS[5], SLOTS[0], SLOTS[6]].map((slot) => {
                    const equipped = getEquippedInSlot(slot.type);
                    const Icon = slot.icon;
                    return (
                      <div key={slot.type} className="flex justify-start">
                        <div onClick={() => equipped && setSelectedEquippedItem(equipped)}
                          title={equipped ? equipped.item.name : slot.label}
                          className={`w-[52px] h-[52px] shrink-0 rounded-xl border-2 flex items-center justify-center text-3xl transition-all relative bg-white ${equipped ? 'border-amber-500/80 shadow-[0_0_12px_rgba(251,191,36,0.2)] cursor-pointer hover:border-amber-400' : 'border-dashed border-slate-300'}`}>
                          {equipped ? (
                            <div className="relative w-full h-full flex items-center justify-center">{equipped.item.image}
                              {equipped.enhancementLevel > 0 && <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black px-1 py-0.5 rounded z-20">+{equipped.enhancementLevel}</div>}
                            </div>
                          ) : <Icon className="w-5 h-5 opacity-20 shrink-0 text-slate-500" />}
                          {equipped && <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center z-20"><Check className="w-2.5 h-2.5 text-white stroke-[3]" /></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {equippedItems.length === 0 && (
                <p className="absolute bottom-4 text-[10px] font-black text-slate-400 tracking-widest uppercase">ยังไม่ได้สวมอุปกรณ์</p>
              )}
            </div>
          </div>

          {/* Col 3 — Effects & Sets */}
          <div className="p-5 space-y-3">
            <h3 className="font-black text-slate-700 text-sm flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />พลังแฝงและเซ็ต
            </h3>
            {equippedEffects.length === 0 && Object.keys(setCounts).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <span className="text-2xl mb-1">🧩</span>
                <p className="text-[11px] font-bold text-slate-500">ยังไม่มีพลังแฝง</p>
                <p className="text-[10px] text-slate-400">สวมอุปกรณ์เพื่อปลดล็อค</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {Object.entries(setCounts).map(([setId, count]) => {
                  const maxP = getSetDisplayMaxPieces(setId);
                  const reached = getReachedSetMilestones(setId, count);
                  const next = getNextSetMilestone(setId, count);
                  const denom = next?.at ?? maxP;
                  const active = reached.length > 0;
                  return (
                    <div key={setId} className={`p-2.5 rounded-xl border flex flex-col gap-1 ${active ? 'bg-amber-950/40 border-amber-700/50' : 'bg-slate-900/40 border-slate-700 opacity-60'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${active ? 'bg-amber-900/70 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>🧩 {setId.replace('_', ' ')}</span>
                        <span className={`text-[10px] font-black ${active ? 'text-amber-400' : 'text-slate-500'}`}>{count}/{denom}ชิ้น</span>
                      </div>
                      {reached.map((m) => <p key={m.at} className="text-[10px] font-bold text-amber-400 pl-1">✓ {m.at}ชิ้น: {m.labelTh}</p>)}
                      {next && <p className="text-[10px] font-bold text-slate-500 pl-1">→ {next.at}ชิ้น: {next.labelTh}</p>}
                      {setCopy(setId).stats && <p className="text-[10px] font-black text-amber-500/80 pl-1">{setCopy(setId).stats}</p>}
                    </div>
                  );
                })}
                {equippedEffects.map((effect) => (
                  <div key={effect as string} className="p-2.5 bg-slate-900/40 border border-slate-700/50 rounded-xl flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md w-fit">✨ {String(effect).replace('_', ' ')}</span>
                    <p className="text-[10px] font-bold text-slate-400 line-clamp-2">{effectCopy(effect as string).desc}</p>
                    <p className="text-[10px] font-black text-amber-400">{effectCopy(effect as string).stats}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Item Bag ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header + Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base tracking-tight">กระเป๋าสัมภาระ</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unequippedItems.length} ชิ้น</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {([
              { key: 'all', label: 'ทั้งหมด', count: unequippedItems.length },
              { key: 'equipment', label: 'อุปกรณ์', count: unequippedItems.filter(s => s.item.type !== 'CONSUMABLE').length },
              { key: 'consumable', label: 'ของใช้', count: unequippedItems.filter(s => s.item.type === 'CONSUMABLE').length },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${activeTab === tab.key ? 'bg-amber-600/40 text-white' : 'bg-white text-slate-500'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="p-4">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-500 text-sm">ไม่มีไอเทมในส่วนนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredItems.map((si, idx) => {
                const isConsumable = si.item.type === 'CONSUMABLE';

                if (isConsumable) {
                  return (
                    <motion.div key={si.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }}>
                      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 hover:border-emerald-300 flex flex-col transition-all group shadow-sm hover:shadow-md">
                        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                        <div className="absolute top-2.5 right-2.5 z-10 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">×{si.quantity}</div>
                        <div className="p-3 flex flex-col items-center flex-1">
                          <div className="w-14 h-14 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-4xl mb-2 group-hover:scale-105 transition-transform shadow-sm">{si.item.image}</div>
                          <h3 className="font-black text-slate-800 text-[11px] text-center mb-1.5 leading-tight">{si.item.name}</h3>
                          <div className="flex flex-col gap-0.5 w-full mb-2">
                            {(si.item.manaRestore ?? 0) > 0 && <span className="text-[9px] font-black bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-center">💧 Mana +{si.item.manaRestore}</span>}
                            {((si.item.hpRestorePercent ?? 0) > 0) && <span className="text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-center">❤️ HP +{Math.round((si.item.hpRestorePercent ?? 0) * 100)}%</span>}
                            {(si.item.staminaRestore ?? 0) > 0 && <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-center">⚡ ST +{si.item.staminaRestore}</span>}
                            {si.item.isPhoenix && <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-center">🪶 Revive 50%</span>}
                            {si.item.isTransmute && <span className="text-[9px] font-black bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-full text-center">🪨 Transmute</span>}
                            {(si.item.buffAtk ?? 0) > 0 && <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-center">⚔️ ATK +{Math.round((si.item.buffAtk ?? 0) * 100)}%</span>}
                          </div>
                        </div>
                        <div className="px-3 pb-3 space-y-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { (si as any)._useQty = Math.max(1, ((si as any)._useQty || 1) - 1); setItems([...items]); }} className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-600 font-black flex items-center justify-center transition-colors hover:bg-slate-50">-</button>
                            <input type="number" min={1} max={si.quantity} value={(si as any)._useQty || 1}
                              onChange={(e) => { const val = Math.max(1, Math.min(si.quantity, parseInt(e.target.value) || 1)); (si as any)._useQty = val; setItems([...items]); }}
                              className="w-10 h-6 text-center text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <button onClick={() => { (si as any)._useQty = Math.min(si.quantity, ((si as any)._useQty || 1) + 1); setItems([...items]); }} className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-600 font-black flex items-center justify-center transition-colors hover:bg-slate-50">+</button>
                          </div>
                          <button onClick={() => handleUseItem(si, (si as any)._useQty || 1)} disabled={usingId === si.id || si.quantity <= 0}
                            className="w-full h-8 rounded-xl font-black text-[11px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm">
                            {usingId === si.id ? <span className="animate-pulse text-[10px]">กำลังดื่ม...</span> : <>🧪 ดื่มยา</>}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                // Equipment card
                const tc = (() => {
                  switch (si.item.tier) {
                    case 'LEGENDARY': return { border: 'border-amber-200', bg: 'bg-amber-50', glow: 'shadow-sm hover:shadow-md', badge: 'bg-amber-100 text-amber-700 border-amber-200', accent: 'text-amber-600', strip: 'from-amber-400 via-yellow-400 to-orange-400', iconBg: 'bg-white border-amber-100' };
                    case 'EPIC': return { border: 'border-violet-200', bg: 'bg-violet-50', glow: 'shadow-sm hover:shadow-md', badge: 'bg-violet-100 text-violet-700 border-violet-200', accent: 'text-violet-600', strip: 'from-purple-400 to-violet-500', iconBg: 'bg-white border-violet-100' };
                    case 'RARE': return { border: 'border-sky-200', bg: 'bg-sky-50', glow: 'shadow-sm hover:shadow-md', badge: 'bg-sky-100 text-sky-700 border-sky-200', accent: 'text-sky-600', strip: 'from-blue-400 to-sky-500', iconBg: 'bg-white border-sky-100' };
                    default: return { border: 'border-slate-200', bg: 'bg-white', glow: 'shadow-sm hover:shadow-md', badge: 'bg-slate-100 text-slate-600 border-slate-200', accent: 'text-slate-600', strip: 'from-slate-400 to-slate-500', iconBg: 'bg-slate-50 border-slate-100' };
                  }
                })();
                const enh = 1 + si.enhancementLevel * 0.1;
                const keyStats = ([
                  si.item.baseHp! > 0 && { icon: '❤️', label: 'HP', val: `+${Math.floor(si.item.baseHp! * enh)}`, color: 'text-rose-400' },
                  si.item.baseAtk! > 0 && { icon: '⚔️', label: 'ATK', val: `+${Math.floor(si.item.baseAtk! * enh)}`, color: 'text-amber-400' },
                  si.item.baseDef! > 0 && { icon: '🛡️', label: 'DEF', val: `+${Math.floor(si.item.baseDef! * enh)}`, color: 'text-indigo-400' },
                  si.item.baseSpd > 0 && { icon: '⚡', label: 'SPD', val: `+${Math.floor(si.item.baseSpd * enh)}`, color: 'text-emerald-400' },
                  si.item.baseCrit > 0 && { icon: '🎯', label: 'CRT', val: `+${Math.round(si.item.baseCrit * enh * 100)}%`, color: 'text-orange-400' },
                  si.item.baseMag! > 0 && { icon: '✨', label: 'MAG', val: `+${Math.floor(si.item.baseMag! * enh)}`, color: 'text-purple-400' },
                  si.item.goldMultiplier > 0 && { icon: '🪙', label: 'GOLD', val: `+${Math.round(si.item.goldMultiplier * enh * 100)}%`, color: 'text-yellow-400' },
                  si.item.bossDamageMultiplier > 0 && { icon: '🔥', label: 'BOSS', val: `+${Math.round(si.item.bossDamageMultiplier * enh * 100)}%`, color: 'text-rose-400' },
                ] as ({ icon: string; label: string; val: string; color: string } | false)[]).filter(Boolean).slice(0, 4) as { icon: string; label: string; val: string; color: string }[];

                return (
                  <motion.div key={si.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }}>
                    <div className={`relative overflow-hidden rounded-2xl border-2 ${tc.border} ${tc.bg} ${tc.glow} flex flex-col transition-all group`}>
                      <div className={`h-1 w-full bg-gradient-to-r ${tc.strip}`} />
                      {si.enhancementLevel > 0 && (
                        <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow">+{si.enhancementLevel}</div>
                      )}
                      <div className="p-3 flex flex-col items-center flex-1">
                        <div className={`w-14 h-14 rounded-xl border ${tc.iconBg} flex items-center justify-center text-4xl mb-2 group-hover:scale-105 transition-transform`}>{si.item.image}</div>
                        <h3 className="font-black text-slate-800 text-[11px] text-center mb-1 leading-tight">{si.item.name}</h3>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${tc.badge} mb-2`}>{si.item.tier} · {si.item.slot || si.item.type}</span>
                        <div className="w-full space-y-0.5 mb-1.5">
                          {keyStats.map(stat => (
                            <div key={stat.label} className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400">{stat.icon} {stat.label}</span>
                              <span className={`font-black ${stat.color}`}>{stat.val}</span>
                            </div>
                          ))}
                        </div>
                        {(si.item.effects?.length || si.item.setId) ? (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {si.item.effects?.slice(0, 2).map(e => (
                              <span key={e as string} onClick={() => setSelectedEffect({ name: e as string, type: 'effect' })}
                                className="text-[8px] bg-slate-700/60 text-slate-400 border border-slate-600/60 px-1.5 py-0.5 rounded-md font-bold cursor-pointer hover:text-slate-200">
                                ✨ {String(e).replace('_', ' ')}
                              </span>
                            ))}
                            {si.item.setId && (
                              <span onClick={() => setSelectedEffect({ name: si.item.setId as string, type: 'set' })}
                                className="text-[8px] bg-indigo-900/50 text-indigo-400 border border-indigo-700/50 px-1.5 py-0.5 rounded-md font-bold cursor-pointer hover:text-indigo-300">
                                🧩 {si.item.setId.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div className="px-3 pb-3 space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button onClick={() => handleToggleEquip(si.id, si.isEquipped)} disabled={togglingId === si.id || enhancingId === si.id || sellingId === si.id}
                            className="h-8 rounded-xl font-black text-[10px] bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-600/30 transition-all active:scale-95 disabled:opacity-40">
                            {togglingId === si.id ? '...' : (si.isEquipped ? '✗ ถอดออก' : '🛡️ สวมใส่')}
                          </button>
                          <button onClick={() => setSelectedItemForEnhance(si)} disabled={enhancingId === si.id || togglingId === si.id || sellingId === si.id}
                            className="h-8 rounded-xl font-black text-[10px] bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-600/30 transition-all active:scale-95 disabled:opacity-40">
                            ⚡ ตีบวก
                          </button>
                        </div>
                        <button onClick={() => handleSellItem(si)} disabled={sellingId === si.id || enhancingId === si.id || togglingId === si.id}
                          className="w-full h-7 rounded-lg font-black text-[9px] text-slate-600 hover:text-amber-400 hover:bg-amber-900/20 transition-all flex items-center justify-center gap-1">
                          💰 ขาย ({Math.floor(si.item.price * 0.5 * (1 + si.enhancementLevel * 0.1)).toLocaleString()} ทอง)
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* EnhancementDialog */}
      {selectedItemForEnhance && (
        <EnhancementDialog
          isOpen={!!selectedItemForEnhance}
          onClose={() => setSelectedItemForEnhance(null)}
          item={(() => {
            const currentItem = items.find(i => i.id === selectedItemForEnhance.id) || selectedItemForEnhance;
            return { id: currentItem.id, name: currentItem.item.name, image: currentItem.item.image, price: currentItem.item.price, tier: currentItem.item.tier, enhancementLevel: currentItem.enhancementLevel, goldMultiplier: currentItem.item.goldMultiplier, bossDamageMultiplier: currentItem.item.bossDamageMultiplier };
          })()}
          currentGold={gold}
          currentPoints={points}
          onEnhance={() => handleEnhance(items.find(i => i.id === selectedItemForEnhance.id) || selectedItemForEnhance)}
        />
      )}
      <AlertDialog open={!!sellConfirmItem} onOpenChange={(open) => { if (!open) setSellConfirmItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการขาย</AlertDialogTitle>
            <AlertDialogDescription>
              {sellConfirmItem && (
                <>
                  ต้องการขาย {sellConfirmItem.item.name} ในราคา{" "}
                  {Math.floor(sellConfirmItem.item.price * 0.5 * (1 + sellConfirmItem.enhancementLevel * 0.1)).toLocaleString()} ทอง?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSell}>ยืนยัน</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Stat Info Modal */}
      <AnimatePresence>
        {statInfoKey && (() => {
          const info = STAT_INFO[statInfoKey];
          if (!info) return null;
          const borderColor: Record<string, string> = {
            rose: "border-rose-800/60", amber: "border-amber-800/60", indigo: "border-indigo-800/60",
            emerald: "border-emerald-800/60", orange: "border-orange-800/60", yellow: "border-yellow-800/60",
          };
          const glowColor: Record<string, string> = {
            rose: "rgba(239,68,68,0.15)", amber: "rgba(251,191,36,0.15)", indigo: "rgba(99,102,241,0.15)",
            emerald: "rgba(52,211,153,0.15)", orange: "rgba(251,146,60,0.15)", yellow: "rgba(234,179,8,0.15)",
          };
          const titleColor: Record<string, string> = {
            rose: "text-rose-300", amber: "text-amber-300", indigo: "text-indigo-300",
            emerald: "text-emerald-300", orange: "text-orange-300", yellow: "text-yellow-300",
          };
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                 onClick={() => setStatInfoKey(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={`bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden border ${borderColor[info.color]}`}
              >
                <div className="absolute inset-0 pointer-events-none"
                     style={{ background: `radial-gradient(ellipse at top, ${glowColor[info.color]}, transparent 60%)` }} />
                <button onClick={() => setStatInfoKey(null)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 z-10">✕</button>

                <div className="flex items-center gap-3 mb-5 relative">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                    {info.emoji}
                  </div>
                  <div>
                    <h3 className={`font-black text-xl tracking-tight ${titleColor[info.color]}`}>{info.title}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">สเตตัสโบนัส</p>
                  </div>
                </div>

                <div className="space-y-3 relative">
                  <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">📖 ทำอะไร?</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{info.desc}</p>
                  </div>

                  <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/40">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">🔢 สูตรคำนวณ</h4>
                    <code className="text-xs text-amber-300 bg-slate-900/80 px-2 py-1 rounded-lg font-black block">{info.formula}</code>
                  </div>

                  <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/40">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">💡 เคล็ดลับ</h4>
                    <ul className="space-y-1.5">
                      {info.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 shrink-0">▸</span>
                          <span className="text-xs text-slate-300 leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Button onClick={() => setStatInfoKey(null)}
                  className="w-full mt-5 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl h-11 font-black relative">
                  เข้าใจแล้ว!
                </Button>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Equipped Item Details Modal */}
      <AnimatePresence>
        {selectedEquippedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
               onClick={() => setSelectedEquippedItem(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden border-t-[8px] ${
                  selectedEquippedItem.item.tier === 'LEGENDARY' ? 'border-amber-400' :
                  selectedEquippedItem.item.tier === 'EPIC' ? 'border-purple-400' :
                  selectedEquippedItem.item.tier === 'RARE' ? 'border-blue-400' :
                  'border-slate-300'
              }`}
            >
              <button 
                onClick={() => setSelectedEquippedItem(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
              
              <div className="flex flex-col items-center mb-6 mt-2">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-6xl mb-4 shadow-inner ${getTierBg(selectedEquippedItem.item.tier)}`}>
                  {selectedEquippedItem.item.image}
                </div>
                <h3 className="font-black text-2xl text-slate-800 tracking-tight text-center">
                  {selectedEquippedItem.item.name} {selectedEquippedItem.enhancementLevel > 0 && <span className="text-indigo-600">+{selectedEquippedItem.enhancementLevel}</span>}
                </h3>
                <span className={`text-[10px] font-black px-3 py-1 bg-slate-100 rounded-full border border-slate-200 mt-2 uppercase tracking-widest text-slate-500`}>
                  {selectedEquippedItem.item.tier} • {selectedEquippedItem.item.type}
                </span>
              </div>

              <div className="space-y-4">
                <div className="w-full bg-slate-50/50 rounded-2xl p-4 text-xs font-bold text-slate-600 flex flex-col gap-2 h-auto border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="leading-tight text-slate-800 uppercase tracking-widest font-black">Stats & Effects</span>
                    </div>
                    {selectedEquippedItem.item.baseHp! > 0 && (
                        <div className="flex justify-between items-center text-rose-500">
                            <span>❤️ HP</span>
                            <span className="font-black">+{Math.floor(selectedEquippedItem.item.baseHp! * (1 + selectedEquippedItem.enhancementLevel * 0.1))}</span>
                        </div>
                    )}
                    {selectedEquippedItem.item.baseAtk! > 0 && (
                        <div className="flex justify-between items-center text-amber-600">
                            <span>⚔️ ATK</span>
                            <span className="font-black">+{Math.floor(selectedEquippedItem.item.baseAtk! * (1 + selectedEquippedItem.enhancementLevel * 0.1))}</span>
                        </div>
                    )}
                    {selectedEquippedItem.item.baseDef! > 0 && (
                        <div className="flex justify-between items-center text-indigo-500">
                            <span>🛡️ DEF</span>
                            <span className="font-black">+{Math.floor(selectedEquippedItem.item.baseDef! * (1 + selectedEquippedItem.enhancementLevel * 0.1))}</span>
                        </div>
                    )}
                    {selectedEquippedItem.item.goldMultiplier > 0 && (
                        <div className="flex justify-between items-center text-amber-600">
                            <span>💰 Gold Boost</span>
                            <span className="font-black">+{Math.round(selectedEquippedItem.item.goldMultiplier * (1 + selectedEquippedItem.enhancementLevel * 0.1) * 100)}%</span>
                        </div>
                    )}
                    {selectedEquippedItem.item.bossDamageMultiplier > 0 && (
                        <div className="flex justify-between items-center text-rose-600">
                            <span>🔥 Boss Damage</span>
                            <span className="font-black">+{Math.round(selectedEquippedItem.item.bossDamageMultiplier * (1 + selectedEquippedItem.enhancementLevel * 0.1) * 100)}%</span>
                        </div>
                    )}
                    {selectedEquippedItem.item.baseSpd > 0 && (
                        <div className="flex justify-between items-center text-emerald-600">
                            <span>⚡ Speed</span>
                            <span className="font-black">+{Math.floor(selectedEquippedItem.item.baseSpd * (1 + selectedEquippedItem.enhancementLevel * 0.1))}</span>
                        </div>
                    )}
                    {selectedEquippedItem.item.baseCrit > 0 && (
                        <div className="flex justify-between items-center text-orange-600">
                            <span>🎯 Critical Rate</span>
                            <span className="font-black">+{Math.round(selectedEquippedItem.item.baseCrit * (1 + selectedEquippedItem.enhancementLevel * 0.1) * 100)}%</span>
                        </div>
                    )}
                    {selectedEquippedItem.item.baseLuck! > 0 && (
                        <div className="flex justify-between items-center text-yellow-600">
                            <span>🍀 Luck</span>
                            <span className="font-black">+{Math.round(selectedEquippedItem.item.baseLuck! * (1 + selectedEquippedItem.enhancementLevel * 0.1) * 100)}%</span>
                        </div>
                    )}
                    {selectedEquippedItem.item.xpMultiplier && selectedEquippedItem.item.xpMultiplier > 0 ? (
                        <div className="flex justify-between items-center text-pink-600">
                            <span>🌟 EXP Boost</span>
                            <span className="font-black">+{Math.round(selectedEquippedItem.item.xpMultiplier * (1 + selectedEquippedItem.enhancementLevel * 0.1) * 100)}%</span>
                        </div>
                    ) : null}
                    
                    {/* Effects and Sets */}
                    {(selectedEquippedItem.item.effects?.length || selectedEquippedItem.item.setId) && (
                        <div className="mt-2 pt-3 border-t border-slate-100 space-y-2">
                             {selectedEquippedItem.item.effects?.map(effect => (
                                <div key={effect as string} className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-black uppercase text-slate-700">✨ {typeof effect === 'string' ? effect.replace('_', ' ') : effect}</span>
                                    <span className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{effectCopy(effect as string).desc}</span>
                                    <span className="text-[10px] text-indigo-600 font-black">{effectCopy(effect as string).stats}</span>
                                </div>
                             ))}
                             {selectedEquippedItem.item.setId && (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-black uppercase text-indigo-600">🧩 {selectedEquippedItem.item.setId.replace('_', ' ')}</span>
                                    <span className="text-[10px] text-indigo-500/80 line-clamp-2 leading-relaxed">{setCopy(selectedEquippedItem.item.setId).desc}</span>
                                    <span className="text-[10px] text-indigo-600 font-black">{setCopy(selectedEquippedItem.item.setId).stats}</span>
                                </div>
                             )}
                        </div>
                    )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-8">
                  <Button 
                    onClick={() => {
                        handleToggleEquip(selectedEquippedItem.id, true);
                        setSelectedEquippedItem(null);
                    }}
                    variant="outline"
                    className="flex-1 bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100 hover:text-rose-600 rounded-2xl h-12 font-black"
                  >
                    ถอดอุปกรณ์ (Unequip)
                  </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function computeStatTotal(base: number | string, bonus: number | string): string {
    if (typeof base === "number" && typeof bonus === "number") {
        return (base + bonus).toLocaleString();
    }
    if (typeof base === "string" && typeof bonus === "string" && base.endsWith("%") && bonus.endsWith("%")) {
        const total = parseFloat(base) + parseFloat(bonus);
        return `${total}%`;
    }
    return `${base}+${bonus}`;
}

function StatSummaryItem({ icon, label, baseValue, bonusValue, color, multiplier, onClick }: {
    icon: any;
    label: string;
    baseValue: number | string;
    bonusValue: number | string;
    color: string;
    multiplier?: number;
    onClick?: () => void;
}) {
    const iconColors: any = {
        rose:    "text-rose-400",
        amber:   "text-amber-400",
        indigo:  "text-indigo-400",
        emerald: "text-emerald-400",
        orange:  "text-orange-400",
        yellow:  "text-yellow-400"
    };
    const total = computeStatTotal(baseValue, bonusValue);

    return (
        <div
            onClick={onClick}
            className={`px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3 transition-all hover:border-amber-800/50 ${onClick ? "cursor-pointer hover:bg-slate-800/60 active:scale-[0.98]" : ""}`}
        >
            {/* Left: icon + label */}
            <div className={`flex items-center gap-1.5 shrink-0 min-w-[52px] ${iconColors[color] || iconColors.indigo}`}>
                {icon}
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                {onClick && <Info className="w-2.5 h-2.5 opacity-50 ml-0.5" />}
            </div>

            {/* Right: total + breakdown + job mult */}
            <div className="flex items-center gap-3 ml-auto">
                {/* Breakdown: base + bonus */}
                <div className="flex items-center gap-0.5 text-[10px]">
                    <span className="text-slate-500 font-semibold">{baseValue}</span>
                    <span className="text-slate-700 mx-0.5">+</span>
                    <span className="text-slate-300 font-bold">{bonusValue}</span>
                </div>

                {/* Separator */}
                <span className="text-slate-700 text-[10px]">=</span>

                {/* Total */}
                <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-amber-300 leading-none">{total}</span>
                    {multiplier && multiplier !== 1 && (
                        <span className="text-[8px] text-slate-600 italic leading-none mt-0.5">Job ×{multiplier.toFixed(1)}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
