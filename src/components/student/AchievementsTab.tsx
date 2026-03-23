"use client"

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock, Star, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  goldReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
  isCustom?: boolean;
}

export function AchievementsTab({ code, classId }: { code: string; classId?: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newUnlocks, setNewUnlocks] = useState<Achievement[]>([]);

  const fetchAchievements = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    try {
      // 1. Trigger check for new system achievements
      await fetch(`/api/student/${code}/achievements`, { method: "POST" });
      // 2. Load all system achievements
      const sysRes = await fetch(`/api/student/${code}/achievements`);
      const sysData = await sysRes.json();

      // 3. If classId provided, load custom achievements and merge
      let allAchievements: Achievement[] = Array.isArray(sysData) ? sysData : [];

      if (classId) {
        const customRes = await fetch(`/api/classroom/${classId}/custom-achievements`);
        const customDefs = await customRes.json();
        if (Array.isArray(customDefs)) {
          // Check which custom ones the student has unlocked (in sysData, achievementId matches custom id)
          const unlockedSet = new Set(allAchievements.filter(a => a.unlocked).map(a => a.id));
          // Re-fetch student achievements to check custom ones too
          const stuRes = await fetch(`/api/student/${code}/achievements`);
          const stuData: Achievement[] = await stuRes.json();
          const stuUnlockedSet = new Set(stuData.filter((a: Achievement) => a.unlocked).map((a: Achievement) => a.id));

          const customAchievements = customDefs.map((def: any) => ({
            id: def.id,
            name: def.name,
            description: def.description,
            icon: def.icon,
            goldReward: def.goldReward,
            unlocked: stuUnlockedSet.has(def.id),
            unlockedAt: null,
            isCustom: true,
          }));
          allAchievements = [...allAchievements, ...customAchievements];
        }
      }

      setAchievements(allAchievements);
    } finally {
      if (isRefresh) setIsRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [code, classId]);

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="aspect-square bg-white/20 animate-pulse rounded-2xl border border-white/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">ความสำเร็จ</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Achievements & Badges</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAchievements(true)}
            disabled={isRefreshing}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <div className="bg-amber-100/60 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            <span className="font-black text-amber-700">{unlocked.length}/{achievements.length}</span>
          </div>
        </div>
      </div>

      {/* Progress Banner */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${achievements.length > 0 ? (unlocked.length / achievements.length) * 100 : 0}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      {/* Unlocked Achievements */}
      {unlocked.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
            ปลดล็อกแล้ว ({unlocked.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {unlocked.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GlassCard className={`p-4 flex flex-col items-center text-center border-2 border-amber-300/50 bg-gradient-to-b from-amber-50/60 to-white/60 shadow-amber-100 ${a.isCustom ? 'border-purple-300/50 from-purple-50/60' : ''}`}>
                  <div className="text-4xl mb-2 drop-shadow-sm">{a.icon}</div>
                  <p className="font-black text-slate-800 text-xs leading-tight mb-1">{a.name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mb-2">{a.description}</p>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-full">
                      <span className="text-[10px] font-black text-amber-700">+{a.goldReward} Gold</span>
                    </div>
                    {a.isCustom && (
                      <span className="text-[9px] font-black text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">👩‍🏫 ครูมอบ</span>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {locked.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            ยังไม่ปลดล็อก ({locked.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {locked.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GlassCard className="p-4 flex flex-col items-center text-center border-2 border-slate-100 bg-slate-50/50 opacity-60">
                  <div className="text-4xl mb-2 grayscale opacity-40">{a.icon}</div>
                  <p className="font-black text-slate-500 text-xs leading-tight mb-1">{a.name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mb-3">{a.description}</p>
                  <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400">ล็อก</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
