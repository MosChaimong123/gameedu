"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { useLanguage } from "@/components/providers/language-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AttendanceRecord {
    id: string;
    studentId: string;
    student: {
        name: string;
        avatar: string | null;
    };
    status: string;
    date: string;
}

interface AttendanceHistoryTabProps {
    classId: string;
}

export function AttendanceHistoryTab({ classId }: AttendanceHistoryTabProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/attendance/history?date=${selectedDate}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records);
            }
        } catch (error) {
            console.error("Failed to load attendance history", error);
        } finally {
            setLoading(false);
        }
    }, [classId, selectedDate]);

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

    const updateStatus = async (recordId: string, newStatus: string) => {
        const previousRecords = [...records];
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r));
        
        try {
            const res = await fetch(`/api/classrooms/${classId}/attendance/history/${recordId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) {
                throw new Error();
            }
        } catch (error) {
            console.error("Failed to update status", error);
            setRecords(previousRecords);
            toast({
                title: t("toastAttendanceSaveFailTitle"),
                description: t("toastAttendanceSaveFailDesc"),
                variant: "destructive",
            });
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "PRESENT": return "bg-green-100 text-green-700 border-green-200";
            case "LATE": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "ABSENT": return "bg-red-100 text-red-700 border-red-200";
            case "LEFT_EARLY": return "bg-orange-100 text-orange-700 border-orange-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle>{t("attendanceHistory")}</CardTitle>
                        <CardDescription>{t("attendanceHistoryDesc")}</CardDescription>
                    </div>
                    <div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center p-12 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : records.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">
                            {t("noAttendanceRecords")}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 divide-y divide-slate-200">
                                <thead className="bg-slate-50 text-slate-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-3 rounded-tl-lg">{t("studentName")}</th>
                                        <th className="px-6 py-3 text-center rounded-tr-lg">{t("status")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {records.map((record) => (
                                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                                    <Image src={`https://api.dicebear.com/7.x/bottts/svg?seed=${record.student.avatar || "1"}`} alt={record.student.name} width={32} height={32} className="w-full h-full object-contain p-1" unoptimized />
                                                </div>
                                                {record.student.name}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <select
                                                    value={record.status}
                                                    onChange={(e) => updateStatus(record.id, e.target.value)}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-slate-400 text-center ${getStatusStyle(record.status)}`}
                                                >
                                                    <option value="PRESENT">{t("present")}</option>
                                                    <option value="LATE">{t("late")}</option>
                                                    <option value="ABSENT">{t("absent")}</option>
                                                    <option value="LEFT_EARLY">{t("leftEarly")}</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
