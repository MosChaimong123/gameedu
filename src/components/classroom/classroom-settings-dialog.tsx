"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Classroom } from "@prisma/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Palette, School, Upload, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";

const THEMES = [
    { label: "Ocean Blue",    value: "from-blue-400 to-cyan-500" },
    { label: "Dragon Fire",   value: "from-red-500 to-orange-500" },
    { label: "Elven Forest",  value: "from-green-500 to-emerald-600" },
    { label: "Royal Purple",  value: "from-purple-500 to-indigo-600" },
    { label: "Golden Glory",  value: "from-yellow-400 to-orange-500" },
    { label: "Dark Knight",   value: "from-slate-700 to-slate-900" },
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

const GRADE_PRESETS = [
    "ป.1","ป.2","ป.3","ป.4","ป.5","ป.6",
    "ม.1","ม.2","ม.3","ม.4","ม.5","ม.6",
];

interface ClassroomSettingsDialogProps {
    classroom: Classroom;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ClassroomSettingsDialog({ classroom, open, onOpenChange }: ClassroomSettingsDialogProps) {
    const classroomWithGrade = classroom as Classroom & { grade?: string | null };
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const { toast } = useToast();

    const [name, setName] = useState(classroom.name);
    const [grade, setGrade] = useState(classroomWithGrade.grade || "");
    const [emoji, setEmoji] = useState(classroom.emoji || "🛡️");
    const [theme, setTheme] = useState(classroom.theme || THEMES[0].value);

    // Custom Theme state
    const [isCustomTheme, setIsCustomTheme] = useState(classroom.theme?.startsWith('custom:') || false);
    const [customStartColor, setCustomStartColor] = useState(classroom.theme?.startsWith('custom:') ? classroom.theme.split(':')[1].split(',')[0] : '#6366f1');
    const [customEndColor, setCustomEndColor] = useState(classroom.theme?.startsWith('custom:') ? classroom.theme.split(':')[1].split(',')[1] : '#a855f7');

    const fileInputRef = useRef<HTMLInputElement>(null);

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
                body: JSON.stringify({ name, grade: grade.trim() || null, emoji, theme: finalTheme })
            });
            if (res.ok) {
                toast({ title: t("settingsSaved") || "Settings Saved" });
                onOpenChange(false);
                window.location.reload();
            } else throw new Error("Failed");
        } catch {
            toast({ title: t("error") || "Error", variant: "destructive", description: "Could not save settings." });
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
            toast({ title: t("error") || "Error", variant: "destructive", description: "Could not reset points." });
        } finally {
            setLoading(false);
            setShowResetConfirm(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] w-[96vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-0">
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
                            {t("classroomSettings") || "Classroom Settings"}
                        </DialogTitle>
                        <p className="text-white/80 text-sm mt-1">ปรับแต่งห้องเรียนของคุณ</p>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#F4F6FB] p-6 space-y-6">
                    {/* Row 1: name + grade + emoji */}
                    <div className="grid grid-cols-3 gap-5">
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                <School className="w-4 h-4" /> ชื่อห้องเรียน
                            </Label>
                            <Input 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                className="h-12 text-lg font-bold rounded-xl border-2 focus-visible:ring-indigo-400 transition-all shadow-sm"
                                placeholder="เช่น ป.5/1 ห้องตัวอย่าง"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-500">ระดับชั้น</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input 
                                    value={grade} 
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="h-12 font-bold rounded-xl text-center"
                                />
                                <div className="grid grid-cols-2 gap-1 items-center">
                                    {GRADE_PRESETS.slice(0, 4).map(p => (
                                        <button 
                                            key={p} 
                                            type="button"
                                            onClick={() => setGrade(p)}
                                            className="text-[10px] py-1 rounded bg-slate-200 hover:bg-slate-300 font-bold"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Emoji / Icon Picker */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                            ไอคอนห้องเรียน
                        </Label>
                        <div className="flex gap-4 items-start">
                            <div 
                                className={`w-24 h-24 rounded-3xl shrink-0 shadow-lg border-4 border-white flex items-center justify-center text-5xl cursor-pointer hover:scale-105 transition-all overflow-hidden relative group ${getBgClass()}`}
                                style={getBgStyle()}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {emoji.startsWith('data:image') || emoji.startsWith('http') ? (
                                    <Image src={emoji} alt="Icon" fill sizes="96px" unoptimized className="object-cover" />
                                ) : (
                                    <span>{emoji}</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="text-white w-6 h-6" />
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileSelect} 
                                    className="hidden" 
                                    accept="image/*" 
                                />
                            </div>

                            <div className="flex-1 bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm">
                                <div className="grid grid-cols-10 gap-x-2 gap-y-3">
                                    {ICON_PRESETS.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setEmoji(icon)}
                                            className={`text-2xl hover:scale-125 transition-transform p-1 rounded-lg ${emoji === icon ? 'bg-indigo-50 ring-2 ring-indigo-400' : 'hover:bg-slate-50'}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Theme Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                <Palette className="w-4 h-4" /> ธีมสีห้องเรียน
                            </Label>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                type="button"
                                onClick={() => setIsCustomTheme(!isCustomTheme)}
                                className={`text-xs font-bold ${isCustomTheme ? 'text-indigo-600' : 'text-slate-400'}`}
                            >
                                {isCustomTheme ? "✨ ใช้ธีมสำเร็จรูป" : "🎨 สร้างธีมเอง"}
                            </Button>
                        </div>

                        {!isCustomTheme ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {THEMES.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setTheme(t.value)}
                                        className={`group relative h-16 rounded-xl overflow-hidden shadow-sm transition-all hover:scale-[1.02] border-2 ${theme === t.value ? 'border-slate-800 ring-2 ring-slate-800 ring-offset-2' : 'border-transparent'}`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-r ${t.value}`} />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                                            <span className="text-white text-xs font-black drop-shadow-md brightness-110">{t.label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-indigo-200 space-y-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จุดเริ่มต้น (Start)</label>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg shadow-inner border" style={{ backgroundColor: customStartColor }} />
                                            <input 
                                                type="color" 
                                                value={customStartColor} 
                                                onChange={(e) => setCustomStartColor(e.target.value)}
                                                className="w-full h-10 cursor-pointer rounded-lg border-0 bg-slate-100 px-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จุดจบ (End)</label>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg shadow-inner border" style={{ backgroundColor: customEndColor }} />
                                            <input 
                                                type="color" 
                                                value={customEndColor} 
                                                onChange={(e) => setCustomEndColor(e.target.value)}
                                                className="w-full h-10 cursor-pointer rounded-lg border-0 bg-slate-100 px-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="h-10 rounded-xl shadow-inner border-2 border-white bg-slate-100 flex items-center justify-center">
                                    <div className="w-full h-full rounded-[10px] flex items-center justify-center font-bold text-white text-sm" style={{ backgroundImage: `linear-gradient(to right, ${customStartColor}, ${customEndColor})` }}>
                                        ตัวอย่างสีของคุณ
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Zone Danger */}
                    <div className="pt-4 border-t border-slate-200">
                        <div className="bg-red-50/50 rounded-2xl p-5 border border-red-100 space-y-1 relative overflow-hidden group">
                           <div className="flex items-start justify-between relative z-10">
                                <div className="space-y-1">
                                    <h4 className="font-black text-red-600 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> รีเซ็ตคะแนนนักเรียน
                                    </h4>
                                    <p className="text-xs text-red-500/80 font-medium">คะแนนทั้งหมดของนักเรียนในห้องนี้จะกลับเป็น 0 (ไม่สามารถย้อนกลับได้)</p>
                                </div>
                                
                                <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                                    <button 
                                        type="button"
                                        onClick={() => setShowResetConfirm(true)}
                                        className="h-10 px-4 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all font-bold text-sm shadow-sm"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2 inline" /> รีเซ็ตคะแนน
                                    </button>
                                    <DialogContent className="sm:max-w-[400px]">
                                        <DialogHeader>
                                            <DialogTitle className="text-red-600">ยืนยันการรีเซ็ตคะแนน?</DialogTitle>
                                            <DialogDescription>การดำเนินการนี้จะทำให้คะแนนสะสมของนักเรียนทุกคนในห้องนี้กลายเป็น 0 ทันที และข้อความประกาศคะแนนจะถูกลบออก (ไม่รวมประวัติการเข้าเรียน)</DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter className="gap-2 sm:gap-0">
                                            <Button variant="outline" type="button" onClick={() => setShowResetConfirm(false)}>ยกเลิก</Button>
                                            <Button variant="destructive" type="button" onClick={handleResetPoints} disabled={loading}>
                                                {loading ? "กำลังดำเนินการ..." : "ยืนยันการรีเซ็ต"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                           </div>
                           <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
                               <AlertTriangle className="w-16 h-16 text-red-500" />
                           </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-white shrink-0">
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="h-11 px-5">{t("cancel") || "Cancel"}</Button>
                    <Button 
                        type="button"
                        onClick={onSave} 
                        disabled={loading}
                        className={`h-11 px-8 hover:opacity-90 transition-opacity bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md border-0`}
                    >
                        {loading ? "กำลังบันทึก..." : (t("saveChanges") || "Save")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
