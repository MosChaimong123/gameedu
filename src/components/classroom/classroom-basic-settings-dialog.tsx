"use client";

import { useState } from "react";
import { Classroom } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useRef } from "react";
import { Palette, Upload } from "lucide-react";

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

interface ClassroomBasicSettingsDialogProps {
    classroom: Classroom;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ClassroomBasicSettingsDialog({ 
    classroom, 
    open, 
    onOpenChange 
}: ClassroomBasicSettingsDialogProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(classroom.name);
    const [emoji, setEmoji] = useState(classroom.emoji || "🛡️");
    const [theme, setTheme] = useState(classroom.theme || THEMES[0].value);
    const [isCustomTheme, setIsCustomTheme] = useState(classroom.theme?.startsWith('custom:') || false);
    const [customStartColor, setCustomStartColor] = useState(
        classroom.theme?.startsWith('custom:') ? classroom.theme.split(':')[1].split(',')[0] : '#6366f1'
    );
    const [customEndColor, setCustomEndColor] = useState(
        classroom.theme?.startsWith('custom:') ? classroom.theme.split(':')[1].split(',')[1] : '#a855f7'
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: "ข้อผิดพลาด", description: "กรุณาอัปโหลดไฟล์รูปภาพ", variant: "destructive" });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast({ title: "ข้อผิดพลาด", description: "ขนาดรูปภาพควรน้อยกว่า 2MB", variant: "destructive" });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setEmoji(reader.result as string);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsDataURL(file);
    };

    const getBgStyle = () => {
        if (isCustomTheme) {
            return { backgroundImage: `linear-gradient(to right, ${customStartColor}, ${customEndColor})` };
        }
        return {};
    };

    const onSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const finalTheme = isCustomTheme ? `custom:${customStartColor},${customEndColor}` : theme;
            
            const res = await fetch(`/api/classrooms/${classroom.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, emoji, theme: finalTheme })
            });

            if (res.ok) {
                toast({ title: "บันทึกสำเร็จ" });
                onOpenChange(false);
                window.location.reload();
            } else {
                throw new Error("Failed");
            }
        } catch {
            toast({ title: "ข้อผิดพลาด", variant: "destructive", description: "ไม่สามารถบันทึกการตั้งค่าได้" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>ตั้งค่าห้องเรียน</DialogTitle>
                    <DialogDescription>{classroom.name}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Class Name */}
                    <div>
                        <Label className="text-sm font-semibold text-slate-700">ชื่อห้องเรียน</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ชื่อห้องเรียน"
                            className="mt-2"
                        />
                    </div>

                    {/* Icon */}
                    <div>
                        <Label className="text-sm font-semibold text-slate-700 mb-3 block">ไอคอนห้องเรียน</Label>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl">
                                {emoji.startsWith('data:image') || emoji.startsWith('http') ? (
                                    <img src={emoji} alt="Icon" className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    emoji
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                อัปโหลด
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {ICON_PRESETS.map(icon => (
                                <button
                                    key={icon}
                                    onClick={() => setEmoji(icon)}
                                    className={`px-3 py-3 rounded-lg text-2xl transition-all ${
                                        emoji === icon
                                            ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-110'
                                            : 'bg-slate-100 hover:bg-slate-200'
                                    }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme */}
                    <div>
                        <Label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            ธีมห้องเรียน
                        </Label>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {THEMES.map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => {
                                        setTheme(t.value);
                                        setIsCustomTheme(false);
                                    }}
                                    className={`h-10 rounded-lg bg-gradient-to-r ${t.value} transition-all ${
                                        !isCustomTheme && theme === t.value ? 'ring-2 ring-slate-400 scale-110' : 'hover:scale-105'
                                    }`}
                                    title={t.label}
                                />
                            ))}
                        </div>

                        {/* Custom Color */}
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <label className="flex items-center gap-2 mb-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isCustomTheme}
                                    onChange={(e) => setIsCustomTheme(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium text-slate-700">สีแบบกำหนดเอง</span>
                            </label>
                            
                            {isCustomTheme && (
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600">สีเริ่มต้น</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="color"
                                                value={customStartColor}
                                                onChange={(e) => setCustomStartColor(e.target.value)}
                                                className="w-10 h-8 rounded border"
                                            />
                                            <input
                                                type="text"
                                                value={customStartColor}
                                                onChange={(e) => setCustomStartColor(e.target.value)}
                                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600">สีสิ้นสุด</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="color"
                                                value={customEndColor}
                                                onChange={(e) => setCustomEndColor(e.target.value)}
                                                className="w-10 h-8 rounded border"
                                            />
                                            <input
                                                type="text"
                                                value={customEndColor}
                                                onChange={(e) => setCustomEndColor(e.target.value)}
                                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div
                                        className="h-10 rounded-lg bg-gradient-to-r mt-2"
                                        style={getBgStyle()}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                            className="flex-1"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={onSave}
                            disabled={loading || !name.trim()}
                            className="flex-1"
                        >
                            {loading ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
