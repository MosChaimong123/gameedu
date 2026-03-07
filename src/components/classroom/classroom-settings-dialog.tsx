"use client";

import { useState } from "react";
import { Classroom } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Crown, Plus, Trash2, GripVertical, Palette } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { parseLevelConfigToEntries, DEFAULT_RANK_ENTRIES, type RankEntry } from "@/lib/classroom-utils";

const THEMES = [
    { label: "Ocean Blue", value: "from-blue-400 to-cyan-500" },
    { label: "Dragon Fire", value: "from-red-500 to-orange-500" },
    { label: "Elven Forest", value: "from-green-500 to-emerald-600" },
    { label: "Royal Purple", value: "from-purple-500 to-indigo-600" },
    { label: "Golden Glory", value: "from-yellow-400 to-orange-500" },
    { label: "Dark Knight", value: "from-slate-700 to-slate-900" },
];

const COLOR_PRESETS = [
    "#94a3b8", "#64748b", "#ef4444", "#f97316", "#f59e0b",
    "#eab308", "#22c55e", "#10b981", "#14b8a6", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
];

interface ClassroomSettingsDialogProps {
    classroom: Classroom;
}

export function ClassroomSettingsDialog({ classroom }: ClassroomSettingsDialogProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"general" | "ranks">("general");
    const { toast } = useToast();

    // General settings
    const [name, setName] = useState(classroom.name);
    const [emoji, setEmoji] = useState(classroom.emoji || "🛡️");
    const [theme, setTheme] = useState(classroom.theme || THEMES[0].value);

    // Rank settings
    const [ranks, setRanks] = useState<RankEntry[]>(() =>
        parseLevelConfigToEntries(classroom.levelConfig)
    );
    const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);

    const handleAddRank = () => {
        setRanks(prev => [...prev, { name: "ยศใหม่", minScore: 0, icon: "⭐", color: "#6366f1" }]);
    };

    const handleRemoveRank = (index: number) => {
        setRanks(prev => prev.filter((_, i) => i !== index));
        if (colorPickerIndex === index) setColorPickerIndex(null);
    };

    const handleRankChange = (index: number, field: keyof RankEntry, value: string | number) => {
        setRanks(prev => prev.map((r, i) => i !== index ? r : { ...r, [field]: value }));
    };

    const onSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, emoji, theme, levelConfig: ranks })
            });
            if (res.ok) {
                toast({ title: t("settingsSaved") });
                setOpen(false);
                window.location.reload();
            } else throw new Error("Failed");
        } catch {
            toast({ title: t("error"), variant: "destructive", description: "Could not save settings." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="h-9 bg-black/20 hover:bg-black/30 text-white border-0 font-medium shadow-sm transition-colors whitespace-nowrap" size="sm">
                    <Settings className="w-4 h-4 md:mr-1.5" />
                    <span className="hidden xl:inline">{t("settings")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[780px] w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b bg-white">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-600" />
                        {t("classroomSettings")}
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex border-b shrink-0 bg-slate-50">
                    <button
                        onClick={() => setTab("general")}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                            tab === "general"
                                ? "border-indigo-600 text-indigo-700 bg-white"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Palette className="w-4 h-4" /> ทั่วไป
                    </button>
                    <button
                        onClick={() => setTab("ranks")}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                            tab === "ranks"
                                ? "border-amber-500 text-amber-700 bg-white"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Crown className="w-4 h-4" /> ตั้งค่ายศ
                    </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">
                    {tab === "general" && (
                        <div className="space-y-6 p-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t("className")}</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emoji">{t("roomEmoji")}</Label>
                                    <Input id="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} className="text-2xl h-10 w-20 text-center" maxLength={2} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("themeColor")}</Label>
                                <div className="grid grid-cols-6 gap-3 mt-2">
                                    {THEMES.map(th => (
                                        <div
                                            key={th.value}
                                            onClick={() => setTheme(th.value)}
                                            className={`cursor-pointer rounded-xl border-2 p-2 flex flex-col items-center gap-1.5 transition-all ${
                                                theme === th.value
                                                    ? "border-indigo-600 bg-indigo-50 shadow-sm scale-105"
                                                    : "border-slate-200 hover:border-indigo-300"
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${th.value}`} />
                                            <span className="text-[10px] text-center font-medium leading-tight">{th.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === "ranks" && (
                        <div className="p-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 font-medium">
                                👑 กำหนดยศ, ไอคอน, สี และคะแนนขั้นต่ำ — เรียงจากน้อยไปมาก
                            </div>

                            {/* Column labels */}
                            <div className="grid grid-cols-[auto_48px_1fr_80px_1fr_auto] items-center gap-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <span></span>
                                <span className="text-center">ไอคอน</span>
                                <span>ชื่อยศ</span>
                                <span className="text-center">คะแนนขั้นต่ำ</span>
                                <span className="text-center">สีกรอบ</span>
                                <span></span>
                            </div>

                            <div className="space-y-2">
                                {ranks.map((rank, i) => (
                                    <div key={i} className="relative">
                                        <div
                                            className="grid grid-cols-[auto_48px_1fr_80px_1fr_auto] items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm border-2 transition-colors"
                                            style={{ borderColor: rank.color || "#e2e8f0" }}
                                        >
                                            {/* Drag handle */}
                                            <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />

                                            {/* Icon */}
                                            <input
                                                type="text"
                                                value={rank.icon ?? "⭐"}
                                                onChange={(e) => handleRankChange(i, "icon", e.target.value)}
                                                className="w-10 h-10 text-center text-2xl bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                                                maxLength={2}
                                            />

                                            {/* Name */}
                                            <Input
                                                value={rank.name}
                                                onChange={(e) => handleRankChange(i, "name", e.target.value)}
                                                placeholder="ชื่อยศ"
                                                className="h-9 font-semibold focus-visible:ring-amber-400 border-slate-200"
                                            />

                                            {/* Min score */}
                                            <Input
                                                type="number"
                                                min={0}
                                                value={rank.minScore}
                                                onChange={(e) => handleRankChange(i, "minScore", parseInt(e.target.value) || 0)}
                                                className="h-9 text-center font-bold focus-visible:ring-amber-400 border-amber-200 bg-amber-50 text-amber-700"
                                            />

                                            {/* Color picker trigger */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setColorPickerIndex(colorPickerIndex === i ? null : i)}
                                                    className="flex items-center gap-2 h-9 px-3 rounded-lg border-2 font-medium text-sm transition-all hover:scale-105 w-full justify-center"
                                                    style={{ borderColor: rank.color || "#e2e8f0", color: rank.color || "#94a3b8" }}
                                                >
                                                    <span className="w-4 h-4 rounded-full border border-white shadow-sm shrink-0" style={{ background: rank.color || "#94a3b8" }} />
                                                    <span className="text-xs font-mono truncate">{rank.color || "#94a3b8"}</span>
                                                </button>
                                            </div>

                                            {/* Delete */}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveRank(i)}
                                                disabled={ranks.length <= 1}
                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Color swatch dropdown */}
                                        {colorPickerIndex === i && (
                                            <div className="absolute z-20 left-12 mt-1 bg-white rounded-xl border shadow-xl p-3 w-56">
                                                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">เลือกสี</p>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {COLOR_PRESETS.map(c => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            onClick={() => {
                                                                handleRankChange(i, "color", c);
                                                                setColorPickerIndex(null);
                                                            }}
                                                            className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                                                                rank.color === c ? "border-slate-800 scale-110" : "border-transparent"
                                                            }`}
                                                            style={{ background: c }}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="mt-2 pt-2 border-t flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400">กำหนดเอง</span>
                                                    <input
                                                        type="color"
                                                        value={rank.color || "#94a3b8"}
                                                        onChange={(e) => handleRankChange(i, "color", e.target.value)}
                                                        className="w-8 h-8 rounded cursor-pointer border-0"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddRank}
                                className="w-full h-10 border-dashed border-2 border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-400 font-bold"
                            >
                                <Plus className="w-4 h-4 mr-2" /> เพิ่มยศใหม่
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t bg-slate-50 shrink-0">
                    <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                    <Button onClick={onSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px]">
                        {t("saveChanges")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
