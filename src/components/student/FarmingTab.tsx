"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Droplets, Heart, Sword, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RPG_COPY } from "@/lib/game/rpg-copy";
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
  NOVICE: "🧑‍🎓",
  WARRIOR: "⚔️",
  MAGE: "🔮",
  RANGER: "🏹",
  HEALER: "✨",
  ROGUE: "🗡️",
  KNIGHT: "🛡️",
  BERSERKER: "🪓",
  ARCHMAGE: "🌟",
  WARLOCK: "💜",
  SNIPER: "🎯",
  BEASTMASTER: "🐉",
  SAINT: "😇",
  DRUID: "🌿",
  ASSASSIN: "🌑",
  DUELIST: "⚡",
  PALADIN: "🛡️",
  GUARDIAN: "🏰",
  WARLORD: "👑",
  "DEATH KNIGHT": "💀",
  "GRAND WIZARD": "🌈",
  ELEMENTALIST: "🌊",
  LICH: "☠️",
  "SHADOW MAGE": "🌑",
  HAWKEYE: "👁️",
  DEADEYE: "🎯",
  "BEAST KING": "🦁",
  TAMER: "🐾",
  ARCHBISHOP: "✝️",
  "DIVINE HERALD": "📯",
  "ELDER DRUID": "🌳",
  "NATURE WARDEN": "🌿",
  "SHADOW LORD": "👤",
  PHANTOM: "👻",
  "BLADE MASTER": "⚔️",
  "SWORD SAINT": "🗡️",
};

