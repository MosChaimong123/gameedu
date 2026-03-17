"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sword, ShieldAlert, Trophy, Users } from "lucide-react";
import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";

interface WorldBossBarProps {
    boss: {
        active: boolean;
        name: string;
        maxHp: number;
        currentHp: number;
        image: string;
        deadline?: string;
    };
    studentId?: string;
    stamina?: number;
    classId?: string;
    onAttackSuccess?: (data: any) => void;
}

import { useState } from "react";
import { Zap, Target } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function WorldBossBar({ boss, studentId, stamina = 0, classId, onAttackSuccess }: WorldBossBarProps) {
    const [isAttacking, setIsAttacking] = useState(false);
    const { toast } = useToast();

    if (!boss || !boss.active) return null;

    const handleAttack = async () => {
        if (!classId || stamina <= 0 || isAttacking) return;

        setIsAttacking(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/boss/attack`, { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                toast({
                    title: data.isCrit ? "⚡ CRITICAL HIT!" : "⚔️ Attack Successful!",
                    description: `คุณทำความเสียหาย ${data.damage.toLocaleString()} HP! ${data.isCrit ? "(x2 Damage)" : ""}`,
                });
                if (onAttackSuccess) onAttackSuccess(data);
            } else {
                toast({
                    title: "ไม่สามารถโจมตีได้",
                    description: data.error === "Insufficient stamina" ? "Stamina ของคุณหมดแล้ว!" : (data.error || "เกิดข้อผิดพลาดในการโจมตี"),
                    variant: "destructive"
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAttacking(false);
        }
    };

    const hpPercentage = (boss.currentHp / boss.maxHp) * 100;
    const isLowHp = hpPercentage < 20;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-8"
        >
            <GlassCard className="overflow-hidden border-2 border-rose-500/20 shadow-[0_20px_40px_rgba(225,29,72,0.15)]" hover={false}>
                <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                    {/* Animated Background Pulse */}
                    <div className={`absolute inset-0 transition-colors duration-1000 ${isLowHp ? 'bg-rose-500/10' : 'bg-indigo-500/5'}`} />
                    
                    {/* Boss Image Section */}
                    <div className="relative shrink-0 flex flex-col items-center">
                        <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full animate-pulse" />
                        <motion.div
                            animate={{ 
                                y: [-5, 5, -5],
                                rotate: [-2, 2, -2]
                            }}
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
                    </div>

                    {/* Boss Stats Section */}
                    <div className="flex-1 w-full space-y-5 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none uppercase italic">
                                    {boss.name}
                                </h2>
                                <div className="flex items-center gap-2 mt-2">
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
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-3xl sm:text-4xl font-black italic tracking-tighter tabular-nums ${isLowHp ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                                    {hpPercentage.toFixed(1)}%
                                </span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Health Remaining</p>
                            </div>
                        </div>

                        {/* HP Bar Container */}
                        <div className="relative group">
                            {/* HP Bar Background */}
                            <div className="w-full h-8 sm:h-10 bg-slate-100 rounded-2xl border-4 border-white shadow-inner overflow-hidden relative">
                                {/* HP Bar Fill */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${hpPercentage}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className={`h-full relative overflow-hidden ${
                                        isLowHp 
                                            ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400' 
                                            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500'
                                    }`}
                                >
                                    {/* Shimmer / Glint effect */}
                                    <motion.div
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                                    />
                                    
                                    {/* Bubbling effect for "energy" */}
                                    <div className="absolute inset-0 overflow-hidden opacity-30">
                                        {[...Array(5)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    y: [-20, 20],
                                                    x: [0, (i % 2 === 0 ? 20 : -20)],
                                                    opacity: [0, 1, 0]
                                                }}
                                                transition={{
                                                    duration: 2 + Math.random(),
                                                    repeat: Infinity,
                                                    delay: i * 0.5
                                                }}
                                                className="absolute w-2 h-2 bg-white rounded-full"
                                                style={{ left: `${20 * i}%`, bottom: '0' }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Markers */}
                                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                                    <div className="w-px h-full bg-black/5" />
                                    <div className="w-px h-full bg-black/5" />
                                    <div className="w-px h-full bg-black/5" />
                                </div>
                            </div>
                            
                            {/* Sword / Damage Indicator */}
                            <div className="absolute -left-3 -top-3 w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform">
                                <Sword className="w-6 h-6 text-rose-500" />
                            </div>
                        </div>

                        {/* Call to Action & Attack Button */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                    <Trophy className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-800 leading-none">REWARD FOR VICTORY</p>
                                    <p className="text-[10px] font-medium text-slate-500 italic">Gold, XP & Class Badge</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-colors ${stamina > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                                    <Zap className={`w-3.5 h-3.5 ${stamina > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                                    <span className={`text-xs font-black ${stamina > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{stamina} Energy</span>
                                </div>

                                <motion.button
                                    whileHover={stamina > 0 && !isAttacking ? { scale: 1.05 } : {}}
                                    whileTap={stamina > 0 && !isAttacking ? { scale: 0.95 } : {}}
                                    onClick={handleAttack}
                                    disabled={stamina <= 0 || isAttacking}
                                    className={`relative px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${
                                        stamina > 0 && !isAttacking
                                            ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200 border-2 border-rose-400/50' 
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300'
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
                                    
                                    {isAttacking && (
                                        <motion.div 
                                            layoutId="attack-ripple"
                                            className="absolute inset-0 bg-white/20 rounded-xl"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                        />
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}
