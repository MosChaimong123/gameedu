"use client";

import { useState, useRef } from "react";
import { Classroom } from "@prisma/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Crown, Plus, Trash2, GripVertical, Palette, School, Upload, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { parseLevelConfigToEntries, DEFAULT_RANK_ENTRIES, type RankEntry } from "@/lib/classroom-utils";

const THEMES = [
    { label: "Ocean Blue",    value: "from-blue-400 to-cyan-500" },
    { label: "Dragon Fire",   value: "from-red-500 to-orange-500" },
    { label: "Elven Forest",  value: "from-green-500 to-emerald-600" },
    { label: "Royal Purple",  value: "from-purple-500 to-indigo-600" },
    { label: "Golden Glory",  value: "from-yellow-400 to-orange-500" },
    { label: "Dark Knight",   value: "from-slate-700 to-slate-900" },
    // 5 เพิ่มใหม่
    { label: "Rose Garden",   value: "from-pink-500 to-rose-600" },
    { label: "Midnight",      value: "from-blue-900 to-indigo-950" },
    { label: "Teal Wave",     value: "from-teal-400 to-cyan-600" },
    { label: "Sunset Glow",   value: "from-orange-400 to-pink-500" },
    { label: "Mint Fresh",    value: "from-emerald-400 to-teal-500" },
];

const ICON_PRESETS = [
    "🛡️","⚔️","🏆","🎓","🌟","🔥","💎","🦁","🐉","🦅",
    "🌈","🎯","🚀","🌙","⚡","🎪","🏰","🎭","🌸","🦋",
];

const COLOR_PRESETS = [
    "#94a3b8","#64748b","#ef4444","#f97316","#f59e0b",
    "#eab308","#22c55e","#10b981","#14b8a6","#3b82f6",
    "#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e",
];

const GRADE_PRESETS = [
    "ป.1","ป.2","ป.3","ป.4","ป.5","ป.6",
    "ม.1","ม.2","ม.3","ม.4","ม.5","ม.6",
];

interface ClassroomSettingsDialogProps {
    classroom: Classroom;
}

