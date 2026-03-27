"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Swords, Trophy, Coins, Star, Users, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
const ELEMENT_META: Record<string, { label: string; emoji: string }> = {
  FIRE:   { label: "Fire",   emoji: "🔥" },
  WATER:  { label: "Water",  emoji: "💧" },
  EARTH:  { label: "Earth",  emoji: "🪨" },
  WIND:   { label: "Wind",   emoji: "🌪️" },
  NATURE: { label: "Nature", emoji: "🌿" },
  ICE:    { label: "Ice",    emoji: "❄️" },
  DARK:   { label: "Dark",   emoji: "🌑" },
  LIGHT:  { label: "Light",  emoji: "✨" },
  VOID:   { label: "Void",   emoji: "🌀" },
};

interface BossStatus {
  active: boolean;
  name: string;
  hpPct: number;
  elementKey: string | null;
  difficulty: string | null;
}

interface StudentRankEntry {
  id: string;
  name: string;
  jobClass: string | null;
  level?: number;
  gold?: number;
  arenaPoints?: number;
}

interface QuestActivity {
  totalStudents: number;
  dailyActive: number;
}

interface GameStats {
  boss: BossStatus | null;
  topByLevel: StudentRankEntry[];
  topByGold: StudentRankEntry[];
  topByArena: StudentRankEntry[];
  questActivity: QuestActivity;
}

interface GameOverviewTabProps {
  classId: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY:       "text-green-600 bg-green-50 border-green-200",
  NORMAL:     "text-blue-600 bg-blue-50 border-blue-200",
  HARD:       "text-orange-600 bg-orange-50 border-orange-200",
  BRUTAL:     "text-red-600 bg-red-50 border-red-200",
  LEGENDARY:  "text-purple-600 bg-purple-50 border-purple-200",
};

const MEDAL = ["🥇", "🥈", "🥉", "4.", "5."];

export function GameOverviewTab({ classId }: GameOverviewTabProps) {
  const [data, setData] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/game-stats`);
      if (res.ok) setData(await res.json() as GameStats);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const elementMeta = data?.boss?.elementKey
    ? (ELEMENT_META as Record<string, { label: string; emoji: string }>)[data.boss.elementKey]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800">🎮 Game Overview</h2>
        <button
          onClick={() => { void fetchData(); }}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <p className="text-slate-400 text-sm">โหลดข้อมูลไม่สำเร็จ</p>
      ) : (
        <>
          {/* Boss + Quest Activity row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Boss Status */}
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
                <Swords className="w-4 h-4 text-rose-500" />
                World Boss
              </h3>
              {data.boss ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 text-base">{data.boss.name}</span>
                    <div className="flex items-center gap-2">
                      {elementMeta && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {elementMeta.emoji} {elementMeta.label}
                        </span>
                      )}
                      {data.boss.difficulty && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[data.boss.difficulty] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                          {data.boss.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>HP</span>
                      <span>{data.boss.hpPct}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${data.boss.hpPct}%`,
                          background: data.boss.hpPct > 50 ? "#22c55e" : data.boss.hpPct > 25 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <Swords className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold">ไม่มี Boss ที่ Active</p>
                </div>
              )}
            </GlassCard>

            {/* Quest Activity */}
            <GlassCard className="p-5" hover={false}>
              <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Quest Activity วันนี้
              </h3>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-4xl font-black text-emerald-600">{data.questActivity.dailyActive}</span>
                <span className="text-slate-400 text-sm font-bold mb-1">/ {data.questActivity.totalStudents} คน</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                  style={{
                    width: data.questActivity.totalStudents > 0
                      ? `${(data.questActivity.dailyActive / data.questActivity.totalStudents) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                นักเรียนที่ complete daily quest ≥ 1 ภารกิจ
              </p>
            </GlassCard>
          </div>

          {/* Leaderboards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeaderboardCard
              title="Level"
              icon={<Star className="w-4 h-4 text-amber-500" />}
              rows={data.topByLevel}
              valueKey="level"
              valueLabel="LV"
            />
            <LeaderboardCard
              title="Gold"
              icon={<Coins className="w-4 h-4 text-yellow-500" />}
              rows={data.topByGold}
              valueKey="gold"
              valueLabel="GP"
            />
            <LeaderboardCard
              title="Arena Points"
              icon={<Trophy className="w-4 h-4 text-purple-500" />}
              rows={data.topByArena}
              valueKey="arenaPoints"
              valueLabel="AP"
            />
          </div>
        </>
      )}
    </div>
  );
}

function LeaderboardCard({
  title,
  icon,
  rows,
  valueKey,
  valueLabel,
}: {
  title: string;
  icon: React.ReactNode;
  rows: StudentRankEntry[];
  valueKey: "level" | "gold" | "arenaPoints";
  valueLabel: string;
}) {
  return (
    <GlassCard className="p-5" hover={false}>
      <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <div className="py-4 text-center text-slate-400">
          <Users className="w-6 h-6 mx-auto mb-1 opacity-30" />
          <p className="text-xs font-bold">ยังไม่มีข้อมูล</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={row.id} className="flex items-center gap-2.5">
              <span className="text-sm w-6 text-center shrink-0">{MEDAL[i]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 truncate">{row.name}</p>
                {row.jobClass && (
                  <p className="text-[10px] text-slate-400 font-bold truncate">{row.jobClass}</p>
                )}
              </div>
              <span className="text-sm font-black text-slate-600 tabular-nums shrink-0">
                {(row[valueKey] ?? 0).toLocaleString()} <span className="text-[10px] text-slate-400">{valueLabel}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
