"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, TrendingUp, TrendingDown, Star, Clock } from "lucide-react";
import { getThemeBgStyle, getThemeHorizontalBgClass } from "@/lib/classroom-utils";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { isToday, isYesterday, format } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { formatPointHistoryReason } from "@/lib/point-history-reason";

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
    behaviorPoints: number;
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
    const { t, language } = useLanguage();
    const dfLocale = language === "th" ? thLocale : enUS;
    const [data, setData] = useState<StudentHistoryData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !studentId) return;
        const frameId = window.requestAnimationFrame(() => {
            setData(null);
            setLoading(true);
        });
        fetch(`/api/classrooms/${classId}/students/${studentId}/history`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => setData(json))
            .finally(() => setLoading(false));
        return () => window.cancelAnimationFrame(frameId);
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
            
            if (isToday(date)) dateKey = t("dateLabelToday");
            else if (isYesterday(date)) dateKey = t("dateLabelYesterday");
            else dateKey = format(date, "d MMMM yyyy", { locale: dfLocale });
            
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
                    className={`shrink-0 px-6 py-5 text-white ${getThemeHorizontalBgClass(theme)}`}
                    style={getThemeBgStyle(theme)}
                >
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white">
                        {data ? (
                            <>
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 border-2 border-white/30 shrink-0">
                                    <Image
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${data.avatar || data.id}`}
                                        alt={data.name}
                                        width={48}
                                        height={48}
                                        className="w-full h-full"
                                        unoptimized
                                    />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-xl leading-tight truncate">{data.name}</p>
                                    {data.nickname && (
                                        <p className="text-white/70 text-sm">&quot;{data.nickname}&quot;</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <span>{t("behaviorHistoryModalTitle")}</span>
                        )}
                    </DialogTitle>

                    {/* Stat pills & Sparkline */}
                    {data && (
                        <div className="flex flex-col gap-5 mt-4">
                            <div className="flex gap-4">
                                <div className="bg-white rounded-2xl p-3 flex-1 flex flex-col items-center border-2 border-white/50 shadow-xl">
                                    <p className="text-slate-500 text-[10px] uppercase font-black mb-1">{t("behaviorHistoryTotalLabel")}</p>
                                    <p className="text-slate-900 font-black text-2xl tracking-tighter">{data.behaviorPoints}</p>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl p-3 flex-1 flex flex-col items-center border-2 border-emerald-200 shadow-xl">
                                    <p className="text-emerald-600 text-[10px] uppercase font-black mb-1">{t("behaviorHistoryEarnedLabel")}</p>
                                    <p className="text-emerald-700 font-black text-2xl tracking-tighter">+{totalPositive}</p>
                                </div>
                                <div className="bg-rose-50 rounded-2xl p-3 flex-1 flex flex-col items-center border-2 border-rose-200 shadow-xl">
                                    <p className="text-rose-600 text-[10px] uppercase font-black mb-1">{t("behaviorHistoryDeductedLabel")}</p>
                                    <p className="text-rose-700 font-black text-2xl tracking-tighter">-{totalNegative}</p>
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
                            <p className="text-center">{t("behaviorHistoryEmptyTitle")}<br /><span className="text-sm">{t("behaviorHistoryEmptyHint")}</span></p>
                        </div>
                    )}

                    {!loading && data && data.history.length > 0 && (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200" />

                            <div className="space-y-6 pl-0">
                                {Object.entries(groupedHistory).map(([dateLabel, records]) => (
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
                                                    <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-white font-black shadow-xl shrink-0 relative z-10 border-4 border-white ${isPositive ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-rose-400 to-red-600 shadow-rose-200'}`}>
                                                        {isPositive ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                                                    </div>

                                                     {/* Content Card */}
                                                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-5 hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-200 transition-all cursor-default group overflow-hidden relative">
                                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        <div className="flex justify-between items-center gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-slate-800 text-lg leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">
                                                                    {formatPointHistoryReason(record.reason, t)}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-3">
                                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                                        <span className="text-xs text-slate-600 font-bold">{format(new Date(record.timestamp), "HH:mm")}</span>
                                                                    </div>
                                                                    <div className={cn(
                                                                        "text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-wider border-2 shadow-sm",
                                                                        isPositive ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-rose-100 border-rose-200 text-rose-700"
                                                                    )}>
                                                                        {isPositive ? t("behaviorHistoryTagPositive") : t("behaviorHistoryTagNegative")}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "text-2xl font-black px-5 py-2.5 rounded-[1.25rem] shrink-0 shadow-lg border-b-4",
                                                                isPositive ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200 shadow-rose-100"
                                                            )}>
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