export function ClassroomSettingsDialog({ classroom }: ClassroomSettingsDialogProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"general" | "ranks">("general");
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const { toast } = useToast();

    const [name, setName] = useState(classroom.name);
    const [grade, setGrade] = useState((classroom as any).grade || "");
    const [emoji, setEmoji] = useState(classroom.emoji || "🛡️");
    const [theme, setTheme] = useState(classroom.theme || THEMES[0].value);

    // Custom Theme state
    const [isCustomTheme, setIsCustomTheme] = useState(classroom.theme?.startsWith('custom:') || false);
    const [customStartColor, setCustomStartColor] = useState(classroom.theme?.startsWith('custom:') ? classroom.theme.split(':')[1].split(',')[0] : '#6366f1');
    const [customEndColor, setCustomEndColor] = useState(classroom.theme?.startsWith('custom:') ? classroom.theme.split(':')[1].split(',')[1] : '#a855f7');

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: t("error") || "Error", description: "Please upload an image file", variant: "destructive" });
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({ title: t("error") || "Error", description: "Image size should be less than 2MB", variant: "destructive" });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setEmoji(reader.result as string);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsDataURL(file);
    };

    const onSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const finalTheme = isCustomTheme ? `custom:${customStartColor},${customEndColor}` : theme;
            
            const res = await fetch(`/api/classrooms/${classroom.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, grade: grade.trim() || null, emoji, theme: finalTheme, levelConfig: ranks })
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

    // Helper to get background style
    const getBgStyle = () => {
        if (isCustomTheme) {
            return { backgroundImage: `linear-gradient(to right, ${customStartColor}, ${customEndColor})` };
        }
        return {};
    };
    
    // Helper to get class name
    const getBgClass = () => {
        if (isCustomTheme) return "";
        return `bg-gradient-to-r ${theme}`;
    };

    const handleResetPoints = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}/points/reset`, {
                method: "POST"
            });
            if (!res.ok) throw new Error("Failed");
            toast({ title: t("success") || "Success", description: "All points have been reset to 0." });
            window.location.reload();
        } catch {
            toast({ title: t("error"), variant: "destructive", description: "Could not reset points." });
        } finally {
            setLoading(false);
            setShowResetConfirm(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="h-9 bg-white/15 hover:bg-white/25 text-white border-0 font-semibold shadow backdrop-blur-sm" size="sm">
                    <Settings className="w-4 h-4 mr-1.5" />
                    {t("settings")}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[920px] w-[96vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-0">
                {/* Header */}
                <div 
                    className={`px-6 py-5 text-white shrink-0 transition-colors duration-500 ${getBgClass()}`}
                    style={getBgStyle()}
                >
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
                                <Settings className="w-5 h-5" />
                            </div>
                            {t("classroomSettings")}
                        </DialogTitle>
                        <p className="text-white/80 text-sm mt-1">ปรับแต่งห้องเรียนของคุณ</p>
                    </DialogHeader>
                </div>

                {/* Tabs */}
                <div className="flex border-b shrink-0 bg-slate-50">
                    <button
                        onClick={() => setTab("general")}
                        className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                            tab === "general"
                                ? "border-indigo-600 text-indigo-700 bg-white"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Palette className="w-4 h-4" /> ทั่วไป
                    </button>
                    <button
                        onClick={() => setTab("ranks")}
                        className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                            tab === "ranks"
                                ? "border-amber-500 text-amber-700 bg-white"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Crown className="w-4 h-4" /> ตั้งค่ายศ
                    </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto bg-[#F4F6FB]">

                    {/* ===== GENERAL TAB ===== */}
                    {tab === "general" && (
                        <div className="p-6 space-y-6">
                            {/* Row 1: name + grade + emoji */}
                            <div className="grid grid-cols-3 gap-5">
                                <div className="col-span-2 space-y-2">
                                    <Label className="font-bold">{t("className")}</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-11 text-base font-medium"
                                        placeholder="ชื่อห้องเรียน"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold">ระดับชั้น</Label>
                                    <Input
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                        className="h-11 text-base font-medium"
                                        placeholder="เช่น ม.1/1"
                                    />
                                </div>
                            </div>

                            {/* Grade presets */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ระดับชั้นเร็ว</Label>
                                <div className="flex flex-wrap gap-2">
                                    {GRADE_PRESETS.map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setGrade(g)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                                                grade === g
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Icon picker */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="font-bold">ไอคอนห้องเรียน</Label>
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0 bg-slate-50 rounded-xl border shadow-sm overflow-hidden">
                                        {emoji?.startsWith('data:image') || emoji?.startsWith('http') ? (
                                            <img src={emoji} alt="Class Icon" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{emoji}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-10 gap-2">
                                    {ICON_PRESETS.map(ic => (
                                        <button
                                            key={ic}
                                            type="button"
                                            onClick={() => setEmoji(ic)}
                                            className={`w-12 h-12 text-2xl rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 ${
                                                emoji === ic
                                                    ? "border-indigo-600 bg-indigo-50 shadow-md scale-110"
                                                    : "border-slate-200 bg-white hover:border-indigo-300"
                                            }`}
                                        >
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3 bg-white rounded-xl border p-3 flex-wrap">
                                    <span className="text-xs text-slate-400 font-medium shrink-0">กำหนดเอง</span>
                                    <Input
                                        value={emoji?.startsWith('data:image') || emoji?.startsWith('http') ? '' : emoji}
                                        onChange={(e) => setEmoji(e.target.value)}
                                        className="h-9 w-20 text-center text-2xl border-slate-200"
                                        maxLength={2}
                                    />
                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 px-3 text-sm font-medium border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        อัปโหลดรูปภาพ
                                    </Button>
                                </div>
                            </div>

                            {/* Theme */}
                            <div className="space-y-3">
                                <Label className="font-bold">{t("themeColor")}</Label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                    {THEMES.map(th => (
                                        <div
                                            key={th.value}
                                            onClick={() => {
                                                setTheme(th.value);
                                                setIsCustomTheme(false);
                                            }}
                                            className={`cursor-pointer rounded-xl border-2 p-2.5 flex flex-col items-center gap-2 transition-all hover:shadow-md ${
                                                !isCustomTheme && theme === th.value
                                                    ? "border-indigo-600 bg-indigo-50 shadow-md scale-105"
                                                    : "border-slate-200 bg-white hover:border-indigo-300"
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br shadow-inner shrink-0 ${th.value}`} />
                                            <span className="text-[10px] text-center font-semibold leading-tight text-slate-600">{th.label}</span>
                                        </div>
                                    ))}
                                    
                                    {/* Custom Theme Button */}
                                    <div
                                        onClick={() => setIsCustomTheme(true)}
                                        className={`cursor-pointer rounded-xl border-2 p-2.5 flex flex-col items-center gap-2 transition-all hover:shadow-md ${
                                            isCustomTheme
                                                ? "border-indigo-600 bg-indigo-50 shadow-md scale-105"
                                                : "border-slate-200 bg-white hover:border-indigo-300"
                                        }`}
                                    >
                                        <div 
                                            className="w-10 h-10 rounded-full shadow-inner shrink-0 border border-slate-200 flex items-center justify-center bg-white"
                                            style={{ backgroundImage: isCustomTheme ? `linear-gradient(to right, ${customStartColor}, ${customEndColor})` : undefined }}
                                        >
                                            {!isCustomTheme && <Palette className="w-5 h-5 text-slate-400" />}
                                        </div>
                                        <span className="text-[10px] text-center font-semibold leading-tight text-slate-600">กำหนดเอง</span>
                                    </div>
                                </div>
                                
                                {/* Custom Theme Pickers */}
                                {isCustomTheme && (
                                    <div className="mt-4 p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/50 flex flex-wrap gap-6 items-center animate-in slide-in-from-top-2">
                                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                                            <Label className="text-xs font-bold text-slate-500 uppercase">สีเริ่มต้น (Start Color)</Label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="color" 
                                                    value={customStartColor}
                                                    onChange={(e) => setCustomStartColor(e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-2 border-slate-200 bg-white p-0.5"
                                                />
                                                <Input 
                                                    value={customStartColor} 
                                                    onChange={(e) => setCustomStartColor(e.target.value)}
                                                    className="font-mono text-sm uppercase bg-white flex-1"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="hidden sm:block text-slate-300">
                                            <ArrowRight className="w-5 h-5 mt-5" />
                                        </div>
                                        
                                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                                            <Label className="text-xs font-bold text-slate-500 uppercase">สีสิ้นสุด (End Color)</Label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="color" 
                                                    value={customEndColor}
                                                    onChange={(e) => setCustomEndColor(e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-2 border-slate-200 bg-white p-0.5"
                                                />
                                                <Input 
                                                    value={customEndColor} 
                                                    onChange={(e) => setCustomEndColor(e.target.value)}
                                                    className="font-mono text-sm uppercase bg-white flex-1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reset Points Section */}
                            <div className="pt-6 border-t mt-8">
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 text-center md:text-left">
                                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-900">รีเซ็ตคะแนนทั้งหมดในห้องเรียน</h4>
                                            <p className="text-red-700/70 text-sm">การดำเนินการนี้จะล้างคะแนนพฤติกรรม คะแนนเก็บ และประวัติคะแนนทั้งหมดของนักเรียนทุกคน</p>
                                        </div>
                                    </div>
                                    <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowResetConfirm(true)}
                                        className="border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold px-6 h-11 transition-all shrink-0 shadow-sm"
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        {t("resetPoints")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== RANKS TAB ===== */}
                    {tab === "ranks" && (
                        <div className="p-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 font-medium">
                                👑 กำหนดยศ, ไอคอน, สี และคะแนนขั้นต่ำ — เรียงจากน้อยไปมาก
                            </div>

                            {/* Column labels */}
                            <div className="grid grid-cols-[auto_48px_1fr_90px_90px_1fr_auto] items-center gap-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <span></span>
                                <span className="text-center">ไอคอน</span>
                                <span>ชื่อยศ</span>
                                <span className="text-center">คะแนนขั้นต่ำ</span>
                                <span className="text-center">เหรียญ/นาที</span>
                                <span className="text-center">สีกรอบ</span>
                                <span></span>
                            </div>

                            <div className="space-y-2">
                                {ranks.map((rank, i) => (
                                    <div key={i} className="relative">
                                        <div
                                            className="grid grid-cols-[auto_48px_1fr_90px_90px_1fr_auto] items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm border-2 transition-colors"
                                            style={{ borderColor: rank.color || "#e2e8f0" }}
                                        >
                                            <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />

                                            <div className="relative group cursor-pointer" onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e) => {
                                                    const file = (e.target as HTMLInputElement).files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => handleRankChange(i, "icon", reader.result as string);
                                                        reader.readAsDataURL(file);
                                                    }
                                                };
                                                input.click();
                                            }}>
                                                <div className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden group-hover:border-indigo-400 transition-colors">
                                                    {(rank.icon?.startsWith('data:image') || rank.icon?.startsWith('http')) ? (
                                                        <img src={rank.icon} alt={rank.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-2xl">{rank.icon ?? "⭐"}</span>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Upload className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <Input
                                                    value={rank.name}
                                                    onChange={(e) => handleRankChange(i, "name", e.target.value)}
                                                    placeholder="ชื่อยศ"
                                                    className="h-9 font-semibold focus-visible:ring-amber-400 border-slate-200"
                                                />
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">ไอคอน:</span>
                                                    <input
                                                        type="text"
                                                        value={(rank.icon?.startsWith('data:image') || rank.icon?.startsWith('http')) ? "🖼️" : (rank.icon ?? "")}
                                                        onChange={(e) => handleRankChange(i, "icon", e.target.value)}
                                                        className="text-[10px] bg-transparent border-0 underline focus:ring-0 w-full"
                                                        placeholder="พิมพ์อิโมจิ..."
                                                    />
                                                </div>
                                            </div>

                                            <Input
                                                type="number"
                                                min={0}
                                                value={rank.minScore}
                                                onChange={(e) => handleRankChange(i, "minScore", parseInt(e.target.value) || 0)}
                                                className="h-9 text-center font-bold focus-visible:ring-amber-400 border-amber-200 bg-amber-50 text-amber-700"
                                            />

                                            <Input
                                                type="number"
                                                min={0}
                                                value={rank.goldRate ?? 0}
                                                onChange={(e) => handleRankChange(i, "goldRate", parseInt(e.target.value) || 0)}
                                                className="h-9 text-center font-bold focus-visible:ring-yellow-400 border-yellow-200 bg-yellow-50 text-yellow-700"
                                            />

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

                                        {colorPickerIndex === i && (
                                            <div className="absolute z-20 left-12 mt-1 bg-white rounded-xl border shadow-xl p-3 w-56">
                                                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">เลือกสี</p>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {COLOR_PRESETS.map(c => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            onClick={() => { handleRankChange(i, "color", c); setColorPickerIndex(null); }}
                                                            className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${rank.color === c ? "border-slate-800 scale-110" : "border-transparent"}`}
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
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-white shrink-0">
                    {/* Preview grade in footer */}
                    {grade && (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <School className="w-4 h-4" />
                            <span>ระดับชั้น: <strong className="text-indigo-600">{grade}</strong></span>
                        </div>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <Button variant="outline" onClick={() => setOpen(false)} className="h-11 px-5">{t("cancel")}</Button>
                        <Button
                            onClick={onSave}
                            disabled={loading}
                            className={`h-11 px-8 hover:opacity-90 transition-opacity text-white font-bold rounded-xl shadow-md min-w-[160px] border-0 ${getBgClass()}`}
                            style={getBgStyle()}
                        >
                            {loading ? "กำลังบันทึก..." : t("saveChanges")}
                        </Button>
                    </div>
                </div>

                {/* Reset Confirmation Dialog */}
                <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                    <DialogContent className="sm:max-w-[425px] w-[95vw] overflow-y-auto max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-2xl p-0">
                        <div className="bg-red-600 p-6 text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">{t("resetPoints")}</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 leading-relaxed">
                                {t("resetPointsConfirm") || "คุณแน่ใจว่าต้องการรีเซ็ตคะแนนทั้งหมดเป็น 0? การดำเนินการนี้ไม่สามารถเรียกคืนได้ และจะล้างข้อมูลคะแนนเก็บทั้งหมดด้วย"}
                            </p>
                        </div>
                        <DialogFooter className="flex sm:justify-end gap-3 p-6 bg-slate-50 border-t">
                            <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="px-6 h-11" disabled={loading}>
                                {t("cancel")}
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={handleResetPoints} 
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 h-11 shadow-md border-0"
                            >
                                {loading ? "กำลังรีเซ็ต..." : t("resetPoints")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}
