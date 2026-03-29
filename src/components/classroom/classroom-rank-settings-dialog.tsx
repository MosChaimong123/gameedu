"use client";

import { useState } from "react";
import { Classroom } from "@prisma/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { parseLevelConfigToEntries, type RankEntry, type LevelConfigInput, DEFAULT_RANK_ENTRIES } from "@/lib/classroom-utils";

const RANK_LABELS_TH: Record<string, string> = {
    "Common": "ทั่วไป",
    "Uncommon": "ไม่ธรรมดา",
    "Rare": "หายาก",
    "Epic": "มหากาพย์",
    "Legendary": "ตำนาน",
    "Mythic": "มายา"
};


interface ClassroomRankSettingsDialogProps {
    classroom: Classroom;
}

export function ClassroomRankSettingsDialog({ classroom }: ClassroomRankSettingsDialogProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Force migration to the new 6 fixed ranks
    const [ranks, setRanks] = useState<RankEntry[]>(() => {
        const current = parseLevelConfigToEntries(classroom.levelConfig as LevelConfigInput);
        return DEFAULT_RANK_ENTRIES.map((def, idx) => {
            const existing = current.find(r => r.name === def.name);
            if (existing) return { ...def, ...existing };
            
            if (current[idx]) {
                return { ...def, minScore: current[idx].minScore, goldRate: current[idx].goldRate || def.goldRate };
            }
            return def;
        });
    });

    const handleRankChange = (index: number, field: keyof RankEntry, value: string | number) => {
        setRanks(prev => prev.map((r, i) => i !== index ? r : { ...r, [field]: value }));
    };

    const onSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ levelConfig: ranks })
            });
            if (res.ok) {
                toast({ title: t("settingsSaved") || "Settings Saved" });
                setOpen(false);
                window.location.reload();
            } else throw new Error("Failed");
        } catch {
            toast({ title: t("error") || "Error", variant: "destructive", description: "Could not save rank settings." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="h-9 bg-blue-500 hover:bg-blue-600 text-white border-0 font-semibold shadow backdrop-blur-sm">
                    <Crown className="w-4 h-4 mr-1.5" />
                    ตั้งค่ายศ
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[700px] w-[96vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-0 bg-[#F4F6FB]">
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
                                <Crown className="w-5 h-5" />
                            </div>
                            ตั้งค่ายศ (Fixed Ranks)
                        </DialogTitle>
                        <p className="text-white/80 text-sm mt-1">กำหนดระดับคะแนนและของรางวัลสำหรับยศมาตรฐาน</p>
                    </DialogHeader>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800 font-medium flex gap-3 items-start">
                        <Info className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            ระบบยศถูกกำหนดให้เป็นมาตรฐาน 6 ระดับ (Common - Mythic) 
                            <p className="text-xs opacity-70 mt-1">คุณสามารถปรับแต่งคะแนนขั้นต่ำ และอัตราทองได้ แต่ไม่สามารถแก้ไขชื่อ, ไอคอน หรือสีกรอบได้</p>
                        </div>
                    </div>

                    {/* Column labels */}
                    <div className="grid grid-cols-[48px_1fr_90px_90px_48px] items-center gap-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="text-center">ไอคอน</span>
                        <span>ชื่อยศ / คำแปล</span>
                        <span className="text-center">คะแนนขั้นต่ำ</span>
                        <span className="text-center">เหรียญ/ชั่วโมง</span>
                        <span className="text-center">สีกรอบ</span>
                    </div>

                    <div className="space-y-2">
                        {ranks.map((rank, i) => (
                            <div key={i} className="relative">
                                <div
                                    className="grid grid-cols-[48px_1fr_90px_90px_48px] items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm border-2 transition-colors"
                                    style={{ borderColor: rank.color || "#e2e8f0" }}
                                >
                                    <div className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                        <span className="text-2xl">{rank.icon ?? "⭐"}</span>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">{rank.name}</span>
                                        <span className="text-xs text-indigo-500 font-medium">({RANK_LABELS_TH[rank.name] || "-"})</span>
                                    </div>

                                    <Input
                                        type="number"
                                        value={rank.minScore}
                                        onChange={(e) => handleRankChange(i, "minScore", parseInt(e.target.value) || 0)}
                                        className="h-9 font-bold text-center border-slate-200 rounded-lg bg-slate-50"
                                    />

                                    <Input
                                        type="number"
                                        value={rank.goldRate}
                                        onChange={(e) => handleRankChange(i, "goldRate", parseInt(e.target.value) || 0)}
                                        className="h-9 font-bold text-center border-slate-200 rounded-lg bg-amber-50 text-amber-700"
                                    />

                                    <div className="flex justify-center">
                                        <div 
                                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                            style={{ backgroundColor: rank.color || "#94a3b8" }}
                                            title="สีประจำระดับยศ"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-white/50 border-t gap-3 shrink-0">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>ยกเลิก</Button>
                    <Button 
                        onClick={onSave} 
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-md"
                    >
                        {loading ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
