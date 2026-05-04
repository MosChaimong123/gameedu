"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, RefreshCw, AlertCircle, Users, Zap, UsersRound } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

interface LeaderEntry {
  id: string;
  name: string;
  avatar: string | null;
  behaviorPoints: number;
  gold: number;
  rank: number;
}

interface GroupMember {
  id: string;
  name: string;
  avatar: string | null;
  score: number;
}

interface SubGroup {
  name: string;
  studentCount: number;
  score: number;
  members: GroupMember[];
}

interface GroupSet {
  id: string;
  name: string;
  subGroups: SubGroup[];
}

const PODIUM_ORDER = [1, 0, 2] as const;
const PODIUM_META = [
  { rank: 2, label: "2", size: "w-14 h-14 text-xl", bg: "bg-slate-100 border-slate-300 text-slate-400", offset: "pt-6" },
  { rank: 1, label: "1", size: "w-20 h-20 text-3xl", bg: "bg-amber-100 border-amber-400 text-amber-500", offset: "" },
  { rank: 3, label: "3", size: "w-12 h-12 text-lg",  bg: "bg-orange-50 border-orange-300 text-orange-500", offset: "pt-10" },
] as const;

export function LeaderboardTab({
  classId,
  currentStudentId,
  studentCode,
}: {
  classId: string;
  currentStudentId: string;
  studentCode: string;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"individual" | "group">("individual");
  const [sortBy, setSortBy] = useState<"points" | "gold">("points");

  // ── Individual ──
  const [data, setData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchLeaderboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(false);
      try {
        const r = await fetch(
          `/api/classrooms/${classId}/leaderboard?code=${encodeURIComponent(studentCode)}`
        );
        if (!r.ok) throw new Error("fetch failed");
        const d = await r.json();
        setData(Array.isArray(d) ? d : []);
      } catch {
        setError(true);
      } finally {
        if (isRefresh) setIsRefreshing(false);
        else setLoading(false);
      }
    },
    [classId, studentCode]
  );

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ── Group ──
  const [groupSets, setGroupSets] = useState<GroupSet[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState(false);
  const [selectedGroupSetId, setSelectedGroupSetId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setGroupLoading(true);
    setGroupError(false);
    try {
      const r = await fetch(
        `/api/classrooms/${classId}/groups/scores?code=${encodeURIComponent(studentCode)}`
      );
      if (!r.ok) throw new Error("fetch failed");
      const d = await r.json();
      const sets: GroupSet[] = d.groupSets ?? [];
      setGroupSets(sets);
      if (sets.length > 0) setSelectedGroupSetId(sets[0].id);
    } catch {
      setGroupError(true);
    } finally {
      setGroupLoading(false);
    }
  }, [classId, studentCode]);

  useEffect(() => {
    if (mode === "group" && groupSets.length === 0 && !groupError) {
      void fetchGroups();
    }
  }, [mode, groupSets.length, groupError, fetchGroups]);

  // Individual helpers
  const sorted = [...data]
    .sort((a, b) => sortBy === "gold" ? b.gold - a.gold : b.behaviorPoints - a.behaviorPoints)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const isLoginCode = (val: string | null) => {
    if (!val) return false;
    return /^[A-Z0-9]{5,12}$/i.test(val);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-600" />;
    return <span className="flex h-5 w-5 items-center justify-center text-sm font-black text-slate-400">#{rank}</span>;
  };

  const getRankBg = (rank: number, isMe: boolean) => {
    if (isMe) return "border-indigo-400 bg-indigo-50/60";
    if (rank === 1) return "border-amber-300 bg-amber-50/60";
    if (rank === 2) return "border-slate-300 bg-slate-50/60";
    if (rank === 3) return "border-amber-700/30 bg-orange-50/60";
    return "border-slate-100 bg-white/40";
  };

  const activeGroupSet = groupSets.find((gs) => gs.id === selectedGroupSetId);

  return (
    <div className="space-y-6">
      {/* Header + toggle */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-cyan-50/40 to-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-black tracking-tight text-slate-800">{t("leaderboardTitle")}</h2>
          <div className="flex items-center gap-2">
            {/* Mode toggle: individual / group */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-black">
              <button onClick={() => setMode("individual")} className={cn("rounded-lg px-3 py-1.5 transition-all", mode === "individual" ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}>
                {t("leaderboardModeIndividual")}
              </button>
              <button onClick={() => setMode("group")} className={cn("rounded-lg px-3 py-1.5 transition-all", mode === "group" ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}>
                {t("leaderboardModeGroup")}
              </button>
            </div>
            {mode === "individual" && (
              <Button variant="ghost" size="sm" onClick={() => fetchLeaderboard(true)} disabled={isRefreshing || loading} className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700">
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
            {mode === "group" && (
              <Button variant="ghost" size="sm" onClick={fetchGroups} disabled={groupLoading} className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700">
                <RefreshCw className={`h-3.5 w-3.5 ${groupLoading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Sort toggle: points / gold (individual only) */}
        {mode === "individual" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-2xl border-2 border-slate-100 bg-slate-50 p-1 gap-1">
              <button
                onClick={() => setSortBy("points")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all",
                  sortBy === "points"
                    ? "bg-amber-400 text-amber-900 shadow-[0_3px_0_0_rgba(180,83,9,0.4)]"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                {t("leaderboardSortPoints")}
              </button>
              <button
                onClick={() => setSortBy("gold")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all",
                  sortBy === "gold"
                    ? "bg-yellow-400 text-yellow-900 shadow-[0_3px_0_0_rgba(161,98,7,0.4)]"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                🪙 {t("leaderboardSortGold")}
              </button>
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-100/60 px-3 py-1.5">
              <Trophy className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-black text-amber-700">{t("leaderboardPeopleCountBadge", { count: data.length })}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── INDIVIDUAL MODE ── */}
      {mode === "individual" && (
        <>
          {error && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-red-100 bg-red-50/60 px-6 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="font-black text-red-700">{t("leaderboardLoadFailed")}</p>
              <Button size="sm" variant="outline" onClick={() => fetchLeaderboard(true)} className="rounded-xl border-red-200 text-red-600">{t("leaderboardRetry")}</Button>
            </div>
          )}
          {loading && <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/40" />)}</div>}
          {!loading && !error && sorted.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white/40 px-6 py-14 text-center">
              <Users className="h-10 w-10 text-slate-300" />
              <p className="font-black text-slate-400">{t("leaderboardNoStudents")}</p>
            </div>
          )}
          {!loading && !error && sorted.length >= 1 && (
            <div className="flex items-end justify-center gap-3 px-4 sm:gap-6">
              {PODIUM_ORDER.map((dataIdx, visualIdx) => {
                const entry = sorted[dataIdx];
                if (!entry) return <div key={visualIdx} className="flex-1" />;
                const meta = PODIUM_META[visualIdx];
                return (
                  <motion.div key={entry.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: visualIdx * 0.1 }} className={`flex flex-1 flex-col items-center gap-1.5 ${meta.offset}`}>
                    {entry.rank === 1 && <Crown className="mb-1 h-6 w-6 text-amber-500 fill-amber-400" />}
                    <div className="text-2xl sm:text-3xl">{isLoginCode(entry.avatar) ? "👤" : (entry.avatar || "🎮")}</div>
                    <div className={`flex items-center justify-center rounded-2xl border-2 font-black ${meta.size} ${meta.bg}`}>{meta.label}</div>
                    <p className="line-clamp-1 text-center text-[10px] font-black text-slate-700 sm:text-xs">{entry.name}</p>
                    {sortBy === "gold" ? (
                      <p className="text-[10px] font-black text-yellow-600">🪙 {entry.gold.toLocaleString()} G</p>
                    ) : (
                      <p className="text-[10px] font-black text-amber-600">⚡ {entry.behaviorPoints.toLocaleString()} {t("leaderboardBehaviorShort")}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
          {!loading && !error && sorted.length > 0 && (
            <div className="space-y-2">
              {sorted.map((entry, idx) => {
                const isMe = entry.id === currentStudentId;
                return (
                  <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                    <GlassCard className={`flex items-center gap-4 border-2 p-3.5 transition-all ${getRankBg(entry.rank, isMe)}`}>
                      <div className="flex w-8 shrink-0 items-center justify-center">{getRankIcon(entry.rank)}</div>
                      <div className="shrink-0 text-2xl">{isLoginCode(entry.avatar) ? "👤" : (entry.avatar || "🎮")}</div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-black leading-tight ${isMe ? "text-indigo-700" : "text-slate-800"}`}>
                          {entry.name}{isMe && <span className="ml-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] text-white">{t("leaderboardYou")}</span>}
                        </p>
                        {sortBy === "gold" ? (
                          <span className="text-[10px] font-bold text-yellow-600">🪙 {entry.gold.toLocaleString()} G</span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600">⚡ {entry.behaviorPoints.toLocaleString()} {t("leaderboardBehaviorShort")}</span>
                        )}
                      </div>
                      <div className={`shrink-0 text-lg font-black ${entry.rank <= 3 ? "text-amber-500" : "text-slate-300"}`}>#{entry.rank}</div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── GROUP MODE ── */}
      {mode === "group" && (
        <>
          {groupLoading && <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/40" />)}</div>}
          {groupError && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-red-100 bg-red-50/60 px-6 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="font-black text-red-700">{t("leaderboardLoadFailed")}</p>
              <Button size="sm" variant="outline" onClick={fetchGroups} className="rounded-xl border-red-200 text-red-600">{t("leaderboardRetry")}</Button>
            </div>
          )}
          {!groupLoading && !groupError && groupSets.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white/40 px-6 py-14 text-center">
              <UsersRound className="h-10 w-10 text-slate-300" />
              <p className="font-black text-slate-400">{t("leaderboardNoGroups")}</p>
              <p className="text-sm text-slate-400">{t("leaderboardNoGroupsHint")}</p>
            </div>
          )}

          {!groupLoading && !groupError && groupSets.length > 0 && (
            <div className="space-y-4">
              {/* Group set selector */}
              {groupSets.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {groupSets.map((gs) => (
                    <button
                      key={gs.id}
                      onClick={() => setSelectedGroupSetId(gs.id)}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-black transition-all",
                        selectedGroupSetId === gs.id
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white/60 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {gs.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-group list */}
              {activeGroupSet && (
                <div className="space-y-2">
                  {activeGroupSet.subGroups.map((sg, idx) => {
                    const rank = idx + 1;
                    const rowKey = `${activeGroupSet.id}-${idx}`;
                    const displayName = sg.name?.trim() ? sg.name : t("leaderboardUnnamedGroup");
                    const isExpanded = expandedGroup === rowKey;
                    return (
                      <motion.div
                        key={rowKey}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setExpandedGroup(isExpanded ? null : rowKey);
                            }
                          }}
                          className="cursor-pointer rounded-3xl"
                          onClick={() => setExpandedGroup(isExpanded ? null : rowKey)}
                        >
                        <GlassCard
                          hover={false}
                          className={cn(
                            "border-2 transition-all",
                            rank === 1 ? "border-amber-300 bg-amber-50/60" :
                            rank === 2 ? "border-slate-300 bg-slate-50/60" :
                            rank === 3 ? "border-orange-200 bg-orange-50/40" :
                            "border-slate-100 bg-white/40"
                          )}
                        >
                          <div className="flex items-center gap-4 p-3.5">
                            <div className="flex w-8 shrink-0 items-center justify-center">
                              {rank === 1 ? <Crown className="w-5 h-5 text-amber-500 fill-amber-400" /> :
                               rank === 2 ? <Medal className="w-5 h-5 text-slate-400 fill-slate-300" /> :
                               rank === 3 ? <Medal className="w-5 h-5 text-amber-700 fill-amber-600" /> :
                               <span className="text-sm font-black text-slate-400">#{rank}</span>}
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                              <UsersRound className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-slate-800">{displayName}</p>
                              <p className="text-[10px] text-slate-400">{t("leaderboardPeopleCountBadge", { count: sg.studentCount })}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-black text-indigo-700 tabular-nums">{sg.score.toLocaleString()}</p>
                              <p className="text-[10px] text-indigo-400">{t("leaderboardGroupTotalScore")}</p>
                            </div>
                          </div>

                          {/* Member list (expanded) */}
                          {isExpanded && sg.members.length > 0 && (
                            <div className="border-t border-slate-100 px-4 pb-3 pt-2 space-y-1.5">
                              {sg.members
                                .slice()
                                .sort((a, b) => b.score - a.score)
                                .map((m) => (
                                  <div key={m.id} className="flex items-center gap-2">
                                    <span className="text-base">{m.avatar || "🎮"}</span>
                                    <span className="text-xs font-bold text-slate-700 flex-1 min-w-0 truncate">{m.name}</span>
                                    <span className="text-xs font-black text-indigo-600 tabular-nums shrink-0">{m.score}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </GlassCard>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
