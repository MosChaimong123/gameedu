"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, ShieldAlert, Trophy, Users, Zap, Target, Flame, WandSparkles, ScrollText } from "lucide-react";
import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";
import { getBossPreset } from "@/lib/game/boss-config";
import { getElementMultiplier, getJobElement, getElementLabel, hasComboOpportunity } from "@/lib/game/element-system";
import type { BossAction, BattleLogEntry, PlayerBattleState } from "@/lib/game/boss-config";
import type { TurnSlot } from "@/lib/game/ctb-engine";
import type { Skill } from "@/lib/game/job-system";

interface ActiveEffect {
    type: string;
    effectValue: number;
    expiresAt: string | null;
    skillId: string;
    skillName: string;
    skillIcon: string;
}

interface BossProp {
    instanceId?: string;
    active: boolean;
    name: string;
    maxHp: number;
    currentHp: number;
    image: string;
    deadline?: string;
    bossId?: string;
    element?: string;
    elementIcon?: string;
    elementKey?: string;
    difficulty?: string;
    rewardGold?: number;
    rewardXp?: number;
    rewardMaterials?: { type: string; quantity: number }[];
    triggeredSkills?: string[];
    activeEffect?: ActiveEffect | null;
    passiveDamageMultiplier?: number;
    recentAttacks?: { jobClass: string; timestamp: number }[];
    // FF fields
    staggerGauge?: number;
    isStaggered?: boolean;
    staggerExpiry?: number | null;
    playerBattleState?: PlayerBattleState;
    battleLog?: BattleLogEntry[];
}

interface WorldBossBarProps {
    bosses: BossProp[];
    studentId?: string;
    stamina?: number;
    maxStamina?: number;
    mana?: number;
    classId?: string;
    jobClass?: string | null;
    limitBreakCharge?: number;
    bossSkills?: Skill[];
    playerGold?: number;
    nextStaminaRegenAt?: string | null;
    onAttackSuccess?: (data: unknown) => void;
    onBossDefeated?: (rewards: { bossName: string; rewardGold?: number; rewardXp?: number; rewardMaterials?: { type: string; quantity: number }[] }) => void;
}

