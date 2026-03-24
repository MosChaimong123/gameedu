"use client"

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TIER_MAX,
  getEnhancementZone,
  getSuccessRate,
  calculateEnhancementCost,
} from "@/lib/game/enhancement-system";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    Sword, Coins, Zap, Star, ArrowRight, Hammer, 
    Loader2, CheckCircle2, XCircle, Sparkles, AlertTriangle, 
    ZapOff, FastForward, Play, Square 
} from "lucide-react";

interface EnhancementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    image: string;
    price: number;
    tier?: string;
    enhancementLevel: number;
    goldMultiplier: number;
    bossDamageMultiplier: number;
  };
  currentGold: number;
  currentPoints: number;
  onEnhance: () => Promise<{ success: boolean; newLevel: number }>;
}

export function EnhancementDialog({
  isOpen,
  onClose,
  item,
  currentGold,
  currentPoints,
  onEnhance
}: EnhancementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; level: number } | null>(null);
  
  const tierMax = TIER_MAX[item.tier ?? "COMMON"] ?? 9;

  // Auto Mode States
  const [autoMode, setAutoMode] = useState(false);
  const [targetLevel, setTargetLevel] = useState(() => tierMax);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const stopAutoRef = useRef(false);

  const isMaxLevel = item.enhancementLevel >= tierMax;
  const zone = getEnhancementZone(item.enhancementLevel);
  const nextLevel = item.enhancementLevel + 1;
  const successRate = Math.round(getSuccessRate(item.enhancementLevel));
  const cost = calculateEnhancementCost(item.enhancementLevel, item.price);
  const goldCost = cost.gold;
  const pointCost = cost.behaviorPoints;

  const hasGold = currentGold >= goldCost;
  const hasPoints = currentPoints >= pointCost;
  const canAfford = hasGold && hasPoints;

  // Bonus preview logic (using max multiplier found for now or listing both)
  const currentGoldBonus = item.goldMultiplier * (1 + item.enhancementLevel * 0.1);
  const nextGoldBonus = item.goldMultiplier * (1 + nextLevel * 0.1);
  
  const currentBossBonus = item.bossDamageMultiplier * (1 + item.enhancementLevel * 0.1);
  const nextBossBonus = item.bossDamageMultiplier * (1 + nextLevel * 0.1);

  const handleEnhance = async () => {
    if (!canAfford || isMaxLevel) return;
    setLoading(true);
    try {
        const res = await onEnhance();
        setResult({ success: res.success, level: res.newLevel });
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleAutoEnhance = async () => {
    if (!canAfford || isMaxLevel || isAutoRunning) return;
    
    setIsAutoRunning(true);
    stopAutoRef.current = false;
    
    let currentLvl = item.enhancementLevel;
    
    while (currentLvl < targetLevel && !stopAutoRef.current) {
        const nxtLvl = currentLvl + 1;
        const gCost = Math.floor(item.price * nxtLvl * 0.5);
        const pCost = nxtLvl * 10;
        
        // Use latest resources internally if we could, but here we rely on props
        // Note: Props might be slightly stale during the loop if not updated via parent fast enough
        // but it's a start.
        
        setLoading(true);
        try {
            const res = await onEnhance();
            if (res.success) {
                currentLvl = res.newLevel;
            }
            // Small delay for visual effect
            await new Promise(r => setTimeout(r, 600));
        } catch (err) {
            console.error(err);
            break;
        } finally {
            setLoading(false);
        }
        
        // Re-check affordability (This is tricky since props only update on next render)
        // For now, let the API handle the rejection if resources run out.
        if (currentLvl >= tierMax) break;
    }
    
    setIsAutoRunning(false);
  };

  const stopAuto = () => {
    stopAutoRef.current = true;
    setIsAutoRunning(false);
  };

  const effectLabel = item.goldMultiplier > 0 ? 'Gold Rate' : 'Boss Damage';

  useEffect(() => {
    if (!isOpen) {
        setTimeout(() => {
            setResult(null);
            setIsAutoRunning(false);
            setAutoMode(false);
        }, 300);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && !isAutoRunning && (open ? null : onClose())}>
      <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-white/20 shadow-2xl overflow-hidden p-0 bg-slate-950">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div 
              key="main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 p-8 flex flex-col items-center text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 -z-10" />
              
              <DialogHeader className="mb-6">
                <DialogTitle className="text-3xl font-black text-white flex items-center justify-center gap-3">
                    <Hammer className="w-8 h-8 text-amber-400" />
                    ตีบวกไอเทม
                </DialogTitle>
                <DialogDescription className="text-indigo-400 font-black uppercase tracking-[0.2em] text-[10px] bg-indigo-500/10 px-4 py-1 rounded-full inline-block mx-auto mt-2">
                    {isAutoRunning ? 'กำลังตีบวกอัตโนมัติ...' : 'Item Enhancement'}
                </DialogDescription>
              </DialogHeader>

              {isMaxLevel ? (
                <div className="py-12 flex flex-col items-center gap-4">
                    <div className="w-24 h-24 bg-amber-500/10 rounded-3xl flex items-center justify-center text-6xl border-2 border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                        {item.image}
                    </div>
                    <h3 className="text-xl font-black text-amber-400">ระดับสูงสุดแล้ว! (+{tierMax})</h3>
                    <p className="text-slate-400 text-sm font-bold">ไอเทมนี้ทรงพลังถึงขีดสุดแล้ว</p>
                    <Button onClick={onClose} className="mt-4 bg-slate-800 text-white rounded-xl px-12 font-black">ปิดหน้าต่าง</Button>
                </div>
              ) : (
                <>
                  {/* Mode Selector */}
                  <div className="flex w-full bg-white/5 p-1 rounded-2xl mb-6 border border-white/10">
                    <button 
                        onClick={() => !isAutoRunning && setAutoMode(false)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!autoMode ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        โหมดปกติ
                    </button>
                    <button 
                        onClick={() => !isAutoRunning && setAutoMode(true)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${autoMode ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        ตีบวกอัตโนมัติ
                    </button>
                  </div>

                  {autoMode && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="w-full mb-6 space-y-3 overflow-hidden"
                    >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">
                            <span>เป้าหมายการตีบวก</span>
                            <span className="text-amber-400">+{targetLevel}</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap justify-between">
                            {Array.from({ length: tierMax }, (_, i) => i + 1).map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => !isAutoRunning && setTargetLevel(lvl)}
                                    disabled={lvl <= item.enhancementLevel}
                                    className={`w-7 h-7 rounded-lg text-[10px] font-black border transition-all ${
                                        targetLevel === lvl 
                                            ? 'bg-amber-500 border-amber-400 text-white shadow-lg' 
                                            : lvl <= item.enhancementLevel
                                                ? 'bg-slate-800 border-transparent text-slate-600 cursor-not-allowed'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                    }`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                  )}

                   {/* Success Rate & Preview */}
                   <div className="flex flex-col items-center gap-6 mb-8 w-full px-4">
                      <div className="flex items-center justify-between w-full">
                         <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-4xl border border-white/10 relative">
                                {item.image}
                                <div className="absolute -top-1.5 -right-1.5 bg-slate-800 px-1.5 py-0.5 rounded-md text-[10px] font-black text-white border border-white/20">
                                    +{item.enhancementLevel}
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ปัจจุบัน</span>
                         </div>

                         <div className="flex flex-col items-center gap-1">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={nextLevel}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center"
                                >
                                    <span className={`text-[10px] font-black ${successRate >= 80 ? 'text-green-400' : 'text-amber-400'}`}>
                                        {successRate}%
                                    </span>
                                    <ArrowRight className="w-6 h-6 text-white/20" />
                                </motion.div>
                            </AnimatePresence>
                         </div>

                         <div className="flex flex-col items-center gap-2">
                            <motion.div 
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-4xl border-2 border-amber-500/40 relative shadow-[0_0_30px_rgba(251,191,36,0.2)]"
                            >
                                {item.image}
                                <div className="absolute -top-1.5 -right-1.5 bg-amber-500 px-1.5 py-0.5 rounded-md text-[10px] font-black text-white border border-white/30 shadow-lg">
                                    +{nextLevel}
                                </div>
                            </motion.div>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">เป้าหมาย</span>
                         </div>
                      </div>

                      {/* Bonus Preview Row */}
                      <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
                          {item.goldMultiplier > 0 && (
                              <div className="flex justify-between items-center text-[11px] font-black">
                                  <span className="text-amber-400 uppercase tracking-tighter">💰 Gold Rate Bonus</span>
                                  <div className="flex items-center gap-2">
                                      <span className="text-slate-500 text-[10px]">+{Math.round(currentGoldBonus * 100)}%</span>
                                      <ArrowRight className="w-3 h-3 text-slate-700" />
                                      <span className="text-white">+{Math.round(nextGoldBonus * 100)}%</span>
                                  </div>
                              </div>
                          )}
                          {item.bossDamageMultiplier > 0 && (
                              <div className="flex justify-between items-center text-[11px] font-black">
                                  <span className="text-rose-400 uppercase tracking-tighter">🔥 Boss DMG Bonus</span>
                                  <div className="flex items-center gap-2">
                                      <span className="text-slate-500 text-[10px]">+{Math.round(currentBossBonus * 100)}%</span>
                                      <ArrowRight className="w-3 h-3 text-slate-700" />
                                      <span className="text-white">+{Math.round(nextBossBonus * 100)}%</span>
                                  </div>
                              </div>
                          )}
                      </div>
                   </div>

                  {/* Costs */}
                  <div className="w-full space-y-2 mb-8">
                     <div className="flex items-center justify-between text-[10px] font-black text-white/40 uppercase tracking-widest px-1 mb-1">
                        <span>ทรัพยากรที่ต้องการ</span>
                        <span>(ต่อครั้ง)</span>
                     </div>
                     <div className={`grid gap-2 ${pointCost > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                         <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <Coins className="w-3 h-3 text-amber-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase">Gold</span>
                            </div>
                            <p className={`text-sm font-black ${hasGold ? 'text-white' : 'text-rose-500'}`}>
                                {goldCost.toLocaleString()}
                            </p>
                         </div>
                         {pointCost > 0 && (
                           <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-left">
                              <div className="flex items-center gap-2 mb-1">
                                  <Star className="w-3 h-3 text-indigo-400" />
                                  <span className="text-[9px] font-black text-slate-400 uppercase">Points</span>
                              </div>
                              <p className={`text-sm font-black ${hasPoints ? 'text-white' : 'text-rose-500'}`}>
                                  {pointCost}
                              </p>
                           </div>
                         )}
                     </div>
                     {zone === "DANGER" && (
                       <p className="text-[10px] font-bold text-amber-300/90 px-1">
                         โซนเสี่ยงสูง: ใช้วัสดุ 1 ชิ้นต่อครั้ง (ระบบจะเลือกวัสดุที่มีให้อัตโนมัติ)
                       </p>
                     )}
                  </div>

                  <DialogFooter className="w-full gap-2">
                    {autoMode ? (
                        isAutoRunning ? (
                            <Button
                                onClick={stopAuto}
                                className="w-full h-14 rounded-2xl text-base font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                            >
                                <Square className="w-5 h-5 mr-2 fill-current" />
                                ยกเลิกการตีบวก
                            </Button>
                        ) : (
                            <Button
                                onClick={handleAutoEnhance}
                                disabled={!canAfford || loading}
                                className="w-full h-14 rounded-2xl text-base font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-[1.02] active:scale-95 text-white shadow-xl shadow-amber-500/30 transition-all"
                            >
                                <Play className="w-5 h-5 mr-2 fill-current" />
                                เริ่มตีบวกอัตโนมัติ
                            </Button>
                        )
                    ) : (
                        <Button
                          onClick={handleEnhance}
                          disabled={!canAfford || loading}
                          className={`w-full h-14 rounded-2xl text-base font-black transition-all duration-300 ${
                            canAfford 
                                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:scale-[1.02] active:scale-95 text-white shadow-xl shadow-indigo-500/30' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          ) : (canAfford ? 'ยืนยันการเพิ่มพลัง' : 'ทรัพยากรไม่เพียงพอ')}
                        </Button>
                    )}
                  </DialogFooter>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div 
               key="result"
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className={`p-8 flex flex-col items-center text-center min-h-[400px] justify-center relative`}
            >
               <div className={`absolute inset-0 opacity-20 -z-10 ${result.success ? 'bg-green-500' : 'bg-rose-500'}`} />
               
               {result.success ? (
                 <>
                   <motion.div
                     initial={{ rotate: -20, scale: 0 }}
                     animate={{ rotate: 0, scale: 1 }}
                     transition={{ type: "spring", damping: 10 }}
                     className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,197,94,0.5)]"
                   >
                     <CheckCircle2 className="w-14 h-14 text-white" />
                   </motion.div>
                   <h2 className="text-4xl font-black text-white mb-2">ตีบวกสำเร็จ!</h2>
                   <p className="text-green-400 font-bold mb-8 uppercase tracking-widest text-sm">Excellent Enhancement</p>
                   
                   <div className="flex items-center gap-6 mb-8">
                      <div className="text-center">
                         <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl border border-white/10 opacity-50">
                            {item.image}
                         </div>
                         <span className="text-[10px] font-black text-slate-500">+{item.enhancementLevel}</span>
                      </div>
                      <ArrowRight className="w-6 h-6 text-green-500" />
                      <div className="text-center">
                         <div className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center text-4xl border-2 border-green-500/40 shadow-lg">
                            {item.image}
                         </div>
                         <span className="text-xs font-black text-green-500">+{result.level}</span>
                      </div>
                   </div>
                 </>
               ) : (
                 <>
                   <motion.div
                     initial={{ rotate: 20, scale: 0 }}
                     animate={{ rotate: 0, scale: 1 }}
                     transition={{ type: "spring", damping: 10 }}
                     className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(244,63,94,0.5)]"
                   >
                     <XCircle className="w-14 h-14 text-white" />
                   </motion.div>
                   <h2 className="text-4xl font-black text-white mb-2">ล้มเหลว...</h2>
                   <p className="text-rose-400 font-bold mb-8 uppercase tracking-widest text-sm">Enhancement Failed</p>
                   
                   <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 w-full">
                      <p className="text-slate-400 text-sm font-bold">โชคร้ายจัง! การตีบวกไม่สำเร็จในครั้งนี้</p>
                      <p className="text-[11px] text-slate-500 mt-2 italic">แต่อย่ายอมแพ้นะ พยายามใหม่อีกครั้ง!</p>
                   </div>
                 </>
               )}

               <Button 
                 onClick={() => setResult(null)}
                 className={`w-full h-12 rounded-xl font-black uppercase tracking-widest ${
                   result.success ? 'bg-green-600 hover:bg-green-700' : 'bg-rose-600 hover:bg-rose-700'
                 } text-white shadow-xl`}
               >
                 {result.success ? 'เยี่ยมมาก!' : 'ลองใหม่'}
               </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
