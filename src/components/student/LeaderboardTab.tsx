"use client"

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Star, Coins, Award, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";

interface LeaderEntry {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  gold: number;
  achievementCount: number;
  equippedCount: number;
  hp: number;
  atk: number;
  def: number;
  rank: number;
}

type SortKey = "gold" | "points" | "achievementCount" | "atk";

export function LeaderboardTab({ classId, currentStudentId }: { classId: string; currentStudentId: string }) {
  const [data, setData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("gold");

  const fetchLeaderboard = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    try {
      const r = await fetch(`/api/classroom/${classId}/leaderboard`);
      const d = await r.json();
      setData(Array.isArray(d) ? d : []);
    } finally {
      if (isRefresh) setIsRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [classId]);

  const sorted = [...data].sort((a, b) => b[sortBy] - a[sortBy]).map((s, i) => ({ ...s, rank: i + 1 }));

  const SORT_TABS: { key: SortKey; label: string; icon: string; color: string }[] = [
    { key: "gold",             label: "Gold",       icon: "🪙", color: "amber" },
    { key: "points",           label: "พฤติกรรม",  icon: "⭐", color: "indigo" },
    { key: "atk",              label: "พลังโจมตี",  icon: "⚔️", color: "rose" },
    { key: "achievementCount", label: "รางวัล",    icon: "🏆", color: "purple" },
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center font-black text-slate-400 text-sm">#{rank}</span>;
  };

  const getRankBg = (rank: number, isMe: boolean) => {
    if (isMe) return "border-indigo-400 bg-indigo-50/60";
    if (rank === 1) return "border-amber-300 bg-amber-50/60";
    if (rank === 2) return "border-slate-300 bg-slate-50/60";
    if (rank === 3) return "border-amber-700/30 bg-orange-50/60";
    return "border-slate-100 bg-white/40";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">กระดานอันดับ</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Classroom Leaderboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchLeaderboard(true)}
            disabled={isRefreshing}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <div className="bg-amber-100/60 border border-amber-200 px-3 py-1.5 rounded-2xl flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span className="font-black text-amber-700 text-sm">{data.length} คน</span>
          </div>
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100/60 rounded-2xl w-fit">
        {SORT_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSortBy(tab.key)}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all ${
              sortBy === tab.key
                ? "bg-white shadow-sm text-slate-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {!loading && sorted.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 px-4">
          {/* 2nd place */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-2 pt-6">
            <div className="text-3xl">{sorted[1].avatar || "🎮"}</div>
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-2xl font-black text-slate-400">2</div>
            <p className="font-black text-slate-700 text-xs text-center line-clamp-1">{sorted[1].name}</p>
            <p className="text-xs font-black text-amber-600">🪙 {sorted[1].gold.toLocaleString()}</p>
          </motion.div>
          {/* 1st place */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2">
            <Crown className="w-8 h-8 text-amber-500 fill-amber-400" />
            <div className="text-4xl">{sorted[0].avatar || "🎮"}</div>
            <div className="w-20 h-20 rounded-2xl bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-3xl font-black text-amber-500">1</div>
            <p className="font-black text-slate-800 text-xs text-center line-clamp-1">{sorted[0].name}</p>
            <p className="text-xs font-black text-amber-600">🪙 {sorted[0].gold.toLocaleString()}</p>
          </motion.div>
          {/* 3rd place */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2 pt-10">
            <div className="text-3xl">{sorted[2].avatar || "🎮"}</div>
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border-2 border-orange-300 flex items-center justify-center text-xl font-black text-orange-500">3</div>
            <p className="font-black text-slate-600 text-xs text-center line-clamp-1">{sorted[2].name}</p>
            <p className="text-xs font-black text-amber-600">🪙 {sorted[2].gold.toLocaleString()}</p>
          </motion.div>
        </div>
      )}

      {/* Full Rankings List */}
      <div className="space-y-2">
        {loading ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white/20 animate-pulse rounded-2xl" />)
        ) : sorted.map((entry, idx) => {
          const isMe = entry.id === currentStudentId;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <GlassCard className={`p-3.5 flex items-center gap-4 border-2 transition-all ${getRankBg(entry.rank, isMe)}`}>
                <div className="w-8 flex items-center justify-center shrink-0">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="text-2xl shrink-0">{entry.avatar || "🎮"}</div>
                <div className="flex-1 min-w-0">
                  <p className={`font-black text-sm leading-tight ${isMe ? "text-indigo-700" : "text-slate-800"}`}>
                    {entry.name} {isMe && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full ml-1">คุณ</span>}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5">
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">🪙 {entry.gold.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">⭐ {entry.points}</span>
                    <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">⚔️ {entry.atk}</span>
                    <span className="text-[10px] font-bold text-purple-500 flex items-center gap-1">🏆 {entry.achievementCount}</span>
                  </div>
                </div>
                <div className={`text-lg font-black shrink-0 ${entry.rank <= 3 ? "text-amber-500" : "text-slate-300"}`}>
                  #{entry.rank}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
