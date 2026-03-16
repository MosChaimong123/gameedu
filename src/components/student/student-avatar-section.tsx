"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Star, Camera, Zap, Heart, Shield, Trophy, Sword, Coins } from "lucide-react";
import { AvatarPickerModal } from "./avatar-picker-modal";
import { type RankEntry, getNextRankProgress } from "@/lib/classroom-utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatProgress } from "./StatProgress";
import { motion, AnimatePresence } from "framer-motion";
import { IdleEngine, type GameStats } from "@/lib/game/idle-engine";
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
    lastSyncTime?: any;
    onUpdateStudent?: (data: any) => void;
}

export function StudentAvatarSection({
    studentId, classId, loginCode, initialAvatar,
    name, nickname, points, behaviorPoints, rankEntry,
    totalPositive, totalNegative,
    themeClass, themeStyle, levelConfig,
    gameStats, items = [], lastSyncTime,
    onUpdateStudent
}: StudentAvatarSectionProps) {
    const [avatar, setAvatar] = useState(initialAvatar);
    const [showPicker, setShowPicker] = useState(false);
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
            
            if (!res.ok) {
                const text = await res.text();
                // console.error(`Sync Gold failed for ${loginCode}: HTTP ${res.status} ${text}`);
            } else {
                const data = await res.json();
                lastSyncRef.current = new Date(data.lastSyncTime);
                
                if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
                    data.newlyUnlocked.forEach((a: any) => {
                        toast({
                            title: `🏆 ปลดล็อก Achievement!`,
                            description: `${a.icon} ${a.name} (+${a.goldReward} Gold)`,
                            variant: "default",
                        });
                    });
                }
                if (onUpdateStudent) {
                    onUpdateStudent({
                        gameStats: { ...gameStats, gold: data.gold },
                        lastSyncTime: data.lastSyncTime
                    });
                }
            }
        } catch (err) {
            // console.error(`Network error during gold sync for ${loginCode}:`, err);
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
            const fullMinutesPassed = Math.floor(elapsedSeconds / 60);
            
            const liveGold = startGold + (fullMinutesPassed * (goldRateRef.current * 60));
            setDisplayGold(liveGold);
            goldValueRef.current = startGold + (elapsedSeconds * goldRateRef.current);
        }, 1000);

        const syncInterval = setInterval(() => {
            syncGold(goldValueRef.current);
        }, 60000);

        return () => {
            clearInterval(interval);
            clearInterval(syncInterval);
        };
    }, [gameStats, lastSyncTime, points, loginCode, items]);

    useEffect(() => {
        return () => {
            if (goldValueRef.current > 0) {
                syncGold(goldValueRef.current);
            }
        };
    }, []); 

    const rankProgress = getNextRankProgress(points, levelConfig);
    const charStats = IdleEngine.calculateCharacterStats(points, items);

    return (
        <>
            <GlassCard className="h-full" hover={false}>
                <div className={`pt-12 pb-10 px-6 flex flex-col items-center relative gap-8 ${themeClass}`} style={themeStyle}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent)]" />
                    
                    <motion.div 
                        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.2, 1] }}
                        transition={{ duration: 6, repeat: Infinity }}
                        className="absolute inset-0 bg-white/10 blur-3xl rounded-full"
                    />

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
                            <button
                                onClick={() => setShowPicker(true)}
                                className="absolute inset-0 bg-indigo-600/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            >
                                <Camera className="w-10 h-10 text-white" />
                            </button>
                        </motion.div>
                        
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg border border-slate-100 flex items-center gap-1.5 z-30">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-800 tracking-tighter uppercase whitespace-nowrap">LVL {points > 0 ? Math.floor(points / 10) + 1 : 1} STUDENT</span>
                        </div>
                    </motion.div>

                    <div className="flex flex-col items-center gap-1">
                        <div className="w-0.5 h-6 bg-white/30 rounded-full" />
                        <div className="bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-0.5 rounded-full text-[8px] font-black text-white tracking-[0.2em] uppercase">
                            Equipped Rank
                        </div>
                    </div>

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
                    <div className="grid grid-cols-3 gap-3">
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="bg-rose-50/50 rounded-2xl p-3 border border-rose-100 flex flex-col items-center gap-1 group transition-colors hover:bg-white hover:border-rose-300 shadow-sm"
                        >
                            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                            </div>
                            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Health</span>
                            <span className="text-lg font-black text-rose-600">{charStats.hp}</span>
                        </motion.div>

                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 flex flex-col items-center gap-1 group transition-colors hover:bg-white hover:border-amber-300 shadow-sm"
                        >
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                <Sword className="w-4 h-4 text-amber-600 fill-amber-600" />
                            </div>
                            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Attack</span>
                            <span className="text-lg font-black text-amber-600">{charStats.atk}</span>
                        </motion.div>

                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100 flex flex-col items-center gap-1 group transition-colors hover:bg-white hover:border-indigo-300 shadow-sm"
                        >
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                <Shield className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                            </div>
                            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Defense</span>
                            <span className="text-lg font-black text-indigo-600">{charStats.def}</span>
                        </motion.div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Behavior:</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-[10px] font-bold text-emerald-600">+{totalPositive} Pos</span>
                            <span className="text-[10px] font-bold text-rose-600">-{Math.abs(totalNegative)} Neg</span>
                        </div>
                    </div>

                    <div className="relative group/gold">
                        <motion.div 
                            whileHover={{ scale: 1.02, y: -2 }}
                            className="bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 rounded-[2rem] p-6 shadow-[0_20px_40px_rgba(251,191,36,0.25)] border-2 border-white/60 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-orange-300/30 blur-2xl rounded-full" />
                            
                            <div className="flex flex-col gap-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] border border-white/40">
                                            <Coins className="w-7 h-7 text-amber-900 drop-shadow-md" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-amber-900/50 tracking-[0.2em] leading-none mb-1">Your Balance</p>
                                            <h2 className="text-[12px] font-black text-amber-900 tracking-wider">TOTAL GOLD</h2>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white/40 backdrop-blur-sm px-3 py-2 rounded-2xl border border-white/30 flex items-center gap-2 shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <span className="text-[11px] font-black text-amber-900 whitespace-nowrap">
                                            +{(goldRateRef.current * 60).toFixed(0)} / นาที
                                        </span>
                                    </div>
                                </div>

                                <div className="w-full h-px bg-white/20" />

                                <div className="flex items-end justify-center py-1">
                                    <span className="text-4xl font-black text-amber-950 tracking-tighter tabular-nums drop-shadow-md">
                                        {Math.floor(displayGold).toLocaleString()}
                                    </span>
                                    <span className="text-sm font-black text-amber-900/60 uppercase ml-2 mb-1.5 tracking-widest">GP</span>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/5">
                                <motion.div 
                                    animate={{ scaleX: [0, 1] }}
                                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                    className="h-full bg-white/40 origin-left"
                                />
                            </div>
                        </motion.div>
                        
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-300 to-orange-400 rounded-[2rem] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10" />
                    </div>

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
