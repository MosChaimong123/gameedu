"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/components/providers/language-provider";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportData {
    summary: { name: string; value: number; fill: string }[];
    recentHistory: {
        id: string;
        studentName: string;
        studentId: string;
        reason: string;
        value: number;
        timestamp: string;
    }[];
    studentStats: any[];
}

interface ReportsTabProps {
    classId: string;
}

export function ReportsTab({ classId }: ReportsTabProps) {
    const { t } = useLanguage();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReports() {
            try {
                const res = await fetch(`/api/classrooms/${classId}/reports`);
                if (res.ok) {
                    setData(await res.json());
                }
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

        const headers = ["Student Name", "Total Positive", "Total Needs Work", "Attendance"];
        const rows = data.studentStats.map(student => [
            student.name,
            student.totalPositive.toString(),
            student.totalNeedsWork.toString(),
            student.attendance
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `classroom_report_${formatDistanceToNow(new Date(), { addSuffix: false }).replace(/ /g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-red-500">{t("failedToLoadReports") || "Failed to load reports."}</div>;

    const totalPoints = data.summary.reduce((acc: any, curr: any) => acc + curr.value, 0);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-end">
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    {t("exportCSV")}
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Chart Area */}
                <Card className="md:col-span-1 shadow-sm">
                <CardHeader>
                    <CardTitle>{t("classOverview")}</CardTitle>
                    <CardDescription>{t("positiveVsNeedsWork")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {totalPoints === 0 ? (
                        <div className="h-[250px] flex items-center justify-center text-slate-400">
                            {t("noDataYet")}
                        </div>
                    ) : (
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.summary.map((item: any) => ({
                                            ...item,
                                            name: item.name === "Positive" ? t("positive") : item.name === "Needs Work" ? t("needsWork") : item.name
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.summary.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card className="md:col-span-2 shadow-sm">
                <CardHeader>
                    <CardTitle>{t("recentActivity")}</CardTitle>
                    <CardDescription>{t("latestPointsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        {data.recentHistory.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">{t("noActivityRecordedYet") || "No activity recorded yet."}</p>
                        ) : (
                            data.recentHistory.map((record: any) => (
                                <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-800">{record.studentName}</span>
                                        <span className="text-sm text-slate-500">{record.reason}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`font-bold ${record.value > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {record.value > 0 ? '+' : ''}{record.value}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Individual Student Reports */}
            <Card className="md:col-span-3 shadow-sm mt-4">
                <CardHeader>
                    <CardTitle>{t("individualStudentReports")}</CardTitle>
                    <CardDescription>{t("studentPerformanceDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-slate-700 uppercase">
                                <tr>
                                    <th className="px-6 py-3 rounded-tl-lg">{t("studentName")}</th>
                                    <th className="px-6 py-3 text-center">{t("positive")}</th>
                                    <th className="px-6 py-3 text-center">{t("needsWork")}</th>
                                    <th className="px-6 py-3 text-center rounded-tr-lg">{t("attendance")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.studentStats.map((student: any) => (
                                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                                        <td className="px-6 py-4 text-center font-bold text-green-600">
                                            {student.totalPositive}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-red-500">
                                            {student.totalNeedsWork}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                student.attendance === 'PRESENT' ? 'bg-green-100 text-green-700 border-green-200' :
                                                student.attendance === 'LATE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                'bg-red-100 text-red-700 border-red-200'
                                            }`}>
                                                {student.attendance === 'PRESENT' ? t("present") : student.attendance === 'LATE' ? t("late") : student.attendance === 'ABSENT' ? t("absent") : student.attendance === 'LEFT_EARLY' ? t("leftEarly") : student.attendance}
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
