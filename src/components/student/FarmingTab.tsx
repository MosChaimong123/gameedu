"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Zap, Target, Trophy, Heart, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { SoloMonster } from "@/lib/game/farming-system";
import {
  buildGlobalSkillMap,
  getMergedClassDef,
  resolveEffectiveJobKey,
  type Skill,
} from "@/lib/game/job-system";

interface FarmingTabProps {
  code: string;
  studentId: string;
  stamina: number;
  mana: number;
  level: number;
  jobClass: string | null;
  jobTier?: string;
  advanceClass?: string | null;
  jobSkills: string[];
  onUpdateStudent: (data: any) => void;
}

const CLASS_ICONS: Record<string, string> = {
  NOVICE: "🧑‍🎓", WARRIOR: "⚔️", MAGE: "🔮", RANGER: "🏹", HEALER: "✨", ROGUE: "🗡️",
  KNIGHT: "🛡️", BERSERKER: "🪓", ARCHMAGE: "🌟", WARLOCK: "💜", SNIPER: "🎯",
  BEASTMASTER: "🐾", SAINT: "🌿", DRUID: "☘️", ASSASSIN: "🌑", DUELIST: "🤺",
  PALADIN: "⚜️", GUARDIAN: "🏰", WARLORD: "👑", "DEATH KNIGHT": "💀",
  "GRAND WIZARD": "🌈", ELEMENTALIST: "🌪️", LICH: "☠️", "SHADOW MAGE": "🌑",
  HAWKEYE: "👁️", DEADEYE: "🎯", "BEAST KING": "🦁", TAMER: "🦊",
  ARCHBISHOP: "✝️", "DIVINE HERALD": "📯", "ELDER DRUID": "🌳", "NATURE WARDEN": "🌿",
  "SHADOW LORD": "👾", PHANTOM: "👻", "BLADE MASTER": "⚡", "SWORD SAINT": "🗡️",
};

const CLASS_COLORS: Record<string, string> = {
  WARRIOR: "from-red-500 to-orange-600", KNIGHT: "from-slate-400 to-blue-600",
  BERSERKER: "from-red-600 to-rose-800", MAGE: "from-blue-500 to-indigo-700",
  ARCHMAGE: "from-indigo-500 to-purple-700", WARLOCK: "from-purple-600 to-rose-800",
  RANGER: "from-green-500 to-emerald-700", SNIPER: "from-teal-500 to-cyan-700",
  BEASTMASTER: "from-amber-500 to-orange-700", HEALER: "from-emerald-400 to-teal-600",
  SAINT: "from-yellow-400 to-amber-600", DRUID: "from-green-600 to-lime-800",
  ROGUE: "from-slate-500 to-zinc-700", ASSASSIN: "from-zinc-700 to-slate-900",
  DUELIST: "from-rose-500 to-pink-700", "DEATH KNIGHT": "from-gray-700 to-zinc-900",
  PALADIN: "from-yellow-500 to-amber-600", LICH: "from-purple-800 to-gray-900",
  NOVICE: "from-slate-400 to-slate-600",
};

