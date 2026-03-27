"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sword, ShieldAlert, Trophy, Users, Zap, Target } from "lucide-react";
import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";
import { getBossPreset } from "@/lib/game/boss-config";

interface ActiveEffect {
    type: string;
    effectValue: number;
    expiresAt: string | null;
    skillId: string;
    skillName: string;
    skillIcon: string;
}

interface BossProp {
    active: boolean;
    name: string;
    maxHp: number;
    currentHp: number;
    image: string;
    deadline?: string;
    bossId?: string;
    element?: string;
    elementIcon?: string;
    difficulty?: string;
    rewardGold?: number;
    rewardXp?: number;
    rewardMaterials?: { type: string; quantity: number }[];
    triggeredSkills?: string[];
    activeEffect?: ActiveEffect | null;
    passiveDamageMultiplier?: number;
}

interface WorldBossBarProps {
    boss: BossProp;
    studentId?: string;
    stamina?: number;
    classId?: string;
    onAttackSuccess?: (data: unknown) => void;
}

export function WorldBossBar({ boss, studentId: _studentId, stamina = 0, classId, onAttackSuccess }: WorldBossBarProps) {
    const { socket } = useSocket();
    const [isAttacking, setIsAttacking] = useState(false);
    const [damageLog, setDamageLog] = useState<{ damage: number; isCrit: boolean; time: Date }[]>([]);
    const { toast } = useToast();

    if (!boss || !boss.active) return null;

    const hpPercentage = (boss.currentHp / boss.maxHp) * 100;
    const isLowHp = hpPercentage < 20;

    const preset = boss.bossId ? getBossPreset(boss.bossId) : null;
    const skills = preset?.skills ?? [];
    const triggeredSkills = boss.triggeredSkills ?? [];
    const activeEffect = boss.activeEffect ?? null;

    // Check if active effect has expired
    const effectActive = activeEffect && (
        activeEffect.expiresAt === null || new Date(activeEffect.expiresAt) > new Date()
    );

    const handleAttack = async () => {
        if (!classId || stamina <= 0 || isAttacking) return;

        setIsAttacking(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/boss/attack`, { method: "POST" });
            const data = await res.json() as {
                success: boolean;
                damage?: number;
                isCrit?: boolean;
                boss?: BossProp;
                error?: string;
                triggeredSkill?: { name: string; icon: string; description: string };
            };

            if (data.success) {
                if (data.boss) {
                    socket?.emit("classroom-update", {
                        classId,
                        type: "BOSS_HP_UPDATE",
                        data: { currentHp: data.boss.currentHp, boss: data.boss }
                    });
                }

                if (data.triggeredSkill) {
                    toast({
                        title: `${data.triggeredSkill.icon} ${data.triggeredSkill.name} ถูกเปิดใช้งาน!`,
                        description: data.triggeredSkill.description,
                        className: "bg-purple-600 text-white",
                    });
                }

                toast({
                    title: data.isCrit ? "⚡ CRITICAL HIT!" : "⚔️ Attack Successful!",
                    description: `คุณทำความเสียหาย ${(data.damage ?? 0).toLocaleString()} HP! ${data.isCrit ? "(x2 Damage)" : ""}`,
                });
                setDamageLog(prev => [
                    { damage: data.damage ?? 0, isCrit: data.isCrit ?? false, time: new Date() },
                    ...prev,
                ].slice(0, 5));
                if (onAttackSuccess) onAttackSuccess(data);
            } else {
                toast({
                    title: "ไม่สามารถโจมตีได้",
                    description: data.error === "Insufficient stamina"
                        ? "Stamina ของคุณหมดแล้ว!"
                        : (data.error || "เกิดข้อผิดพลาดในการโจมตี"),
                    variant: "destructive"
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAttacking(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-8"
        >
            <GlassCard className="overflow-hidden border-2 border-rose-500/20 shadow-[0_20px_40px_rgba(225,29,72,0.15)]" hover={false}>
                <div className="relative p-6 sm:p-8 flex flex-col gap-6">
                    {/* Animated Background Pulse */}
                    <div className={`absolute inset-0 transition-colors duration-1000 pointer-events-none ${isLowHp ? "bg-rose-500/10" : "bg-indigo-500/5"}`} />

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
                                    {activeEffect.type === "HP_REGEN" && "ฟื้นฟู HP แล้ว"}
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
                        {/* Boss Image */}
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
                                World Boss
                            </div>
                            {boss.element && (
                                <div className="mt-1 text-[10px] font-bold text-slate-500 z-20">
                                    {boss.elementIcon} {boss.element}
                                </div>
                            )}
                        </div>

                        {/* Boss Stats */}
                        <div className="flex-1 w-full space-y-5 relative z-10">
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

                            {/* HP Bar */}
                            <div className="relative group">
                                {/* Skill threshold markers */}
                                <div className="relative w-full h-8 sm:h-10 bg-slate-100 rounded-2xl border-4 border-white shadow-inner overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${hpPercentage}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className={`h-full relative overflow-hidden ${
                                            isLowHp
                                                ? "bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400"
                                                : "bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500"
                                        }`}
                                    >
                                        <motion.div
                                            animate={{ x: ["-100%", "200%"] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                                        />
                                    </motion.div>

                                    {/* Skill threshold lines */}
                                    {[75, 50, 25].map((pct) => (
                                        <div
                                            key={pct}
                                            className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                                            style={{ left: `${pct}%` }}
                                        />
                                    ))}
                                </div>
                                <div className="absolute -left-3 -top-3 w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform">
                                    <Sword className="w-6 h-6 text-rose-500" />
                                </div>
                            </div>

                            {/* Damage Log */}
                            {damageLog.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {damageLog.slice(0, 3).map((entry, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                                                entry.isCrit
                                                    ? "bg-amber-50 border-amber-200 text-amber-700"
                                                    : "bg-rose-50 border-rose-200 text-rose-700"
                                            }`}
                                        >
                                            <Sword className="w-3 h-3" />
                                            <span>{entry.isCrit ? "⚡" : "⚔️"} {entry.damage.toLocaleString()}</span>
                                            <span className="text-[9px] font-medium opacity-60">
                                                {entry.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Rewards + Attack */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                        <Trophy className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-800 leading-none">REWARD FOR VICTORY</p>
                                        <p className="text-[10px] font-medium text-slate-500">
                                            {boss.rewardGold ? `🪙 ${boss.rewardGold} ` : ""}
                                            {boss.rewardXp ? `✨ ${boss.rewardXp} XP` : "Gold, XP & Class Badge"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-colors ${stamina > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-100 border-slate-200 opacity-60"}`}>
                                        <Zap className={`w-3.5 h-3.5 ${stamina > 0 ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                                        <span className={`text-xs font-black ${stamina > 0 ? "text-amber-700" : "text-slate-400"}`}>{stamina} Stamina</span>
                                    </div>

                                    <motion.button
                                        whileHover={stamina > 0 && !isAttacking ? { scale: 1.05 } : {}}
                                        whileTap={stamina > 0 && !isAttacking ? { scale: 0.95 } : {}}
                                        onClick={handleAttack}
                                        disabled={stamina <= 0 || isAttacking}
                                        className={`relative px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${
                                            stamina > 0 && !isAttacking
                                                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200 border-2 border-rose-400/50"
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300"
                                        }`}
                                    >
                                        {isAttacking ? (
                                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                                <Target className="w-5 h-5" />
                                            </motion.div>
                                        ) : (
                                            <Sword className="w-5 h-5" />
                                        )}
                                        <span>โจมตีบอส</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                            className={`relative flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${
                                                isActive
                                                    ? "bg-purple-50 border-purple-300 shadow"
                                                    : isTriggered
                                                        ? "bg-slate-100 border-slate-200 opacity-60"
                                                        : "bg-white border-slate-200"
                                            }`}
                                        >
                                            <span className="text-xl shrink-0">{sk.icon}</span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className={`text-xs font-black leading-none ${isActive ? "text-purple-700" : "text-slate-700"}`}>
                                                        {sk.name}
                                                    </p>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                                        isActive
                                                            ? "bg-purple-200 text-purple-700 animate-pulse"
                                                            : isTriggered
                                                                ? "bg-slate-200 text-slate-500"
                                                                : hpPercentage <= thresholdPct
                                                                    ? "bg-rose-100 text-rose-600"
                                                                    : "bg-slate-100 text-slate-400"
                                                    }`}>
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
