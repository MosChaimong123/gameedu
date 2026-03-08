"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, TrendingUp, TrendingDown, Star, Clock, CalendarDays } from "lucide-react";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { isToday, isYesterday, startOfDay, format } from "date-fns";
import { useLanguage } from "@/components/providers/language-provider";

interface PointRecord {
    id: string;
    reason: string;
    value: number;
    timestamp: string;
    skillId?: string | null;
}

interface StudentHistoryData {
    id: string;
    name: string;
    nickname?: string | null;
    points: number;
    avatar?: string | null;
    history: PointRecord[];
}

interface StudentHistoryModalProps {
    classId: string;
    studentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    theme: string;
}

export function StudentHistoryModal({
    classId,
    studentId,
    open,
    onOpenChange,
    theme,
}: StudentHistoryModalProps) {
    const { t } = useLanguage();
    const [data, setData] = useState<StudentHistoryData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !studentId) return;
        setData(null);
        setLoading(true);
        fetch(`/api/classrooms/${classId}/students/${studentId}/history`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => setData(json))
            .finally(() => setLoading(false));
    }, [open, classId, studentId]);

    const totalPositive = data?.history.filter(h => h.value > 0).reduce((s, h) => s + h.value, 0) ?? 0;
    const totalNegative = data?.history.filter(h => h.value < 0).reduce((s, h) => s + Math.abs(h.value), 0) ?? 0;

    // Process history for Sparkline (last 10 points)
    const sparklineData = data?.history
        .slice()
        .reverse()
        .map((h, i) => ({ value: h.value, index: i }));

    // Grouping helper
    const groupHistoryByDate = () => {
        if (!data?.history) return {};
        const groups: Record<string, PointRecord[]> = {};
        
        data.history.forEach(record => {
            const date = new Date(record.timestamp);
            let dateKey = "";
            
            if (isToday(date)) dateKey = "วันนี้";
            else if (isYesterday(date)) dateKey = "เมื่อวาน";
            else dateKey = format(date, "d MMMM yyyy");
            
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(record);
        });
        
        return groups;
    };

    const groupedHistory = groupHistoryByDate();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                {/* Header */}
                <DialogHeader
                    className={`px-6 py-5 shrink-0 ${getThemeBgClass(theme)}`}
                    style={getThemeBgStyle(theme)}
                >
                    <DialogTitle className="text-white text-xl font-bold flex items-center gap-3">
                        {data ? (
                            <>
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 border-2 border-white/30 shrink-0">
                                    <img
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${data.avatar || data.id}`}
                                        alt={data.name}
                                        className="w-full h-full"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-xl leading-tight truncate">{data.name}</p>
                                    {data.nickname && (
                                        <p className="text-white/70 text-sm">"{data.nickname}"</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <span>ประวัติคะแนน</span>
                        )}
                    </DialogTitle>

                    {/* Stat pills & Sparkline */}
                    {data && (
                        <div className="flex flex-col gap-4 mt-3">
                            <div className="flex gap-2">
                                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
                                    <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold">รวม</p>
                                    <p className="text-white font-black text-xl">{data.points}</p>
                                </div>
                                <div className="bg-green-500/30 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
                                    <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold">ได้รับ</p>
                                    <p className="text-green-200 font-black text-xl">+{totalPositive}</p>
                                </div>
                                <div className="bg-red-500/30 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
                                    <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold">หักออก</p>
                                    <p className="text-red-200 font-black text-xl">-{totalNegative}</p>
                                </div>
                            </div>
                            
                            {/* Sparkline */}
                            {sparklineData && sparklineData.length > 1 && (
                                <div className="h-12 w-full px-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={sparklineData}>
                                            <Area 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke="#fff" 
                                                strokeWidth={2} 
                                                fillOpacity={0.2} 
                                                fill="#fff" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}
                </DialogHeader>

                {/* Timeline Body */}
                <div className="flex-1 overflow-y-auto bg-[#F4F6FB] p-4">
                    {loading && (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    )}

                    {!loading && data?.history.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                                <Star className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-center">ยังไม่มีประวัติคะแนน<br /><span className="text-sm">คะแนนจะแสดงที่นี่เมื่อนักเรียนได้รับหรือถูกหักคะแนน</span></p>
                        </div>
                    )}

                    {!loading && data && data.history.length > 0 && (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200" />

                            <div className="space-y-6 pl-0">
                                {Object.entries(groupedHistory).map(([dateLabel, records], groupIndex) => (
                                    <div key={dateLabel} className="space-y-3">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-slate-200 h-[1px] flex-1" />
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                                {dateLabel}
                                            </span>
                                            <div className="bg-slate-200 h-[1px] flex-1" />
                                        </div>
                                        
                                        {records.map((record, index) => {
                                            const isPositive = record.value > 0;
                                            return (
                                                <div key={record.id} className="flex gap-4 items-start animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${index * 50}ms` }}>
                                                    {/* NodeIcon */}
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shrink-0 relative z-10 ${isPositive ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-rose-400 to-red-600'}`}>
                                                        {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                                                    </div>

                                                    {/* Content Card */}
                                                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-xl hover:border-indigo-100 transition-all cursor-default group overflow-hidden relative">
                                                        <div className={`absolute top-0 left-0 w-1 h-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-black text-slate-800 text-base leading-tight group-hover:text-indigo-600 transition-colors">
                                                                    {record.reason}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {format(new Date(record.timestamp), "HH:mm")}
                                                                    </p>
                                                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                                    <p className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-tight">
                                                                        {isPositive ? 'Reward' : 'Infraction'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className={`text-xl font-black px-4 py-2 rounded-xl shrink-0 ${isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                                                                {isPositive ? '+' : ''}{record.value}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
