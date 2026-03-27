"use client"

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface DailyQuest {
  id: string;
  name: string;
  description: string;
  icon: string;
  goldReward: number;
  completed: boolean;
}

interface PendingNotification {
  id: string;
  name: string;
  icon: string;
  goldReward: number;
}

interface DailyQuestCardProps {
  code: string;
  onGoldEarned?: (newGold: number) => void;
}

export function DailyQuestCard({ code, onGoldEarned }: DailyQuestCardProps) {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const { toast } = useToast();

  // Time until midnight reset
  const [timeLeft, setTimeLeft] = useState("");

  const parseQuestPayload = (data: {
    quests?: DailyQuest[];
    daily?: DailyQuest[];
    pendingNotifications?: PendingNotification[];
  }) => {
    const pending = data.pendingNotifications ?? [];
    pending.forEach((n) => {
      toast({
        title: `${n.icon} ${n.name} สำเร็จ!`,
        description: `+${n.goldReward} Gold`,
        className: "bg-indigo-600 text-white",
      });
    });
    return data.quests ?? data.daily ?? [];
  };

  const handleClaim = useCallback(async (questId: string) => {
    setClaiming(questId);
    try {
      const res = await fetch(`/api/student/${code}/daily-quests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "รับรางวัลสำเร็จ! 🎉", description: data.message });
        setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, completed: true } : q)));
        if (onGoldEarned && data.newGold !== undefined) {
          onGoldEarned(data.newGold);
        }
      } else {
        toast({ title: "ไม่สามารถรับรางวัลได้", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setClaiming(null);
    }
  }, [code, onGoldEarned, toast]);

  const refetchQuests = async () => {
    setIsRefreshing(true);
    try {
      const r = await fetch(`/api/student/${code}/daily-quests`);
      const data = await r.json();
      if (!r.ok) {
        toast({
          title: "โหลดภารกิจไม่สำเร็จ",
          description: data.error || "ลองใหม่อีกครั้ง",
          variant: "destructive",
        });
        return;
      }
      setQuests(parseQuestPayload(data));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetch(`/api/student/${code}/daily-quests`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          toast({
            title: "โหลดภารกิจไม่สำเร็จ",
            description: data.error || "ลองรีเฟรชหน้า",
            variant: "destructive",
          });
          setQuests([]);
          return;
        }
        setQuests(parseQuestPayload(data));
      })
      .catch(() => {
        toast({ title: "เครือข่ายผิดพลาด", variant: "destructive" });
        setQuests([]);
      })
      .finally(() => setLoading(false));
  }, [code, toast]);

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const detail = (e as CustomEvent<{ questId?: string }>).detail;
      const questId = detail?.questId;
      if (!questId || loading || quests.length === 0) return;
      const q = quests.find((x) => x.id === questId);
      if (!q || q.completed) return;
      void handleClaim(questId);
    };
    window.addEventListener("trigger-quest", handleTrigger);
    return () => window.removeEventListener("trigger-quest", handleTrigger);
  }, [quests, loading, handleClaim]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-complete DAILY_LOGIN quest on mount
  useEffect(() => {
    if (!loading && quests.length > 0) {
      const loginQuest = quests.find((q) => q.id === "DAILY_LOGIN" && !q.completed);
      if (loginQuest) {
        void handleClaim("DAILY_LOGIN");
      }
    }
  }, [loading, quests, handleClaim]);

  const completedCount = quests.filter(q => q.completed).length;

  return (
    <GlassCard className="p-6 bg-indigo-900/5 border-indigo-200/30">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
            ☀️ ภารกิจประจำวัน
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Daily Quests — {completedCount}/{quests.length} สำเร็จ</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetchQuests()}
            disabled={isRefreshing}
            title="รีเฟรชภารกิจ"
            aria-label="รีเฟรชภารกิจประจำวัน"
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-black text-slate-600 tabular-nums">{timeLeft}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-100 rounded-full mb-5 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
          animate={{ width: `${quests.length > 0 ? (completedCount / quests.length) * 100 : 0}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Quest list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-white/20 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {quests.map((quest, idx) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all ${
                quest.completed
                  ? "bg-emerald-50/60 border-emerald-100"
                  : "bg-white/50 border-slate-100"
              }`}
            >
              <div className="text-2xl shrink-0">{quest.icon}</div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-sm leading-tight ${quest.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {quest.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{quest.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 whitespace-nowrap min-w-max">
                  +{quest.goldReward} 🪙
                </span>
                {quest.completed ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Button
                    onClick={() => handleClaim(quest.id)}
                    disabled={claiming === quest.id}
                    className="h-7 px-3 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  >
                    {claiming === quest.id ? "..." : "รับ"}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
