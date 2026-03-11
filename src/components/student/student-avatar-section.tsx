"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Camera, Zap, Heart, Shield, Trophy } from "lucide-react";
import { AvatarPickerModal } from "./avatar-picker-modal";
import { type RankEntry, getNextRankProgress } from "@/lib/classroom-utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatProgress } from "./StatProgress";
import { motion, AnimatePresence } from "framer-motion";
import { IdleEngine, type GameStats } from "@/lib/game/idle-engine";
import { useEffect, useRef } from "react";
import { Coins } from "lucide-react";

interface StudentAvatarSectionProps {
    studentId: string;
    classId: string;
    loginCode: string;
    initialAvatar: string;
    name: string;
    nickname?: string | null;
    points: number;
    behaviorPoints: number;
    rankEntry: RankEntry;
    totalPositive: number;
    totalNegative: number;
    themeClass: string;
    themeStyle: React.CSSProperties;
    levelConfig?: any;
    gameStats?: any;
    lastSyncTime?: any;
    onUpdateStudent?: (data: any) => void;
}

export function StudentAvatarSection({
    studentId, classId, loginCode, initialAvatar,
    name, nickname, points, behaviorPoints, rankEntry,
    totalPositive, totalNegative,
    themeClass, themeStyle, levelConfig,
    gameStats, lastSyncTime,
    onUpdateStudent
}: StudentAvatarSectionProps) {
    const [avatar, setAvatar] = useState(initialAvatar);
    const [showPicker, setShowPicker] = useState(false);
    
    // Live Gold State
    const [displayGold, setDisplayGold] = useState<number>(0);
    const goldValueRef = useRef<number>(0);
    const goldRateRef = useRef<number>(0);
    const lastSyncRef = useRef<Date>(lastSyncTime ? new Date(lastSyncTime) : new Date());

    // Sync Gold to Database
    const syncGold = async (currentGold: number) => {
        try {
            const res = await fetch(`/api/student/${loginCode}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    clientGold: currentGold,
                    lastSyncTime: lastSyncRef.current.toISOString()
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                lastSyncRef.current = new Date(data.lastSyncTime);
                // Update parent state to keep everything in sync
                if (onUpdateStudent) {
                    onUpdateStudent({
                        gameStats: { ...gameStats, gold: data.gold },
                        lastSyncTime: data.lastSyncTime
                    });
                }
            }
        } catch (err) {
            console.error("Failed to sync gold:", err);
        }
    };

    // Initialize and Tick Gold
    useEffect(() => {
        // Use 'points' (academicTotal) for rank-based gold calculations
        const baseResources = IdleEngine.calculateCurrentResources({ 
            points, 
            gameStats, 
            lastSyncTime,
            classroom: { levelConfig }
        });
        
        const initialGold = baseResources.stats.gold;
        setDisplayGold(initialGold);
        goldValueRef.current = initialGold;

        const rate = IdleEngine.calculateGoldRate(points, baseResources.stats, levelConfig);
        goldRateRef.current = rate;

        const startTime = Date.now();
        const startGold = initialGold;

        // Ticking logic (every 100ms with time-aware calculation)
        const interval = setInterval(() => {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const liveGold = startGold + (elapsedSeconds * goldRateRef.current);
            setDisplayGold(liveGold);
            goldValueRef.current = liveGold;
        }, 100);

        // Periodic Sync (Every 60s)
        const syncInterval = setInterval(() => {
            syncGold(goldValueRef.current);
        }, 60000);

        return () => {
            clearInterval(interval);
            clearInterval(syncInterval);
            // Final sync on unmount using the latest value
            if (goldValueRef.current > 0) {
                syncGold(goldValueRef.current);
            }
        };
    }, [gameStats, lastSyncTime, points, loginCode]);

    const rankProgress = getNextRankProgress(points, levelConfig);

    return (
        <>
            <GlassCard className="h-full" hover={false}>
                {/* Avatar / Rank Card Hero - Vertical Stack (No Overlap) */}
                <div className={`pt-12 pb-10 px-6 flex flex-col items-center relative gap-8 ${themeClass}`} style={themeStyle}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent)]" />
                    
                    {/* Atmospheric Background Glow */}
                    <motion.div 
                        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.2, 1] }}
                        transition={{ duration: 6, repeat: Infinity }}
                        className="absolute inset-0 bg-white/10 blur-3xl rounded-full"
                    />

                    {/* 1. Student Avatar (The Identity) */}
                    <motion.div 
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="relative z-20 group"
                    >
                        <motion.div 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="w-32 h-32 rounded-full border-4 border-white shadow-[0_0_30px_rgba(255,255,255,0.4)] overflow-hidden bg-white relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
                            <Image
                                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                alt={name}
                                width={128}
                                height={128}
                                className="p-2 relative z-10"
                            />
                            {/* Change avatar button */}
                            <button
                                onClick={() => setShowPicker(true)}
                                className="absolute inset-0 bg-indigo-600/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            >
                                <Camera className="w-10 h-10 text-white" />
                            </button>
                        </motion.div>
                        
                        {/* Status Ornament */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg border border-slate-100 flex items-center gap-1.5 z-30">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-800 tracking-tighter uppercase whitespace-nowrap">LVL {points > 0 ? Math.floor(points / 10) + 1 : 1} STUDENT</span>
                        </div>
                    </motion.div>

                    {/* Bridge/Connector */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-0.5 h-6 bg-white/30 rounded-full" />
                        <div className="bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-0.5 rounded-full text-[8px] font-black text-white tracking-[0.2em] uppercase">
                            Equipped Rank
                        </div>
                    </div>

                    {/* 2. Rank Card (The Achievement) */}
                    <div className="relative z-10 w-full flex justify-center">
                        {rankEntry.icon?.startsWith('data:image') || rankEntry.icon?.startsWith('http') ? (
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ y: -10, scale: 1.05 }}
                                className="w-48 h-64 rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-white/10 backdrop-blur-md relative transform transition-all duration-500 cursor-pointer"
                            >
                                <img 
                                    src={rankEntry.icon} 
                                    alt={rankEntry.name} 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            </motion.div>
                        ) : (
                            /* Standard Rank Icon if no card image */
                            <motion.div 
                                whileHover={{ scale: 1.1 }}
                                className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-5xl shadow-xl"
                            >
                                {rankEntry.icon || "🏆"}
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className="p-6 pt-10 space-y-8">
                    {/* Identity Section */}
                    <div className="text-center space-y-2">
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 text-sm font-black shadow-inner"
                            style={{ color: rankEntry.color || "#6366f1" }}
                        >
                            <Trophy className="w-4 h-4 fill-current opacity-70" />
                            {rankEntry.name}
                        </motion.div>
                        <div className="mt-4">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{name}</h1>
                            {nickname && (
                                <p className="text-indigo-400 font-bold text-sm bg-indigo-50 inline-block px-3 py-0.5 rounded-lg mt-1">
                                    "{nickname}"
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Character Stats (The "Character Sheet" feel) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center gap-1 group transition-colors hover:bg-white hover:border-emerald-200">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                            </div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Positive</span>
                            <span className="text-xl font-black text-emerald-600">+{totalPositive}</span>
                        </div>
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center gap-1 group transition-colors hover:bg-white hover:border-rose-200">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                            </div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Negative</span>
                            <span className="text-xl font-black text-rose-600">-{Math.abs(totalNegative)}</span>
                        </div>
                    </div>

                    {/* Gold Resource (RPG Idle Style) */}
                    <div className="relative group/gold">
                        <motion.div 
                            whileHover={{ scale: 1.02, y: -2 }}
                            className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-3xl p-5 shadow-[0_10px_20px_rgba(251,191,36,0.2)] border-2 border-white/50 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
                            
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/30">
                                        <Coins className="w-6 h-6 text-white drop-shadow-sm" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-amber-900/40 tracking-widest leading-none mb-1">Total Gold</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-amber-900 tracking-tighter tabular-nums drop-shadow-sm">
                                                {displayGold.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                            </span>
                                            <span className="text-[10px] font-black text-amber-900/60 uppercase">GP</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-white/30 px-2 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span className="text-[10px] font-black text-amber-900/80">
                                            +{(goldRateRef.current * 60).toFixed(0)}/min
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tiny progress bar for the "tick" feel */}
                            <motion.div 
                                animate={{ scaleX: [0, 1] }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 origin-left"
                            />
                        </motion.div>
                        
                        {/* Hover tooltip for rate details */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-black px-3 py-2 rounded-xl opacity-0 group-hover/gold:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50">
                            RATE: {goldRateRef.current.toFixed(4)} GOLD / SEC
                        </div>
                    </div>

                    {/* Progress Bars Section */}
                    <div className="space-y-6 pt-2">
                        <StatProgress 
                            label="Rank Progress" 
                            value={points} 
                            max={rankProgress.nextRank ? (points + rankProgress.pointsNeeded) : points}
                            color="bg-gradient-to-r from-indigo-500 to-purple-600"
                            icon={<Shield className="w-3.5 h-3.5 text-indigo-500" />}
                        />
                        
                        <StatProgress 
                            label="Behavior Points" 
                            value={behaviorPoints} 
                            max={Math.max(100, behaviorPoints)}
                            color="bg-gradient-to-r from-amber-400 to-orange-500"
                            icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                        />

                        {rankProgress.nextRank && (
                            <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 text-center animate-pulse">
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                                    อีก <span className="text-sm font-black mx-1">{rankProgress.pointsNeeded}</span> คะแนน เพื่อเป็น <span className="font-black underline mx-1">{rankProgress.nextRank}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>

            <AvatarPickerModal
                open={showPicker}
                onOpenChange={setShowPicker}
                classId={classId}
                studentId={studentId}
                loginCode={loginCode}
                currentAvatar={avatar}
                onSaved={setAvatar}
            />
        </>
    );
}
