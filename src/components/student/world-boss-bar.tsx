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
}

export function WorldBossBar({ boss }: WorldBossBarProps) {
    if (!boss || !boss.active) return null;

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

                        {/* Call to Action */}
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
                            <div className="bg-indigo-600/5 px-4 py-2 rounded-xl border border-indigo-200/50">
                                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                                    ส่งการบ้านเพื่อโจมตี! <span className="text-xs ml-1">⚔️</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}
