"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp, Users, Star, Trophy,
  FileSpreadsheet, Loader2, BarChart3, Award,
  ClipboardList, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

type AnalyticsHistoryEntry = {
  createdAt?: string;
  reason?: string;
  value?: number;
};

type AnalyticsStudentStat = {
  name: string;
  nickname?: string | null;
  behaviorPoints: number;
  totalPositive: number;
  totalNeedsWork: number;
  achievementCount: number;
  attendance: string;
};

type AssignmentStat = {
  id: string;
  name: string;
  type: string | null;
  maxScore: number;
  passScore: number | null;
  submittedCount: number;
  totalStudents: number;
  submissionRate: number;
  avgScore: number;
  passCount: number | null;
  notSubmitted: { id: string; name: string }[];
};

function attendanceSegmentLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  status?: string,
  legacyName?: string
) {
  if (status === "PRESENT") return t("present");
  if (status === "LATE") return t("late");
  if (status === "ABSENT") return t("absent");
  if (status === "LEFT_EARLY") return t("leftEarly");
  return legacyName ?? status ?? "";
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

interface AnalyticsData {
  summary: { name: string; value: number; fill: string }[];
  growthData: { date: string; points: number }[];
  skillDistribution: { name: string; count: number }[];
  recentHistory: AnalyticsHistoryEntry[];
  studentStats: AnalyticsStudentStat[];
  attendanceSummary: { status?: string; name?: string; value: number; fill: string }[];
  achievementSummary: {
    total: number;
    avgPerStudent: number;
  };
  achievementDistribution: { id: string; count: number }[];
  assignmentStats: AssignmentStat[];
}

export function AnalyticsDashboard({ classId }: { classId: string }) {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");

  useEffect(() => {
    fetch(`/api/classrooms/${classId}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [classId]);

  const handleExportCsv = () => {
    if (!data) return;
    const studentsData = [
      [
        t("studentName"),
        t("analyticsTableBehaviorColumn"),
        t("analyticsExportEarnedSum"),
        t("analyticsExportDeductedSum"),
        t("analyticsTeacherRewardsTotalLabel"),
        t("attendance"),
      ],
      ...data.studentStats.sort((a, b) => b.behaviorPoints - a.behaviorPoints).map(s => [
        s.name, s.behaviorPoints, s.totalPositive, s.totalNeedsWork, s.achievementCount, s.attendance
      ])
    ];
    const csv = studentsData.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics_${new Date().toLocaleDateString("th-TH").replace(/\//g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const totalStud = data?.studentStats.length ?? 0;
  const avgPoints = totalStud > 0 ? Math.round((data?.studentStats ?? []).reduce((s, st) => s + st.behaviorPoints, 0) / totalStud) : 0;

  const filteredAssignments = useMemo(() => {
    const q = assignmentSearch.toLowerCase();
    return (data?.assignmentStats ?? []).filter((a) =>
      !q || a.name.toLowerCase().includes(q)
    );
  }, [data?.assignmentStats, assignmentSearch]);

  const attendancePieData = useMemo(() => {
    if (!data) return [];
    return data.attendanceSummary.map((e) => ({
      ...e,
      name: attendanceSegmentLabel(t, e.status, e.name),
    }));
  }, [data, t]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-300">
      <Loader2 className="w-10 h-10 animate-spin" />
    </div>
  );
  if (!data) return <div className="p-8 text-center text-red-500">{t("analyticsLoadFailed")}</div>;

  const barData = [...data.studentStats]
    .sort((a, b) => b.behaviorPoints - a.behaviorPoints)
    .slice(0, 12)
    .map(s => ({
      name: s.nickname || s.name.split(" ")[0] || s.name,
      earned: s.totalPositive,
      deducted: s.totalNeedsWork,
    }));

  return (
    <div className="space-y-6 animate-in fade-in">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">{t("analyticsPageTitle")}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t("analyticsPageSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCsv} size="sm" className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">
            <FileSpreadsheet className="w-4 h-4" /> {t("analyticsExportCsvButton")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5 text-indigo-500" />, label: t("analyticsAllStudentsLabel"), value: t("studentsCount", { count: totalStud }), bg: "bg-indigo-50", border: "border-indigo-100" },
          { icon: <Star className="w-5 h-5 text-emerald-500" />, label: t("analyticsAvgBehaviorPoints"), value: String(avgPoints), bg: "bg-emerald-50", border: "border-emerald-100" },
          { icon: <Award className="w-5 h-5 text-amber-500" />, label: t("analyticsTeacherRewardsTotalLabel"), value: `${data.achievementSummary.total}`, bg: "bg-amber-50", border: "border-amber-100" },
          { icon: <Trophy className="w-5 h-5 text-purple-500" />, label: t("analyticsAvgTeacherRewardPerStudentLabel"), value: `${data.achievementSummary.avgPerStudent}`, bg: "bg-purple-50", border: "border-purple-100" },
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
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> {t("analyticsGrowthTitle")}</p>
              <p className="text-xs text-slate-400 mb-4">{t("analyticsGrowthSubtitle")}</p>
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
              <p className="font-black text-slate-800 mb-1">{t("analyticsAttendanceTodayTitle")}</p>
              <p className="text-xs text-slate-400 mb-4">{t("analyticsAttendanceTodaySubtitle")}</p>
              {data.attendanceSummary.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-slate-300 text-sm">{t("analyticsNoAttendanceYet")}</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={attendancePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                        {attendancePieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "none" }}
                        formatter={(v) => [
                          t("analyticsTooltipPeopleCount", { count: Number(v) }),
                          t("analyticsTooltipAmountLabel"),
                        ]}
                      />
                      <Legend verticalAlign="bottom" height={30} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> {t("analyticsStudentBehaviorTop")}</p>
              <p className="text-xs text-slate-400 mb-4">{t("analyticsStudentBehaviorBarsHint")}</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                    <Bar dataKey="earned" name={t("analyticsTableEarnedHeader")} fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deducted" name={t("analyticsTableDeductedHeader")} fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-400" /> {t("analyticsTopSkillsTitle")}</p>
              <p className="text-xs text-slate-400 mb-4">{t("analyticsSkillUsesSubtitle")}</p>
              <div className="h-56">
                {data.skillDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-300 text-sm">{t("analyticsNoDataYet")}</div>
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
              <p className="font-black text-slate-800 mb-1 flex items-center gap-2"><Trophy className="w-4 h-4 text-purple-500" /> {t("analyticsTeacherRewardsFrequentTitle")}</p>
              <div className="h-48 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.achievementDistribution.slice(0, 10)} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="id" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} name={t("analyticsChartTimesUnit")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Assignment Submission Analytics */}
          {(data.assignmentStats ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
                <p className="font-black text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-500" /> {t("analyticsAssignmentReportTitle")}
                </p>
                <input
                  type="text"
                  placeholder={t("analyticsSearchAssignmentsPlaceholder")}
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 w-40"
                />
              </div>
              <div className="divide-y divide-slate-50">
                {filteredAssignments.map((a) => {
                  const isExpanded = expandedAssignment === a.id;
                  const rateColor =
                    a.submissionRate >= 80 ? "bg-emerald-500"
                    : a.submissionRate >= 50 ? "bg-amber-400"
                    : "bg-red-400";
                  return (
                    <div key={a.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedAssignment(isExpanded ? null : a.id)}
                        className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center gap-4"
                      >
                        {/* Submission rate bar */}
                        <div className="shrink-0 w-24">
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${rateColor}`}
                              style={{ width: `${a.submissionRate}%` }}
                            />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 mt-0.5 tabular-nums">
                            {t("analyticsSubmissionRateLabel", { rate: a.submissionRate })}
                          </p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-800 truncate">{a.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {t("analyticsSubmittedOfStudents", { submitted: a.submittedCount, total: a.totalStudents })}
                            {a.avgScore > 0
                              ? t("analyticsAvgScoreSnippet", { avg: a.avgScore, max: a.maxScore })
                              : ""}
                            {a.passCount !== null
                              ? t("analyticsPassCountSnippet", { count: a.passCount })
                              : ""}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {a.notSubmitted.length > 0 && (
                            <span className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-black text-red-600">
                              <AlertCircle className="w-3 h-3" />
                              {t("analyticsNotSubmittedBadge", { count: a.notSubmitted.length })}
                            </span>
                          )}
                          {a.notSubmitted.length === 0 && a.submittedCount > 0 && (
                            <span className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> {t("analyticsAllSubmittedBadge")}
                            </span>
                          )}
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                            : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>

                      {/* Expanded: who hasn't submitted */}
                      {isExpanded && a.notSubmitted.length > 0 && (
                        <div className="px-5 pb-4 pt-1 bg-red-50/40 border-t border-red-100/60">
                          <p className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-2">
                            {t("analyticsNotSubmittedListTitle", { count: a.notSubmitted.length })}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.notSubmitted.map((s) => (
                              <span key={s.id} className="rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {isExpanded && a.notSubmitted.length === 0 && (
                        <div className="px-5 pb-3 pt-1 bg-emerald-50/40 border-t border-emerald-100/60">
                          <p className="text-xs font-bold text-emerald-600">✓ {t("analyticsEveryoneSubmitted")}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredAssignments.length === 0 && (
                  <p className="px-5 py-6 text-sm text-slate-400 text-center">{t("analyticsNoMatchingAssignments")}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-black text-slate-800">{t("analyticsStudentReportTitle")}</p>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm text-slate-600 divide-y divide-slate-50 min-w-[640px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("analyticsTableNameHeader")}</th>
                    <th className="px-4 py-3 text-center">{t("analyticsTableBehaviorColumn")}</th>
                    <th className="px-4 py-3 text-center text-emerald-600">{t("analyticsTableEarnedHeader")}</th>
                    <th className="px-4 py-3 text-center text-red-500">{t("analyticsTableDeductedHeader")}</th>
                    <th className="px-4 py-3 text-center text-purple-600">{t("analyticsTableRewardsHeader")}</th>
                    <th className="px-4 py-3 text-center">{t("analyticsTableAttendanceHeader")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...data.studentStats].sort((a, b) => b.behaviorPoints - a.behaviorPoints).map((s, rowIdx) => (
                    <tr key={`${s.name}-${rowIdx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
                      <td className="px-4 py-3 text-center font-black text-indigo-600">{s.behaviorPoints}</td>
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
                          {s.attendance === "PRESENT"
                            ? t("present")
                            : s.attendance === "LATE"
                              ? t("late")
                              : s.attendance === "ABSENT"
                                ? t("absent")
                                : t("leftEarly")}
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
