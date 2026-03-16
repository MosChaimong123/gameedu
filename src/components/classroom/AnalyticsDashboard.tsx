"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp, Users, Star, Coins, Trophy, Crown,
  Download, FileSpreadsheet, Loader2, Sword, Award, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

interface AnalyticsData {
  summary: { name: string; value: number; fill: string }[];
  growthData: { date: string; points: number }[];
  skillDistribution: { name: string; count: number }[];
  recentHistory: any[];
  studentStats: any[];
  attendanceSummary: { name: string; value: number; fill: string }[];
  gameSummary: {
    totalGold: number;
    avgGold: number;
    totalAchievements: number;
    totalItems: number;
  };
  goldLeaderboard: { name: string; gold: number; points: number; achievements: number }[];
  achievementDistribution: { id: string; count: number }[];
}

export function AnalyticsDashboard({ classId }: { classId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"behavior" | "game">("behavior");

  useEffect(() => {
    fetch(`/api/classrooms/${classId}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [classId]);

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const studentsData = [
      ["ชื่อ", "คะแนนพฤติกรรม", "ได้รับ", "หักออก", "Gold", "รางวัล", "ไอเทม", "การเข้าเรียน"],
      ...data.studentStats.sort((a, b) => b.points - a.points).map(s => [
        s.name, s.points, s.totalPositive, s.totalNeedsWork, s.gold,
        s.achievementCount, s.itemCount, s.attendance
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(studentsData);
    ws["!cols"] = [{wch:20},{wch:14},{wch:10},{wch:10},{wch:10},{wch:8},{wch:8},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws, "นักเรียน");
    XLSX.writeFile(wb, `analytics_${new Date().toLocaleDateString("th-TH").replace(/\//g,"-")}.xlsx`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-300">
      <Loader2 className="w-10 h-10 animate-spin" />
    </div>
  );
  if (!data) return <div className="p-8 text-center text-red-500">โหลดข้อมูลไม่ได้</div>;

  const totalStud = data.studentStats.length;
  const avgPoints = totalStud > 0 ? Math.round(data.studentStats.reduce((s, st) => s + st.points, 0) / totalStud) : 0;
  const totalPos = data.summary.find(s => s.name === "Positive")?.value || 0;
  const totalNeg = data.summary.find(s => s.name === "Needs Work")?.value || 0;
  const topGold = data.goldLeaderboard[0];

  const barData = [...data.studentStats]
    .sort((a, b) => b.points - a.points)
    .slice(0, 12)
    .map(s => ({
      name: s.nickname || s.name.split(" ")[0] || s.name,
      ได้รับ: s.totalPositive,
      หักออก: s.totalNeedsWork,
    }));

  return (
    <div className="space-y-6 animate-in fade-in">

      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Analytics Dashboard</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">ภาพรวมห้องเรียน</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} size="sm" className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* ===== KPI Cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5 text-indigo-500" />, label: "นักเรียนทั้งหมด", value: `${totalStud} คน`, bg: "bg-indigo-50", border: "border-indigo-100" },
          { icon: <Star className="w-5 h-5 text-emerald-500" />, label: "คะแนนเฉลี่ย", value: `${avgPoints} แต้ม`, bg: "bg-emerald-50", border: "border-emerald-100" },
          { icon: <Coins className="w-5 h-5 text-amber-500" />, label: "Gold เฉลี่ย/คน", value: `🪙 ${data.gameSummary.avgGold.toLocaleString()}`, bg: "bg-amber-50", border: "border-amber-100" },
          { icon: <Trophy className="w-5 h-5 text-purple-500" />, label: "รางวัลทั้งหมด", value: `🏆 ${data.gameSummary.totalAchievements}`, bg: "bg-purple-50", border: "border-purple-100" },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`rounded-2xl border-2 ${card.border} ${card.bg} p-4 flex items-center gap-3 shadow-sm`}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold">{card.label}</p>
              <p className="font-black text-slate-800 text-base leading-tight">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ===== Tab Switch ===== */}
      <div className="flex gap-2 p-1.5 bg-slate-100/60 rounded-2xl w-fit">
        {[
          { key: "behavior", label: "📊 พฤติกรรม" },
          { key: "game", label: "🎮 เกมเพลย์" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-5 py-2 rounded-xl font-black text-sm transition-all ${tab === t.key ? "bg-white shadow text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== BEHAVIOR TAB ===== */}
      {tab === "behavior" && (
        <motion.div key="behavior" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Growth + Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> ความเคลื่อนไหวคะแนน (14 วัน)</p>
              <p className="text-xs text-slate-400 mb-4">จำนวนคะแนนที่บันทึกแต่ละวัน</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.growthData}>
                    <defs>
                      <linearGradient id="gPoints" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 20px -4px rgba(0,0,0,0.1)" }} />
                    <Area type="monotone" dataKey="points" stroke="#6366f1" strokeWidth={3} fill="url(#gPoints)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1">การเข้าเรียนวันนี้</p>
              <p className="text-xs text-slate-400 mb-4">สัดส่วนสถานะการมาเรียน</p>
              {data.attendanceSummary.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-slate-300 text-sm">ยังไม่เช็คชื่อ</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.attendanceSummary} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                        {data.attendanceSummary.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} formatter={(v) => [`${v} คน`, "จำนวน"]} />
                      <Legend verticalAlign="bottom" height={30} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Student bar + Skill bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> คะแนนนักเรียน (Top 12)</p>
              <p className="text-xs text-slate-400 mb-4">เขียวคือได้รับ แดงคือหักออก</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                    <Bar dataKey="ได้รับ" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="หักออก" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-400" /> ทักษะที่ใช้บ่อย</p>
              <p className="text-xs text-slate-400 mb-4">จำนวนครั้งที่บันทึกคะแนนแยกตามหมวด</p>
              <div className="h-56">
                {data.skillDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-300 text-sm">ยังไม่มีข้อมูล</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.skillDistribution} margin={{ left: 50, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: "bold" }} width={120} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                      <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Full student table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-black text-slate-800">รายงานรายนักเรียน</p>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm text-slate-600 divide-y divide-slate-50 min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">ชื่อ</th>
                    <th className="px-4 py-3 text-center">คะแนน</th>
                    <th className="px-4 py-3 text-center text-emerald-600">ได้รับ</th>
                    <th className="px-4 py-3 text-center text-red-500">หักออก</th>
                    <th className="px-4 py-3 text-center text-amber-600">Gold</th>
                    <th className="px-4 py-3 text-center text-purple-600">รางวัล</th>
                    <th className="px-4 py-3 text-center">เข้าเรียน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...data.studentStats].sort((a, b) => b.points - a.points).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
                      <td className="px-4 py-3 text-center font-black text-indigo-600">{s.points}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">+{s.totalPositive}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-500">-{s.totalNeedsWork}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600">🪙 {s.gold.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-bold text-purple-600">🏆 {s.achievementCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          s.attendance === "PRESENT" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          s.attendance === "LATE" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                          s.attendance === "ABSENT" ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-orange-50 text-orange-700 border-orange-200"
                        }`}>
                          {s.attendance === "PRESENT" ? "มาเรียน" : s.attendance === "LATE" ? "สาย" : s.attendance === "ABSENT" ? "ขาด" : "ออกก่อน"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== GAME TAB ===== */}
      {tab === "game" && (
        <motion.div key="game" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Game KPI row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-5 text-center">
              <p className="text-3xl font-black text-amber-600">🪙 {data.gameSummary.totalGold.toLocaleString()}</p>
              <p className="text-xs text-amber-500 font-bold mt-1">Gold รวมในห้อง</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5 text-center">
              <p className="text-3xl font-black text-purple-600">🏆 {data.gameSummary.totalAchievements}</p>
              <p className="text-xs text-purple-500 font-bold mt-1">รางวัลที่ได้รับทั้งหมด</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 text-center">
              <p className="text-3xl font-black text-emerald-600">⚔️ {data.gameSummary.totalItems}</p>
              <p className="text-xs text-emerald-500 font-bold mt-1">ไอเทมทั้งหมดในเกม</p>
            </div>
          </div>

          {/* Gold Leaderboard Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> Gold Leaderboard (Top 10)</p>
              <p className="text-xs text-slate-400 mb-4">อันดับ Gold สะสมรายนักเรียน</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.goldLeaderboard} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: "bold" }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none" }}
                      formatter={(v, n) => [`🪙 ${Number(v).toLocaleString()}`, "Gold"]}
                    />
                    <Bar dataKey="gold" radius={[0, 6, 6, 0]} barSize={20}>
                      {data.goldLeaderboard.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#818cf8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gold per student scatter */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><Award className="w-4 h-4 text-purple-500" /> Gold vs คะแนนพฤติกรรม</p>
              <p className="text-xs text-slate-400 mb-4">เปรียบเทียบ Gold กับคะแนนพฤติกรรมรายคน</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.goldLeaderboard} margin={{ top: 0, right: 10, left: -20, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                    <Bar yAxisId="left" dataKey="gold" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Gold" />
                    <Bar yAxisId="right" dataKey="points" fill="#6366f1" radius={[4, 4, 0, 0]} name="คะแนน" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Game full table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-black text-slate-800">สถานะเกมรายนักเรียน</p>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm text-slate-600 divide-y divide-slate-50 min-w-[500px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">ชื่อ</th>
                    <th className="px-4 py-3 text-center text-amber-600">Gold 🪙</th>
                    <th className="px-4 py-3 text-center text-purple-600">รางวัล 🏆</th>
                    <th className="px-4 py-3 text-center text-emerald-600">ไอเทม ⚔️</th>
                    <th className="px-4 py-3 text-center text-indigo-600">คะแนน ⭐</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...data.studentStats].sort((a, b) => b.gold - a.gold).map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                        {i < 3 && <span className="text-base">{["🥇","🥈","🥉"][i]}</span>}
                        {i >= 3 && <span className="text-xs text-slate-300 font-black">#{i+1}</span>}
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-amber-600">{s.gold.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-bold text-purple-600">{s.achievementCount}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">{s.itemCount}</td>
                      <td className="px-4 py-3 text-center font-black text-indigo-600">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