export function FarmingTab({
  code,
  studentId,
  stamina,
  mana,
  level,
  jobClass,
  jobTier = "BASE",
  advanceClass = null,
  jobSkills,
  onUpdateStudent,
}: FarmingTabProps) {
  const [farming, setFarming] = useState<{ currentWave: number; monster: SoloMonster; playerMaxMp?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAttacking, setIsAttacking] = useState(false);
  const [shake, setShake] = useState(false);
  // damage popups
  const [damagePopup, setDamagePopup] = useState<{ damage: number; isCrit?: boolean; key: number } | null>(null);
  const [monsterDmgPopup, setMonsterDmgPopup] = useState<{ damage: number; key: number } | null>(null);
  // player stats
  const [playerHp, setPlayerHp] = useState<number | null>(null);
  const [playerMaxHp, setPlayerMaxHp] = useState<number | null>(null);
  const [playerMaxMp, setPlayerMaxMp] = useState<number | null>(null);
  const [activeEffects, setActiveEffects] = useState<{
    poison?: { turnsLeft: number };
    defBuff?: { turnsLeft: number };
    atkBuff?: { turnsLeft: number };
    atkDebuff?: { turnsLeft: number };
    critBuff?: { turnsLeft: number };
    defBreak?: { turnsLeft: number };
    slow?: { turnsLeft: number };
    stun?: { turnsLeft: number };
    regen?: { turnsLeft: number };
  } | null>(null);
  // auto & potions
  const [poisonPopup, setPoisonPopup] = useState<{ damage: number; key: number } | null>(null);
  const [isAuto, setIsAuto] = useState(false);
  const [hpPotions, setHpPotions] = useState<any[]>([]);
  const [manaPotions, setManaPotions] = useState<any[]>([]);
  const [isUsingPotion, setIsUsingPotion] = useState(false);
  const { toast } = useToast();

  const loadFarming = async () => {
    try {
      const [farmRes, invRes] = await Promise.all([
        fetch(`/api/student/${code}/farming`),
        fetch(`/api/student/inventory?studentId=${studentId}`),
      ]);
      const farmData = await farmRes.json();
      const invData = invRes.ok ? await invRes.json() : [];

      if (farmData.success) {
        setFarming(farmData.farming);
        if (farmData.farming.playerHp != null) setPlayerHp(farmData.farming.playerHp);
        if (farmData.farming.playerMaxHp != null) setPlayerMaxHp(farmData.farming.playerMaxHp);
        if (farmData.farming.playerMaxMp != null) setPlayerMaxMp(farmData.farming.playerMaxMp);
        setActiveEffects(farmData.farming.activeEffects ?? null);
      }

      if (Array.isArray(invData)) {
        const consumables = invData.filter((si: any) => si.item?.type === "CONSUMABLE" && si.quantity > 0);
        setHpPotions(consumables.filter((si: any) =>
          (si.item?.hpRestorePercent ?? 0) > 0 ||
          si.item?.isPhoenix ||
          si.item?.name?.toLowerCase().includes("hp potion") ||
          si.item?.name?.toLowerCase().includes("phoenix")
        ));
        setManaPotions(consumables.filter((si: any) => (si.item?.manaRestore ?? 0) > 0));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFarming(); }, [code]);

  const currentSkills: Skill[] = useMemo(() => {
    const eff = resolveEffectiveJobKey({ jobClass, jobTier, advanceClass });
    const classDef = getMergedClassDef(eff);
    const skillsMap = new Map<string, Skill>();
    const globalMap = buildGlobalSkillMap();
    if (jobSkills?.length) {
      jobSkills.forEach((id) => { const f = globalMap[id]; if (f) skillsMap.set(id, f); });
    }
    classDef.skills.forEach((skill) => {
      if (skill.unlockLevel <= level) skillsMap.set(skill.id, skill);
    });
    return Array.from(skillsMap.values()).sort((a, b) => a.unlockLevel - b.unlockLevel);
  }, [jobClass, jobTier, advanceClass, jobSkills, level]);

  const displayIconKey = jobTier !== "BASE" && advanceClass ? advanceClass : jobClass || "NOVICE";
  const classIcon = CLASS_ICONS[displayIconKey] || CLASS_ICONS[jobClass || "NOVICE"] || "🧑‍🎓";
  const classGradient = CLASS_COLORS[displayIconKey] || CLASS_COLORS[jobClass || "NOVICE"] || CLASS_COLORS.NOVICE;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const applyFarmResult = (data: any, isAP?: boolean) => {
    setFarming(data.farming);
    if (data.playerHp != null) setPlayerHp(data.playerHp);
    if (data.playerMaxHp != null) setPlayerMaxHp(data.playerMaxHp);
    if (data.farming?.playerMaxMp != null) setPlayerMaxMp(data.farming.playerMaxMp);
    setActiveEffects(data.activeEffects ?? null);

    if (data.damage > 0) {
      setDamagePopup({ damage: data.damage, isCrit: data.isCrit, key: Date.now() });
      setTimeout(() => setDamagePopup(null), 1200);
    }
    if (data.poisonDamage > 0) {
      setPoisonPopup({ damage: data.poisonDamage, key: Date.now() + 2 });
      setTimeout(() => setPoisonPopup(null), 1400);
    }
    if (data.monsterDamage > 0) {
      setMonsterDmgPopup({ damage: data.monsterDamage, key: Date.now() + 1 });
      setTimeout(() => setMonsterDmgPopup(null), 1200);
    }

    const resourceUpdate = isAP != null
      ? (isAP ? { stamina: data.stamina, mana: data.mana } : { mana: data.mana, stamina: data.stamina })
      : { stamina: data.stamina };
    onUpdateStudent({ ...resourceUpdate, gameStats: { gold: data.gold, xp: data.xp, level: data.newLevel, farming: data.farming } });

    if (data.playerDied) {
      setIsAuto(false);
      toast({ title: "💀 ล้มลงแล้ว!", description: `ถอยกลับไป Wave ${data.deathPenaltyWave} (−10%) · ฟื้นคืน 50% HP`, variant: "destructive" });
    }
    if (data.newEffectDescription) {
      toast({ title: data.newEffectDescription });
    }
    if (data.healAmount > 0) {
      toast({ title: "❤️ ฟื้นคืน HP", description: `+${data.healAmount.toLocaleString()}` });
    }
    if (data.isDefeated) {
      toast({ title: "มอนสเตอร์พ่ายแพ้! 🏆", description: `+${data.loot?.gold} Gold · +${data.loot?.xp} XP` });
    }
  };

  const handleAttack = async () => {
    if (stamina <= 0 || isAttacking) return;
    setIsAttacking(true);
    setShake(true);
    setTimeout(() => setShake(false), 250);
    try {
      const res = await fetch(`/api/student/${code}/farming/attack`, { method: "POST" });
      const data = await res.json();
      if (data.success) applyFarmResult(data);
      else toast({ title: data.error, variant: "destructive" });
    } finally { setIsAttacking(false); }
  };

  const handleUseSkill = async (skillId: string) => {
    if (isAttacking) return;
    const skill = currentSkills.find((s) => s.id === skillId);
    const isAP = skill?.costType === "AP";
    if (!skill || (isAP ? stamina : mana) < skill.cost) return;
    setIsAttacking(true);
    setShake(true);
    setTimeout(() => setShake(false), 250);
    try {
      const res = await fetch(`/api/student/${code}/farming/skill`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json();
      if (data.success) applyFarmResult(data, isAP);
      else toast({ title: data.error, variant: "destructive" });
    } finally { setIsAttacking(false); }
  };

  const handleUsePotion = async (si: any) => {
    if (isUsingPotion) return;
    setIsUsingPotion(true);
    try {
      const res = await fetch("/api/student/inventory/use", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentItemId: si.id, studentId }),
      });
      const data = await res.json();
      if (data.success) {
        // Update mana if mana potion
        if (data.newMana != null) onUpdateStudent({ mana: data.newMana });
        // Update playerHp immediately if HP potion used in farming
        if (data.newPlayerHp != null) setPlayerHp(data.newPlayerHp);
        if (data.newPlayerMaxHp != null) setPlayerMaxHp(data.newPlayerMaxHp);
        toast({ title: `✅ ${si.item.name}`, description: data.message });
        // Re-fetch inventory to update potion counts
        const invRes = await fetch(`/api/student/inventory?studentId=${studentId}`);
        if (invRes.ok) {
          const invData = await invRes.json();
          if (Array.isArray(invData)) {
            const consumables = invData.filter((s: any) => s.item?.type === "CONSUMABLE" && s.quantity > 0);
            setHpPotions(consumables.filter((s: any) =>
              (s.item?.hpRestorePercent ?? 0) > 0 ||
              s.item?.isPhoenix ||
              s.item?.name?.toLowerCase().includes("hp potion") ||
              s.item?.name?.toLowerCase().includes("phoenix")
            ));
            setManaPotions(consumables.filter((s: any) => (s.item?.manaRestore ?? 0) > 0));
          }
        }
      } else {
        toast({ title: data.error || "ใช้ไม่ได้", variant: "destructive" });
      }
    } finally { setIsUsingPotion(false); }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAuto && stamina > 0 && !isAttacking) {
      timer = setTimeout(handleAttack, 1000);
    } else if (stamina <= 0 && isAuto) {
      setIsAuto(false);
      toast({ title: "Stamina หมด!", description: "ระบบโจมตีอัตโนมัติหยุดทำงาน", variant: "destructive" });
    }
    return () => clearTimeout(timer);
  }, [isAuto, stamina, isAttacking]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-bounce">⚔️</div>
        <p className="text-slate-500 font-bold text-sm">กำลังตามล่ามอนสเตอร์...</p>
      </div>
    </div>
  );
  if (!farming) return <div className="p-8 text-center text-slate-400 font-bold">ไม่มีมอนสเตอร์ให้ฟาร์ม</div>;

  const { monster, currentWave } = farming;
  const monsterHpPct = Math.max(0, (monster.hp / monster.maxHp) * 100);
  const playerHpPct = playerHp != null && playerMaxHp != null ? Math.max(0, (playerHp / playerMaxHp) * 100) : 100;
  const playerMpPct = playerMaxMp != null && playerMaxMp > 0 ? Math.max(0, (mana / playerMaxMp) * 100) : Math.min(100, mana);
  const isDangerous = playerHpPct < 30;

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-black text-sm flex items-center gap-1.5 shadow">
            <Target className="w-3.5 h-3.5 text-rose-400" />
            WAVE {currentWave}
          </div>
          <span className="text-lg font-black text-slate-700 italic uppercase">{monster.name}</span>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAuto(!isAuto)}
          className={`rounded-xl font-black text-xs h-8 px-3 transition-all ${
            isAuto ? "bg-amber-500 text-white shadow-amber-300/50 shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Zap className={`w-3 h-3 mr-1 ${isAuto ? "fill-white animate-pulse" : ""}`} />
          {isAuto ? "AUTO: ON" : "AUTO: OFF"}
        </Button>
      </div>

      {/* ── Battle Arena ──────────────────────────────────────────── */}
      <div className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-300 ${
        isDangerous ? "border-red-400 shadow-red-200 shadow-lg" : "border-slate-200 shadow-lg"
      } bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`}>

        {/* Background texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 25% 50%, #7c3aed 0%, transparent 50%), radial-gradient(circle at 75% 50%, #dc2626 0%, transparent 50%)" }} />

        <div className="relative grid grid-cols-[1fr_auto_1fr] gap-0 min-h-[380px]">

          {/* ── LEFT: Player Panel ─────────────────────────── */}
          <div className="flex flex-col items-center justify-between p-4 gap-3">

            {/* Character Frame */}
            <div className="relative flex flex-col items-center gap-2 w-full">
              {/* Avatar */}
              <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br ${classGradient} flex items-center justify-center shadow-xl border-2 border-white/20 ${isDangerous ? "animate-pulse" : ""}`}>
                <span className="text-4xl md:text-5xl drop-shadow-md">{classIcon}</span>
                {/* Level badge */}
                <div className="absolute -bottom-2 -right-2 bg-slate-900 border-2 border-amber-400 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-lg shadow">
                  Lv.{level}
                </div>
                {/* Auto badge */}
                {isAuto && (
                  <div className="absolute -top-2 -left-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg border border-amber-300 animate-pulse">
                    AUTO
                  </div>
                )}
              </div>
              {/* Class label */}
              <div className="text-[10px] font-black text-white/60 uppercase tracking-wider">
                {advanceClass || jobClass || "NOVICE"}
              </div>
            </div>

            {/* Player Stats Bars */}
            <div className="w-full space-y-2">
              {/* HP Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-rose-300 uppercase tracking-wider flex items-center gap-1">
                    <Heart className="w-2.5 h-2.5 fill-rose-400" /> HP
                  </span>
                  <span className={`text-[10px] font-black tabular-nums ${isDangerous ? "text-red-400 animate-pulse" : "text-white/70"}`}>
                    {playerHp?.toLocaleString() ?? "?"} / {playerMaxHp?.toLocaleString() ?? "?"}
                  </span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    animate={{ width: `${playerHpPct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className={`h-full rounded-full ${isDangerous ? "bg-gradient-to-r from-red-600 to-orange-500 animate-pulse" : "bg-gradient-to-r from-rose-500 to-pink-400"}`}
                  />
                </div>
                {/* HP Potion buttons — all sizes */}
                {hpPotions.length > 0 ? (
                  <div className="flex gap-1">
                    {[...hpPotions]
                      .sort((a, b) => (a.item?.hpRestorePercent ?? 0) - (b.item?.hpRestorePercent ?? 0))
                      .map((si) => {
                        const label = si.item.name.match(/\(([^)]+)\)/)?.[1] ?? si.item.name;
                        return (
                          <button
                            key={si.id}
                            onClick={() => handleUsePotion(si)}
                            disabled={isUsingPotion}
                            className="flex-1 text-[9px] font-black bg-rose-900/60 hover:bg-rose-800/80 border border-rose-500/40 text-rose-200 rounded-lg px-1 py-1 flex flex-col items-center gap-0 transition-all active:scale-95 disabled:opacity-50 leading-tight"
                          >
                            <span>❤️ {label}</span>
                            <span className="text-rose-400">×{si.quantity}</span>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="w-full text-[9px] font-black bg-rose-950/40 border border-rose-800/30 text-rose-600 rounded-lg px-2 py-1 flex items-center justify-center gap-1 opacity-60">
                    ❤️ ไม่มียาฟื้นฟู HP
                  </div>
                )}
              </div>

              {/* MP Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider flex items-center gap-1">
                    <Droplets className="w-2.5 h-2.5 fill-blue-400" /> MP
                  </span>
                  <span className="text-[10px] font-black text-white/70 tabular-nums">
                    {mana} / {playerMaxMp ?? "?"}
                  </span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    animate={{ width: `${playerMpPct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-400"
                  />
                </div>
                {/* Mana Potion buttons — all sizes */}
                {manaPotions.length > 0 && (
                  <div className="flex gap-1">
                    {[...manaPotions]
                      .sort((a, b) => (a.item?.manaRestore ?? 0) - (b.item?.manaRestore ?? 0))
                      .map((si) => {
                        const label = si.item.name.match(/\(([^)]+)\)/)?.[1] ?? si.item.name;
                        return (
                          <button
                            key={si.id}
                            onClick={() => handleUsePotion(si)}
                            disabled={isUsingPotion}
                            className="flex-1 text-[9px] font-black bg-blue-900/60 hover:bg-blue-800/80 border border-blue-500/40 text-blue-200 rounded-lg px-1 py-1 flex flex-col items-center gap-0 transition-all active:scale-95 disabled:opacity-50 leading-tight"
                          >
                            <span>💧 {label}</span>
                            <span className="text-blue-400">×{si.quantity}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Stamina pips */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">ST</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(stamina, 10) }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-sm bg-amber-400 shadow-sm" />
                  ))}
                  {stamina > 10 && <span className="text-[9px] text-amber-300 font-black">+{stamina - 10}</span>}
                </div>
              </div>
            </div>

            {/* Status Effect Badges */}
            {activeEffects && Object.keys(activeEffects).length > 0 && (
              <div className="flex flex-col gap-1 w-full">
                {activeEffects.poison && (
                  <div className="text-[9px] font-black bg-purple-900/60 border border-purple-500/40 text-purple-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>☠️ POISON</span><span className="text-purple-400">×{activeEffects.poison.turnsLeft}</span>
                  </div>
                )}
                {activeEffects.defBuff && (
                  <div className="text-[9px] font-black bg-blue-900/60 border border-blue-500/40 text-blue-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>🛡️ DEF BUFF</span><span className="text-blue-400">×{activeEffects.defBuff.turnsLeft}</span>
                  </div>
                )}
                {activeEffects.atkBuff && (
                  <div className="text-[9px] font-black bg-amber-900/60 border border-amber-500/40 text-amber-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>⚔️ ATK UP</span><span className="text-amber-400">×{activeEffects.atkBuff.turnsLeft}</span>
                  </div>
                )}
                {activeEffects.atkDebuff && (
                  <div className="text-[9px] font-black bg-slate-800/80 border border-slate-500/40 text-slate-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>🌪️ ATK DOWN</span><span className="text-slate-400">×{activeEffects.atkDebuff.turnsLeft}</span>
                  </div>
                )}
                {activeEffects.critBuff && (
                  <div className="text-[9px] font-black bg-yellow-900/60 border border-yellow-500/40 text-yellow-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>🎯 CRIT UP</span><span className="text-yellow-400">×{activeEffects.critBuff.turnsLeft}</span>
                  </div>
                )}
                {activeEffects.defBreak && (
                  <div className="text-[9px] font-black bg-orange-900/60 border border-orange-500/40 text-orange-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>🔓 DEF BREAK</span><span className="text-orange-400">×{activeEffects.defBreak.turnsLeft}</span>
                  </div>
                )}
                {activeEffects.slow && (
                  <div className="text-[9px] font-black bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>🧊 SLOW</span><span className="text-cyan-400">×{activeEffects.slow.turnsLeft}</span>
                  </div>
                )}
                {activeEffects.stun && (
                  <div className="text-[9px] font-black bg-violet-900/60 border border-violet-500/40 text-violet-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>⚡ STUN</span><span className="text-violet-400">×{activeEffects.stun.turnsLeft}</span>
                  </div>
                )}
                {activeEffects.regen && (
                  <div className="text-[9px] font-black bg-green-900/60 border border-green-500/40 text-green-200 rounded-lg px-2 py-0.5 flex items-center justify-between">
                    <span>💚 REGEN</span><span className="text-green-400">×{activeEffects.regen.turnsLeft}</span>
                  </div>
                )}
              </div>
            )}

            {/* Monster damage indicator on player side */}
            <AnimatePresence>
              {monsterDmgPopup && (
                <motion.div
                  key={monsterDmgPopup.key}
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -40, scale: 1.3 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.0, ease: "easeOut" }}
                  className="absolute bottom-24 left-8 pointer-events-none z-20"
                >
                  <div className="font-black text-xl text-white bg-red-600/90 px-3 py-1.5 rounded-xl border border-red-400 shadow-lg">
                    💥 -{monsterDmgPopup.damage.toLocaleString()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── CENTER: VS + Attack ──────────────────────────── */}
          <div className="flex flex-col items-center justify-center gap-3 px-2 py-4">
            <div className="text-white/20 font-black text-xs tracking-[0.3em] rotate-0">VS</div>
            {/* Attack Button */}
            <motion.button
              onClick={handleAttack}
              disabled={stamina <= 0 || isAttacking || isAuto}
              whileTap={{ scale: 0.9 }}
              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-xl transition-all border-2 ${
                stamina <= 0 || isAttacking || isAuto
                  ? "bg-slate-700 border-slate-600 opacity-40 cursor-not-allowed"
                  : "bg-gradient-to-br from-rose-500 to-red-700 border-rose-400 hover:from-rose-400 hover:to-red-600 cursor-pointer active:scale-90"
              }`}
            >
              <Sword className="w-6 h-6 text-white" />
              <span className="text-[8px] font-black text-white/80 uppercase">-1 ST</span>
            </motion.button>
            <div className="text-white/10 font-black text-[10px] tracking-widest">────</div>
          </div>

          {/* ── RIGHT: Monster Panel ─────────────────────────── */}
          <div className="flex flex-col items-center justify-between p-4 gap-3">
            {/* Monster HP bar (top) */}
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-red-300 uppercase tracking-wider">Enemy HP</span>
                <span className={`text-[10px] font-black tabular-nums ${monsterHpPct < 30 ? "text-red-400 animate-pulse" : "text-white/70"}`}>
                  {monster.hp.toLocaleString()} / {monster.maxHp.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  animate={{ width: `${monsterHpPct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-400"
                />
              </div>
            </div>

            {/* Monster Image */}
            <div className="relative flex items-center justify-center flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={monster.name + currentWave}
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{
                    scale: 1, opacity: 1, y: 0,
                    x: shake ? [-6, 6, -6, 6, 0] : 0,
                    filter: shake ? "brightness(2) saturate(2)" : "brightness(1) saturate(1)"
                  }}
                  exit={{ scale: 1.3, opacity: 0 }}
                  className="relative"
                >
                  <img
                    src={monster.image}
                    alt={monster.name}
                    className="w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-2xl"
                  />
                  {/* Shadow */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-black/30 blur-lg rounded-full" />
                </motion.div>
              </AnimatePresence>

              {/* Player damage popup */}
              <AnimatePresence>
                {damagePopup && (
                  <motion.div
                    key={damagePopup.key}
                    initial={{ opacity: 1, y: 0, scale: 0.6 }}
                    animate={{ opacity: 0, y: -60, scale: damagePopup.isCrit ? 1.6 : 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-20"
                  >
                    <div className={`font-black text-center drop-shadow-lg ${damagePopup.isCrit ? "text-4xl text-yellow-300" : "text-3xl text-white"}`}>
                      -{damagePopup.damage.toLocaleString()}
                      {damagePopup.isCrit && <div className="text-xs text-yellow-400 font-black tracking-widest animate-pulse">⚡ CRIT!</div>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Poison tick popup */}
              <AnimatePresence>
                {poisonPopup && (
                  <motion.div
                    key={poisonPopup.key}
                    initial={{ opacity: 1, y: 10, scale: 0.7 }}
                    animate={{ opacity: 0, y: -45, scale: 1.1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    className="absolute top-4 left-1/4 pointer-events-none z-20"
                  >
                    <div className="font-black text-xl text-purple-200 drop-shadow-lg flex items-center gap-1 bg-purple-900/70 px-2 py-1 rounded-xl border border-purple-500/60">
                      ☠️ -{poisonPopup.damage.toLocaleString()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Monster ATK info */}
            <div className="text-[10px] text-white/30 font-bold flex items-center gap-1">
              <span>ATK {monster.atk}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Skills Grid ──────────────────────────────────────────── */}
      <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-700/50">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 px-1">ทักษะ</div>
        {currentSkills.length === 0 ? (
          <div className="text-center text-slate-500 text-xs font-bold py-4 italic">
            ยังไม่มีทักษะ — เลื่อนเลเวลเพื่อปลดล็อก
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {currentSkills.map((skill) => {
              const isAP = skill.costType === "AP";
              const canUse = (isAP ? stamina : mana) >= skill.cost;
              const effect = skill.effect ?? "DAMAGE";
              const effectLabel: Record<string, string> = {
                DAMAGE: "⚔️", POISON: "☠️", BUFF_DEF: "🛡️", DEFEND: "🛡️", BUFF_ATK: "💢", HEAL: "❤️"
              };
              return (
                <button
                  key={skill.id}
                  onClick={() => handleUseSkill(skill.id)}
                  disabled={!canUse || isAttacking}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all group ${
                    canUse
                      ? "bg-slate-800 border-slate-600 hover:border-amber-500/60 hover:bg-slate-700 cursor-pointer active:scale-95"
                      : "bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed grayscale"
                  }`}
                >
                  {/* Effect icon + class icon */}
                  <div className="relative">
                    <span className="text-xl">{classIcon}</span>
                    <span className="absolute -top-1 -right-1 text-[10px]">{effectLabel[effect] || "✨"}</span>
                  </div>
                  <span className="text-[9px] font-black text-white/80 truncate w-full text-center leading-tight">{skill.name}</span>
                  {/* Cost badge */}
                  <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${
                    isAP
                      ? "bg-amber-900/60 border-amber-600/40 text-amber-300"
                      : "bg-blue-900/60 border-blue-600/40 text-blue-300"
                  }`}>
                    {skill.cost}{isAP ? " ST" : " MP"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Rewards tip ─────────────────────────────────────────── */}
      <div className="p-3 bg-emerald-950/60 border border-emerald-700/30 rounded-xl flex items-start gap-3">
        <Trophy className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-emerald-300/80 font-medium leading-relaxed">
          ฟาร์มมอนสเตอร์เพื่อรับ <span className="text-amber-300 font-black">Gold</span>, <span className="text-emerald-300 font-black">XP</span> และ <span className="text-purple-300 font-black">Materials</span> · ตายจะถอยกลับ 10% ของ Wave
        </p>
      </div>
    </div>
  );
}
