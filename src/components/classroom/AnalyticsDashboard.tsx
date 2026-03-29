"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp, Users, Star, Trophy,
  FileSpreadsheet, Loader2, BarChart3, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

type AnalyticsHistoryEntry = {
  createdAt?: string;
  reason?: string;
  value?: number;
};

type AnalyticsStudentStat = {
  name: string;
  nickname?: string | null;
  points: number;
  totalPositive: number;
  totalNeedsWork: number;
  achievementCount: number;
  attendance: string;
};

interface AnalyticsData {
  summary: { name: string; value: number; fill: string }[];
  growthData: { date: string; points: number }[];
  skillDistribution: { name: string; count: number }[];
  recentHistory: AnalyticsHistoryEntry[];
  studentStats: AnalyticsStudentStat[];
  attendanceSummary: { name: string; value: number; fill: string }[];
  achievementSummary: {
    total: number;
    avgPerStudent: number;
  };
  achievementDistribution: { id: string; count: number }[];
}

export function AnalyticsDashboard({ classId }: { classId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

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
      ["ชื่อ", "คะแนนพฤติกรรม", "ได้รับ", "หักออก", "รางวัลจากครู", "การเข้าเรียน"],
      ...data.studentStats.sort((a, b) => b.points - a.points).map(s => [
        s.name, s.points, s.totalPositive, s.totalNeedsWork, s.achievementCount, s.attendance
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(studentsData);
    ws["!cols"] = [{wch:20},{wch:14},{wch:10},{wch:10},{wch:12},{wch:12}];
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5 text-indigo-500" />, label: "นักเรียนทั้งหมด", value: `${totalStud} คน`, bg: "bg-indigo-50", border: "border-indigo-100" },
          { icon: <Star className="w-5 h-5 text-emerald-500" />, label: "คะแนนเฉลี่ย", value: `${avgPoints} แต้ม`, bg: "bg-emerald-50", border: "border-emerald-100" },
          { icon: <Award className="w-5 h-5 text-amber-500" />, label: "รางวัลจากครู (รวม)", value: `${data.achievementSummary.total}`, bg: "bg-amber-50", border: "border-amber-100" },
          { icon: <Trophy className="w-5 h-5 text-purple-500" />, label: "เฉลี่ยรางวัล/คน", value: `${data.achievementSummary.avgPerStudent}`, bg: "bg-purple-50", border: "border-purple-100" },
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

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

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

          {data.achievementDistribution.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><Trophy className="w-4 h-4 text-purple-500" /> รางวัลจากครูที่มอบบ่อย</p>
              <div className="h-48 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.achievementDistribution.slice(0, 10)} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="id" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} name="ครั้ง" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-black text-slate-800">รายงานรายนักเรียน</p>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm text-slate-600 divide-y divide-slate-50 min-w-[640px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">ชื่อ</th>
                    <th className="px-4 py-3 text-center">คะแนน</th>
                    <th className="px-4 py-3 text-center text-emerald-600">ได้รับ</th>
                    <th className="px-4 py-3 text-center text-red-500">หักออก</th>
                    <th className="px-4 py-3 text-center text-purple-600">รางวัลจากครู</th>
                    <th className="px-4 py-3 text-center">เข้าเรียน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...data.studentStats].sort((a, b) => b.points - a.points).map((s, rowIdx) => (
                    <tr key={`${s.name}-${rowIdx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
                      <td className="px-4 py-3 text-center font-black text-indigo-600">{s.points}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">+{s.totalPositive}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-500">-{s.totalNeedsWork}</td>
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
    </div>
  );
}
