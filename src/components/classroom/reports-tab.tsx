"use client";

import { useEffect, useState } from "react";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/components/providers/language-provider";
import { Loader2, Download, FileSpreadsheet, TrendingUp, Users, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

interface StudentStat {
    id: string;
    name: string;
    nickname: string | null;
    points: number;
    totalPositive: number;
    totalNeedsWork: number;
    attendance: string;
}

interface ReportData {
    summary: { name: string; value: number; fill: string }[];
    attendanceSummary: { name: string; value: number; fill: string }[];
    recentHistory: {
        id: string;
        studentName: string;
        studentId: string;
        reason: string;
        value: number;
        timestamp: string;
    }[];
    studentStats: StudentStat[];
    growthData: { date: string; points: number }[];
    skillDistribution: { name: string; count: number }[];
}

export function ReportsTab({ classId }: { classId: string }) {
    const { t } = useLanguage();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReports() {
            try {
                const res = await fetch(`/api/classrooms/${classId}/reports`);
                if (res.ok) setData(await res.json());
            } catch (error) {
                console.error("Failed to load reports", error);
            } finally {
                setLoading(false);
            }
        }
        fetchReports();
    }, [classId]);

    const handleExportCSV = () => {
        if (!data) return;
        const headers = ["ชื่อ", "ชื่อเล่น", "คะแนนรวม", "ได้รับ", "หักออก", "การเข้าเรียน"];
        const rows = data.studentStats.map(s => [
            s.name,
            s.nickname || "-",
            s.points.toString(),
            s.totalPositive.toString(),
            s.totalNeedsWork.toString(),
            s.attendance
        ]);
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
        const a = document.createElement("a"); a.href = url; a.download = `report_${classId}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const handleExportExcel = () => {
        if (!data) return;

        const wb = XLSX.utils.book_new();

        // Sheet 1: Students
        const studentsData = [
            ["ชื่อ", "ชื่อเล่น", "คะแนนรวม", "คะแนนได้รับ", "คะแนนหักออก", "การเข้าเรียน"],
            ...[...data.studentStats].sort((a, b) => b.points - a.points).map(s => [
                s.name, s.nickname || "-", s.points, s.totalPositive, s.totalNeedsWork, s.attendance
            ])
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(studentsData);
        ws1["!cols"] = [{wch:20},{wch:15},{wch:12},{wch:14},{wch:14},{wch:14}];
        XLSX.utils.book_append_sheet(wb, ws1, "นักเรียน");

        // Sheet 2: Point History
        const historyData = [
            ["ชื่อนักเรียน", "เหตุผล", "คะแนน", "วันเวลา"],
            ...data.recentHistory.map(h => [
                h.studentName, h.reason, h.value,
                new Date(h.timestamp).toLocaleString("th-TH")
            ])
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(historyData);
        ws2["!cols"] = [{wch:20},{wch:30},{wch:10},{wch:20}];
        XLSX.utils.book_append_sheet(wb, ws2, "ประวัติคะแนน");

        // Sheet 3: Attendance summary
        const attData = [
            ["สถานะ", "จำนวน (คน)"],
            ...(data.attendanceSummary ?? []).map(a => [a.name, a.value])
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(attData);
        ws3["!cols"] = [{wch:15},{wch:12}];
        XLSX.utils.book_append_sheet(wb, ws3, "การเข้าเรียน");

        XLSX.writeFile(wb, `รายงาน_ห้องเรียน_${new Date().toLocaleDateString("th-TH").replace(/\//g,"-")}.xlsx`);
    };

    if (loading) return (
        <div className="flex items-center justify-center p-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
    );

    if (!data) return <div className="p-8 text-center text-red-500">ไม่สามารถโหลดรายงานได้</div>;

    const totalPoints = data.summary.reduce((acc, curr) => acc + curr.value, 0);

    // Bar chart data – top 15 sorted by points desc
    const barData = [...data.studentStats]
        .sort((a, b) => b.points - a.points)
        .slice(0, 15)
        .map(s => ({
            name: s.nickname || (s.name.split(" ")[0] ?? s.name),
            ได้รับ: s.totalPositive,
            หักออก: s.totalNeedsWork,
            รวม: s.points
        }));

    const attendanceData = data.attendanceSummary ?? [];

    // Summary stats
    const totalStudents = data.studentStats.length;
    const avgPoints = totalStudents > 0 ? Math.round(data.studentStats.reduce((s, st) => s + st.points, 0) / totalStudents) : 0;
    const topStudent = [...data.studentStats].sort((a, b) => b.points - a.points)[0];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Top bar */}
            <div className="flex items-center justify-between">
                <div className="flex gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Users className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">นักเรียน</p>
                            <p className="font-bold text-slate-700">{totalStudents} คน</p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">คะแนนเฉลี่ย</p>
                            <p className="font-bold text-slate-700">{avgPoints} แต้ม</p>
                        </div>
                    </div>
                    {topStudent && (
                        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
                            <div className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-500 font-bold">🏆</div>
                            <div>
                                <p className="text-xs text-slate-400">Top นักเรียน</p>
                                <p className="font-bold text-slate-700 truncate max-w-[120px]">{topStudent.name.split(" ")[0] ?? topStudent.name}</p>
                            </div>
                        </div>
                    )}
                </div>
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2 rounded-xl border-2">
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
                <Button onClick={handleExportExcel} size="sm" className="gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white">
                    <FileSpreadsheet className="w-4 h-4" /> Export Excel
                </Button>
            </div>

            {/* Row 1: Key Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Chart (Line) */}
                <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden">
                    <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                                    ความเคลื่อนไหวคะแนนในชั้นเรียน
                                </CardTitle>
                                <CardDescription>สถิติการให้คะแนนรวมรายวัน (14 วันล่าสุด)</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.growthData}>
                                    <defs>
                                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="points" 
                                        stroke="#6366f1" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorPoints)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendance (Pie) */}
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-base">การเข้าเรียนวันนี้</CardTitle>
                        <CardDescription>สถานะการมาเรียนรวม</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {attendanceData.length === 0 ? (
                            <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">ยังไม่มีการเช็คชื่อ</div>
                        ) : (
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={attendanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                                            {attendanceData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(v) => [`${v} คน`, 'จำนวน']} 
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Skill Popularity (Horizontal Bar) */}
                 <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            ทักษะที่ถูกใช้บ่อยที่สุด
                        </CardTitle>
                        <CardDescription>จำนวนครั้งที่ได้รับคะแนนแยกตามทักษะ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            {data.skillDistribution.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูลคะแนน</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        layout="vertical" 
                                        data={data.skillDistribution} 
                                        margin={{ left: 40, right: 30 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            tick={{ fontSize: 11, fontWeight: 'bold' }} 
                                            width={100}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top 15 Students (Vertical Bar) */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base uppercase tracking-tight">นักเรียนดีเด่น (Top {Math.min(barData.length, 15)})</CardTitle>
                        <CardDescription>เปรียบเทียบคะแนนได้รับและถูกหักออก</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(v, name) => [`${v}`, name === 'ได้รับ' ? '✅ ได้รับ' : '❌ หักออก']} 
                                    />
                                    <Bar dataKey="ได้รับ" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="หักออก" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Activity feed + Student table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-400" /> กิจกรรมล่าสุด
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            {data.recentHistory.length === 0 ? (
                                <p className="text-slate-400 text-center py-8 text-sm">ยังไม่มีกิจกรรม</p>
                            ) : data.recentHistory.slice(0, 30).map(record => (
                                <div key={record.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 text-sm truncate">{record.studentName}</p>
                                        <p className="text-xs text-slate-400 truncate">{record.reason}</p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className={`font-bold text-sm ${record.value > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {record.value > 0 ? '+' : ''}{record.value}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">รายงานรายนักเรียน</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 divide-y divide-slate-100">
                                <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-xl">ชื่อ</th>
                                        <th className="px-4 py-3 text-center">คะแนนรวม</th>
                                        <th className="px-4 py-3 text-center text-green-600">ได้รับ</th>
                                        <th className="px-4 py-3 text-center text-red-500">หักออก</th>
                                        <th className="px-4 py-3 text-center rounded-tr-xl">การเข้าเรียน</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {[...data.studentStats].sort((a, b) => b.points - a.points).map((student) => (
                                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-slate-800">{student.name}</p>
                                                {student.nickname && <p className="text-xs text-slate-400">"{student.nickname}"</p>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-black text-indigo-600 text-base">{student.points}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-green-600">+{student.totalPositive}</td>
                                            <td className="px-4 py-3 text-center font-bold text-red-500">-{student.totalNeedsWork}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                                    student.attendance === 'PRESENT' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    student.attendance === 'LATE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                    student.attendance === 'LEFT_EARLY' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                    'bg-red-100 text-red-700 border-red-200'
                                                }`}>
                                                    {student.attendance === 'PRESENT' ? 'มาเรียน' : student.attendance === 'LATE' ? 'สาย' : student.attendance === 'ABSENT' ? 'ขาด' : student.attendance === 'LEFT_EARLY' ? 'ออกก่อน' : student.attendance}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