type FarmingState = {
  currentWave: number;
  monster: SoloMonster;
  playerHp?: number;
  playerMaxHp?: number;
  playerMaxMp?: number;
  skillCooldowns?: Record<string, number>;
  activeEffects?: Record<string, { turnsLeft: number }>;
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
  const { toast } = useToast();
  const [farming, setFarming] = useState<FarmingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isUsingPotion, setIsUsingPotion] = useState(false);
  const [playerHp, setPlayerHp] = useState<number | null>(null);
  const [playerMaxHp, setPlayerMaxHp] = useState<number | null>(null);
  const [playerMaxMp, setPlayerMaxMp] = useState<number | null>(null);
  const [hpPotions, setHpPotions] = useState<any[]>([]);
  const [manaPotions, setManaPotions] = useState<any[]>([]);
  const [damagePopup, setDamagePopup] = useState<{ damage: number; isCrit?: boolean; key: number } | null>(null);
  const [monsterDmgPopup, setMonsterDmgPopup] = useState<{ damage: number; key: number } | null>(null);
  const [poisonPopup, setPoisonPopup] = useState<{ damage: number; key: number } | null>(null);

  const currentSkills: Skill[] = useMemo(() => {
    const eff = resolveEffectiveJobKey({ jobClass, jobTier, advanceClass });
    const classDef = getMergedClassDef(eff);
    const globalMap = buildGlobalSkillMap();
    const skillsMap = new Map<string, Skill>();

    jobSkills?.forEach((id) => {
      const found = globalMap[id];
      if (found) skillsMap.set(id, found);
    });
    classDef.skills.forEach((skill) => {
      if (skill.unlockLevel <= level) skillsMap.set(skill.id, skill);
    });
    return Array.from(skillsMap.values()).sort((a, b) => a.unlockLevel - b.unlockLevel);
  }, [jobClass, jobTier, advanceClass, jobSkills, level]);

  const classIcon = CLASS_ICONS[advanceClass || jobClass || "NOVICE"] || "🧑‍🎓";

  const loadInventory = async () => {
    const res = await fetch(`/api/student/inventory?studentId=${studentId}`);
    const data = res.ok ? await res.json() : [];
    if (!Array.isArray(data)) return;
    const consumables = data.filter((si: any) => si.item?.type === "CONSUMABLE" && si.quantity > 0);
    setHpPotions(consumables.filter((si: any) => (si.item?.hpRestorePercent ?? 0) > 0 || si.item?.isPhoenix));
    setManaPotions(consumables.filter((si: any) => (si.item?.manaRestore ?? 0) > 0));
  };

  const loadFarming = async () => {
    try {
      const res = await fetch(`/api/student/${code}/farming`);
      const data = await res.json();
      if (data.success) {
        setFarming(data.farming);
        setPlayerHp(data.farming.playerHp ?? null);
        setPlayerMaxHp(data.farming.playerMaxHp ?? null);
        setPlayerMaxMp(data.farming.playerMaxMp ?? null);
      }
      await loadInventory();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarming();
  }, [code]);

  const applyFarmResult = (data: any, includeMana = true) => {
    setFarming(data.farming);
    if (data.playerHp != null) setPlayerHp(data.playerHp);
    if (data.playerMaxHp != null) setPlayerMaxHp(data.playerMaxHp);
    if (data.farming?.playerMaxMp != null) setPlayerMaxMp(data.farming.playerMaxMp);
    if (data.damage > 0) {
      setDamagePopup({ damage: data.damage, isCrit: data.isCrit, key: Date.now() });
      setTimeout(() => setDamagePopup(null), 1000);
    }
    if (data.monsterDamage > 0) {
      setMonsterDmgPopup({ damage: data.monsterDamage, key: Date.now() + 1 });
      setTimeout(() => setMonsterDmgPopup(null), 1000);
    }
    if (data.poisonDamage > 0) {
      setPoisonPopup({ damage: data.poisonDamage, key: Date.now() + 2 });
      setTimeout(() => setPoisonPopup(null), 1200);
    }

    onUpdateStudent({
      stamina: data.stamina,
      ...(includeMana ? { mana: data.mana } : {}),
      gameStats: { gold: data.gold, xp: data.xp, level: data.newLevel, farming: data.farming },
    });

    if (data.playerDied) {
      setIsAuto(false);
      toast({
        title: RPG_COPY.farming.diedTitle,
        description: RPG_COPY.farming.diedDescription(data.deathPenaltyWave),
        variant: "destructive",
      });
    }
    if (data.healAmount > 0) {
      toast({ title: RPG_COPY.farming.healTitle, description: `+${data.healAmount.toLocaleString()}` });
    }
    if (data.isDefeated) {
      toast({ title: RPG_COPY.farming.defeatedTitle, description: `+${data.loot?.gold} Gold / +${data.loot?.xp} XP` });
    }
  };

  const handleAttack = async () => {
    if (stamina <= 0 || isAttacking) return;
    setIsAttacking(true);
    try {
      const res = await fetch(`/api/student/${code}/farming/attack`, { method: "POST" });
      const data = await res.json();
      if (data.success) applyFarmResult(data, false);
      else toast({ title: data.error || RPG_COPY.farming.attackFailed, variant: "destructive" });
    } finally {
      setIsAttacking(false);
    }
  };

  const handleUseSkill = async (skillId: string) => {
    if (isAttacking) return;
    const skill = currentSkills.find((s) => s.id === skillId);
    const isAP = skill?.costType === "AP";
    if (!skill || (isAP ? stamina : mana) < skill.cost) return;
    setIsAttacking(true);
    try {
      const res = await fetch(`/api/student/${code}/farming/skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json();
      if (data.success) applyFarmResult(data, true);
      else toast({ title: data.error || RPG_COPY.farming.skillFailed, variant: "destructive" });
    } finally {
      setIsAttacking(false);
    }
  };

  const handleUsePotion = async (row: any) => {
    if (isUsingPotion) return;
    setIsUsingPotion(true);
    try {
      const res = await fetch("/api/student/inventory/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentItemId: row.id, studentId }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.newMana != null) onUpdateStudent({ mana: data.newMana });
        if (data.newPlayerHp != null) setPlayerHp(data.newPlayerHp);
        if (data.newPlayerMaxHp != null) setPlayerMaxHp(data.newPlayerMaxHp);
        // Apply farming active effects from item buff
        if (data.farmingActiveEffects && farming) {
          setFarming((prev) => prev ? { ...prev, activeEffects: data.farmingActiveEffects } : prev);
        }
        toast({ title: RPG_COPY.farming.useItemTitle(row.item.name), description: data.message });
        await loadInventory();
      } else {
        toast({ title: data.error || RPG_COPY.farming.useFailed, variant: "destructive" });
      }
    } finally {
      setIsUsingPotion(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAuto && stamina > 0 && !isAttacking) {
      timer = setTimeout(handleAttack, 1000);
    } else if (isAuto && stamina <= 0) {
      setIsAuto(false);
      toast({
        title: RPG_COPY.farming.autoStoppedTitle,
        description: RPG_COPY.farming.autoStoppedDescription,
        variant: "destructive",
      });
    }
    return () => clearTimeout(timer);
  }, [isAuto, stamina, isAttacking]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">{RPG_COPY.farming.loading}</div>;
  }

  if (!farming) {
    return <div className="p-8 text-center text-slate-400 font-bold">{RPG_COPY.farming.emptyState}</div>;
  }

  const { monster, currentWave } = farming;
  const hpPct = playerHp != null && playerMaxHp ? Math.max(0, (playerHp / playerMaxHp) * 100) : 100;
  const mpPct = playerMaxMp ? Math.max(0, (mana / playerMaxMp) * 100) : 0;
  const monsterHpPct = Math.max(0, (monster.hp / monster.maxHp) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-emerald-50/40 to-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{classIcon}</div>
          <div>
            <div className="font-black text-slate-800">{RPG_COPY.farming.wave(currentWave)}</div>
            <div className="text-xs text-slate-500 uppercase font-semibold">{monster.name}</div>
          </div>
        </div>
        <Button size="sm" onClick={() => setIsAuto((v) => !v)} className={isAuto ? "bg-amber-500 hover:bg-amber-400" : "bg-slate-800 hover:bg-slate-900 text-white"}>
          <Zap className="w-3 h-3 mr-1" />
          {isAuto ? "AUTO: ON" : "AUTO: OFF"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 p-5 text-slate-800 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Enemy HP</div>
              <div className="text-sm font-bold text-slate-800">{monster.hp.toLocaleString()} / {monster.maxHp.toLocaleString()}</div>
            </div>
            <div className="text-xs text-slate-500">ATK {monster.atk}</div>
          </div>
          <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-gradient-to-r from-red-600 to-orange-400 transition-all duration-300" style={{ width: `${monsterHpPct}%` }} />
          </div>
          {/* Monster status effects (debuffs applied to enemy) */}
          {(() => {
            const ae = farming?.activeEffects as Record<string, { turnsLeft: number }> | undefined;
            if (!ae) return null;
            const tags: { icon: string; label: string; color: string }[] = [];
            if (ae.poison)    tags.push({ icon: "☠️", label: `Poison ×${ae.poison.turnsLeft}`,      color: "bg-purple-800/80 border-purple-600/60 text-purple-200" });
            if (ae.atkDebuff) tags.push({ icon: "💢", label: `ATK↓ ×${ae.atkDebuff.turnsLeft}`,    color: "bg-rose-800/80 border-rose-600/60 text-rose-200" });
            if (ae.defBreak)  tags.push({ icon: "💥", label: `ArmorBreak ×${ae.defBreak.turnsLeft}`, color: "bg-orange-800/80 border-orange-600/60 text-orange-200" });
            if (ae.slow)      tags.push({ icon: "🐢", label: `Slow ×${ae.slow.turnsLeft}`,          color: "bg-teal-800/80 border-teal-600/60 text-teal-200" });
            if (ae.stun)      tags.push({ icon: "⚡", label: `Stun ×${ae.stun.turnsLeft}`,          color: "bg-yellow-800/80 border-yellow-600/60 text-yellow-100" });
            if (tags.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-1 mb-3">
                {tags.map((t, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1 ${t.color}`}>
                    {t.icon} {t.label}
                  </span>
                ))}
              </div>
            );
          })()}

          <div className="relative flex min-h-[260px] items-center justify-center">
            <motion.img
              animate={{ x: isAttacking ? [-4, 4, -4, 0] : 0 }}
              src={monster.image}
              alt={monster.name}
              className="h-40 w-40 object-contain drop-shadow-2xl"
            />
            <AnimatePresence>
              {damagePopup && (
                <motion.div
                  key={damagePopup.key}
                  initial={{ opacity: 1, y: 0, scale: 0.7 }}
                  animate={{ opacity: 0, y: -50, scale: damagePopup.isCrit ? 1.4 : 1.1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-6 text-center"
                >
                  <div className="text-3xl font-black text-rose-600">-{damagePopup.damage.toLocaleString()}</div>
                  {damagePopup.isCrit && <div className="text-xs font-black text-yellow-300">CRIT!</div>}
                </motion.div>
              )}
              {poisonPopup && (
                <motion.div
                  key={poisonPopup.key}
                  initial={{ opacity: 1, y: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 0, y: -45, x: 30, scale: 1.05 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="absolute top-10 right-4 text-center pointer-events-none"
                >
                  <div className="text-lg font-black text-purple-300">☠️ -{poisonPopup.damage.toLocaleString()}</div>
                  <div className="text-[9px] font-black text-purple-400 tracking-widest">POISON</div>
                </motion.div>
              )}
              {monsterDmgPopup && (
                <motion.div
                  key={monsterDmgPopup.key}
                  initial={{ opacity: 1, y: 0, scale: 0.7 }}
                  animate={{ opacity: 0, y: -40, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-0 left-0 rounded-xl bg-red-600/90 px-3 py-1 text-sm font-black"
                >
                  💥 -{monsterDmgPopup.damage.toLocaleString()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <button
              onClick={handleAttack}
              disabled={stamina <= 0 || isAttacking || isAuto}
              className="rounded-2xl border-2 border-rose-400 bg-gradient-to-br from-rose-500 to-red-700 px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-2">
                <Sword className="h-5 w-5" />
                โจมตี
              </div>
              <div className="text-[10px] uppercase text-white/80">ใช้ 1 Stamina</div>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-black uppercase text-slate-500">
              <span className="flex items-center gap-1 text-rose-500"><Heart className="h-3 w-3 fill-rose-500" /> HP</span>
              <span>{playerHp ?? "?"} / {playerMaxHp ?? "?"}</span>
            </div>
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-gradient-to-r from-rose-500 to-pink-400" style={{ width: `${hpPct}%` }} />
            </div>

            <div className="mb-3 flex items-center justify-between text-xs font-black uppercase text-slate-500">
              <span className="flex items-center gap-1 text-blue-500"><Droplets className="h-3 w-3 fill-blue-500" /> MP</span>
              <span>{mana} / {playerMaxMp ?? "?"}</span>
            </div>
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-400" style={{ width: `${mpPct}%` }} />
            </div>

            <div className="flex items-center justify-between text-xs font-black uppercase text-slate-500">
              <span className="text-amber-500">Stamina</span>
              <span>{stamina}</span>
            </div>
            {/* Player buff badges */}
            {(() => {
              const ae = farming?.activeEffects as Record<string, { turnsLeft: number }> | undefined;
              if (!ae) return null;
              const buffs: { icon: string; label: string; color: string }[] = [];
              if (ae.atkBuff)  buffs.push({ icon: "⚔️", label: `ATK↑ ×${ae.atkBuff.turnsLeft}`,  color: "bg-amber-100 border-amber-300 text-amber-700" });
              if (ae.defBuff)  buffs.push({ icon: "🛡️", label: `DEF↑ ×${ae.defBuff.turnsLeft}`,  color: "bg-indigo-100 border-indigo-300 text-indigo-700" });
              if (ae.critBuff) buffs.push({ icon: "🎯", label: `CRIT↑ ×${ae.critBuff.turnsLeft}`, color: "bg-yellow-100 border-yellow-300 text-yellow-700" });
              if (ae.regen)    buffs.push({ icon: "💚", label: `Regen ×${ae.regen.turnsLeft}`,    color: "bg-green-100 border-green-300 text-green-700" });
              if (buffs.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
                  {buffs.map((b, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1 ${b.color}`}>
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-xs font-black uppercase text-slate-500">{RPG_COPY.farming.recoveryItems}</div>
            {hpPotions.length === 0 && manaPotions.length === 0 ? (
              <div className="text-xs text-slate-400">{RPG_COPY.farming.noRecoveryItems}</div>
            ) : (
              <>
                {/* HP Potions row */}
                {hpPotions.length > 0 && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1.5 flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-rose-400" /> HP Potion
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {hpPotions.map((row) => {
                        const sizeLetter = row.item.name.match(/\(([SML])\)/)?.[1] ?? "?";
                        const restore = row.item.hpRestorePercent;
                        return (
                          <button
                            key={row.id}
                            onClick={() => handleUsePotion(row)}
                            disabled={isUsingPotion || row.quantity <= 0}
                            title={`${row.item.name} — +${restore}% HP\nมี x${row.quantity}`}
                            className="flex flex-col items-center rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-400 active:scale-95 px-3 py-2 disabled:opacity-40 transition-all min-w-[54px]"
                          >
                            <span className="text-lg leading-none">🧪</span>
                            <span className="text-[11px] font-black text-rose-600 mt-0.5">{sizeLetter}</span>
                            <span className="text-[9px] text-rose-400 font-bold">+{restore}%</span>
                            <span className="text-[9px] text-slate-400 font-bold mt-0.5">×{row.quantity}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Mana Potions row */}
                {manaPotions.length > 0 && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1.5 flex items-center gap-1">
                      <Droplets className="w-3 h-3 fill-blue-400" /> Mana Potion
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {manaPotions.map((row) => {
                        const sizeLetter = row.item.name.match(/\(([SML])\)/)?.[1] ?? "?";
                        const restore = row.item.manaRestore;
                        return (
                          <button
                            key={row.id}
                            onClick={() => handleUsePotion(row)}
                            disabled={isUsingPotion || row.quantity <= 0}
                            title={`${row.item.name} — +${restore} MP\nมี x${row.quantity}`}
                            className="flex flex-col items-center rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 active:scale-95 px-3 py-2 disabled:opacity-40 transition-all min-w-[54px]"
                          >
                            <span className="text-lg leading-none">💙</span>
                            <span className="text-[11px] font-black text-blue-600 mt-0.5">{sizeLetter}</span>
                            <span className="text-[9px] text-blue-400 font-bold">+{restore} MP</span>
                            <span className="text-[9px] text-slate-400 font-bold mt-0.5">×{row.quantity}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Other consumables (Phoenix etc.) */}
                {[...hpPotions.filter((r: any) => r.item.isPhoenix), ...manaPotions.filter((r: any) => r.item.isPhoenix)].map((row: any) => (
                  <button
                    key={`other-${row.id}`}
                    onClick={() => handleUsePotion(row)}
                    disabled={isUsingPotion}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    <div>{row.item.name}</div>
                    <div className="text-[10px] text-slate-400">x{row.quantity}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{RPG_COPY.farming.skills}</div>
          {/* Active Effects Bar */}
          {(() => {
            const ae = farming?.activeEffects as Record<string, { turnsLeft: number; damagePerTurn?: number; reduction?: number; multiplier?: number; bonus?: number; amplify?: number }> | undefined;
            if (!ae || Object.keys(ae).length === 0) return null;
            const badges: { label: string; color: string; icon: string }[] = [];
            if (ae.poison)    badges.push({ icon: "☠️", label: `Poison ×${ae.poison.turnsLeft}`,      color: "bg-purple-100 text-purple-700 border-purple-300" });
            if (ae.atkBuff)   badges.push({ icon: "⚔️", label: `ATK↑ ×${ae.atkBuff.turnsLeft}`,      color: "bg-amber-100 text-amber-700 border-amber-300" });
            if (ae.defBuff)   badges.push({ icon: "🛡️", label: `DEF↑ ×${ae.defBuff.turnsLeft}`,      color: "bg-indigo-100 text-indigo-700 border-indigo-300" });
            if (ae.atkDebuff) badges.push({ icon: "💢", label: `ATK↓ ×${ae.atkDebuff.turnsLeft}`,    color: "bg-rose-100 text-rose-700 border-rose-300" });
            if (ae.critBuff)  badges.push({ icon: "🎯", label: `CRIT↑ ×${ae.critBuff.turnsLeft}`,    color: "bg-yellow-100 text-yellow-700 border-yellow-300" });
            if (ae.defBreak)  badges.push({ icon: "💥", label: `ArmorBreak ×${ae.defBreak.turnsLeft}`, color: "bg-orange-100 text-orange-700 border-orange-300" });
            if (ae.slow)      badges.push({ icon: "🐢", label: `Slow ×${ae.slow.turnsLeft}`,           color: "bg-teal-100 text-teal-700 border-teal-300" });
            if (ae.stun)      badges.push({ icon: "⚡", label: `Stun ×${ae.stun.turnsLeft}`,           color: "bg-yellow-100 text-yellow-700 border-yellow-300" });
            if (ae.regen)     badges.push({ icon: "💚", label: `Regen ×${ae.regen.turnsLeft}`,         color: "bg-green-100 text-green-700 border-green-300" });
            if (badges.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-1">
                {badges.map((b, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1 ${b.color}`}>
                    <span>{b.icon}</span>{b.label}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
        {currentSkills.length === 0 ? (
          <div className="text-center text-xs font-bold italic text-slate-400">{RPG_COPY.farming.noSkills}</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {currentSkills.map((skill) => {
              const isAP = skill.costType === "AP";
              const canUse = (isAP ? stamina : mana) >= skill.cost;
              const cooldown = farming?.skillCooldowns?.[skill.id] ?? 0;
              const onCooldown = cooldown > 0;
              const effect = skill.effect ?? "DAMAGE";
              const effectMeta: Record<string, { label: string; color: string }> = {
                POISON:      { label: "☠️ พิษ",      color: "bg-purple-700/80 text-purple-200" },
                BUFF_ATK:    { label: "⚔️ ATK↑",    color: "bg-amber-700/80 text-amber-200" },
                BUFF_DEF:    { label: "🛡️ DEF↑",    color: "bg-indigo-700/80 text-indigo-200" },
                DEFEND:      { label: "🛡️ ป้องกัน",  color: "bg-indigo-700/80 text-indigo-200" },
                DEBUFF_ATK:  { label: "💢 ATK↓",    color: "bg-rose-700/80 text-rose-200" },
                CRIT_BUFF:   { label: "🎯 CRIT↑",   color: "bg-yellow-700/80 text-yellow-200" },
                ARMOR_PIERCE:{ label: "💥 เจาะเกราะ", color: "bg-orange-700/80 text-orange-200" },
                HEAL:        { label: "💚 ฟื้นฟู",   color: "bg-green-700/80 text-green-200" },
                LIFESTEAL:   { label: "🩸 ดูดเลือด", color: "bg-red-700/80 text-red-200" },
                SLOW:        { label: "🐢 ช้าลง",    color: "bg-teal-700/80 text-teal-200" },
                STUN:        { label: "⚡ สตัน",     color: "bg-yellow-600/80 text-yellow-100" },
                REGEN:       { label: "🌿 Regen",   color: "bg-emerald-700/80 text-emerald-200" },
                MANA_SURGE:  { label: "💧 MP↑",     color: "bg-blue-700/80 text-blue-200" },
              };
              const em = effectMeta[effect];
              return (
                <button
                  key={skill.id}
                  onClick={() => handleUseSkill(skill.id)}
                  disabled={!canUse || isAttacking || onCooldown}
                  className={`relative overflow-hidden rounded-xl border p-2 text-center text-slate-800 transition-all ${
                    onCooldown
                      ? "border-slate-300 bg-slate-100 opacity-70"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 disabled:opacity-40"
                  }`}
                >
                  {/* Cooldown overlay */}
                  {onCooldown && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-slate-800/70 z-10">
                      <span className="text-2xl font-black text-white leading-none">{cooldown}</span>
                      <span className="text-[8px] font-bold text-slate-200 leading-none mt-0.5">เทิร์น</span>
                    </div>
                  )}
                  {skill.icon ? (
                    <img src={skill.icon} alt={skill.name} className="w-8 h-8 object-cover rounded-lg mx-auto mb-1" />
                  ) : (
                    <div className="text-lg">{classIcon}</div>
                  )}
                  <div className="truncate text-[10px] font-black leading-tight">{skill.name}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{skill.cost}{isAP ? " ST" : " MP"}</div>
                  {em && (
                    <div className={`mt-1 px-1.5 py-0.5 rounded-md text-[8px] font-black leading-none ${em.color}`}>
                      {em.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
        <Trophy className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
        <p className="text-[11px] font-medium leading-relaxed text-emerald-700">
          ฟาร์มมอนสเตอร์เพื่อรับ <span className="font-black text-amber-300">Gold</span>,{" "}
          <span className="font-black text-emerald-600">XP</span> และ{" "}
          <span className="font-black text-purple-600">Materials</span> ถ้าแพ้จะถอยกลับ 10% ของด่านปัจจุบัน
        </p>
      </div>
    </div>
  );
}
