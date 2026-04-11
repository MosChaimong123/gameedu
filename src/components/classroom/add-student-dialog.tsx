"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Plus, Trash2, Users, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { getThemeBgStyle, getThemeHorizontalBgClass } from "@/lib/classroom-utils";
import type { Student } from "@prisma/client";

interface StudentEntry { name: string; nickname: string; }

interface AddStudentDialogProps {
    classId: string;
    theme: string;
    onStudentAdded?: (students: Student[]) => void;
}

export function AddStudentDialog({ classId, theme, onStudentAdded }: AddStudentDialogProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
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
            toast({
                title: t("toastAddStudentNoInputTitle"),
                description: t("toastAddStudentNoInputDesc"),
                variant: "destructive",
            });
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
            const createdStudents = await res.json() as Student[];
            toast({
                title: t("toastAddStudentSuccessTitle"),
                description: t("toastAddStudentSuccessDesc", { count: validRows.length }),
            });
            setOpen(false);
            setRows([emptyRow()]);
            onStudentAdded?.(createdStudents);
        } catch {
            toast({
                title: t("toastAddStudentFailTitle"),
                description: t("toastAddStudentFailDesc"),
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-9 min-h-[44px] rounded-full border-[#d9d9dd] bg-white font-medium text-[#212121] shadow-none hover:border-[#1863dc] hover:text-[#1863dc] lg:min-h-0" size="sm">
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    {t("addStudents")}
                </Button>
            </DialogTrigger>

            <DialogContent className="flex max-h-[min(92dvh,44rem)] w-[min(96vw,40rem)] flex-col gap-0 overflow-hidden rounded-2xl border-2 border-amber-200/60 bg-[#faf8f5] p-0 shadow-2xl sm:max-h-[90vh] sm:max-w-[680px]">
                {/* Header */}
                <div 
                    className={`shrink-0 px-6 py-5 text-white ${getThemeHorizontalBgClass(theme)}`}
                    style={getThemeBgStyle(theme)}
                >
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            {t("addStudentDialogTitle")}
                        </DialogTitle>
                        <p className="text-white/80 text-sm mt-1">{t("addStudentDialogSubtitle")}</p>
                    </DialogHeader>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#f0f4fc]">
                    {/* Column headers — desktop table */}
                    <div className="hidden md:grid md:grid-cols-[40px_1fr_1fr_40px] md:gap-3 md:px-6 md:pt-4 md:pb-2">
                        <span className="text-center text-xs font-bold uppercase tracking-wider text-slate-600">{t("addStudentColIndex")}</span>
                        <span className="text-xs font-bold text-slate-700">{t("addStudentColFullName")}</span>
                        <span className="text-xs font-bold text-slate-700">{t("addStudentColNickname")}</span>
                        <span />
                    </div>

                    <div className="space-y-3 px-4 py-3 sm:px-6 sm:py-4">
                        {rows.map((row, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:grid md:grid-cols-[40px_1fr_1fr_40px] md:items-center md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
                            >
                                <div className="mb-3 flex items-center justify-between md:mb-0 md:hidden">
                                    <span className="text-sm font-bold text-slate-600">{t("addStudentRowLabel", { n: i + 1 })}</span>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 text-sm font-bold text-indigo-700">
                                        {i + 1}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeRow(i)}
                                        className="h-9 w-9 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                        aria-label={t("addStudentRemoveRowAria")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="hidden md:flex md:justify-center">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 text-xs font-bold text-indigo-700">
                                        {i + 1}
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:space-y-0">
                                    <label className="text-xs font-semibold text-slate-600 md:sr-only">{t("addStudentColFullName")}</label>
                                    <Input
                                        value={row.name}
                                        onChange={e => setRow(i, "name", e.target.value)}
                                        onPaste={e => handlePaste(e, i)}
                                        placeholder={t("addStudentFullNamePlaceholder")}
                                        className="h-11 border-slate-200 bg-white text-base font-medium text-slate-900 focus-visible:ring-indigo-400"
                                        onKeyDown={e => {
                                            if (e.key === "Enter") { e.preventDefault(); addRow(); }
                                        }}
                                    />
                                </div>
                                <div className="mt-3 space-y-1.5 md:mt-0 md:space-y-0">
                                    <label className="text-xs font-semibold text-slate-600 md:sr-only">{t("addStudentColNickname")}</label>
                                    <Input
                                        value={row.nickname}
                                        onChange={e => setRow(i, "nickname", e.target.value)}
                                        placeholder={t("addStudentNicknamePlaceholder")}
                                        className="h-11 border-slate-200 bg-white text-base text-slate-800 focus-visible:ring-purple-400"
                                    />
                                </div>
                                <div className="hidden md:flex md:justify-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeRow(i)}
                                        className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                        aria-label={t("addStudentRemoveRowAria")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {/* Add row button */}
                        <button
                            type="button"
                            onClick={addRow}
                            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 text-sm font-semibold text-indigo-600 transition-all hover:border-indigo-400 hover:bg-indigo-50"
                        >
                            <Plus className="h-4 w-4" /> {t("addStudentAddRow")}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200/80 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Users className="h-4 w-4 shrink-0 text-indigo-600" />
                        <span className="font-bold text-indigo-700">
                            {t("addStudentReadySummary", { count: validRows.length })}
                        </span>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Button variant="outline" onClick={() => setOpen(false)} className="h-11 w-full px-5 font-semibold sm:w-auto">
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={onSubmit}
                            disabled={loading || validRows.length === 0}
                            className={`h-11 w-full px-8 text-base font-bold text-white shadow-md transition-opacity hover:opacity-90 sm:w-auto ${getThemeHorizontalBgClass(theme)}`}
                            style={getThemeBgStyle(theme)}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("addStudentSubmitting")}</>
                            ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" />{" "}
                                    {validRows.length > 0
                                        ? t("addStudentSubmitWithCount", { count: validRows.length })
                                        : t("addStudentSubmit")}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
