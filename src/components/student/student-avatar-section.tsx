"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Camera, Zap, Heart, Shield, Trophy, Sword, Coins } from "lucide-react";
import { AvatarPickerModal } from "./avatar-picker-modal";
import { type RankEntry, getNextRankProgress, formatAmount } from "@/lib/classroom-utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatProgress } from "./StatProgress";
import { motion, AnimatePresence } from "framer-motion";
import { IdleEngine, type GameStats } from "@/lib/game/idle-engine";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { useToast } from "@/components/ui/use-toast";

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
    items?: any[];
    stamina?: number;
    maxStamina?: number;
    mana?: number;
    jobClass?: string | null;
    jobTier?: string;
    advanceClass?: string | null;
    lastSyncTime?: any;
    onUpdateStudent?: (data: any) => void;
}

export function StudentAvatarSection({
    studentId, classId, loginCode, initialAvatar,
    name, nickname, points, behaviorPoints, rankEntry,
    totalPositive, totalNegative,
    themeClass, themeStyle, levelConfig,
    gameStats, items = [],
    jobClass = null,
    jobTier = "BASE",
    advanceClass = null,
    lastSyncTime,
    onUpdateStudent
}: StudentAvatarSectionProps) {
    const [avatar, setAvatar] = useState(initialAvatar);
    const [showPicker, setShowPicker] = useState(false);
    const { t } = useLanguage();
    const { toast } = useToast();
    
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
                
                if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
                    data.newlyUnlocked.forEach((a: any) => {
                        toast({
                            title: `🏆 Achievements Unlocked!`,
                            description: `${a.icon} ${a.name} (+${a.goldReward} Gold)`,
                            variant: "default",
                        });
                    });
                }
                if (onUpdateStudent) {
                    onUpdateStudent({
                        gameStats: { ...gameStats, gold: data.gold },
                        stamina: data.stamina,
                        maxStamina: data.maxStamina,
                        mana: data.mana,
                        lastSyncTime: data.lastSyncTime
                    });
                }
            }
        } catch (err) {
            console.error("Sync error", err);
        }
    };

    // Initialize and Tick Gold
    useEffect(() => {
        const settings = (levelConfig as any)?.gamifiedSettings || {};
        const events = (settings.events || []) as any[];
        const nowTime = new Date();
        const activeEvents = events.filter(e => new Date(e.startAt) <= nowTime && new Date(e.endAt) >= nowTime);

        const baseResources = IdleEngine.calculateCurrentResources({ 
            points, 
            gameStats, 
            items,
            lastSyncTime,
            classroom: { levelConfig }
        }, activeEvents);
        
        const initialGold = baseResources.stats.gold;
        setDisplayGold(initialGold);
        goldValueRef.current = initialGold;

        const rate = IdleEngine.calculateGoldRate(points, baseResources.stats, levelConfig, items, activeEvents);
        goldRateRef.current = rate;

        const startTime = Date.now();
        const startGold = initialGold;

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsedSeconds = (now - startTime) / 1000;
            const liveGold = startGold + (elapsedSeconds * goldRateRef.current);
            setDisplayGold(liveGold);
            goldValueRef.current = liveGold;
        }, 50); // High frequency for smooth ticking

        const syncInterval = setInterval(() => {
            syncGold(goldValueRef.current);
        }, 60000);

        return () => {
            clearInterval(interval);
            clearInterval(syncInterval);
        };
    }, [gameStats, lastSyncTime, points, loginCode, items]);

    const rankProgress = getNextRankProgress(points, levelConfig);
    const charStats = IdleEngine.calculateCharacterStats(
        points,
        items,
        (gameStats as any)?.level || 1,
        jobClass,
        jobTier,
        advanceClass
    );

    const jobBadgeLabel =
        jobTier !== "BASE" && advanceClass ? advanceClass : jobClass;

    return (
        <div className="flex flex-col gap-6">
            <GlassCard className="overflow-hidden border-0 shadow-2xl bg-white/40 backdrop-blur-3xl" hover={false}>
                {/* Hero Header Section */}
                <div className="relative pt-12 pb-10 px-6 flex flex-col items-center overflow-hidden">
                    {/* Dynamic Backgrounds */}
                    <div className={cn(
                        "absolute inset-0 transition-all duration-1000 -z-10",
                        themeClass || "bg-slate-900"
                    )} style={themeStyle} />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.15),transparent)] -z-10" />
                    
                    {/* Animated Particles/Glows */}
                    <motion.div 
                        animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }} 
                        transition={{ duration: 8, repeat: Infinity }}
                        className="absolute -top-20 w-[300px] h-[300px] bg-white/5 blur-[80px] rounded-full -z-10"
                    />
 
                    {/* Avatar Container */}
                    <div className="relative z-20 group">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative"
                        >
                                {/* Rotating Aura Ring */}
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                    className="absolute -inset-3 border-2 border-dashed rounded-full"
                                    style={{ borderColor: `${rankEntry.color || "#6366f1"}40` }}
                                />
                                
                                <motion.div 
                                    whileHover={{ scale: 1.05, rotate: 2 }}
                                    className="w-36 h-36 rounded-full border-4 border-white/90 shadow-[0_0_40px_rgba(255,255,255,0.25)] overflow-hidden bg-white/95 relative z-10"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 via-white to-blue-50/30" />
                                    <Image
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}&backgroundColor=transparent`}
                                        alt={name}
                                        width={144}
                                        height={144}
                                        className="p-3 relative z-10 drop-shadow-xl"
                                    />
                                    <button
                                        onClick={() => setShowPicker(true)}
                                        className="absolute inset-0 bg-indigo-600/70 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
                                    >
                                        <Camera className="w-10 h-10 text-white drop-shadow-lg" />
                                    </button>
                                </motion.div>
    
                                {/* Level Badge - Integrated floating */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30">
                                    <motion.div 
                                        whileHover={{ y: -2, scale: 1.05 }}
                                        className="bg-white px-6 py-3 rounded-2xl shadow-2xl border border-white/80 backdrop-blur-md flex flex-col items-center gap-1.5 min-w-[180px]"
                                    >
                                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                                            <div 
                                                className="w-3.5 h-3.5 rounded-full animate-pulse" 
                                                style={{ 
                                                    backgroundColor: rankEntry.color || "#10b981",
                                                    boxShadow: `0 0 12px ${rankEntry.color || "#10b981"}bf`
                                                }}
                                            />
                                            <span className="text-sm font-black text-slate-800 tracking-tight uppercase">
                                                LV.{gameStats?.level || 1} {rankEntry.name}
                                                {jobClass && (
                                                    <span className="ml-2 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-[10px] text-yellow-700 font-black tracking-widest align-middle">
                                                        [{jobBadgeLabel}]
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5 shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(gameStats?.xp || 0) / IdleEngine.getXpRequirement(gameStats?.level || 1) * 100}%` }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
 
                </div>
 
                {/* Identity & Stats Body */}
                <div className="p-6 pt-8 space-y-8 bg-gradient-to-b from-white to-slate-50/50 relative">
                    {/* Floating Identity Tags */}
                    <div className="flex flex-col items-center gap-6 relative">
                        <div className="text-center">
                            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none mb-3 drop-shadow-sm">{name}</h1>
                            {nickname && (
                                <div className="inline-block relative">
                                    <span className="px-5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-500 font-black text-lg shadow-sm">
                                        "{nickname}"
                                    </span>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Gold Balance Premium Card */}
                    <div className="relative group">
                        <motion.div 
                            whileHover={{ y: -5, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-gradient-to-br from-[#f59e0b] via-[#fbbf24] to-[#ea580c] rounded-[2.5rem] p-6 shadow-xl border-4 border-white relative overflow-hidden cursor-pointer"
                        >
                            {/* Metallic Texture Overlays */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 mix-blend-overlay" />
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10 mix-blend-overlay" />
                            
                            <div className="flex flex-col gap-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-12 h-12 bg-white/30 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/40">
                                            <Coins className="w-7 h-7 text-amber-950 drop-shadow-md" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-amber-950/40 tracking-wider leading-none mb-1">Total Wealth</p>
                                            <div className="flex flex-col gap-1.5">
                                                <h2 className="text-lg font-black text-amber-950/80 tracking-tighter uppercase whitespace-nowrap">Gold Coins</h2>
                                                <div className="bg-amber-950/10 px-2 py-1 rounded-lg border border-amber-950/10 flex items-center self-start">
                                                    <span className="text-[9px] font-black text-amber-950 whitespace-nowrap uppercase">
                                                        +{formatAmount(goldRateRef.current * 3600)} / ชั่วโมง
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full h-px bg-amber-950/10" />

                                <div className="flex items-end justify-center py-1">
                                    <motion.span 
                                        key={Math.floor(displayGold)}
                                        className="text-4xl font-black text-amber-950 tracking-tighter tabular-nums drop-shadow-sm"
                                    >
                                        {formatAmount(displayGold)}
                                    </motion.span>
                                    <span className="text-base font-black text-amber-950/50 uppercase ml-2 mb-1.5 tracking-widest">GP</span>
                                </div>
                            </div>

                            {/* Live Tick Pulse Bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/5 overflow-hidden">
                                <motion.div 
                                    animate={{ x: ["-100%", "100%"] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* Development Stats */}
                    <div className="space-y-8 pt-4">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <header className="flex items-center gap-2 px-2">
                                    <Shield className="w-5 h-5 text-indigo-500" />
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Rank Advancement</span>
                                </header>
                                <div className="flex justify-center -mb-1">
                                    <span className="text-sm font-black text-indigo-600 tabular-nums whitespace-nowrap">
                                        {points.toLocaleString()} <span className="text-slate-300 font-bold mx-1">/</span> {rankProgress.nextRank ? (points + rankProgress.pointsNeeded).toLocaleString() : points.toLocaleString()}
                                    </span>
                                </div>
                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(points / (rankProgress.nextRank ? (points + rankProgress.pointsNeeded) : points)) * 100}%` }}
                                        className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-purple-600 rounded-full shadow-[0_2px_10px_rgba(99,102,241,0.2)]"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <header className="flex items-center gap-2 px-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Behavior Score</span>
                                </header>
                                <div className="flex justify-center -mb-1">
                                    <span className="text-sm font-black text-amber-600 tabular-nums whitespace-nowrap">
                                        {behaviorPoints.toLocaleString()} <span className="text-slate-300 font-bold ml-1">PTS</span>
                                    </span>
                                </div>
                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (behaviorPoints / Math.max(100, behaviorPoints)) * 100)}%` }}
                                        className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-full shadow-[0_2px_10px_rgba(245,158,11,0.2)]"
                                    />
                                </div>
                            </div>
                        </div>

                        {rankProgress.nextRank && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-indigo-50/70 backdrop-blur-sm rounded-[2rem] p-5 border-2 border-dashed border-indigo-100/80 text-center relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/30 rotate-12 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000" />
                                <p className="text-sm font-bold text-indigo-700 uppercase tracking-wide flex items-center justify-center gap-3">
                                    {t("needMore") || "อีก"} 
                                    <span className="text-2xl font-black text-indigo-600 drop-shadow-sm">{rankProgress.pointsNeeded}</span> 
                                    {t("pointsToNextRank") || "แต้มเพื่อเลื่อนยศเป็น"}
                                    <span className="font-black text-indigo-600 underline underline-offset-4 decoration-indigo-200/50">{rankProgress.nextRank}</span>
                                </p>
                            </motion.div>
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
        </div>
    );
}


