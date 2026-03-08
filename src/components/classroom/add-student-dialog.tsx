"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Plus, Trash2, Users, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { getThemeBgClass, getThemeBgStyle } from "@/lib/classroom-utils";

interface StudentEntry { name: string; nickname: string; }

interface AddStudentDialogProps {
    classId: string;
    theme: string;
    onStudentAdded?: () => void;
}

export function AddStudentDialog({ classId, theme, onStudentAdded }: AddStudentDialogProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const emptyRow = (): StudentEntry => ({ name: "", nickname: "" });
    const [rows, setRows] = useState<StudentEntry[]>([emptyRow()]);

    const setRow = (i: number, field: keyof StudentEntry, val: string) =>
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

    const addRow = () => setRows(prev => [...prev, emptyRow()]);

    const removeRow = (i: number) =>
        setRows(prev => prev.length === 1 ? [emptyRow()] : prev.filter((_, idx) => idx !== i));

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, rowIdx: number) => {
        const text = e.clipboardData.getData("text");
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) return;
        e.preventDefault();
        const newRows = [...rows];
        newRows[rowIdx] = { name: lines[0], nickname: "" };
        for (let i = 1; i < lines.length; i++) {
            newRows.splice(rowIdx + i, 0, { name: lines[i], nickname: "" });
        }
        setRows(newRows);
    };

    const validRows = rows.filter(r => r.name.trim().length > 0);

    const onSubmit = async () => {
        if (validRows.length === 0) {
            toast({ title: "กรุณากรอกชื่อนักเรียนอย่างน้อย 1 คน", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/students`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ students: validRows.map(r => ({ name: r.name.trim(), nickname: r.nickname.trim() || null })) })
            });
            if (!res.ok) throw new Error();
            toast({ title: `✅ เพิ่ม ${validRows.length} คนสำเร็จ!` });
            setOpen(false);
            setRows([emptyRow()]);
            router.refresh();
            onStudentAdded?.();
        } catch {
            toast({ title: t("error"), description: "Something went wrong.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-9 bg-white/15 hover:bg-white/25 text-white border-0 font-semibold shadow backdrop-blur-sm" size="sm">
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    {t("addStudents")}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[680px] w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-0">
                {/* Header */}
                <div 
                    className={`px-6 py-5 text-white shrink-0 ${getThemeBgClass(theme)}`}
                    style={getThemeBgStyle(theme)}
                >
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            เพิ่มนักเรียนใหม่
                        </DialogTitle>
                        <p className="text-white/80 text-sm mt-1">กรอกชื่อ-นามสกุล และชื่อเล่น (ไม่บังคับ) สามารถวางหลายบรรทัดได้</p>
                    </DialogHeader>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-[#F4F6FB]">
                    {/* Column headers */}
                    <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-3 px-6 pt-4 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span className="text-center">#</span>
                        <span>ชื่อ-นามสกุล *</span>
                        <span>ชื่อเล่น</span>
                        <span></span>
                    </div>

                    <div className="px-6 pb-4 space-y-2">
                        {rows.map((row, i) => (
                            <div key={i} className="grid grid-cols-[40px_1fr_1fr_40px] gap-3 items-center">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-600 mx-auto shrink-0">
                                    {i + 1}
                                </div>
                                <Input
                                    value={row.name}
                                    onChange={e => setRow(i, "name", e.target.value)}
                                    onPaste={e => handlePaste(e, i)}
                                    placeholder="ชื่อ-นามสกุล..."
                                    className="h-10 bg-white border-slate-200 focus-visible:ring-indigo-400 font-medium"
                                    onKeyDown={e => {
                                        if (e.key === "Enter") { e.preventDefault(); addRow(); }
                                    }}
                                />
                                <Input
                                    value={row.nickname}
                                    onChange={e => setRow(i, "nickname", e.target.value)}
                                    placeholder="ชื่อเล่น (ไม่บังคับ)"
                                    className="h-10 bg-white border-slate-200 focus-visible:ring-purple-400 text-slate-600"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeRow(i)}
                                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 mx-auto"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}

                        {/* Add row button */}
                        <button
                            type="button"
                            onClick={addRow}
                            className="w-full h-10 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm font-semibold mt-2"
                        >
                            <Plus className="w-4 h-4" /> เพิ่มแถว
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Users className="w-4 h-4" />
                        <span>พร้อมเพิ่ม <span className="font-bold text-indigo-600">{validRows.length}</span> คน</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} className="h-11 px-5">
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={onSubmit}
                            disabled={loading || validRows.length === 0}
                            className={`h-11 px-8 bg-gradient-to-r hover:opacity-90 text-white font-bold text-base shadow-md rounded-xl transition-opacity ${getThemeBgClass(theme)}`}
                            style={getThemeBgStyle(theme)}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังเพิ่ม...</>
                            ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> เพิ่มนักเรียน {validRows.length > 0 ? `(${validRows.length})` : ""}</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