const STATUS_META: Record<string, { icon: string; label: string; color: string }> = {
    POISON:     { icon: "🤢", label: "Poison",     color: "bg-green-100 border-green-400 text-green-800" },
    BIND:       { icon: "⛓️", label: "Bind",       color: "bg-slate-200 border-slate-400 text-slate-700" },
    BLIND:      { icon: "👁️", label: "Blind",      color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
    VULNERABLE: { icon: "💢", label: "Vulnerable", color: "bg-red-100 border-red-400 text-red-800" },
};

const LOG_COLOR: Record<string, string> = {
    PLAYER_ATTACK: "text-indigo-600",
    PLAYER_MAGIC:  "text-violet-600",
    BOSS_ACTION:   "text-rose-600",
    STAGGER:       "text-amber-600",
    PHASE_CHANGE:  "text-orange-500 font-black",
    MISS:          "text-slate-400 italic",
};

export function WorldBossBar({ bosses: bossesProp, studentId, stamina = 0, maxStamina = 10, mana = 0, classId, jobClass, limitBreakCharge = 0, bossSkills = [], playerGold = 0, nextStaminaRegenAt, onAttackSuccess, onBossDefeated }: WorldBossBarProps) {
    const { socket } = useSocket();
    const [isAttacking, setIsAttacking] = useState(false);
    const [currentCharge, setCurrentCharge] = useState(limitBreakCharge);
    const [lastComboLabel, setLastComboLabel] = useState("");
    const [currentMana, setCurrentMana] = useState(mana);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    // FF state
    const [staggerGauge, setStaggerGauge] = useState(0);
    const [isStaggered, setIsStaggered] = useState(false);
    const [playerBattleState, setPlayerBattleState] = useState<PlayerBattleState | null>(null);
    const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
    const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
    const [hitsUntilBoss, setHitsUntilBoss] = useState<number | null>(null);
    const [pulsingThreshold, setPulsingThreshold] = useState<number | null>(null);
    const [showLog, setShowLog] = useState(false);
    const [flashType, setFlashType] = useState<"attack" | "magic" | "limitBreak" | "boss" | "crit" | null>(null);
    const [isUsingPotion, setIsUsingPotion] = useState(false);
    const [currentGold, setCurrentGold] = useState(playerGold);
    const [ctbTimeline, setCtbTimeline] = useState<TurnSlot[]>([]);
    const [staminaCountdown, setStaminaCountdown] = useState("");
    const logRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Stamina regen countdown
    useEffect(() => {
        if (!nextStaminaRegenAt || stamina >= maxStamina) { setStaminaCountdown(""); return; }
        const update = () => {
            const diff = new Date(nextStaminaRegenAt).getTime() - Date.now();
            if (diff <= 0) { setStaminaCountdown(""); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setStaminaCountdown(h > 0
                ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
                : `${m}:${String(s).padStart(2, "0")}`
            );
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [nextStaminaRegenAt, stamina, maxStamina]);

    // Sync gold from prop
    useEffect(() => { setCurrentGold(playerGold); }, [playerGold]);

    // Trigger flash overlay then clear
    const triggerFlash = (type: typeof flashType) => {
        setFlashType(type);
        setTimeout(() => setFlashType(null), 350);
    };

    const handlePotion = async (type: "HP" | "MP") => {
        if (!classId || isUsingPotion || isAttacking) return;
        setIsUsingPotion(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/boss/potion`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });
            const data = await res.json() as {
                success?: boolean; error?: string;
                battleHp?: number; maxBattleHp?: number; manaLeft?: number; goldLeft?: number;
            };
            if (data.success) {
                if (typeof data.goldLeft === "number") setCurrentGold(data.goldLeft);
                if (type === "HP" && data.battleHp !== undefined) {
                    setPlayerBattleState((prev) => prev
                        ? { ...prev, battleHp: data.battleHp!, maxBattleHp: data.maxBattleHp ?? prev.maxBattleHp }
                        : prev
                    );
                    toast({ title: "❤️ HP ฟื้นฟู!", description: `Battle HP กลับมา ${data.battleHp?.toLocaleString()} HP`, className: "bg-emerald-600 text-white" });
                } else if (type === "MP" && data.manaLeft !== undefined) {
                    setCurrentMana(data.manaLeft);
                    toast({ title: "🔮 MP ฟื้นฟู!", description: `Mana กลับมา ${data.manaLeft} MP`, className: "bg-violet-600 text-white" });
                }
            } else {
                toast({ title: "ใช้ยาไม่ได้", description: data.error ?? "เกิดข้อผิดพลาด", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "ไม่สามารถเชื่อมต่อได้", variant: "destructive" });
        } finally {
            setIsUsingPotion(false);
        }
    };

    // Sync mana from prop (changes after sync route)
    useEffect(() => { setCurrentMana(mana); }, [mana]);

    // Auto-scroll log to bottom
    useEffect(() => {
        if (showLog && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [battleLog, showLog]);

    const activeBosses = useMemo(
        () => bossesProp.filter((b) => b.active !== false && b.currentHp > 0),
        [bossesProp]
    );

    const boss = useMemo(() => {
        if (activeBosses.length === 0) return null;
        return activeBosses[0];
    }, [activeBosses]);

    const isPreviewBoss = boss?.instanceId?.startsWith("preview-") ?? false;

    // Sync FF state from boss prop (initial load / socket update)
    useEffect(() => {
        if (!boss) return;
        if (typeof boss.staggerGauge === "number") setStaggerGauge(boss.staggerGauge);
        if (typeof boss.isStaggered === "boolean") setIsStaggered(boss.isStaggered);
        if (boss.playerBattleState) setPlayerBattleState(boss.playerBattleState);
        if (boss.battleLog && boss.battleLog.length > 0) setBattleLog(boss.battleLog);
    }, [boss]); // only on boss instance change

    if (!boss || !boss.active) return null;

    const hpPercentage = (boss.currentHp / boss.maxHp) * 100;
    const isLowHp = hpPercentage < 20;

    const preset = boss.bossId ? getBossPreset(boss.bossId) : null;
    const bossElementKey = boss.elementKey ?? preset?.elementKey ?? boss.bossId ?? null;
    const elementMult = getElementMultiplier(jobClass, bossElementKey);
    const elementLabel = getElementLabel(elementMult);
    const jobEl = getJobElement(jobClass);
    const skills = preset?.skills ?? [];
    const triggeredSkills = boss.triggeredSkills ?? [];
    const activeEffect = boss.activeEffect ?? null;

    const effectActive = activeEffect && (
        activeEffect.expiresAt === null || new Date(activeEffect.expiresAt) > new Date()
    );

    const lbCharge = currentCharge;
    const lbReady = lbCharge >= 100;

    const recentAttacks = boss.recentAttacks ?? [];
    const recentWindow = recentAttacks.filter((a) => Date.now() - a.timestamp <= 10000);
    const recentJobClasses = recentWindow.map((a) => a.jobClass);
    const comboReady = hasComboOpportunity(jobClass, recentJobClasses);

    const isBound = playerBattleState?.statusEffects.some((e) => e.type === "BIND") ?? false;
    const playerBattleHp = playerBattleState?.battleHp ?? 0;
    const playerMaxBattleHp = playerBattleState?.maxBattleHp ?? 100;
    const playerHpPct = playerMaxBattleHp > 0 ? (playerBattleHp / playerMaxBattleHp) * 100 : 0;
    const activeStatuses = playerBattleState?.statusEffects ?? [];

    const handleAttack = async (action: "attack" | "magic" | "limitBreak", skillId?: string) => {
        const isLimitBreak = action === "limitBreak";
        const isMagic = action === "magic" || !!skillId;
        const selectedSkill = skillId ? bossSkills.find((s) => s.id === skillId) : null;
        const manaCost = selectedSkill ? selectedSkill.cost : 20;

        if (!classId || isAttacking) return;
        if (!isMagic && stamina <= 0) return;
        if (isLimitBreak && lbCharge < 100) return;
        if (isMagic && currentMana < manaCost) return;
        if (isBound) {
            toast({ title: "⛓️ ถูกล็อค!", description: "ไม่สามารถโจมตีได้ในรอบนี้", variant: "destructive" });
            return;
        }

        setIsAttacking(true);
        const targetName = boss.name;
        const targetRewards = { rewardGold: boss.rewardGold, rewardXp: boss.rewardXp, rewardMaterials: boss.rewardMaterials };

        try {
            const res = await fetch(`/api/classrooms/${classId}/boss/attack`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    limitBreak: isLimitBreak,
                    action: isMagic ? "magic" : "attack",
                    ...(skillId ? { skillId } : {}),
                }),
            });
            const data = await res.json() as {
                success: boolean;
                damage?: number;
                isCrit?: boolean;
                boss?: BossProp | null;
                targetInstanceId?: string;
                error?: string;
                triggeredSkill?: { name: string; icon: string; description: string };
                limitBreakCharge?: number;
                comboLabel?: string;
                comboMult?: number;
                manaLeft?: number;
                // FF extras
                isMiss?: boolean;
                justStaggered?: boolean;
                isStaggered?: boolean;
                staggerGauge?: number;
                executedBossAction?: BossAction | null;
                playerBattleState?: PlayerBattleState | null;
                battleLog?: BattleLogEntry[];
                phase?: 1 | 2 | 3 | 4;
                hitsUntilBossAct?: number | null;
                ctbTimeline?: TurnSlot[];
            };

            if (data.success) {
                // Trigger visual flash based on action type
                if (isLimitBreak) triggerFlash("limitBreak");
                else if (data.isCrit) triggerFlash("crit");
                else if (skillId || isMagic) triggerFlash("magic");
                else triggerFlash("attack");

                // Boss action → separate flash after short delay
                if (data.executedBossAction) {
                    setTimeout(() => triggerFlash("boss"), 400);
                }

                socket?.emit("classroom-update", {
                    classId,
                    type: "BOSS_HP_UPDATE",
                    data: { studentId, personalBoss: data.boss, instanceId: data.targetInstanceId },
                });

                // Sync FF state
                if (typeof data.staggerGauge === "number") setStaggerGauge(data.staggerGauge);
                if (typeof data.isStaggered === "boolean") setIsStaggered(data.isStaggered);
                if (data.playerBattleState) setPlayerBattleState(data.playerBattleState);
                if (data.battleLog) setBattleLog(data.battleLog);
                if (data.phase) {
                    // Detect phase transition → trigger HP bar pulse
                    setPhase((prev) => {
                        if (data.phase && data.phase > prev) {
                            setPulsingThreshold(data.phase);
                            setTimeout(() => setPulsingThreshold(null), 2000);
                        }
                        return data.phase ?? prev;
                    });
                }
                if (data.hitsUntilBossAct !== undefined) setHitsUntilBoss(data.hitsUntilBossAct ?? null);
                if (data.ctbTimeline?.length) setCtbTimeline(data.ctbTimeline);
                if (typeof data.limitBreakCharge === "number") setCurrentCharge(data.limitBreakCharge);
                if (typeof data.manaLeft === "number") setCurrentMana(data.manaLeft);

                // Combo label
                if (data.comboLabel) {
                    setLastComboLabel(data.comboLabel);
                    setTimeout(() => setLastComboLabel(""), 4000);
                }

                // Toasts
                if (data.triggeredSkill) {
                    toast({
                        title: `${data.triggeredSkill.icon} ${data.triggeredSkill.name} ถูกเปิดใช้งาน!`,
                        description: data.triggeredSkill.description,
                        className: "bg-purple-600 text-white",
                    });
                }

                if (data.justStaggered) {
                    toast({ title: "💥 STAGGER!", description: `${boss.name} ถูก Stagger! ดาเมจ ×2 เป็นเวลา 30 วินาที`, className: "bg-amber-500 text-white" });
                }

                if (data.executedBossAction) {
                    const act = data.executedBossAction;
                    toast({
                        title: `${act.icon} ${boss.name}: ${act.name}`,
                        description: act.description,
                        variant: "destructive",
                    });
                }

                if (data.isMiss) {
                    toast({ title: "💨 MISS!", description: "การโจมตีพลาด! (Blind)", variant: "destructive" });
                } else {
                    const skillLabel = selectedSkill ? `✨ ${selectedSkill.name}!` : isLimitBreak ? "💥 LIMIT BREAK!" : isMagic ? "🔮 Magic!" : data.isCrit ? "⚡ CRITICAL!" : "⚔️ โจมตี!";
                    toast({
                        title: skillLabel,
                        description: `ดาเมจ ${(data.damage ?? 0).toLocaleString()} HP${data.isStaggered ? " [STAGGERED ×2]" : ""}`,
                        className: isLimitBreak ? "bg-orange-600 text-white" : isMagic ? "bg-violet-600 text-white" : undefined,
                    });
                }

                if (onAttackSuccess) onAttackSuccess(data);

                if (data.boss == null && onBossDefeated) {
                    onBossDefeated({ bossName: targetName, ...targetRewards });
                }
            } else {
                toast({
                    title: "ไม่สามารถโจมตีได้",
                    description: data.error === "Insufficient stamina" ? "Stamina หมดแล้ว!"
                        : data.error === "Limit Break not ready" ? "Limit Break ยังไม่พร้อม!"
                        : data.error === "MP ไม่พอ (ต้องการ 20 MP)" ? "MP ไม่พอ! (ต้องการ 20 MP)"
                        : (data.error || "เกิดข้อผิดพลาด"),
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAttacking(false);
        }
    };

    const phaseColors = ["", "text-emerald-600", "text-amber-600", "text-orange-600", "text-rose-600 animate-pulse"];
    const phaseBg = ["", "bg-emerald-50 border-emerald-200", "bg-amber-50 border-amber-200", "bg-orange-50 border-orange-200", "bg-rose-50 border-rose-200"];

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full mb-8">
            <GlassCard className="overflow-hidden border-2 border-rose-500/20 shadow-[0_20px_40px_rgba(225,29,72,0.15)]" hover={false}>
                <div className="relative p-6 sm:p-8 flex flex-col gap-6">
                    <div className={`absolute inset-0 transition-colors duration-1000 pointer-events-none ${isLowHp ? "bg-rose-500/10" : "bg-indigo-500/5"}`} />

                    {/* Attack flash overlay */}
                    <AnimatePresence>
                        {flashType && (
                            <motion.div
                                key={`flash-${flashType}`}
                                initial={{ opacity: flashType === "boss" ? 0.55 : 0.45 }}
                                animate={{ opacity: 0 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className={`absolute inset-0 pointer-events-none z-50 rounded-[inherit] ${
                                    flashType === "limitBreak" ? "bg-orange-400" :
                                    flashType === "crit"       ? "bg-yellow-300" :
                                    flashType === "magic"      ? "bg-violet-400" :
                                    flashType === "boss"       ? "bg-rose-600"   :
                                                                 "bg-white"
                                }`}
                            />
                        )}
                    </AnimatePresence>

                    {/* STAGGERED Banner */}
                    <AnimatePresence>
                        {isStaggered && (
                            <motion.div
                                key="stagger-banner"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative z-10 flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-400/90 text-amber-900 border-2 border-amber-300 shadow-lg"
                            >
                                <span className="text-xl">💥</span>
                                <p className="font-black text-sm tracking-widest uppercase">STAGGERED! — ดาเมจ ×2!</p>
                                <span className="text-xl">💥</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Active Effect Banner */}
                    {effectActive && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative z-10 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-purple-600/90 text-white border border-purple-400/30 shadow-lg"
                        >
                            <span className="text-2xl">{activeEffect.skillIcon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-sm leading-none">{activeEffect.skillName} <span className="font-medium opacity-80">— กำลังใช้งาน</span></p>
                                <p className="text-xs opacity-75 mt-0.5">
                                    {activeEffect.type === "DAMAGE_REDUCTION" && `ลดดาเมจ ${Math.round(activeEffect.effectValue * 100)}%`}
                                    {activeEffect.type === "DAMAGE_AMPLIFY" && `⚡ Enrage! รับดาเมจเพิ่ม ${Math.round(activeEffect.effectValue * 100)}%`}
                                    {activeEffect.type === "STAMINA_DOUBLE" && "การโจมตีแต่ละครั้งใช้ Stamina ×2"}
                                    {activeEffect.type === "XP_REDUCTION" && `EXP ที่ได้รับลดลง ${Math.round(activeEffect.effectValue * 100)}%`}
                                    {activeEffect.type === "GOLD_BOOST" && `Gold ที่ได้รับเพิ่มขึ้น ${Math.round(activeEffect.effectValue * 100)}%`}
                                    {activeEffect.type === "CRIT_IMMUNITY" && "คริติคอลไม่ทำงาน"}
                                    {activeEffect.expiresAt && ` · หมดอายุ ${new Date(activeEffect.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                                    {activeEffect.expiresAt === null && " · ถาวรจนกว่าบอสจะตาย"}
                                </p>
                            </div>
                            {activeEffect.type === "DAMAGE_AMPLIFY" && (
                                <span className="text-xs font-black bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full uppercase animate-pulse">ENRAGE</span>
                            )}
                        </motion.div>
                    )}

                    {/* Main boss row */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 relative z-10">
                        {/* Boss Image + Phase */}
                        <div className="relative shrink-0 flex flex-col items-center">
                            <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full animate-pulse" />
                            <motion.div
                                animate={{ y: [-5, 5, -5], rotate: [-2, 2, -2] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="relative z-10 w-32 h-32 sm:w-40 sm:h-40"
                            >
                                <Image
                                    src={boss.image || "/assets/monsters/lethargy_dragon.png"}
                                    alt={boss.name}
                                    fill
                                    className="object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)]"
                                />
                            </motion.div>
                            <div className="mt-4 bg-rose-600 text-white text-[10px] sm:text-xs font-black px-4 py-1 rounded-full shadow-lg border-2 border-rose-400/50 uppercase tracking-widest z-20">
                                Personal Boss
                            </div>
                            {/* Phase badge */}
                            <div className={`mt-1 px-3 py-0.5 rounded-full border text-[10px] font-black uppercase z-20 ${phaseBg[phase]}`}>
                                <span className={phaseColors[phase]}>Phase {phase}</span>
                            </div>
                            {boss.element && (
                                <div className="mt-1 text-[10px] font-bold text-slate-500 z-20">
                                    {boss.elementIcon} {boss.element}
                                </div>
                            )}
                        </div>

                        {/* Boss Stats */}
                        <div className="flex-1 w-full space-y-4 relative z-10">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none uppercase italic">
                                        {boss.name}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                            <Users className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase">Classroom Goal</span>
                                        </div>
                                        {boss.deadline && (
                                            <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-[10px] font-black text-amber-600 uppercase">Limited Time</span>
                                            </div>
                                        )}
                                        {boss.difficulty && (
                                            <div className="bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                                                <span className="text-[10px] font-black text-purple-600 uppercase">{boss.difficulty}</span>
                                            </div>
                                        )}
                                        {elementLabel && jobEl !== "NEUTRAL" && (
                                            <div className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${elementMult > 1 ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"}`}>
                                                {elementLabel}
                                            </div>
                                        )}
                                        {elementMult > 1 && (
                                            <motion.div
                                                animate={{ scale: [1, 1.06, 1] }}
                                                transition={{ duration: 1.2, repeat: Infinity }}
                                                className="px-2 py-0.5 rounded-lg border text-[10px] font-black bg-orange-50 border-orange-300 text-orange-700"
                                            >
                                                ⚡ PRESSURED
                                            </motion.div>
                                        )}
                                        {comboReady && (
                                            <motion.div
                                                animate={{ scale: [1, 1.05, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="px-2 py-0.5 rounded-lg border text-[10px] font-black bg-cyan-50 border-cyan-300 text-cyan-700"
                                            >
                                                🔗 Combo Ready!
                                            </motion.div>
                                        )}
                                        {lastComboLabel && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="px-2 py-0.5 rounded-lg border text-[10px] font-black bg-cyan-100 border-cyan-400 text-cyan-800"
                                            >
                                                {lastComboLabel}
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-3xl sm:text-4xl font-black italic tracking-tighter tabular-nums ${isLowHp ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>
                                        {hpPercentage.toFixed(1)}%
                                    </span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Health Remaining</p>
                                    <p className="text-xs text-slate-500 font-bold tabular-nums mt-0.5">
                                        {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Boss HP Bar */}
                            <div className="relative group">
                                <div className="relative w-full h-8 sm:h-10 bg-slate-100 rounded-2xl border-4 border-white shadow-inner overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${hpPercentage}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className={`h-full relative overflow-hidden ${isLowHp ? "bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400" : "bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500"}`}
                                    >
                                        <motion.div
                                            animate={{ x: ["-100%", "200%"] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                                        />
                                    </motion.div>
                                    {[75, 50, 25].map((pct, i) => {
                                        const thresholdPhase = [2, 3, 4][i];
                                        const isPulsing = pulsingThreshold === thresholdPhase;
                                        return (
                                            <motion.div
                                                key={pct}
                                                className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                                                style={{ left: `${pct}%` }}
                                                animate={isPulsing ? { scaleX: [1, 6, 1], opacity: [0.6, 1, 0.6] } : {}}
                                                transition={{ duration: 0.5, repeat: isPulsing ? 3 : 0 }}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="absolute -left-3 -top-3 w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform">
                                    <Sword className="w-6 h-6 text-rose-500" />
                                </div>
                            </div>

                            {/* Stagger Gauge + Boss Turn Countdown */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-sm ${isStaggered ? "animate-bounce" : ""}`}>💥</span>
                                    <span className={`text-[10px] font-black uppercase ${isStaggered ? "text-amber-600" : "text-slate-500"}`}>
                                        {isStaggered ? "STAGGERED!" : "Stagger"}
                                    </span>
                                </div>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full border border-slate-200 overflow-hidden relative">
                                    <motion.div
                                        animate={{ width: isStaggered ? "100%" : `${Math.min(100, staggerGauge)}%` }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className={`h-full rounded-full ${isStaggered ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 animate-pulse" : "bg-gradient-to-r from-violet-400 to-purple-500"}`}
                                    />
                                </div>
                                <span className={`text-[10px] font-black tabular-nums shrink-0 ${isStaggered ? "text-amber-600" : "text-slate-500"}`}>
                                    {isStaggered ? "MAX" : `${Math.min(100, staggerGauge)}/100`}
                                </span>
                                {/* Boss turn countdown (fallback when no timeline) */}
                                {!isStaggered && hitsUntilBoss !== null && ctbTimeline.length === 0 && (
                                    <motion.div
                                        animate={hitsUntilBoss === 1 ? { scale: [1, 1.1, 1] } : {}}
                                        transition={{ duration: 0.6, repeat: hitsUntilBoss === 1 ? Infinity : 0 }}
                                        className={`shrink-0 px-2 py-0.5 rounded-lg border text-[10px] font-black ${
                                            hitsUntilBoss === 1
                                                ? "bg-rose-100 border-rose-400 text-rose-700"
                                                : "bg-slate-100 border-slate-300 text-slate-600"
                                        }`}
                                    >
                                        {hitsUntilBoss === 1 ? "⚠️ Boss โจมตี!" : `Boss act ใน ${hitsUntilBoss} hits`}
                                    </motion.div>
                                )}
                            </div>

                            {/* CTB Timeline Bar */}
                            {ctbTimeline.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Turn Order</span>
                                    <div className="flex items-center gap-1.5">
                                        {ctbTimeline.map((slot, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: i === 0 ? 1.15 : 1, opacity: 1 }}
                                                transition={{ duration: 0.2, delay: i * 0.03 }}
                                                className={`relative flex items-center justify-center rounded-lg border font-black transition-all
                                                    ${i === 0 ? "w-9 h-9 shadow-md" : "w-7 h-7"}
                                                    ${slot.owner === "boss"
                                                        ? "bg-rose-100 border-rose-400 text-rose-700"
                                                        : "bg-sky-100 border-sky-400 text-sky-700"}`}
                                            >
                                                {slot.owner === "boss" ? "👹" : "⚔️"}
                                                {i === 0 && (
                                                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-500 whitespace-nowrap">NEXT</span>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Limit Break Gauge */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Flame className={`w-4 h-4 ${lbReady ? "text-orange-500 fill-orange-500 animate-pulse" : "text-slate-400"}`} />
                                    <span className={`text-[10px] font-black uppercase ${lbReady ? "text-orange-600" : "text-slate-500"}`}>
                                        {lbReady ? "LIMIT BREAK!" : "Limit Break"}
                                    </span>
                                </div>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full border border-slate-200 overflow-hidden relative">
                                    <motion.div
                                        animate={{ width: `${Math.min(100, lbCharge)}%` }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className={`h-full rounded-full ${lbReady ? "bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 animate-pulse" : "bg-gradient-to-r from-orange-300 to-red-400"}`}
                                    />
                                </div>
                                <span className={`text-[10px] font-black tabular-nums shrink-0 ${lbReady ? "text-orange-600" : "text-slate-500"}`}>
                                    {Math.min(100, lbCharge)}/100
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Player Battle State ── */}
                    <div className="relative z-10 pt-4 border-t border-slate-100">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-3">สถานะผู้เล่น</p>

                        {/* KO Banner */}
                        <AnimatePresence>
                            {playerBattleHp <= 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="mb-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 border-2 border-rose-500 text-white"
                                >
                                    <span className="text-xl">💀</span>
                                    <div className="text-center">
                                        <p className="font-black text-sm tracking-widest text-rose-400">K.O.!</p>
                                        <p className="text-[10px] text-slate-300 mt-0.5">กำลังฟื้นคืน — ถูกล็อค 2 ตา</p>
                                    </div>
                                    <span className="text-xl">💀</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col gap-3">
                            {/* HP + MP bars */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* HP bar */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-black text-slate-600 uppercase">❤️ Battle HP</span>
                                        <span className={`text-xs font-black tabular-nums ${playerHpPct <= 20 ? "text-rose-600 animate-pulse" : playerHpPct <= 50 ? "text-amber-600" : "text-emerald-600"}`}>
                                            {playerBattleHp.toLocaleString()} / {playerMaxBattleHp.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                                        <motion.div
                                            animate={{ width: `${playerHpPct}%` }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className={`h-full rounded-full ${playerBattleHp <= 0 ? "bg-slate-400" : playerHpPct <= 20 ? "bg-gradient-to-r from-rose-500 to-rose-400" : playerHpPct <= 50 ? "bg-gradient-to-r from-amber-400 to-yellow-400" : "bg-gradient-to-r from-emerald-500 to-green-400"}`}
                                        />
                                    </div>
                                </div>
                                {/* MP bar */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-black text-slate-600 uppercase">🔮 Mana</span>
                                        <span className={`text-xs font-black tabular-nums ${currentMana <= 20 ? "text-slate-400" : "text-violet-600"}`}>
                                            {currentMana} MP
                                        </span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                                        <motion.div
                                            animate={{ width: `${Math.min(100, (currentMana / 200) * 100)}%` }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status effects */}
                            <div className="flex flex-wrap gap-1.5 items-center">
                                {activeStatuses.length > 0 ? activeStatuses.map((s, i) => {
                                    const meta = STATUS_META[s.type] ?? { icon: "❓", label: s.type, color: "bg-slate-100 border-slate-300 text-slate-700" };
                                    return (
                                        <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black ${meta.color}`}>
                                            <span>{meta.icon}</span>
                                            <span>{meta.label}</span>
                                            <span className="opacity-70">×{s.remainingTurns}</span>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-[10px] text-slate-400 font-medium">ไม่มี status effect</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Rewards + Action Buttons ── */}
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                <Trophy className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-800 leading-none">REWARD FOR VICTORY</p>
                                <p className="text-[10px] font-medium text-slate-500">
                                    {boss.rewardGold ? `🪙 ${boss.rewardGold} ` : ""}
                                    {boss.rewardXp ? `✨ ${boss.rewardXp} XP` : "Gold, XP & Materials"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Stamina / Mana indicators */}
                            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-colors ${stamina > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-100 border-slate-200 opacity-60"}`}>
                                <Zap className={`w-3.5 h-3.5 ${stamina > 0 ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                                <span className={`text-xs font-black ${stamina > 0 ? "text-amber-700" : "text-slate-400"}`}>{stamina}/{maxStamina} ST</span>
                                {staminaCountdown && (
                                    <span className="text-xs text-amber-500 font-mono">+1 {staminaCountdown}</span>
                                )}
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-colors ${currentMana >= 20 ? "bg-violet-50 border-violet-200" : "bg-slate-100 border-slate-200 opacity-60"}`}>
                                <WandSparkles className={`w-3.5 h-3.5 ${currentMana >= 20 ? "text-violet-500" : "text-slate-400"}`} />
                                <span className={`text-xs font-black ${currentMana >= 20 ? "text-violet-700" : "text-slate-400"}`}>{currentMana} MP</span>
                            </div>

                            {/* HP Potion button */}
                            <motion.button
                                whileHover={currentGold >= 100 && !isUsingPotion && !isPreviewBoss ? { scale: 1.05 } : {}}
                                whileTap={currentGold >= 100 && !isUsingPotion && !isPreviewBoss ? { scale: 0.95 } : {}}
                                onClick={() => handlePotion("HP")}
                                disabled={currentGold < 100 || isUsingPotion || isAttacking || isPreviewBoss}
                                title={isPreviewBoss ? "โจมตีบอสก่อนเพื่อใช้ยา" : "HP Potion — ฟื้น 40% HP (100 Gold)"}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all ${currentGold >= 100 && !isUsingPotion && !isAttacking && !isPreviewBoss ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                            >
                                ❤️ 100g
                            </motion.button>

                            {/* MP Elixir button */}
                            <motion.button
                                whileHover={currentGold >= 60 && !isUsingPotion && !isPreviewBoss ? { scale: 1.05 } : {}}
                                whileTap={currentGold >= 60 && !isUsingPotion && !isPreviewBoss ? { scale: 0.95 } : {}}
                                onClick={() => handlePotion("MP")}
                                disabled={currentGold < 60 || isUsingPotion || isAttacking || isPreviewBoss}
                                title={isPreviewBoss ? "โจมตีบอสก่อนเพื่อใช้ยา" : "MP Elixir — ฟื้น 80 MP (60 Gold)"}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all ${currentGold >= 60 && !isUsingPotion && !isAttacking && !isPreviewBoss ? "bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                            >
                                🔮 60g
                            </motion.button>

                            {/* Battle Log toggle */}
                            <button
                                onClick={() => setShowLog((v) => !v)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-black flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
                            >
                                <ScrollText className="w-3.5 h-3.5" />
                                Log
                            </button>

                            {/* Limit Break button */}
                            {lbReady && (
                                <motion.button
                                    whileHover={stamina > 0 && !isAttacking ? { scale: 1.05 } : {}}
                                    whileTap={stamina > 0 && !isAttacking ? { scale: 0.95 } : {}}
                                    onClick={() => handleAttack("limitBreak")}
                                    disabled={stamina <= 0 || isAttacking || isBound}
                                    className={`relative px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg animate-pulse ${stamina > 0 && !isAttacking && !isBound ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-orange-200 border-2 border-orange-400/50" : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300"}`}
                                >
                                    {isAttacking ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Target className="w-4 h-4" /></motion.div> : <Flame className="w-4 h-4" />}
                                    LIMIT BREAK!
                                </motion.button>
                            )}

                            {/* Magic / Skill button:
                                - หากมีสกิล → แสดงเฉพาะเมื่อเลือกสกิลแล้ว
                                - หากไม่มีสกิลเลย → แสดง Magic (20 MP) ทั่วไป */}
                            {bossSkills.length === 0 ? (
                                <motion.button
                                    whileHover={currentMana >= 20 && !isAttacking && !isBound ? { scale: 1.05 } : {}}
                                    whileTap={currentMana >= 20 && !isAttacking && !isBound ? { scale: 0.95 } : {}}
                                    onClick={() => handleAttack("magic")}
                                    disabled={currentMana < 20 || isAttacking || isBound}
                                    className={`relative px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${currentMana >= 20 && !isAttacking && !isBound ? "bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200 border-2 border-violet-400/50" : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300"}`}
                                >
                                    {isAttacking ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Target className="w-4 h-4" /></motion.div> : <WandSparkles className="w-4 h-4" />}
                                    Magic (20 MP)
                                </motion.button>
                            ) : selectedSkillId ? (() => {
                                const activeSkill = bossSkills.find((s) => s.id === selectedSkillId)!;
                                const canCast = currentMana >= activeSkill.cost && !isAttacking && !isBound;
                                return (
                                    <motion.button
                                        whileHover={canCast ? { scale: 1.05 } : {}}
                                        whileTap={canCast ? { scale: 0.95 } : {}}
                                        onClick={() => handleAttack("magic", activeSkill.id)}
                                        disabled={!canCast}
                                        className={`relative px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${canCast ? "bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200 border-2 border-violet-400/50" : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300"}`}
                                    >
                                        {isAttacking ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Target className="w-4 h-4" /></motion.div> : <WandSparkles className="w-4 h-4" />}
                                        {activeSkill.name} ({activeSkill.cost} MP)
                                    </motion.button>
                                );
                            })() : null}

                            {/* Normal attack button */}
                            <motion.button
                                whileHover={stamina > 0 && !isAttacking && !isBound ? { scale: 1.05 } : {}}
                                whileTap={stamina > 0 && !isAttacking && !isBound ? { scale: 0.95 } : {}}
                                onClick={() => handleAttack("attack")}
                                disabled={stamina <= 0 || isAttacking || isBound}
                                className={`relative px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${stamina > 0 && !isAttacking && !isBound ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200 border-2 border-rose-400/50" : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300"}`}
                            >
                                {isAttacking ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Target className="w-4 h-4" /></motion.div> : <Sword className="w-4 h-4" />}
                                โจมตี
                            </motion.button>
                        </div>
                    </div>

                    {/* ── Player Skill Selector ── */}
                    {bossSkills.length > 0 && (
                        <div className="relative z-10 pt-2 border-t border-slate-100">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">สกิลของคุณ — เลือกก่อนกด Magic</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {bossSkills.map((sk) => {
                                    const isSelected = selectedSkillId === sk.id;
                                    const canAfford = currentMana >= sk.cost;
                                    const dmgText = sk.damageMultiplier ? `×${sk.damageMultiplier.toFixed(2)}` : "";
                                    const critText = sk.isCrit ? " 💥Crit" : "";
                                    void critText;
                                    return (
                                        <button
                                            key={sk.id}
                                            onClick={() => setSelectedSkillId(isSelected ? null : sk.id)}
                                            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                                                isSelected
                                                    ? "bg-violet-50 border-violet-400 shadow ring-2 ring-violet-300"
                                                    : canAfford
                                                    ? "bg-white border-slate-200 hover:border-violet-300 hover:bg-violet-50/50"
                                                    : "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                                            }`}
                                            disabled={!canAfford && !isSelected}
                                        >
                                            <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                {sk.icon ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={sk.icon} alt={sk.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg">✨</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs font-black leading-none truncate ${isSelected ? "text-violet-700" : "text-slate-700"}`}>
                                                    {sk.name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                                    {sk.cost} MP{dmgText ? ` · ${dmgText}` : ""}{sk.isCrit ? " · Crit" : ""}
                                                </p>
                                            </div>
                                            {isSelected && (
                                                <span className="text-[9px] font-black bg-violet-500 text-white px-1.5 py-0.5 rounded-full shrink-0">✓</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Battle Log ── */}
                    <AnimatePresence>
                        {showLog && (
                            <motion.div
                                key="battle-log"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative z-10 overflow-hidden"
                            >
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">Battle Log</p>
                                    <div
                                        ref={logRef}
                                        className="h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200"
                                    >
                                        {battleLog.length === 0 && (
                                            <p className="text-[11px] text-slate-400 italic text-center pt-4">ยังไม่มี log การต่อสู้</p>
                                        )}
                                        {battleLog.map((entry) => (
                                            <div key={entry.id} className="flex items-start gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                                                <span className={`text-[11px] font-bold flex-1 leading-snug ${LOG_COLOR[entry.type] ?? "text-slate-600"}`}>
                                                    {entry.text}
                                                </span>
                                                <span className="text-[9px] text-slate-400 shrink-0 tabular-nums">
                                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Boss Skills Panel ── */}
                    {skills.length > 0 && (
                        <div className="relative z-10 pt-2 border-t border-slate-100">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">สกิลบอส</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {skills.map((sk) => {
                                    const isTriggered = triggeredSkills.includes(sk.id);
                                    const isActive = effectActive && activeEffect?.skillId === sk.id;
                                    const thresholdPct = Math.round(sk.triggerHpPct * 100);
                                    return (
                                        <div
                                            key={sk.id}
                                            className={`relative flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${isActive ? "bg-purple-50 border-purple-300 shadow" : isTriggered ? "bg-slate-100 border-slate-200 opacity-60" : "bg-white border-slate-200"}`}
                                        >
                                            <span className="text-xl shrink-0">{sk.icon}</span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className={`text-xs font-black leading-none ${isActive ? "text-purple-700" : "text-slate-700"}`}>{sk.name}</p>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-purple-200 text-purple-700 animate-pulse" : isTriggered ? "bg-slate-200 text-slate-500" : hpPercentage <= thresholdPct ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>
                                                        {isTriggered ? "✓ triggered" : isActive ? "● active" : `HP ≤${thresholdPct}%`}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">{sk.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>
        </motion.div>
    );
}
